const schoolNameInput = document.getElementById('school-name-input');
const productListContainer = document.getElementById('product-list-container');
const packsContainer = document.getElementById('packs-container');
const configForm = document.getElementById('school-config-form');
const addProductBtn = document.getElementById('add-product-btn');
const cancelConfigBtn = document.getElementById('cancel-config-btn');

// Liste de base, enrichie par le scan réel
let availableFolders = ['18x24', 'GRJPEG']; 

let currentSchoolId = null;
let currentConfig = { catalog: [], packs: {} };

// --- LISTENERS GLOBAUX (PROGRESSION) ---
window.api.onThumbnailProgress(({ processed, total }) => {
    const statusContainer = document.getElementById('processing-status');
    const progressBar = document.getElementById('config-progress-bar');
    const progressText = document.getElementById('progress-text');

    if (statusContainer && progressBar && progressText) {
        if (statusContainer.style.display === 'none') {
            statusContainer.style.display = 'flex';
        }
        progressBar.value = processed;
        progressBar.max = total;
        progressText.textContent = `Traitement des photos : ${processed} / ${total}`;
    }
});

window.api.onThumbnailComplete(() => {
    const statusContainer = document.getElementById('processing-status');
    if(statusContainer) {
        statusContainer.style.display = 'flex';
        statusContainer.innerHTML = '<div class="success-msg">✅ Traitement des photos terminé !</div>';
    }
});

// --- CHARGEMENT DONNÉES ---
window.api.onSchoolConfigData(async (schoolId) => {
    currentSchoolId = schoolId;
    
    // 1. CHARGEMENT DES DOSSIERS RÉELS
    const foldersResult = await window.api.getSubfolders(schoolId);
    
    if (foldersResult.success && foldersResult.folders.length > 0) {
        const realFolders = foldersResult.folders;
        // Fusion intelligente : on privilégie les dossiers réels, on ajoute les défauts si manquants
        const allFolders = new Set([...realFolders, ...availableFolders]);
        availableFolders = Array.from(allFolders).sort();
        console.log("Dossiers disponibles :", availableFolders);
    } else {
        console.warn("Aucun sous-dossier détecté ou erreur scan:", foldersResult.error);
    }

    // 2. CHARGEMENT DE L'ÉCOLE
    const result = await window.api.getSchoolById(schoolId);
    if (!result.success) { alert("Erreur de chargement"); return; }
    
    const school = result.school;
    if (schoolNameInput) schoolNameInput.value = school.name;
    
    if (school.products && school.products.packs) {
        currentConfig = school.products;
    } else {
        const defaultConfig = await window.api.getDefaultProductCatalog();
        // Si ancienne structure sans 'packs', on reset ou on adapte
        if (school.products && !school.products.packs) {
             currentConfig = { catalog: school.products, packs: {} };
        } else {
             currentConfig = school.products || { catalog: [], packs: {} };
        }
    }
    
    renderCatalog();
    renderPacks();
});

// --- RENDU DU CATALOGUE (TABLEAU 1) ---
function renderCatalog() {
    productListContainer.innerHTML = '';
    
    currentConfig.catalog.forEach((product, index) => {
        const row = document.createElement('div');
        row.className = 'config-catalog-row row-hover';
        
        const isBundle = product.type === 'bundle';
        const currentSource = product.source_folder || '18x24';
        const currentDest = product.destination_folder || product.name;
        
        const folderOptions = availableFolders.map(f => 
            `<option value="${f}" ${currentSource === f ? 'selected' : ''}>${f}</option>`
        ).join('');

        row.innerHTML = `
            <div class="col-name">
                <input type="text" class="input-name" value="${product.name}" data-index="${index}" ${isBundle ? 'readonly' : ''}>
            </div>
            
            <div class="col-source">
                ${!isBundle ? `<select class="select-source" data-index="${index}">${folderOptions}</select>` : '<span style="color:#ccc">-</span>'}
            </div>

            <div class="col-dest">
                ${!isBundle ? `<input type="text" class="input-dest" value="${currentDest}" data-index="${index}">` : '<span style="color:#ccc">-</span>'}
            </div>

            <div class="col-type">
                <span class="badge-type ${product.type}">${isBundle ? 'Pack' : 'Produit'}</span>
            </div>
            <div class="col-price">
                <input type="number" class="input-price" value="${product.price}" step="0.5" min="0" data-index="${index}">
            </div>
            <div class="col-active">
                <label class="switch">
                    <input type="checkbox" class="check-active" ${product.active ? 'checked' : ''} data-index="${index}">
                    <span class="slider round"></span>
                </label>
            </div>
        `;
        productListContainer.appendChild(row);
    });
}

// --- RENDU DES PACKS (TABLEAU 2) ---
function renderPacks() {
    packsContainer.innerHTML = '';
    
    // On ne cherche que le pack maître 'pochette_complete'
    const masterPackKey = 'pochette_complete';
    const bundle = currentConfig.catalog.find(p => p.key === masterPackKey);
    
    if (bundle) {
        const packKey = bundle.key;
        const packItems = currentConfig.packs[packKey] || [];
        
        const packDiv = document.createElement('div');
        packDiv.className = 'pack-container';
        
        let html = `
            <div class="pack-title">
                <span>📦 Contenu Technique de la Pochette (Modèle Unique)</span>
                <button type="button" class="btn-secondary btn-small btn-add-pack-item" data-pack="${packKey}">+ Ajouter un élément</button>
            </div>
            <div class="config-pack-header">
                <span>Nom Élément (Technique)</span>
                <span>Qté</span>
                <span>Dossier Source</span>
                <span>Dossier Export (Dans le pack)</span>
                <span>Action</span>
            </div>
        `;
        
        packItems.forEach((item, itemIndex) => {
            const currentSource = item.source || '18x24';
            const currentQty = item.qty || 1;
            
            const folderOptions = availableFolders.map(f => 
                `<option value="${f}" ${currentSource === f ? 'selected' : ''}>${f}</option>`
            ).join('');
            
            html += `
                <div class="config-pack-row row-hover">
                    <div class="col-name">
                        <input type="text" class="pack-input-name" value="${item.name}" data-pack="${packKey}" data-index="${itemIndex}">
                    </div>
                    <div class="col-qty">
                        <input type="number" class="pack-input-qty" value="${currentQty}" min="1" data-pack="${packKey}" data-index="${itemIndex}">
                    </div>
                    <div class="col-source">
                        <select class="pack-select-source" data-pack="${packKey}" data-index="${itemIndex}">
                            ${folderOptions}
                        </select>
                    </div>
                    <div class="col-dest">
                        <input type="text" class="pack-input-dest" value="${item.dest}" data-pack="${packKey}" data-index="${itemIndex}">
                    </div>
                    <div class="col-action">
                        <button type="button" class="btn-danger btn-small btn-remove-pack-item" data-pack="${packKey}" data-index="${itemIndex}">
                            <svg width="18" height="18" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#000000"><path d="M18 6L17.1991 18.0129C17.129 19.065 17.0939 19.5911 16.8667 19.99C16.6666 20.3412 16.3648 20.6235 16.0011 20.7998C15.588 21 15.0607 21 14.0062 21H9.99377C8.93927 21 8.41202 21 7.99889 20.7998C7.63517 20.6235 7.33339 20.3412 7.13332 19.99C6.90607 19.5911 6.871 19.065 6.80086 18.0129L6 6M4 6H20M16 6L15.7294 5.18807C15.4671 4.40125 15.3359 4.00784 15.0927 3.71698C14.8779 3.46013 14.6021 3.26132 14.2905 3.13878C13.9376 3 13.523 3 12.6936 3H11.3064C10.477 3 10.0624 3 9.70951 3.13878C9.39792 3.26132 9.12208 3.46013 8.90729 3.71698C8.66405 4.00784 8.53292 4.40125 8.27064 5.18807L8 6M14 10V17M10 10V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                        </button>
                    </div>
                </div>
            `;
        });
        
        packDiv.innerHTML = html;
        packsContainer.appendChild(packDiv);
    }
}

// --- INTERACTIVITÉ CATALOGUE ---
productListContainer.addEventListener('change', (e) => {
    const target = e.target;
    const index = target.dataset.index;
    if (index === undefined) return;
    
    const product = currentConfig.catalog[index];
    
    if (target.classList.contains('input-name')) {
        product.name = target.value;
        renderPacks(); 
    } else if (target.classList.contains('select-source')) {
        product.source_folder = target.value;
    } else if (target.classList.contains('input-dest')) {
        product.destination_folder = target.value;
    } else if (target.classList.contains('input-price')) {
        product.price = parseFloat(target.value);
    } else if (target.classList.contains('check-active')) {
        product.active = target.checked;
        renderPacks(); 
    }
});

// Ajout Produit
if (addProductBtn) {
    addProductBtn.addEventListener('click', () => {
        const newKey = `custom_${Date.now()}`;
        // On prend le premier dossier dispo
        const defaultSource = availableFolders[0] || '18x24';
        
        currentConfig.catalog.push({
            key: newKey, name: 'Nouveau Produit', price: 10.00, type: 'product',
            active: true, source_folder: defaultSource, destination_folder: 'Nouveau Dossier'
        });
        renderCatalog();
        // Scroll en bas
        setTimeout(() => {
            if(productListContainer.lastElementChild) {
                productListContainer.lastElementChild.scrollIntoView({ behavior: 'smooth' });
                productListContainer.lastElementChild.querySelector('.input-name').focus();
            }
        }, 100);
    });
}

// --- INTERACTIVITÉ PACKS ---
packsContainer.addEventListener('click', (e) => {
    // Gestion clic SVG
    const target = e.target.closest('button'); 
    if (!target) return;

    if (target.classList.contains('btn-add-pack-item')) {
        const packKey = target.dataset.pack;
        if (!currentConfig.packs[packKey]) currentConfig.packs[packKey] = [];
        
        const defaultSource = availableFolders[0] || '18x24';
        currentConfig.packs[packKey].push({
            name: 'Nouvel Élément', qty: 1, source: defaultSource, dest: 'Dossier Pack'
        });
        renderPacks();
    }
    
    if (target.classList.contains('btn-remove-pack-item')) {
        const packKey = target.dataset.pack;
        const index = parseInt(target.dataset.index);
        currentConfig.packs[packKey].splice(index, 1);
        renderPacks();
    }
});

packsContainer.addEventListener('change', (e) => {
    const target = e.target;
    const packKey = target.dataset.pack;
    const index = target.dataset.index;
    if (!packKey || index === undefined) return;
    
    const item = currentConfig.packs[packKey][index];
    
    if (target.classList.contains('pack-input-name')) {
        item.name = target.value;
    } else if (target.classList.contains('pack-input-qty')) {
        item.qty = parseInt(target.value) || 1;
    } else if (target.classList.contains('pack-select-source')) {
        item.source = target.value;
    } else if (target.classList.contains('pack-input-dest')) {
        item.dest = target.value;
    }
});

// --- BOUTONS FOOTER ---

// Annulation
if (cancelConfigBtn) {
    cancelConfigBtn.addEventListener('click', () => {
        window.api.navigate('index');
    });
}

// Sauvegarde
if (configForm) {
    configForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const result = await window.api.saveSchoolConfig({
            schoolId: currentSchoolId,
            config: currentConfig,
            schoolName: schoolNameInput ? schoolNameInput.value : null 
        });
        if (result.success) {
            window.api.navigate('index');
        } else {
            alert(`Erreur: ${result.error}`);
        }
    });
}