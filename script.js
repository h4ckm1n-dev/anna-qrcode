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
    
    // Variables pour stocker les données du QR code
    let qrCodeInstance = null;
    let currentQRUrl = '';

    // Fonction pour montrer un indicateur de chargement
    function showLoader() {
        qrcodeContainer.innerHTML = '';
        const loader = document.createElement('div');
        loader.className = 'qr-loader';
        loader.innerHTML = '<i class="fas fa-spinner fa-pulse"></i><span>Génération en cours...</span>';
        qrcodeContainer.appendChild(loader);
    }

    // Fonction pour générer le QR code
    function generateQRCode(text) {
        console.log(`Génération du QR code pour: ${text}`);
        
        // Montrer l'indicateur de chargement
        showLoader();
        
        // Ajouter un léger délai pour l'animation
        setTimeout(() => {
            try {
                // Vider le conteneur avant de générer un nouveau QR code
                qrcodeContainer.innerHTML = '';
                
                // Ajouter une classe d'animation au conteneur
                qrcodeWrapper.classList.add('generating');
                
                // Vérifier la structure de l'objet QRCode
                console.log('Structure de QRCode:', QRCode);
                if (typeof QRCode.CorrectLevel === 'undefined') {
                    console.warn('QRCode.CorrectLevel n\'est pas défini, utilisation des options de base');
                    
                    // Version simplifiée sans le correctLevel
                    qrCodeInstance = new QRCode(qrcodeContainer, {
                        text: text,
                        width: 200,
                        height: 200,
                        colorDark: '#000000',
                        colorLight: '#ffffff'
                    });
                } else {
                    // Version complète avec correctLevel
                    qrCodeInstance = new QRCode(qrcodeContainer, {
                        text: text,
                        width: 200,
                        height: 200,
                        colorDark: '#000000',
                        colorLight: '#ffffff',
                        correctLevel: QRCode.CorrectLevel.H
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
                } else {
                    alert(`Erreur lors de la génération du QR code: ${error.message}`);
                }
                
                // Retirer la classe d'animation
                qrcodeWrapper.classList.remove('generating');
            }
        }, 300); // Délai artificiel pour une meilleure UX
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
                
                // Générer un nom de fichier basé sur l'URL
                const filename = 'qrcode-' + currentQRUrl.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 15) + '.png';
                
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
}

// Fonction pour vérifier si QRCode est chargé
function checkQRCodeLoaded() {
    if (typeof QRCode !== 'undefined') {
        console.log('QRCode est chargé, initialisation de l\'application');
        initQRCodeGenerator();
        return true;
    }
    return false;
}

// Essayer d'initialiser au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('Chargement du DOM terminé, vérification de QRCode');
    
    // Désactiver les éléments d'interface jusqu'à ce que QRCode soit chargé
    const urlInput = document.getElementById('url-input');
    const generateBtn = document.getElementById('generate-btn');
    if (urlInput) urlInput.disabled = true;
    if (generateBtn) generateBtn.disabled = true;
    
    // Essayer immédiatement
    if (checkQRCodeLoaded()) return;
    
    // Sinon, vérifier périodiquement
    let attempts = 0;
    const maxAttempts = 10;
    const interval = setInterval(() => {
        attempts++;
        console.log(`Tentative ${attempts}/${maxAttempts} de vérification de QRCode`);
        
        if (checkQRCodeLoaded() || attempts >= maxAttempts) {
            clearInterval(interval);
            
            if (attempts >= maxAttempts && typeof QRCode === 'undefined') {
                console.error('Échec du chargement de QRCode après plusieurs tentatives');
                const errorMessage = document.getElementById('error-message');
                if (errorMessage) {
                    errorMessage.textContent = 'Impossible de charger la bibliothèque QRCode. Veuillez rafraîchir la page ou vérifier votre connexion Internet.';
                    errorMessage.style.display = 'block';
                } else {
                    alert('Impossible de charger la bibliothèque QRCode. Veuillez rafraîchir la page ou vérifier votre connexion Internet.');
                }
            }
        }
    }, 1000); // Vérifier toutes les secondes
});