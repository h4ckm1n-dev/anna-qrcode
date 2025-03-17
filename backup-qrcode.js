/**
 * Solution de secours minimale pour QRCode.js
 * Utilisé uniquement si toutes les autres sources ont échoué
 */

// Définir l'objet QRCode s'il n'existe pas déjà
if (typeof QRCode === 'undefined') {
    console.log('Utilisation de la version de secours de QRCode');
    
    // Définir un objet QRCode minimal
    window.QRCode = function(element, options) {
        if (!element) {
            throw new Error('Élément DOM non spécifié');
        }
        
        if (!options || !options.text) {
            throw new Error('Texte du QR code non spécifié');
        }
        
        // Valeurs par défaut
        this.options = {
            text: options.text || '',
            width: options.width || 256,
            height: options.height || 256,
            colorDark: options.colorDark || '#000000',
            colorLight: options.colorLight || '#ffffff'
        };
        
        // Simuler la création d'un QR code avec une image placeholder
        this.createFallbackImage(element);
    };
    
    // Méthode pour créer une image de substitution
    QRCode.prototype.createFallbackImage = function(element) {
        // Nettoyer l'élément
        element.innerHTML = '';
        
        // Créer un élément canvas
        var canvas = document.createElement('canvas');
        canvas.width = this.options.width;
        canvas.height = this.options.height;
        
        // Ajouter le canvas à l'élément
        element.appendChild(canvas);
        
        // Dessiner un QR code simplifié (juste un carré avec le texte)
        var ctx = canvas.getContext('2d');
        
        // Fond blanc
        ctx.fillStyle = this.options.colorLight;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Cadre noir
        ctx.fillStyle = this.options.colorDark;
        ctx.fillRect(10, 10, canvas.width - 20, canvas.height - 20);
        
        // Zone centrale blanche
        ctx.fillStyle = this.options.colorLight;
        ctx.fillRect(40, 40, canvas.width - 80, canvas.height - 80);
        
        // Texte
        ctx.fillStyle = this.options.colorDark;
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Afficher un message indiquant que c'est une solution de secours
        ctx.fillText('Version de secours', canvas.width / 2, canvas.height / 2 - 20);
        
        // Afficher une partie du texte encodé (limité à 20 caractères)
        var displayText = this.options.text;
        if (displayText.length > 20) {
            displayText = displayText.substring(0, 17) + '...';
        }
        ctx.fillText(displayText, canvas.width / 2, canvas.height / 2 + 20);
    };
    
    // Ajouter l'objet CorrectLevel pour compatibilité
    QRCode.CorrectLevel = {
        L: 1,
        M: 0,
        Q: 3,
        H: 2
    };
    
    console.log('Version de secours de QRCode chargée avec succès');
}