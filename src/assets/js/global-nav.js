document.addEventListener('DOMContentLoaded', () => {
    const navLinkIndex = document.getElementById('nav-link-index');
    // NOUVEAU
    const navLinkGenerate = document.getElementById('nav-link-generate');

    if (navLinkIndex) {
        navLinkIndex.addEventListener('click', (e) => {
            e.preventDefault();
            window.api.navigate('index');
        });
    }

    // NOUVEAU
    if (navLinkGenerate) {
        navLinkGenerate.addEventListener('click', (e) => {
            e.preventDefault();
            window.api.navigate('generate-bdc');
        });
    }
});