// Variables globales
let qrCodeInstance = null;
let currentQRUrl = '';
let currentLogo = null;

// Fonction pour configurer les écouteurs d'événements des options
function setupOptionListeners() {
    ['qr-color', 'qr-bg-color'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', () => {
                if (currentQRUrl) {
                    generateQRCode(currentQRUrl);
                }
            });
        }
    });
}

// Fonction d'initialisation qui sera appelée une fois que QRCode est chargé
function initQRCodeGenerator() {
    console.log('[DEBUG] Début de l\'initialisation');
    
    // Éléments DOM
    const urlInput = document.getElementById('url-input');
    const generateBtn = document.getElementById('generate-btn');
    const downloadBtn = document.getElementById('download-btn');
    const qrcodeContainer = document.getElementById('qrcode');
    const errorMessage = document.getElementById('error-message');
    
    console.log('[DEBUG] Éléments DOM récupérés');
    
    // Vérifier si les éléments DOM existent
    if (!urlInput || !generateBtn || !downloadBtn || !qrcodeContainer) {
        console.error('[DEBUG] Éléments manquants');
        if (errorMessage) {
            errorMessage.textContent = 'Erreur: Certains éléments de la page n\'ont pas été trouvés. Veuillez rafraîchir la page.';
            errorMessage.style.display = 'block';
        }
        return;
    }
    
    // Initialiser les écouteurs d'événements pour les options
    setupOptionListeners();
    
    // Événement de clic sur le bouton de génération
    generateBtn.addEventListener('click', () => {
        console.log('[DEBUG] Clic sur le bouton Générer');
        generateBtn.classList.add('btn-pulse');
        
        setTimeout(() => {
            generateBtn.classList.remove('btn-pulse');
        }, 300);
        
        const url = urlInput.value.trim();
        console.log('[DEBUG] URL à générer:', url);
        
        if (!url) {
            console.warn('[DEBUG] URL vide');
            if (errorMessage) {
                errorMessage.textContent = 'Veuillez entrer une URL ou un texte';
                errorMessage.style.display = 'block';
            }
            return;
        }
        
        generateQRCode(url);
    });
    
    // Événement de pression de la touche Entrée dans le champ de texte
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const url = urlInput.value.trim();
            if (!url) {
                if (errorMessage) {
                    errorMessage.textContent = 'Veuillez entrer une URL ou un texte';
                    errorMessage.style.display = 'block';
                }
                return;
            }
            generateQRCode(url);
        }
    });
    
    // Réactiver les éléments d'interface
    urlInput.disabled = false;
    generateBtn.disabled = false;
    
    // Mettre le focus sur l'input
    urlInput.focus();
    
    console.log('[DEBUG] Initialisation terminée');
}

// Fonction pour afficher/masquer les options du logo
function toggleLogoOptions(show) {
    const removeLogoBtn = document.getElementById('remove-logo');
    if (removeLogoBtn) {
        removeLogoBtn.style.display = show ? 'block' : 'none';
    }
}

// Fonction pour afficher le spinner de chargement
function toggleLoadingSpinner(show) {
    const loadingOverlay = document.querySelector('.loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
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

// Fonction modifiée pour appliquer le logo au QR code
async function applyLogoToQRCode(qrCanvas, logoData) {
    console.log('[DEBUG] Début de l\'application du logo au QR code');
    
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Définir la taille du canvas final
        canvas.width = qrCanvas.width;
        canvas.height = qrCanvas.height;
        
        // Dessiner le QR code
        ctx.drawImage(qrCanvas, 0, 0);
        
        // Charger le logo
        const logo = new Image();
        logo.onload = () => {
            console.log('[DEBUG] Logo chargé, application au QR code');
            
            // Calculer la taille du logo (utiliser une taille fixe optimale)
            const size = Math.min(canvas.width, canvas.height);
            // Utiliser 35% comme taille optimale pour le cercle
            const circleRadius = size * 0.175;
            console.log('[DEBUG] Rayon du cercle calculé:', circleRadius);
            
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            
            // Dessiner le fond du cercle en blanc
            ctx.save();
            ctx.beginPath();
            ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            
            // Dessiner une double bordure blanche
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = circleRadius * 0.1;
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, circleRadius * 1.1, 0, Math.PI * 2);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = circleRadius * 0.05;
            ctx.stroke();
            
            // Dessiner le logo
            ctx.beginPath();
            ctx.arc(centerX, centerY, circleRadius * 0.85, 0, Math.PI * 2);
            ctx.clip();
            
            const logoSize = circleRadius * 1.7; // Taille du logo légèrement plus grande que le cercle interne
            const logoX = centerX - (logoSize / 2);
            const logoY = centerY - (logoSize / 2);
            
            ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
            ctx.restore();
            
            console.log('[DEBUG] Logo appliqué avec succès');
            resolve(canvas);
        };
        logo.onerror = (error) => {
            console.error('[DEBUG] Erreur lors du chargement du logo:', error);
            resolve(qrCanvas);
        };
        logo.src = logoData;
    });
}

// Fonction pour supprimer le logo
function removeLogo() {
    currentLogo = null;
    toggleLogoOptions(false);
    
    // Réinitialiser l'input file
    const logoInput = document.getElementById('logo-input');
    if (logoInput) {
        logoInput.value = '';
    }
    
    // Masquer la prévisualisation du logo
    const logoPreviewContainer = document.querySelector('.logo-preview-container');
    if (logoPreviewContainer) {
        logoPreviewContainer.style.display = 'none';
    }
    
    // Régénérer le QR code sans logo si une URL existe
    if (currentQRUrl) {
        generateQRCode(currentQRUrl);
    }
}

// Modification de la fonction handleLogoFile
async function handleLogoFile(file) {
    console.log('[DEBUG] Début du traitement du logo');
    const previewContainer = document.querySelector('.logo-preview-container');
    const previewImage = previewContainer.querySelector('.logo-preview');
    
    toggleLoadingSpinner(true);
    
    try {
        // Traiter le logo
        const processedLogo = await processLogo(file);
        console.log('[DEBUG] Logo traité avec succès');
        
        // Mettre à jour la prévisualisation
        previewImage.src = processedLogo;
        previewContainer.style.display = 'block';
        
        // Stocker le logo traité
        currentLogo = processedLogo;
        console.log('[DEBUG] Logo stocké dans currentLogo');
        
        // Afficher les options du logo
        toggleLogoOptions(true);
        
        // Régénérer le QR code avec le logo si une URL existe
        if (currentQRUrl) {
            console.log('[DEBUG] Régénération du QR code avec le logo');
            generateQRCode(currentQRUrl);
        }
    } catch (error) {
        console.error('[DEBUG] Erreur lors du traitement du logo:', error);
        const errorMessage = document.getElementById('error-message');
        if (errorMessage) {
            errorMessage.textContent = 'Erreur lors du traitement du logo. Veuillez réessayer.';
            errorMessage.style.display = 'block';
        }
    } finally {
        toggleLoadingSpinner(false);
    }
}

// Fonction pour télécharger le QR code
async function downloadQRCode() {
    console.log('[DEBUG] Début du téléchargement du QR code');
    
    let canvas;
    if (currentLogo) {
        // Si nous avons un logo, utiliser le canvas avec le logo appliqué
        const qrCanvas = document.querySelector('#qrcode canvas');
        if (!qrCanvas) return;
        
        canvas = await applyLogoToQRCode(qrCanvas, currentLogo);
    } else {
        // Si pas de logo, utiliser le canvas du QR code directement
        canvas = document.querySelector('#qrcode canvas');
        if (!canvas) return;
    }
    
    // Créer un lien temporaire
    const link = document.createElement('a');
    link.download = 'qrcode.png';
    link.href = canvas.toDataURL('image/png', 1.0);
    
    // Simuler un clic sur le lien
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Fonction pour générer le QR code
function generateQRCode(url) {
    console.log('[DEBUG] Début de la génération du QR code pour:', url);
    
    const qrcodeContainer = document.getElementById('qrcode');
    const qrcodeWrapper = document.getElementById('qrcode-container');
    const downloadBtn = document.getElementById('download-btn');
    const errorMessage = document.getElementById('error-message');
    
    console.log('[DEBUG] Éléments DOM récupérés');
    
    // Nettoyer le conteneur
    qrcodeContainer.innerHTML = '';
    currentQRUrl = url;
    
    // Ajouter la classe d'animation
    qrcodeWrapper.classList.add('generating');
    
    try {
        // Créer le QR code avec les options personnalisées
        const options = {
            text: url,
            width: 500, // Utiliser toujours la taille maximale
            height: 500, // Utiliser toujours la taille maximale
            colorDark: document.getElementById('qr-color')?.value || '#000000',
            colorLight: document.getElementById('qr-bg-color')?.value || '#ffffff',
            correctLevel: QRCode.CorrectLevel.H, // Toujours utiliser le niveau maximal
        };
        
        console.log('[DEBUG] Options du QR code:', options);
        
        // Créer une nouvelle instance de QRCode
        if (qrCodeInstance) {
            qrCodeInstance.clear();
        }
        
        qrCodeInstance = new QRCode(qrcodeContainer, options);
        
        // Si nous avons un logo, l'appliquer après un court délai
        if (currentLogo) {
            setTimeout(async () => {
                try {
                    const canvas = qrcodeContainer.querySelector('canvas');
                    if (canvas) {
                        const finalCanvas = await applyLogoToQRCode(canvas, currentLogo);
                        qrcodeContainer.innerHTML = '';
                        qrcodeContainer.appendChild(finalCanvas);
                    }
                } catch (error) {
                    console.error('[DEBUG] Erreur lors de l\'application du logo:', error);
                }
            }, 100);
        }
        
        // Activer le bouton de téléchargement
        downloadBtn.disabled = false;
        
        // Ajouter un label avec l'URL sous le QR code
        const urlDisplay = document.createElement('div');
        urlDisplay.className = 'qr-url-display';
        
        let displayUrl = url;
        if (displayUrl.length > 30) {
            displayUrl = displayUrl.substring(0, 27) + '...';
        }
        
        urlDisplay.textContent = displayUrl;
        qrcodeContainer.appendChild(urlDisplay);
        
        if (errorMessage) {
            errorMessage.style.display = 'none';
        }
        
    } catch (error) {
        console.error('[DEBUG] Erreur lors de la génération du QR code:', error);
        if (errorMessage) {
            errorMessage.textContent = `Erreur lors de la génération du QR code: ${error.message}`;
            errorMessage.style.display = 'block';
        }
    }
    
    setTimeout(() => {
        qrcodeWrapper.classList.remove('generating');
    }, 500);
}

// Fonction pour la prévisualisation du logo
function setupLogoPreview() {
    const logoInput = document.getElementById('logo-input');
    const previewContainer = document.createElement('div');
    previewContainer.className = 'logo-preview-container';
    previewContainer.style.display = 'none';
    
    const previewImage = document.createElement('img');
    previewImage.className = 'logo-preview';
    previewContainer.appendChild(previewImage);
    
    logoInput.parentElement.appendChild(previewContainer);
    
    // Gestionnaire pour le drag & drop
    const dropZone = document.querySelector('.file-input-wrapper');
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            logoInput.files = e.dataTransfer.files;
            handleLogoFile(file);
        }
    });
    
    // Gestionnaire pour l'input file classique
    logoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleLogoFile(file);
        }
    });
}

// Fonction pour compresser l'image
async function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calculer les dimensions optimales
                let width = img.width;
                let height = img.height;
                const MAX_SIZE = 200;
                
                if (width > MAX_SIZE || height > MAX_SIZE) {
                    if (width > height) {
                        height = (height / width) * MAX_SIZE;
                        width = MAX_SIZE;
                    } else {
                        width = (width / height) * MAX_SIZE;
                        height = MAX_SIZE;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob(blob => {
                    resolve(new File([blob], file.name, {
                        type: 'image/png',
                        lastModified: Date.now()
                    }));
                }, 'image/png', 0.8);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// Ajouter les styles CSS nécessaires
const style = document.createElement('style');
style.textContent = `
    .logo-preview-container {
        margin-top: 15px;
        text-align: center;
        max-width: 150px;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .logo-preview {
        max-width: 100%;
        height: auto;
        display: block;
    }
    
    .file-input-wrapper.drag-over {
        border-color: var(--primary-color);
        background-color: var(--input-focus-glow);
    }
    
    .file-input-wrapper {
        position: relative;
    }
    
    .file-input-wrapper::after {
        content: "ou glissez une image ici";
        position: absolute;
        bottom: -25px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 0.85rem;
        color: var(--text-muted);
    }
`;

document.head.appendChild(style);

// Initialiser l'application au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    console.log('Page chargée, vérification de QRCode');
    
    // Vérifier si QRCode est déjà chargé
    if (typeof QRCode !== 'undefined') {
        console.log('QRCode est déjà chargé');
        initQRCodeGenerator();
        setupLogoPreview();
    } else {
        console.log('En attente du chargement de QRCode...');
        // Attendre que QRCode soit chargé
        const checkQRCode = setInterval(() => {
            if (typeof QRCode !== 'undefined') {
                console.log('QRCode est maintenant chargé');
                clearInterval(checkQRCode);
                initQRCodeGenerator();
                setupLogoPreview();
            }
        }, 100);
        
        // Arrêter la vérification après 5 secondes
        setTimeout(() => {
            clearInterval(checkQRCode);
            if (typeof QRCode === 'undefined') {
                console.error('Impossible de charger QRCode après 5 secondes');
                const errorMessage = document.getElementById('error-message');
                if (errorMessage) {
                    errorMessage.textContent = 'Erreur: Impossible de charger la bibliothèque QRCode. Veuillez rafraîchir la page.';
                    errorMessage.style.display = 'block';
                }
            }
        }, 5000);
    }
    
    // Ajouter le gestionnaire d'événements pour le bouton de téléchargement
    const downloadBtn = document.getElementById('download-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadQRCode);
    }

    // Événement pour le bouton de suppression du logo
    const removeLogoBtn = document.getElementById('remove-logo');
    if (removeLogoBtn) {
        removeLogoBtn.addEventListener('click', removeLogo);
    }
}); 