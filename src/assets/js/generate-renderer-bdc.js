// src/assets/js/generate-renderer-bdc.js

// --- SÉLECTION DES ÉLÉMENTS ---
const btnOutputFolder = document.getElementById('btn-output-folder');
const inputOutputFolder = document.getElementById('global-output-folder');
const generatorForm = document.getElementById('generator-form');
const tasksContainer = document.getElementById('tasks-container');
const btnAddTask = document.getElementById('btn-add-task');
const emptyMsg = document.getElementById('empty-tasks-msg');
const taskTemplate = document.getElementById('task-row-template');
const btnEditTemplates = document.getElementById('btn-edit-templates');

// Éléments Footer
const progressTitle = document.getElementById('progress-title');
const tasksProgressList = document.getElementById('tasks-progress-list');
const btnCancel = document.getElementById('btn-cancel-generation');
const btnStart = document.getElementById('btn-start-generation');

let availableTemplates = {};

// --- CHARGEMENT INITIAL ---
async function init() {
    try {
        availableTemplates = await window.api.getTemplates();
    } catch (e) {
        console.error("Erreur templates:", e);
        availableTemplates = {};
    }
    addTask();
    
    // ETAT INITIAL (Screen 1)
    if(progressTitle) progressTitle.style.display = 'none';
    if(tasksProgressList) tasksProgressList.style.display = 'none';
    if(btnCancel) btnCancel.style.display = 'none';
    if(btnStart) btnStart.disabled = false;
}

if (btnEditTemplates) {
    btnEditTemplates.addEventListener('click', () => window.api.navigate('template-editor-bdc'));
}

btnOutputFolder.addEventListener('click', async () => {
    const path = await window.api.selectFolder();
    if (path) inputOutputFolder.value = path;
});

// --- GESTION DES TÂCHES ---
function updateEmptyMsg() {
    emptyMsg.style.display = tasksContainer.children.length === 0 ? 'block' : 'none';
}

function addTask() {
    const clone = taskTemplate.content.cloneNode(true);
    const row = clone.querySelector('.task-row');
    
    const btnPhoto = row.querySelector('.task-photo-btn');
    const inputPhoto = row.querySelector('.task-photo-input');
    const btnTemplate = row.querySelector('.task-template-btn');
    const inputTemplate = row.querySelector('.task-template-input');
    const btnRemove = row.querySelector('.btn-remove-task');
    const selectType = row.querySelector('.task-type-select');
    const subfoldersContainer = row.querySelector('.subfolders-list');

    selectType.innerHTML = ''; 
    Object.keys(availableTemplates).forEach(key => {
        const tpl = availableTemplates[key];
        const option = document.createElement('option');
        option.value = key;
        option.textContent = tpl.label || key;
        selectType.appendChild(option);
    });

    const updateTemplateState = () => {
        const selectedKey = selectType.value;
        const tpl = availableTemplates[selectedKey];
        if (tpl && tpl.systemFile) {
            inputTemplate.value = "(Modèle Intégré : " + tpl.label + ")";
            inputTemplate.dataset.isSystem = "true";
            inputTemplate.disabled = true;
            btnTemplate.disabled = true;
            btnTemplate.style.opacity = "0.5";
        } else {
            inputTemplate.value = "";
            delete inputTemplate.dataset.isSystem;
            inputTemplate.disabled = false;
            btnTemplate.disabled = false;
            btnTemplate.style.opacity = "1";
        }
    };
    selectType.addEventListener('change', updateTemplateState);
    updateTemplateState();

    btnPhoto.addEventListener('click', async () => {
        const path = await window.api.selectFolder();
        if (path) {
            inputPhoto.value = path;
            const result = await window.api.listSubfolders(path);
            if (result.success && result.folders.length > 0) {
                subfoldersContainer.style.display = 'block';
                subfoldersContainer.innerHTML = `
                    <div style="margin-bottom:5px; border-bottom:1px solid #eee; padding-bottom:5px;">
                        <label style="font-weight:bold; font-size:0.85rem; cursor:pointer; display:flex; align-items:center; gap:5px;">
                            <input type="checkbox" class="check-all" checked> Tout cocher
                        </label>
                    </div>
                `;
                result.folders.forEach(folder => {
                    const div = document.createElement('div');
                    div.innerHTML = `<label style="font-size:0.85rem; cursor:pointer; display:flex; align-items:center; gap:5px;"><input type="checkbox" class="subfolder-check" value="${folder}" checked> ${folder}</label>`;
                    subfoldersContainer.appendChild(div);
                });
                subfoldersContainer.querySelector('.check-all').addEventListener('change', (e) => {
                    subfoldersContainer.querySelectorAll('.subfolder-check').forEach(c => c.checked = e.target.checked);
                });
            } else {
                subfoldersContainer.style.display = 'none';
                subfoldersContainer.innerHTML = '';
            }
        }
    });

    btnTemplate.addEventListener('click', async () => {
        if (!btnTemplate.disabled) {
            const path = await window.api.selectFile(['xlsx']);
            if (path) inputTemplate.value = path;
        }
    });

    btnRemove.addEventListener('click', () => { row.remove(); updateEmptyMsg(); });
    tasksContainer.appendChild(row);
    updateEmptyMsg();
}

if (btnAddTask) btnAddTask.addEventListener('click', addTask);


// --- SOUMISSION & SUIVI ---
if (generatorForm) {
    generatorForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const outputFolder = inputOutputFolder.value;
        if (!outputFolder) { alert("Veuillez sélectionner un dossier de destination."); return; }

        const taskRows = tasksContainer.querySelectorAll('.task-row');
        const tasks = [];

        taskRows.forEach(row => {
            const mode = row.querySelector('.task-type-select').value;
            const photoFolder = row.querySelector('.task-photo-input').value;
            const templateFile = row.querySelector('.task-template-input').value;
            const isSystem = row.querySelector('.task-template-input').dataset.isSystem === "true";
            
            const subfoldersDiv = row.querySelector('.subfolders-list');
            let selectedSubfolders = [];
            if (subfoldersDiv.style.display !== 'none') {
                row.querySelectorAll('.subfolder-check:checked').forEach(cb => selectedSubfolders.push(cb.value));
            }

            if (photoFolder && (templateFile || isSystem)) {
                tasks.push({ mode, photoFolder, templateFile, outputFolder, subfolders: selectedSubfolders });
            }
        });

        if (tasks.length === 0) { alert("Configuration incomplète."); return; }

        // --- ETAT 2 : DÉMARRAGE (Screen 2) ---
        
        // 1. Bouton Lancer -> Désactivé
        btnStart.disabled = true;
        
        // 2. Afficher les éléments de progression
        progressTitle.style.display = 'block';
        tasksProgressList.style.display = 'flex';
        
        // 3. Bouton Arrêter -> Visible
        btnCancel.style.display = 'block';
        btnCancel.disabled = false;
        btnCancel.textContent = "Arrêter la génération";
        
        tasksProgressList.innerHTML = '';
        
        // Génération visuelle des barres
        tasks.forEach((task, idx) => {
            const tplName = availableTemplates[task.mode] ? availableTemplates[task.mode].label : task.mode;
            const rowDiv = document.createElement('div');
            rowDiv.id = `progress-task-${idx}`;
            rowDiv.className = 'progress-row pending';
            
            rowDiv.innerHTML = `
                <div class="task-info">
                    <span class="task-title">${tplName}</span>
                    <span class="task-detail">${task.photoFolder}</span>
                </div>
                <div class="task-progress-bar-container">
                    <progress class="mini-progress" value="0" max="100"></progress>
                </div>
                <div class="task-status-area">
                    <span class="status-text">En attente</span>
                </div>
            `;
            tasksProgressList.appendChild(rowDiv);
        });

        window.api.startExcelGeneration(tasks);
    });
}

// --- LISTENERS IPC (MISE À JOUR UI) ---

// 1. Tâche Start
window.api.onGenerateTaskStart((index) => {
    const row = document.getElementById(`progress-task-${index}`);
    if (row) {
        row.className = 'progress-row running';
        row.querySelector('.status-text').textContent = 'Démarrage...';
    }
});

// 2. Progression
window.api.onGenerateProgress(({ percent, status }) => {
    const row = document.querySelector('.progress-row.running');
    if (row) {
        row.querySelector('progress').value = percent;
        row.querySelector('.status-text').textContent = status; 
    }
});

// 3. Tâche Finie
window.api.onGenerateTaskComplete(({ index, success, error }) => {
    const row = document.getElementById(`progress-task-${index}`);
    if (row) {
        row.classList.remove('running');
        if (success) {
            row.classList.add('completed');
            row.querySelector('.task-status-area').innerHTML = `
                <span class="status-text" style="color:var(--green-color)">Terminé</span>
                <span style="font-size:1.2rem">✅</span>
            `;
            row.querySelector('progress').value = 100;
        } else {
            row.classList.add('error');
            row.querySelector('.task-status-area').innerHTML = `
                <span class="status-text" style="color:#dc3545">Erreur</span>
                <span style="font-size:1.2rem">❌</span>
            `;
            const detail = row.querySelector('.task-detail');
            detail.textContent = `Erreur : ${error}`;
            detail.style.color = '#dc3545';
        }
    }
});

// 4. Fin Globale
window.api.onGenerateComplete((result) => {
    
    // --- ETAT 3 : FIN (Screen 3) ---
    
    // 1. Bouton Arrêter -> Disparaît
    btnCancel.style.display = 'none';

    // 2. Bouton Lancer -> Réactivé
    btnStart.disabled = false;

    if (result.cancelled) {
        const running = document.querySelector('.progress-row.running');
        if (running) {
            running.classList.remove('running');
            running.classList.add('error');
            running.querySelector('.status-text').textContent = 'Annulé';
        }
        alert("Génération arrêtée par l'utilisateur.");
    }
});

// Annulation
if (btnCancel) {
    btnCancel.addEventListener('click', () => {
        if (confirm("Voulez-vous vraiment tout arrêter ?")) {
            window.api.cancelExcelGeneration();
            btnCancel.disabled = true;
            btnCancel.textContent = "Arrêt en cours...";
        }
    });
}

init();