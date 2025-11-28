document.addEventListener('DOMContentLoaded', () => {
    const navLinkIndex = document.getElementById('nav-link-index');
    const navLinkGenerate = document.getElementById('nav-link-generate');

    // --- 1. LOGIQUE DE NAVIGATION (Clics) ---

    if (navLinkIndex) {
        navLinkIndex.addEventListener('click', (e) => {
            e.preventDefault();
            window.api.navigate('index');
        });
    }

    if (navLinkGenerate) {
        navLinkGenerate.addEventListener('click', (e) => {
            e.preventDefault();
            window.api.navigate('generate-bdc');
        });
    }

    // --- 2. LOGIQUE D'ACTIVATION VISUELLE ---
    
    // On retire la classe active de tous les liens par sécurité
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    const pageTitle = document.title.toLowerCase();

    // Détection basée sur le titre de la page
    if (pageTitle.includes('générateur') || pageTitle.includes('modèles')) {
        // On est dans le module Générateur ou Éditeur
        if (navLinkGenerate) navLinkGenerate.parentElement.classList.add('active');
    } else {
        // Par défaut, ou si on est sur Accueil / École / Config
        // On considère qu'on est dans le module de Gestion
        if (navLinkIndex) navLinkIndex.parentElement.classList.add('active');
    }
})