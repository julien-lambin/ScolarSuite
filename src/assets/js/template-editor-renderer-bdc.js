const list = document.getElementById('template-list');
const form = document.getElementById('template-form');
const keyInput = document.getElementById('tpl-key');
const labelInput = document.getElementById('tpl-label');
const splitInput = document.getElementById('tpl-split');
const widthInput = document.getElementById('tpl-width');
const col1Input = document.getElementById('tpl-col1');
const row1Input = document.getElementById('tpl-row1');
const col2Input = document.getElementById('tpl-col2');
const row2Input = document.getElementById('tpl-row2');
const placeholdersInput = document.getElementById('tpl-placeholders');

let allTemplates = {};
let currentKey = null;

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

function selectTemplate(key) {
    document.getElementById('empty-state').style.display = 'none';
    currentKey = key;
    const tpl = allTemplates[key];
    
    form.style.display = 'block';
    keyInput.value = key;
    labelInput.value = tpl.label || key;
    splitInput.value = tpl.split_mode ? "true" : "false";
    widthInput.value = tpl.photo_width;
    
    col1Input.value = tpl.photo_anchors[0].col;
    row1Input.value = tpl.photo_anchors[0].row;
    col2Input.value = tpl.photo_anchors[1].col;
    row2Input.value = tpl.photo_anchors[1].row;

    // Extraction des placeholders pour l'éditeur JSON
    const extraData = {
        id_placeholders: tpl.id_placeholders,
        name_placeholders: tpl.name_placeholders,
        order_placeholders: tpl.order_placeholders
    };
    placeholdersInput.value = JSON.stringify(extraData, null, 2);
    
    renderList(); // Pour mettre à jour la surbrillance
}

// Sauvegarde
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentKey) return;

    try {
        const extras = JSON.parse(placeholdersInput.value);
        
        allTemplates[currentKey] = {
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
        renderList();
    } catch (err) {
        alert("Erreur dans le JSON des placeholders : " + err.message);
    }
});

// Nouveau modèle
document.getElementById('btn-new-template').addEventListener('click', () => {
    const name = prompt("Nom du nouveau modèle (clé unique, ex: 'sport') :");
    if (name && !allTemplates[name]) {
        // Clone du modèle indiv par défaut
        allTemplates[name] = JSON.parse(JSON.stringify(allTemplates['indiv']));
        allTemplates[name].label = name;
        selectTemplate(name);
    }
});

// Retour
document.getElementById('btn-back').addEventListener('click', () => {
    window.api.navigate('generate-bdc');
});


// Suppression
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