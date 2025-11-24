// src/assets/js/renderer.js

document.addEventListener('DOMContentLoaded', () => {

    // --- SÉLECTION DES ÉLÉMENTS DU DOM ---
    const browseBtn = document.getElementById('browse-folder-btn');
    const folderDisplay = document.getElementById('source-folder-display'); 
    const folderPathInput = document.getElementById('source-folder-path'); 
    const schoolNameInput = document.getElementById('school-name');
    const createSchoolForm = document.getElementById('create-school-form');
    const schoolListDiv = document.querySelector('.school-list');

    // --- FONCTIONS ---

    /**
     * Ajoute une école à la liste visible des écoles existantes.
     * @param {Object} school - L'objet école avec les propriétés id et name.
     */
    function addSchoolToList(school) {
        const placeholder = schoolListDiv.querySelector('.school-item-placeholder');
        if (placeholder) schoolListDiv.innerHTML = '';

        const schoolDiv = document.createElement('div');
        schoolDiv.className = 'school-item';
        schoolDiv.dataset.schoolId = school.id;

        // 1. Le nom
        const nameSpan = document.createElement('span');
        nameSpan.textContent = school.name;
        schoolDiv.appendChild(nameSpan);

        // 2. Conteneur des actions
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'school-actions';

        // A. Bouton Config
        const configBtn = document.createElement('button');
        configBtn.className = 'btn-school-config';
        configBtn.innerHTML = '⚙️ Configurer';
        configBtn.title = "Modifier les prix et produits";
        configBtn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            window.api.navigateToSchoolConfig(school.id);
        });
        actionsDiv.appendChild(configBtn);

        // B. Bouton Supprimer (Ton SVG)
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-danger';
        deleteBtn.title = "Supprimer l'école";
        deleteBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M18 6L17.1991 18.0129C17.129 19.065 17.0939 19.5911 16.8667 19.99C16.6666 20.3412 16.3648 20.6235 16.0011 20.7998C15.588 21 15.0607 21 14.0062 21H9.99377C8.93927 21 8.41202 21 7.99889 20.7998C7.63517 20.6235 7.33339 20.3412 7.13332 19.99C6.90607 19.5911 6.871 19.065 6.80086 18.0129L6 6M4 6H20M16 6L15.7294 5.18807C15.4671 4.40125 15.3359 4.00784 15.0927 3.71698C14.8779 3.46013 14.6021 3.26132 14.2905 3.13878C13.9376 3 13.523 3 12.6936 3H11.3064C10.477 3 10.0624 3 9.70951 3.13878C9.39792 3.26132 9.12208 3.46013 8.90729 3.71698C8.66405 4.00784 8.53292 4.40125 8.27064 5.18807L8 6M14 10V17M10 10V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>`;
        
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const confirmDelete = confirm(`Êtes-vous sûr de vouloir supprimer l'école "${school.name}" ?\n\nCette action est irréversible et supprimera toutes les commandes associées.`);
            if (confirmDelete) {
                const result = await window.api.deleteSchool(school.id);
                if (result.success) {
                    loadSchools(); // Recharger la liste
                } else {
                    alert("Erreur lors de la suppression : " + result.error);
                }
            }
        });
        actionsDiv.appendChild(deleteBtn);

        schoolDiv.appendChild(actionsDiv);
        schoolListDiv.appendChild(schoolDiv);
    }

    /**
     * Charge toutes les écoles existantes depuis la base de données et les affiche.
     */
    async function loadSchools() {
        const result = await window.api.getSchools();
        if (result.success && result.schools.length > 0) {
            schoolListDiv.innerHTML = '';
            result.schools.forEach(addSchoolToList);
        } else if (result.success) {
            schoolListDiv.innerHTML = '<div class="school-item-placeholder">Aucune école créée pour le moment.</div>';
        } else {
            schoolListDiv.innerHTML = '<div class="school-item-placeholder" style="color: red;">Erreur lors du chargement des écoles.</div>';
            alert(`Erreur de chargement: ${result.error}`);
        }
    }

    // --- ÉCOUTEURS D'ÉVÉNEMENTS ---

    // Gère le clic sur le bouton "Parcourir"
    browseBtn.addEventListener('click', async () => {
        const folderPath = await window.api.selectFolder();
        if (folderPath) {
            folderDisplay.value = folderPath; 
            folderPathInput.value = folderPath; 
            
            const pathParts = folderPath.replace(/\\/g, '/').split('/');
            const folderName = pathParts.pop() || ''; 
            if (!schoolNameInput.value) {
                schoolNameInput.value = folderName;
            }
        }
    });

    // Gère la soumission du formulaire de création d'école
    createSchoolForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const name = schoolNameInput.value;
        const sourceFolderPath = folderPathInput.value;

        // Note : La création gère désormais le catalogue par défaut via main.js/handleCreateSchool
        // On passe juste les infos de base
        
        if (!name || !sourceFolderPath) {
            alert('Veuillez renseigner le nom de l\'école et choisir un dossier source.');
            return;
        }
        
        const schoolData = { name, sourceFolderPath }; // Plus besoin de passer 'products' ici

        // UI Progression
        createSchoolForm.style.display = 'none';
        const progressSection = document.createElement('div');
        progressSection.innerHTML = `
            <h3>Génération des vignettes...</h3>
            <p>Optimisation des photos pour une interface plus rapide. Veuillez patienter.</p>
            <progress id="thumbnail-progress-bar" value="0" max="100"></progress>
            <p id="thumbnail-progress-text">0 / 0</p>
        `;
        createSchoolForm.parentNode.appendChild(progressSection);
        
        const result = await window.api.createSchool(schoolData);

        if (result.success) {
            // Redirection directe vers la configuration
            window.api.navigateToSchoolConfig(result.school.id);
        } else {
            alert(`Une erreur est survenue lors de la création de l'école : ${result.error}`);
            createSchoolForm.style.display = 'block';
            progressSection.remove();
        }
    });

    // Gère les clics sur la liste des écoles (Navigation vers l'école)
    schoolListDiv.addEventListener('click', (event) => {
        // Si on clique sur le bouton config, l'event.stopPropagation() du bouton empêche d'arriver ici.
        // Donc ici, on gère uniquement l'ouverture de l'école.
        
        const schoolItem = event.target.closest('.school-item');
        if (schoolItem) {
            const schoolId = schoolItem.dataset.schoolId;
            if (schoolId) {
                window.api.navigateToSchool(schoolId);
            }
        }
    });


    // --- GESTION DE LA PROGRESSION DES VIGNETTES ---

    window.api.onThumbnailProgress(({ processed, total }) => {
        const progressBar = document.getElementById('thumbnail-progress-bar');
        const progressText = document.getElementById('thumbnail-progress-text');
        if (progressBar && progressText) {
            progressBar.value = processed;
            progressBar.max = total;
            progressText.textContent = `${processed} / ${total} photos optimisées`;
        }
    });

    window.api.onThumbnailComplete(() => {
        alert("Optimisation des photos terminée !");
        window.api.navigate('index');
    });

    window.api.onThumbnailError(({ message }) => {
        alert(`Une erreur critique est survenue pendant l'optimisation des photos :\n${message}`);
        window.api.navigate('index');
    });


    // --- INITIALISATION DE LA PAGE ---
    loadSchools();

});