const list = document.getElementById('template-list');
const form = document.getElementById('template-form');
const keyInput = document.getElementById('tpl-key');
const labelInput = document.getElementById('tpl-label');

// Gestion Fichier Excel
const fileStatusText = document.getElementById('file-status-text');
const filePathText = document.getElementById('file-path-text');
const btnEditExcel = document.getElementById('btn-edit-excel');
const btnChangeFile = document.getElementById('btn-change-file');
const btnResetFile = document.getElementById('btn-reset-file'); // Nouveau bouton

const splitInput = document.getElementById('tpl-split');
const widthInput = document.getElementById('tpl-width');
const col1Input = document.getElementById('tpl-col1');
const row1Input = document.getElementById('tpl-row1');
const col2Input = document.getElementById('tpl-col2');
const row2Input = document.getElementById('tpl-row2');
const placeholdersInput = document.getElementById('tpl-placeholders');

let allTemplates = {};
let currentKey = null;
let currentTemplateData = null;

// Chargement initial
async function loadData() {
    allTemplates = await window.api.getTemplates();
    renderList();
}

function renderList() {
    list.innerHTML = '';
    Object.keys(allTemplates).forEach(key => {
        const item = document.createElement('li');
        item.textContent = allTemplates[key].label || key;
        item.style.padding = '0.5rem';
        item.style.cursor = 'pointer';
        item.style.borderBottom = '1px solid #eee';
        if (key === currentKey) item.classList.add('active');
        
        item.addEventListener('click', () => selectTemplate(key));
        list.appendChild(item);
    });
}

function updateFileDisplay(tpl) {
    btnResetFile.style.display = 'none'; // Caché par défaut

    if (tpl.user_file_path) {
        fileStatusText.textContent = "✅ Fichier Personnalisé";
        fileStatusText.style.color = "var(--green-color)";
        filePathText.textContent = tpl.user_file_path;
        btnEditExcel.textContent = "🖊️ Ouvrir et Modifier";
        
        // Si c'est un modèle qui avait un fichier système à la base, on permet de reset
        if (tpl.systemFile) {
            btnResetFile.style.display = 'block';
        }

    } else if (tpl.systemFile) {
        fileStatusText.textContent = "🔒 Fichier Système (Par défaut)";
        fileStatusText.style.color = "var(--primary-color)";
        filePathText.textContent = "Intégré : " + tpl.systemFile;
        btnEditExcel.textContent = "🖊️ Créer une copie et Modifier";
    } else {
        fileStatusText.textContent = "⚠️ Aucun fichier";
        fileStatusText.style.color = "#dc3545";
        filePathText.textContent = "Sélectionnez un fichier...";
        btnEditExcel.textContent = "Choisir un fichier d'abord";
        btnEditExcel.disabled = true;
        return;
    }
    btnEditExcel.disabled = false;
}

function selectTemplate(key) {
    document.getElementById('empty-state').style.display = 'none';
    currentKey = key;
    currentTemplateData = allTemplates[key]; 
    
    form.style.display = 'block';
    keyInput.value = key;
    labelInput.value = currentTemplateData.label || key;
    
    updateFileDisplay(currentTemplateData);

    splitInput.value = currentTemplateData.split_mode ? "true" : "false";
    widthInput.value = currentTemplateData.photo_width;
    
    col1Input.value = currentTemplateData.photo_anchors[0].col;
    row1Input.value = currentTemplateData.photo_anchors[0].row;
    col2Input.value = currentTemplateData.photo_anchors[1].col;
    row2Input.value = currentTemplateData.photo_anchors[1].row;

    const extraData = {
        id_placeholders: currentTemplateData.id_placeholders,
        name_placeholders: currentTemplateData.name_placeholders,
        order_placeholders: currentTemplateData.order_placeholders
    };
    placeholdersInput.value = JSON.stringify(extraData, null, 2);
    
    renderList();
}

// 1. BOUTON MODIFIER EXCEL
btnEditExcel.addEventListener('click', async () => {
    if (!currentKey) return;

    const result = await window.api.openTemplateForEdit(currentTemplateData);
    
    if (result.success) {
        if (result.newPath) {
            currentTemplateData.user_file_path = result.newPath;
            allTemplates[currentKey] = currentTemplateData;
            await window.api.saveTemplates(allTemplates);
            
            updateFileDisplay(currentTemplateData);
            alert("Une copie du modèle a été créée dans vos Documents.\nElle est ouverte dans Excel.\n\nLe logiciel utilisera désormais cette copie.");
        }
    } else {
        alert("Erreur : " + result.error);
    }
});

// 2. BOUTON CHANGER FICHIER
btnChangeFile.addEventListener('click', async () => {
    const path = await window.api.selectFile(['xlsx']);
    if (path) {
        currentTemplateData.user_file_path = path;
        updateFileDisplay(currentTemplateData);
    }
});

// 3. BOUTON RESET (Nouveau)
btnResetFile.addEventListener('click', async () => {
    if (confirm("Voulez-vous vraiment annuler vos modifications et revenir au fichier Excel d'origine (intégré) ?")) {
        // On supprime simplement la propriété user_file_path
        delete currentTemplateData.user_file_path;
        updateFileDisplay(currentTemplateData);
        // On sauvegarde tout de suite pour éviter les confusions
        allTemplates[currentKey] = currentTemplateData;
        // La sauvegarde finale se fera aussi au submit, mais ça sécurise l'état visuel
    }
});

// SAUVEGARDE GÉNÉRALE
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentKey) return;

    try {
        const extras = JSON.parse(placeholdersInput.value);
        
        allTemplates[currentKey] = {
            ...currentTemplateData, 
            label: labelInput.value,
            split_mode: splitInput.value === "true",
            photo_width: parseInt(widthInput.value),
            photo_anchors: [
                { col: parseInt(col1Input.value), row: parseInt(row1Input.value) },
                { col: parseInt(col2Input.value), row: parseInt(row2Input.value) }
            ],
            ...extras
        };

        await window.api.saveTemplates(allTemplates);
        alert("Modèle sauvegardé !");
        
        currentTemplateData = allTemplates[currentKey];
        renderList();
    } catch (err) {
        alert("Erreur dans le JSON des placeholders : " + err.message);
    }
});

document.getElementById('btn-new-template').addEventListener('click', () => {
    const name = prompt("Nom du nouveau modèle (clé unique, ex: 'sport') :");
    if (name && !allTemplates[name]) {
        const base = allTemplates['indiv'] || {};
        allTemplates[name] = JSON.parse(JSON.stringify(base));
        allTemplates[name].label = name;
        
        delete allTemplates[name].systemFile;
        delete allTemplates[name].user_file_path;
        
        selectTemplate(name);
    }
});

document.getElementById('btn-back').addEventListener('click', () => {
    window.api.navigate('generate-bdc');
});

document.getElementById('btn-delete-template').addEventListener('click', async () => {
    if (confirm("Supprimer définitivement ce modèle ?")) {
        delete allTemplates[currentKey];
        await window.api.saveTemplates(allTemplates);
        currentKey = null;
        form.style.display = 'none';
        document.getElementById('empty-state').style.display = 'block';
        renderList();
    }
});

loadData();