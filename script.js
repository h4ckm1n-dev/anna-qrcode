// Fonction d'initialisation qui sera appelée une fois que QRCode est chargé
function initQRCodeGenerator() {
    console.log('DOM chargé, initialisation du générateur de QR code');
    
    // Éléments DOM
    const urlInput = document.getElementById('url-input');
    const generateBtn = document.getElementById('generate-btn');
    const downloadBtn = document.getElementById('download-btn');
    const qrcodeContainer = document.getElementById('qrcode');
    const qrcodeWrapper = document.getElementById('qrcode-container');
    const errorMessage = document.getElementById('error-message');
    
    // Détection des changements de thème
    const prefersColorScheme = window.matchMedia('(prefers-color-scheme: dark)');
    let isDarkMode = prefersColorScheme.matches;
    
    // Ajouter un listener pour le changement de thème
    prefersColorScheme.addEventListener('change', (e) => {
        isDarkMode = e.matches;
        console.log(`Thème passé en mode ${isDarkMode ? 'sombre' : 'clair'}`);
        
        // Si un QR code est déjà affiché, s'assurer qu'il est toujours lisible
        if (qrcodeContainer.querySelector('canvas')) {
            refreshQRCodeBackground();
        }
    });
    
    // Fonction pour s'assurer que le QR code est toujours sur fond blanc
    function refreshQRCodeBackground() {
        const canvas = qrcodeContainer.querySelector('canvas');
        if (canvas) {
            canvas.style.backgroundColor = 'white';
            canvas.style.padding = '10px';
        }
    }
    
    // Vérifier si les éléments DOM existent
    if (!urlInput || !generateBtn || !downloadBtn || !qrcodeContainer) {
        console.error('Erreur: Un ou plusieurs éléments DOM n\'ont pas été trouvés.');
        if (!urlInput) console.error('Élément #url-input non trouvé');
        if (!generateBtn) console.error('Élément #generate-btn non trouvé');
        if (!downloadBtn) console.error('Élément #download-btn non trouvé');
        if (!qrcodeContainer) console.error('Élément #qrcode non trouvé');
        
        if (errorMessage) {
            errorMessage.textContent = 'Erreur: Certains éléments de la page n\'ont pas été trouvés. Veuillez rafraîchir la page.';
            errorMessage.style.display = 'block';
        } else {
            alert('Erreur: Certains éléments de la page n\'ont pas été trouvés. Veuillez rafraîchir la page.');
        }
        return;
    } else {
        console.log('Tous les éléments DOM ont été trouvés');
    }
    
    // Variables pour stocker les données du QR code et du logo
    let qrCodeInstance = null;
    let currentQRUrl = '';
    let currentLogo = null;

    // Fonction pour montrer un indicateur de chargement
    function showLoader() {
        qrcodeContainer.innerHTML = '';
        const loader = document.createElement('div');
        loader.className = 'qr-loader';
        loader.innerHTML = '<i class="fas fa-spinner fa-pulse"></i><span>Génération en cours...</span>';
        qrcodeContainer.appendChild(loader);
    }

    // Fonction pour détecter les bords de l'image avec une meilleure précision
    function detectImageBounds(ctx, width, height) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        let minX = width, minY = height, maxX = 0, maxY = 0;
        let hasContent = false;
        
        // Calculer l'histogramme de luminosité
        let histogram = new Array(256).fill(0);
        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            histogram[Math.floor(avg)]++;
        }
        
        // Trouver le seuil optimal (méthode d'Otsu)
        let totalPixels = (width * height);
        let sum = 0;
        for (let i = 0; i < 256; i++) {
            sum += i * histogram[i];
        }
        
        let sumB = 0;
        let wB = 0;
        let wF = 0;
        let maxVariance = 0;
        let threshold = 0;
        
        for (let t = 0; t < 256; t++) {
            wB += histogram[t];
            if (wB === 0) continue;
            wF = totalPixels - wB;
            if (wF === 0) break;
            
            sumB += t * histogram[t];
            let mB = sumB / wB;
            let mF = (sum - sumB) / wF;
            
            let variance = wB * wF * (mB - mF) * (mB - mF);
            if (variance > maxVariance) {
                maxVariance = variance;
                threshold = t;
            }
        }
        
        // Détecter les bords avec le seuil optimal
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const alpha = data[idx + 3];
                if (alpha === 0) continue; // Ignorer les pixels transparents
                
                const avg = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                if (avg < threshold) {
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                    hasContent = true;
                }
            }
        }
        
        if (!hasContent) {
            return { minX: 0, minY: 0, maxX: width, maxY: height };
        }
        
        // Calculer la marge dynamique basée sur la taille de l'image
        const marginPercent = 0.08; // 8% de marge
        const marginX = Math.max(width * marginPercent, 1);
        const marginY = Math.max(height * marginPercent, 1);
        
        // Appliquer les marges tout en respectant les limites de l'image
        minX = Math.max(0, minX - marginX);
        minY = Math.max(0, minY - marginY);
        maxX = Math.min(width, maxX + marginX);
        maxY = Math.min(height, maxY + marginY);
        
        return { minX, minY, maxX, maxY };
    }

    // Fonction pour optimiser le logo avec une meilleure qualité
    async function processLogo(imageFile) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // Calculer la taille optimale pour le traitement
                    const maxSize = 1000; // Taille maximale pour de bonnes performances
                    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
                    const targetWidth = Math.round(img.width * scale);
                    const targetHeight = Math.round(img.height * scale);
                    
                    // Créer un canvas temporaire pour le traitement initial
                    const tempCanvas = document.createElement('canvas');
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCanvas.width = targetWidth;
                    tempCanvas.height = targetHeight;
                    
                    // Activer l'anticrénelage pour une meilleure qualité
                    tempCtx.imageSmoothingEnabled = true;
                    tempCtx.imageSmoothingQuality = 'high';
                    
                    // Dessiner l'image originale avec la mise à l'échelle
                    tempCtx.drawImage(img, 0, 0, targetWidth, targetHeight);
                    
                    // Détecter les bords de l'image
                    const bounds = detectImageBounds(tempCtx, targetWidth, targetHeight);
                    
                    // Calculer les dimensions du logo recadré
                    const cropWidth = bounds.maxX - bounds.minX;
                    const cropHeight = bounds.maxY - bounds.minY;
                    
                    // Calculer la taille finale en maintenant un ratio carré
                    const finalSize = Math.max(cropWidth, cropHeight);
                    
                    // Créer le canvas final avec une résolution plus élevée
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = finalSize;
                    canvas.height = finalSize;
                    
                    // Activer l'anticrénelage pour le canvas final
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    
                    // Remplir le fond en transparent
                    ctx.clearRect(0, 0, finalSize, finalSize);
                    
                    // Calculer la position centrée pour l'image recadrée
                    const offsetX = (finalSize - cropWidth) / 2;
                    const offsetY = (finalSize - cropHeight) / 2;
                    
                    // Dessiner la partie recadrée de l'image avec une meilleure qualité
                    ctx.drawImage(
                        tempCanvas,
                        bounds.minX, bounds.minY, cropWidth, cropHeight,
                        offsetX, offsetY, cropWidth, cropHeight
                    );
                    
                    // Convertir le canvas en base64 avec une qualité maximale
                    resolve(canvas.toDataURL('image/png', 1.0));
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(imageFile);
        });
    }

    // Fonction pour appliquer le logo au QR code
    async function applyLogoToQRCode(qrCanvas, logoDataUrl) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = qrCanvas.width;
            canvas.height = qrCanvas.height;
            
            // Dessiner le QR code
            ctx.drawImage(qrCanvas, 0, 0);
            
            // Charger le logo
            const logo = new Image();
            logo.onload = () => {
                // Calculer la taille du logo (30% de la taille du QR code)
                const logoSize = Math.min(canvas.width, canvas.height) * 0.30;
                const padding = logoSize * 0.15; // Padding autour du logo (15%)
                const totalSize = logoSize + (padding * 2); // Taille totale avec le padding
                const logoX = (canvas.width - totalSize) / 2;
                const logoY = (canvas.height - totalSize) / 2;
                
                // Créer un fond blanc avec dégradé pour le logo
                const gradient = ctx.createRadialGradient(
                    logoX + totalSize/2,
                    logoY + totalSize/2,
                    logoSize/2 * 0.9, // Réduire légèrement le rayon intérieur
                    logoX + totalSize/2,
                    logoY + totalSize/2,
                    totalSize/2
                );
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
                gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0.95)');
                
                // Dessiner le cercle blanc avec dégradé
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(
                    logoX + totalSize/2,
                    logoY + totalSize/2,
                    totalSize/2,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
                
                // Dessiner le logo au centre avec le padding
                ctx.drawImage(
                    logo,
                    logoX + padding,
                    logoY + padding,
                    logoSize,
                    logoSize
                );
                
                resolve(canvas);
            };
            logo.src = logoDataUrl;
        });
    }

    // Fonction modifiée pour générer le QR code avec logo
    async function generateQRCode(text) {
        console.log(`Génération du QR code pour: ${text}`);
        
        // Montrer l'indicateur de chargement
        showLoader();
        
        // Ajouter un léger délai pour l'animation
        setTimeout(async () => {
            try {
                // Vider le conteneur avant de générer un nouveau QR code
                qrcodeContainer.innerHTML = '';
                
                // Ajouter une classe d'animation au conteneur
                qrcodeWrapper.classList.add('generating');

                // Si nous avons un logo, nous devons utiliser une approche différente
                if (currentLogo) {
                    // Créer un div temporaire pour le QR code
                    const tempDiv = document.createElement('div');
                    
                    // Générer le QR code dans le div temporaire
                    new QRCode(tempDiv, {
                        text: text,
                        width: 200,
                        height: 200,
                        colorDark: '#000000',
                        colorLight: '#ffffff',
                        correctLevel: QRCode.CorrectLevel ? QRCode.CorrectLevel.H : 0
                    });
                    
                    // Attendre que le QR code soit généré
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Récupérer le canvas du QR code
                    const canvas = tempDiv.querySelector('canvas');
                    
                    if (canvas) {
                        // Appliquer le logo au QR code
                        const finalCanvas = await applyLogoToQRCode(canvas, currentLogo);
                        qrcodeContainer.appendChild(finalCanvas);
                        qrCodeInstance = { _el: finalCanvas }; // Créer un objet compatible
                    }
                } else {
                    // Générer directement dans le conteneur si pas de logo
                    qrCodeInstance = new QRCode(qrcodeContainer, {
                        text: text,
                        width: 200,
                        height: 200,
                        colorDark: '#000000',
                        colorLight: '#ffffff',
                        correctLevel: QRCode.CorrectLevel ? QRCode.CorrectLevel.H : 0
                    });
                }
                
                // S'assurer que le QR code est sur fond blanc
                refreshQRCodeBackground();
                
                console.log('QR code généré avec succès');
                
                // Activer le bouton de téléchargement
                downloadBtn.disabled = false;
                
                // Stocker l'URL actuelle
                currentQRUrl = text;
                
                // Cacher le message d'erreur s'il était affiché
                if (errorMessage) {
                    errorMessage.style.display = 'none';
                }
                
                // Ajouter un label avec l'URL sous le QR code
                const urlDisplay = document.createElement('div');
                urlDisplay.className = 'qr-url-display';
                
                // Tronquer l'URL si elle est trop longue
                let displayUrl = text;
                if (displayUrl.length > 30) {
                    displayUrl = displayUrl.substring(0, 27) + '...';
                }
                
                urlDisplay.textContent = displayUrl;
                qrcodeContainer.appendChild(urlDisplay);
                
                // Retirer la classe d'animation après un court délai
                setTimeout(() => {
                    qrcodeWrapper.classList.remove('generating');
                }, 300);
                
            } catch (error) {
                console.error('Erreur lors de la génération du QR code:', error);
                if (errorMessage) {
                    errorMessage.textContent = `Erreur lors de la génération du QR code: ${error.message}`;
                    errorMessage.style.display = 'block';
                }
                
                // Retirer la classe d'animation
                qrcodeWrapper.classList.remove('generating');
            }
        }, 300);
    }

    // Événement de clic sur le bouton de génération
    generateBtn.addEventListener('click', () => {
        console.log('Bouton Générer cliqué');
        generateBtn.classList.add('btn-pulse');
        
        setTimeout(() => {
            generateBtn.classList.remove('btn-pulse');
        }, 300);
        
        const url = urlInput.value.trim();
        
        if (!url) {
            console.warn('Aucune URL ou texte saisi');
            if (errorMessage) {
                errorMessage.textContent = 'Veuillez entrer une URL ou un texte';
                errorMessage.style.display = 'block';
            } else {
                alert('Veuillez entrer une URL ou un texte');
            }
            return;
        }
        
        generateQRCode(url);
    });

    // Événement de pression de la touche Entrée dans le champ de texte
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            console.log('Touche Entrée pressée dans le champ de saisie');
            const url = urlInput.value.trim();
            
            if (!url) {
                console.warn('Aucune URL ou texte saisi');
                if (errorMessage) {
                    errorMessage.textContent = 'Veuillez entrer une URL ou un texte';
                    errorMessage.style.display = 'block';
                } else {
                    alert('Veuillez entrer une URL ou un texte');
                }
                return;
            }
            
            generateQRCode(url);
        }
    });

    // Événement pour mettre en surbrillance l'input au focus
    urlInput.addEventListener('focus', () => {
        urlInput.classList.add('input-focus');
    });

    urlInput.addEventListener('blur', () => {
        urlInput.classList.remove('input-focus');
    });

    // Événement de clic sur le bouton de téléchargement
    downloadBtn.addEventListener('click', () => {
        console.log('Bouton Télécharger cliqué');
        downloadBtn.classList.add('btn-pulse');
        
        setTimeout(() => {
            downloadBtn.classList.remove('btn-pulse');
        }, 300);
        
        if (!qrCodeInstance) {
            console.warn('Aucun QR code n\'a été généré');
            return;
        }
        
        try {
            // Récupérer l'image QR code
            const canvas = qrcodeContainer.querySelector('canvas');
            
            if (canvas) {
                console.log('Canvas du QR code trouvé, préparation du téléchargement');
                
                // Créer un lien de téléchargement
                const link = document.createElement('a');
                
                // Générer un nom de fichier basé sur l'URL et la date
                const date = new Date().toISOString().slice(0, 10);
                const urlPart = currentQRUrl.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
                const filename = `QRCode_${urlPart}_${date}.png`;
                
                // Définir l'URL et le nom du fichier
                link.href = canvas.toDataURL('image/png');
                link.download = filename;
                
                console.log(`Téléchargement du fichier: ${filename}`);
                
                // Déclencher le téléchargement
                link.click();
                
                // Afficher un message temporaire de succès
                const successMessage = document.createElement('div');
                successMessage.className = 'success-message';
                successMessage.textContent = 'QR Code téléchargé avec succès !';
                successMessage.style.position = 'fixed';
                successMessage.style.bottom = '20px';
                successMessage.style.left = '50%';
                successMessage.style.transform = 'translateX(-50%)';
                successMessage.style.padding = '10px 20px';
                successMessage.style.backgroundColor = 'rgba(46, 204, 113, 0.9)';
                successMessage.style.color = 'white';
                successMessage.style.borderRadius = '5px';
                successMessage.style.zIndex = '1000';
                document.body.appendChild(successMessage);
                
                // Supprimer le message après 3 secondes
                setTimeout(() => {
                    document.body.removeChild(successMessage);
                }, 3000);
                
            } else {
                console.error('Canvas du QR code non trouvé');
                if (errorMessage) {
                    errorMessage.textContent = 'Erreur: Impossible de trouver l\'image du QR code pour le téléchargement.';
                    errorMessage.style.display = 'block';
                } else {
                    alert('Erreur: Impossible de trouver l\'image du QR code pour le téléchargement.');
                }
            }
        } catch (error) {
            console.error('Erreur lors du téléchargement du QR code:', error);
            if (errorMessage) {
                errorMessage.textContent = `Erreur lors du téléchargement du QR code: ${error.message}`;
                errorMessage.style.display = 'block';
            } else {
                alert(`Erreur lors du téléchargement du QR code: ${error.message}`);
            }
        }
    });

    console.log('Initialisation du générateur de QR code terminée');
    
    // Réactiver tous les éléments d'interface
    urlInput.disabled = false;
    generateBtn.disabled = false;
    
    // Mettre le focus sur l'input
    urlInput.focus();

    // Gérer le changement de logo
    const logoInput = document.getElementById('logo-input');
    if (logoInput) {
        logoInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    // Traiter le logo sans conversion en noir et blanc
                    currentLogo = await processLogo(file);
                    
                    // Si un QR code est déjà généré, le regénérer avec le nouveau logo
                    if (currentQRUrl) {
                        generateQRCode(currentQRUrl);
                    }
                } catch (error) {
                    console.error('Erreur lors du traitement du logo:', error);
                    if (errorMessage) {
                        errorMessage.textContent = 'Erreur lors du traitement du logo';
                        errorMessage.style.display = 'block';
                    }
                }
            }
        });
    }
}

// Attendre que le DOM et QRCode soient chargés
window.addEventListener('load', function() {
    console.log('Page chargée, vérification de QRCode');
    
    // Vérifier si QRCode est déjà chargé
    if (typeof QRCode !== 'undefined') {
        console.log('QRCode est déjà chargé');
        initQRCodeGenerator();
        return;
    }
    
    // Sinon, attendre un peu et réessayer
    setTimeout(function() {
        if (typeof QRCode !== 'undefined') {
            console.log('QRCode chargé après délai');
            initQRCodeGenerator();
        } else {
            console.error('QRCode n\'a pas pu être chargé');
            const errorMessage = document.getElementById('error-message');
            if (errorMessage) {
                errorMessage.textContent = 'Erreur: La bibliothèque QRCode n\'a pas pu être chargée. Veuillez rafraîchir la page.';
                errorMessage.style.display = 'block';
            }
        }
    }, 1500); // Attendre 1.5 secondes
}); 