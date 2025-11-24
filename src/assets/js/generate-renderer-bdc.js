// src/assets/js/generate-renderer-bdc.js

// --- SÉLECTION DES ÉLÉMENTS ---
const btnOutputFolder = document.getElementById('btn-output-folder');
const inputOutputFolder = document.getElementById('global-output-folder');
const generatorForm = document.getElementById('generator-form');
const logsDiv = document.getElementById('generation-logs');
const startBtn = document.getElementById('btn-start-generation');
const tasksContainer = document.getElementById('tasks-container');
const btnAddTask = document.getElementById('btn-add-task');
const emptyMsg = document.getElementById('empty-tasks-msg');
const taskTemplate = document.getElementById('task-row-template');
const btnEditTemplates = document.getElementById('btn-edit-templates');

// Cache pour les templates chargés
let availableTemplates = {};

// --- CHARGEMENT INITIAL ---
async function init() {
    // 1. Charger les templates depuis le backend
    try {
        availableTemplates = await window.api.getTemplates();
    } catch (e) {
        console.error("Erreur chargement templates:", e);
        availableTemplates = { 'default': { label: 'Défaut (Erreur chargement)' } };
    }

    // 2. Ajouter une première tâche vide pour commencer
    addTask();
}

// --- NAVIGATION VERS ÉDITEUR ---
if (btnEditTemplates) {
    btnEditTemplates.addEventListener('click', () => {
        window.api.navigate('template-editor-bdc');
    });
}

// --- GESTION DOSSIER SORTIE (GLOBAL) ---
btnOutputFolder.addEventListener('click', async () => {
    const path = await window.api.selectFolder();
    if (path) inputOutputFolder.value = path;
});

// --- GESTION DES TÂCHES DYNAMIQUES ---

function updateEmptyMsg() {
    if (tasksContainer.children.length === 0) {
        emptyMsg.style.display = 'block';
    } else {
        emptyMsg.style.display = 'none';
    }
}

function addTask() {
    // Clonage du template HTML
    const clone = taskTemplate.content.cloneNode(true);
    const row = clone.querySelector('.task-row');
    
    // Sélecteurs internes à la ligne
    const btnPhoto = row.querySelector('.task-photo-btn');
    const inputPhoto = row.querySelector('.task-photo-input');
    const btnTemplate = row.querySelector('.task-template-btn');
    const inputTemplate = row.querySelector('.task-template-input');
    const btnRemove = row.querySelector('.btn-remove-task');
    const selectType = row.querySelector('.task-type-select');
    const subfoldersContainer = row.querySelector('.subfolders-list');

    // 1. Remplissage dynamique du Select des modèles
    selectType.innerHTML = ''; 
    Object.keys(availableTemplates).forEach(key => {
        const tpl = availableTemplates[key];
        const option = document.createElement('option');
        option.value = key;
        option.textContent = tpl.label || key;
        selectType.appendChild(option);
    });

    // 2. Choisir dossier photo + SCAN SOUS-DOSSIERS
    btnPhoto.addEventListener('click', async () => {
        const path = await window.api.selectFolder();
        if (path) {
            inputPhoto.value = path;
            
            // Appel au backend pour lister les sous-dossiers
            const result = await window.api.listSubfolders(path);
            
            if (result.success && result.folders.length > 0) {
                // Affichage de la zone de sélection
                subfoldersContainer.style.display = 'block';
                subfoldersContainer.innerHTML = `
                    <div style="margin-bottom:5px; border-bottom:1px solid #eee; padding-bottom:5px;">
                        <label style="font-weight:bold; font-size:0.85rem; cursor:pointer; display:flex; align-items:center; gap:5px;">
                            <input type="checkbox" class="check-all" checked> Tout cocher / décocher
                        </label>
                    </div>
                `;
                
                // Ajout des cases à cocher
                result.folders.forEach(folder => {
                    const div = document.createElement('div');
                    div.innerHTML = `
                        <label style="font-size:0.85rem; cursor:pointer; display:flex; align-items:center; gap:5px;">
                            <input type="checkbox" class="subfolder-check" value="${folder}" checked> ${folder}
                        </label>
                    `;
                    subfoldersContainer.appendChild(div);
                });

                // Gestion du clic "Tout cocher"
                const checkAll = subfoldersContainer.querySelector('.check-all');
                checkAll.addEventListener('change', (e) => {
                    const checkboxes = subfoldersContainer.querySelectorAll('.subfolder-check');
                    checkboxes.forEach(c => c.checked = e.target.checked);
                });

            } else {
                // Pas de sous-dossiers : on cache la zone
                subfoldersContainer.style.display = 'none';
                subfoldersContainer.innerHTML = '';
            }
        }
    });

    // 3. Choisir fichier template Excel
    btnTemplate.addEventListener('click', async () => {
        const path = await window.api.selectFile(['xlsx']);
        if (path) inputTemplate.value = path;
    });

    // 4. Supprimer la ligne
    btnRemove.addEventListener('click', () => {
        row.remove();
        updateEmptyMsg();
    });

    // Ajout au DOM
    tasksContainer.appendChild(row);
    updateEmptyMsg();
}

// Bouton Ajouter Tâche
if (btnAddTask) {
    btnAddTask.addEventListener('click', addTask);
}


// --- SOUMISSION ---

if (generatorForm) {
    generatorForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const outputFolder = inputOutputFolder.value;
        if (!outputFolder) {
            alert("Veuillez sélectionner un dossier de destination.");
            return;
        }

        // Récupération de toutes les tâches configurées
        const taskRows = tasksContainer.querySelectorAll('.task-row');
        const tasks = [];

        taskRows.forEach(row => {
            const mode = row.querySelector('.task-type-select').value;
            const photoFolder = row.querySelector('.task-photo-input').value;
            const templateFile = row.querySelector('.task-template-input').value;
            
            // Récupération des sous-dossiers cochés
            const subfoldersDiv = row.querySelector('.subfolders-list');
            let selectedSubfolders = [];
            
            if (subfoldersDiv.style.display !== 'none') {
                const checkboxes = subfoldersDiv.querySelectorAll('.subfolder-check:checked');
                checkboxes.forEach(cb => selectedSubfolders.push(cb.value));
            }

            if (photoFolder && templateFile) {
                tasks.push({ 
                    mode, 
                    photoFolder, 
                    templateFile, 
                    outputFolder,
                    subfolders: selectedSubfolders // Tableau vide si pas de sous-dossiers
                });
            }
        });

        if (tasks.length === 0) {
            alert("Veuillez configurer au moins une tâche complète (Dossier + Template).");
            return;
        }

        // UI : Passage en mode "Traitement"
        startBtn.disabled = true;
        startBtn.textContent = "Génération en cours...";
        logsDiv.style.display = 'block';
        logsDiv.innerHTML = '<div>Démarrage du processus par lots...</div>';

        // Envoi de la LISTE des tâches au backend
        window.api.startExcelGeneration(tasks);
    });
}

// --- ÉCOUTE DES LOGS ---
window.api.onGenerateLog((message) => {
    const line = document.createElement('div');
    line.textContent = `> ${message}`;
    logsDiv.appendChild(line);
    logsDiv.scrollTop = logsDiv.scrollHeight;
});

window.api.onGenerateComplete((result) => {
    startBtn.disabled = false;
    startBtn.textContent = "🚀 Lancer la génération par lots";
    
    if (result.success) {
        alert("Toutes les générations sont terminées !");
    } else {
        alert(`Erreur globale : ${result.error}`);
    }
});

// Lancement de l'initialisation
init();