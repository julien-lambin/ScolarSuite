const schoolNameInput = document.getElementById('school-name-input');
const productListContainer = document.getElementById('product-list-container');
const packsContainer = document.getElementById('packs-container');
const configForm = document.getElementById('school-config-form');
const addProductBtn = document.getElementById('add-product-btn'); // Bouton bleu en haut
const cancelConfigBtn = document.getElementById('cancel-config-btn');

// Éléments Import
const btnOpenImport = document.getElementById('btn-open-import');
const importModal = document.getElementById('import-modal');
const importSelect = document.getElementById('import-school-select');
const btnCancelImport = document.getElementById('btn-cancel-import');
const btnConfirmImport = document.getElementById('btn-confirm-import');

// Éléments Product Picker
const pickerModal = document.getElementById('product-picker-modal');
const pickerList = document.getElementById('product-picker-list');
const pickerSearch = document.getElementById('product-search-input');
const btnClosePicker = document.getElementById('btn-close-picker');
const btnCreateCustom = document.getElementById('btn-create-custom-product');

// Base de produits standards
const STANDARD_PRODUCTS = [
    // --- TIRAGES CLASSIQUES ---
    { code: 'P1015', name: 'Portrait 10x15', type: 'product', image: 'src/assets/images/products/18x24.webp', dest: '10x15', defaultPrice: 1.00 },
    { code: 'P1318', name: 'Portrait 13x18', type: 'product', image: 'src/assets/images/products/18x24.webp', dest: '13x18', defaultPrice: 6.00 },
    { code: 'P1824', name: 'Portrait 18x24', type: 'product', image: 'src/assets/images/products/18x24.webp', dest: '18x24', defaultPrice: 8.50 },
    
    // --- PHOTOS DE GROUPE (Manuscrit bas de page) ---
    { code: 'GR1824', name: 'Groupe 18x24', type: 'product', image: 'src/assets/images/products/groupe.webp', dest: 'GRJPEG', defaultPrice: 5.50 },
    { code: 'GR2030', name: 'Groupe 20x30', type: 'product', image: 'src/assets/images/products/groupe2030.webp', dest: 'GRJPEG', defaultPrice: 6.50 },

    // --- MULTIFORMAT ---
    { code: 'MFLB', name: 'Multiformat LB', type: 'product', image: 'src/assets/images/products/mflb.webp', dest: 'MF VRAC', defaultPrice: 10.00 },
    { code: 'MFLB3', name: 'Multiformat LB3', type: 'product', image: 'src/assets/images/products/mflb3.webp', dest: 'MF VRAC', defaultPrice: 10.00 },
    { code: 'MFIA', name: 'Multiformat IA', type: 'product', image: 'src/assets/images/products/mfia.webp', dest: 'MF VRAC', defaultPrice: 10.00 },
    { code: 'MFIA2', name: 'Multiformat IA2', type: 'product', image: 'src/assets/images/products/mfia2.webp', dest: 'MF VRAC', defaultPrice: 10.00 },
    { code: 'MF1218', name: 'Multiformat 2x 12x18', type: 'product', image: 'src/assets/images/products/mf12x18.webp', dest: 'MF VRAC', defaultPrice: 10.00 },
    { code: 'MF912', name: 'Multiformat (2x 9x12 + 3x 6x8 + 4x 3,5x4,5)', type: 'product', image: 'src/assets/images/products/mf912.webp', dest: 'MF VRAC', defaultPrice: 10.00 },

    // --- VŒUX & CALENDRIERS ---
    { code: 'CX1015', name: 'Carte de Vœux 10x15', type: 'product', image: 'src/assets/images/products/voeux.webp', dest: 'Voeux', defaultPrice: 1.00 },
    { code: 'CAL1318', name: 'Calendrier 13x18', type: 'product', image: 'src/assets/images/products/calendrier.webp', dest: 'Calendrier', defaultPrice: 6.00 },
    { code: 'CAL1824', name: 'Calendrier 18x24', type: 'product', image: 'src/assets/images/products/calendrier.webp', dest: 'Calendrier', defaultPrice: 10.00 },
    { code: 'CAL3040', name: 'Calendrier 30x40', type: 'product', image: 'src/assets/images/products/calendrier.webp', dest: 'Calendrier', defaultPrice: 20.00 },

    // --- POSTERS ---
    { code: 'P2030', name: 'Poster 20x30', type: 'product', image: 'src/assets/images/products/18x24.webp', dest: 'Poster', defaultPrice: 15.00 },
    { code: 'P3040', name: 'Poster 30x40', type: 'product', image: 'src/assets/images/products/18x24.webp', dest: 'Poster', defaultPrice: 20.00 },
    { code: 'P5060', name: 'Poster 50x60', type: 'product', image: 'src/assets/images/products/18x24.webp', dest: 'Poster', defaultPrice: 50.00 },
    { code: 'P5070', name: 'Poster 50x70', type: 'product', image: 'src/assets/images/products/18x24.webp', dest: 'Poster', defaultPrice: 60.00 },
    { code: 'P6080', name: 'Poster 60x80', type: 'product', image: 'src/assets/images/products/18x24.webp', dest: 'Poster', defaultPrice: 70.00 },

    // --- TOILES (Canvas) ---
    { code: 'T2030', name: 'Photo sur toile 20x30', type: 'product', image: 'src/assets/images/products/18x24.webp', dest: 'Toile', defaultPrice: 39.00 },
    { code: 'T3040', name: 'Photo sur toile 30x40', type: 'product', image: 'src/assets/images/products/18x24.webp', dest: 'Toile', defaultPrice: 69.00 },
    { code: 'T4050', name: 'Photo sur toile 40x50', type: 'product', image: 'src/assets/images/products/18x24.webp', dest: 'Toile', defaultPrice: 79.00 },
    { code: 'T5060', name: 'Photo sur toile 50x60', type: 'product', image: 'src/assets/images/products/18x24.webp', dest: 'Toile', defaultPrice: 89.00 },

    // --- MUG ---
    { code: 'MUG', name: 'Mug', type: 'product', image: 'src/assets/images/products/mug.webp', dest: 'Objets', defaultPrice: 10.00 },

    // --- PORTE CLES ---
    { code: 'PCLE', name: 'Porte Clés SANS PHOTO', type: 'product', image: 'src/assets/images/products/porte-cles-vide.webp', dest: 'Objets', defaultPrice: 2.00 },
    { code: 'PCLE+', name: 'Porte Clés AVEC PHOTO', type: 'product', image: 'src/assets/images/products/porte-cles.webp', dest: 'Objets', defaultPrice: 4.00 },
    { code: 'SIMILI', name: 'Porte Clés SIMILI CUIR', type: 'product', image: 'src/assets/images/products/porte-cles-simili.webp', dest: 'Objets', defaultPrice: 6.00 },

    // --- CADRE ---
    { code: 'CADRE', name: 'Cadre 10x15', type: 'product', image: 'src/assets/images/products/cadre.webp', dest: 'Objets', defaultPrice: 4.00 },

    // --- MAGNETS ---
    { code: 'MAG', name: 'Magnet SANS PHOTO', type: 'product', image: 'src/assets/images/products/magnet.webp', dest: 'Magnet', defaultPrice: 1.00 },
    { code: 'MAG+', name: 'Magnet AVEC PHOTO', type: 'product', image: 'src/assets/images/products/magnet.webp', dest: 'Magnet', defaultPrice: 2.00 },
    { code: 'MAG913', name: 'Magnet 9x13', type: 'product', image: 'src/assets/images/products/magnet.webp', dest: 'Magnet', defaultPrice: 7.00 },
];

let availableFolders = []; 
let currentSchoolId = null;
let navContext = null;
let currentConfig = { catalog: [], packs: {} };
let currentPackContext = null; // null = Catalogue, string = Clé du pack cible
let currentPickerSource = []; // Liste des produits affichés dans le modal

// --- LISTENERS GLOBAUX ---
window.api.onThumbnailProgress(({ processed, total }) => {
    const statusContainer = document.getElementById('processing-status');
    const progressBar = document.getElementById('config-progress-bar');
    const progressText = document.getElementById('progress-text');
    if (statusContainer && progressBar && progressText) {
        statusContainer.style.display = 'flex';
        progressBar.value = processed;
        progressBar.max = total;
        progressText.textContent = `Traitement des photos : ${processed} / ${total}`;
    }
});

window.api.onThumbnailComplete(() => {
    const statusContainer = document.getElementById('processing-status');
    if(statusContainer) {
        statusContainer.style.display = 'flex';
        statusContainer.innerHTML = '<div class="success-msg">✅ Traitement terminé !</div>';
    }
});

// --- CHARGEMENT DONNÉES ---
window.api.onSchoolConfigData(async (data) => {
    if (typeof data === 'object' && data.schoolId) {
        currentSchoolId = data.schoolId;
        navContext = data;
    } else {
        currentSchoolId = data;
        navContext = { from: 'index' };
    }
    
    const foldersResult = await window.api.getSubfolders(currentSchoolId);
    if (foldersResult.success && foldersResult.folders.length > 0) {
        availableFolders = foldersResult.folders.sort();
    } else {
        availableFolders = [];
    }

    const result = await window.api.getSchoolById(currentSchoolId);
    if (result.success) {
        const school = result.school;
        if (schoolNameInput) schoolNameInput.value = school.name;
        
        let rawProducts = school.products;
        let config = null;
        if (typeof rawProducts === 'string') {
            try { config = JSON.parse(rawProducts); } catch (e) { config = null; }
        } else {
            config = rawProducts;
        }

        if (!config || (Array.isArray(config) && config.length === 0) || (!config.catalog && !Array.isArray(config))) {
            const defaultConfig = await window.api.getDefaultProductCatalog();
            currentConfig = { catalog: defaultConfig, packs: {} };
        } else {
            if (Array.isArray(config)) {
                currentConfig = { catalog: config, packs: {} };
            } else {
                currentConfig = config;
            }
        }
        
        renderCatalog();
        renderPacks();
    }
});

// --- RENDU CATALOGUE ---
function renderCatalog() {
    productListContainer.innerHTML = '';
    let draggedItemIndex = null;
    
    if (currentConfig.catalog && currentConfig.catalog.length > 0) {
        currentConfig.catalog.forEach((product, index) => {
            const row = document.createElement('div');
            row.className = 'config-catalog-row row-hover';
            
            row.draggable = true;
            row.dataset.index = index;

            if (!product.active) {
                row.style.opacity = '0.5';
                row.style.pointerEvents = 'auto';
            }
            
            const isBundle = product.type === 'bundle';
            const currentSource = product.source_folder || '18x24';
            const currentDest = product.destination_folder || product.name;
            const sourceExists = availableFolders.includes(currentSource);
            
            let folderOptions = availableFolders.map(f => 
                `<option value="${f}" ${currentSource === f ? 'selected' : ''}>${f}</option>`
            ).join('');

            if (!isBundle && !sourceExists) {
                folderOptions = `<option value="${currentSource}" selected>⚠️ ${currentSource} (Introuvable)</option>` + folderOptions;
            }
            
            const warningStyle = (!isBundle && !sourceExists && product.active) ? 'border: 2px solid red; color: #d32f2f; background: #ffebee;' : '';
            const dragHandle = `<div class="drag-handle" title="Déplacer" draggable="true">☰</div>`;

            let deleteBtn = '';
            if (!isBundle) {
                deleteBtn = `
                    <button type="button" class="btn-delete-row" data-index="${index}" title="Supprimer">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                `;
            }

            row.innerHTML = `
                <div class="col-name" style="display: flex; align-items: center;">
                    ${dragHandle}
                    <input type="text" class="input-name" value="${product.name}" data-index="${index}" ${isBundle ? 'readonly' : ''}>
                </div>
                <div class="col-source">
                    ${!isBundle ? `<select class="select-source" data-index="${index}" style="${warningStyle}">${folderOptions}</select>` : '<span style="color:#ccc">-</span>'}
                </div>
                <div class="col-dest">
                    ${!isBundle ? `<input type="text" class="input-dest" value="${currentDest}" data-index="${index}">` : '<span style="color:#ccc">-</span>'}
                </div>
                <div class="col-type">
                    <span class="badge-type ${product.type}">${isBundle ? 'Pack' : 'Produit'}</span>
                </div>
                <div class="col-price">
                    <div class="price-input-group">
                        <input type="number" class="input-price" value="${product.price}" step="0.5" min="0" data-index="${index}">
                        <span class="price-symbol">€</span>
                    </div>
                </div>
                <div class="col-active">
                    <label class="switch">
                        <input type="checkbox" class="check-active" ${product.active ? 'checked' : ''} data-index="${index}">
                        <span class="slider round"></span>
                    </label>
                </div>
                <div class="col-delete" style="display:flex; justify-content:center;">
                    ${deleteBtn}
                </div>
            `;
            
            // Drag Events
            row.addEventListener('dragstart', (e) => {
                if (!e.target.classList.contains('drag-handle') && !e.target.closest('.drag-handle')) {
                    e.preventDefault();
                    return;
                }
                draggedItemIndex = index;
                row.classList.add('dragging'); 
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setDragImage(row, 0, 0);
            });
            row.addEventListener('dragend', (e) => {
                e.target.classList.remove('dragging');
                draggedItemIndex = null;
            });
            row.addEventListener('dragover', (e) => { e.preventDefault(); });
            row.addEventListener('drop', (e) => {
                e.preventDefault();
                const targetRow = e.target.closest('.config-catalog-row');
                if (!targetRow || draggedItemIndex === null) return;
                const targetIndex = parseInt(targetRow.dataset.index);
                if (draggedItemIndex !== targetIndex) {
                    const itemToMove = currentConfig.catalog[draggedItemIndex];
                    currentConfig.catalog.splice(draggedItemIndex, 1); 
                    currentConfig.catalog.splice(targetIndex, 0, itemToMove); 
                    renderCatalog(); 
                }
            });

            productListContainer.appendChild(row);
        });
    }

    const addRow = document.createElement('div');
    addRow.className = 'config-catalog-row';
    addRow.style.display = 'flex';
    addRow.style.justifyContent = 'center';
    addRow.style.padding = '10px';
    addRow.style.backgroundColor = '#f9f9f9'; 

    addRow.innerHTML = `
        <button type="button" class="btn-secondary btn-add-product-dynamic">
            + Nouveau Produit
        </button>
    `;
    productListContainer.appendChild(addRow);
}

// --- RENDU PACKS ---
function renderPacks() {
    packsContainer.innerHTML = '';
    const masterPackKey = 'pochette_complete';
    const bundle = currentConfig.catalog.find(p => p.key === masterPackKey);
    
    if (bundle) {
        const packKey = bundle.key;
        const packItems = currentConfig.packs[packKey] || [];
        
        const packDiv = document.createElement('div');
        packDiv.className = 'pack-container';
        
        if (!bundle.active) {
            packDiv.style.opacity = '0.5';
        } else {
            packDiv.style.opacity = '1';
        }

        // Header AVEC BOUTON
        let html = `
            <div class="pack-title">
                <span>📦 Contenu Technique de la Pochette (Modèle Unique)</span>
                <button type="button" class="btn-secondary btn-small btn-add-pack-item" data-pack="${packKey}">+ Ajouter un élément</button>
            </div>
            <div class="config-pack-header">
                <span>Nom Élément</span>
                <span>Qté</span>
                <span>Dossier Source</span>
                <span>Dossier Export (Pack)</span>
                <span>Action</span>
            </div>
        `;
        
        packItems.forEach((item, itemIndex) => {
            const currentSource = item.source || '18x24';
            const currentQty = item.qty || 1;
            const sourceExists = availableFolders.includes(currentSource);
            const warningStyle = (!sourceExists && bundle.active) ? 'border: 2px solid red; color: #d32f2f; background: #ffebee;' : '';

            let folderOptions = availableFolders.map(f => 
                `<option value="${f}" ${currentSource === f ? 'selected' : ''}>${f}</option>`
            ).join('');
            
            if (!sourceExists) {
                folderOptions = `<option value="${currentSource}" selected>⚠️ ${currentSource} (Introuvable)</option>` + folderOptions;
            }
            
            html += `
                <div class="config-pack-row row-hover">
                    <div class="col-name">
                        <input type="text" class="pack-input-name" value="${item.name}" data-pack="${packKey}" data-index="${itemIndex}">
                    </div>
                    <div class="col-qty">
                        <input type="number" class="pack-input-qty" value="${currentQty}" min="1" data-pack="${packKey}" data-index="${itemIndex}">
                    </div>
                    <div class="col-source">
                        <select class="pack-select-source" data-pack="${packKey}" data-index="${itemIndex}" style="${warningStyle}">
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
        
        // Bouton Bas
        const addRow = document.createElement('div');
        addRow.className = 'config-pack-row';
        addRow.style.display = 'flex';
        addRow.style.justifyContent = 'center';
        addRow.style.padding = '10px';
        addRow.style.backgroundColor = '#f9f9f9'; 
        addRow.style.borderTop = '1px solid #dee2e6';

        addRow.innerHTML = `
            <button type="button" class="btn-secondary btn-add-product-dynamic" data-pack="${packKey}">
                + Ajouter un élément au pack
            </button>
        `;
        packDiv.appendChild(addRow);

        packsContainer.appendChild(packDiv);
    }
}

// --- LOGIQUE PRODUCT PICKER ---

function openProductPicker() {
    // 1. Déterminer la source des données
    if (currentPackContext) {
        // Mode Pack
        currentPickerSource = currentConfig.catalog
            .filter(p => p.active && p.type !== 'bundle')
            .map(p => {
                let originCode = 'custom';
                if (p.key && p.key.includes('_')) originCode = p.key.split('_')[0];
                const standardRef = STANDARD_PRODUCTS.find(sp => sp.code === originCode);
                
                return {
                    name: p.name,
                    code: originCode === 'custom' ? 'Perso' : originCode,
                    image: standardRef ? standardRef.image : null,
                    dest: p.destination_folder, 
                    isPackItem: true,
                    defaultPrice: p.price // ICI : On prend le prix réel du catalogue
                };
            });
    } else {
        // Mode Catalogue
        currentPickerSource = STANDARD_PRODUCTS;
    }

    renderPickerList('');
    pickerSearch.value = '';
    pickerModal.style.display = 'flex';
    
    setTimeout(() => {
        pickerSearch.focus();
    }, 50);
}

function renderPickerList(filterText) {
    pickerList.innerHTML = '';
    const term = filterText.toLowerCase();
    
    const filtered = currentPickerSource.filter(p => 
        p.name.toLowerCase().includes(term) || 
        (p.code && p.code.toLowerCase().includes(term))
    );

    if (filtered.length === 0) {
        pickerList.innerHTML = '<div style="padding: 20px; text-align: center; color: #888;">Aucun produit trouvé.<br>Créez-le manuellement ci-dessous.</div>';
        return;
    }

    filtered.forEach(p => {
        const item = document.createElement('div');
        item.className = 'product-picker-item';
        
        const imgSrc = p.image;
        let imageHtml = '';
        if (imgSrc) {
            imageHtml = `<img src="${imgSrc}" class="product-icon-placeholder" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                         <div class="product-icon-fallback" style="display:none;">📦</div>`;
        } else {
            imageHtml = `<div class="product-icon-fallback">📦</div>`;
        }
        
        // AFFICHAGE PRIX AJOUTÉ
        const priceHtml = p.defaultPrice ? `<span style="font-size: 0.85rem; color: #28a745; font-weight: 600;">${p.defaultPrice.toFixed(2)} €</span>` : '';

        item.innerHTML = `
            ${imageHtml}
            <div class="product-info">
                <span class="product-title">${p.name}</span>
                <div style="display:flex; align-items:center; gap: 10px;">
                    <span class="product-code">Code : ${p.code}</span>
                    ${priceHtml}
                </div>
            </div>
            <div class="product-add-icon">+</div>
        `;
        
        item.addEventListener('click', () => {
            const defaultSource = availableFolders.length > 0 ? availableFolders[0] : '';

            // CAS 1 : Ajout dans un PACK
            if (currentPackContext) {
                if (!currentConfig.packs[currentPackContext]) {
                    currentConfig.packs[currentPackContext] = [];
                }
                
                currentConfig.packs[currentPackContext].push({
                    name: p.name,
                    qty: 1,
                    source: defaultSource,
                    dest: p.dest || ''
                });
                renderPacks();
            } 
            // CAS 2 : Ajout au CATALOGUE
            else {
                addProductToCatalog({
                    key: `${p.code}_${Date.now()}`,
                    name: p.name,
                    price: p.defaultPrice || 0, // ICI : On utilise le prix par défaut
                    type: 'product',
                    active: true,
                    source_folder: defaultSource,
                    destination_folder: p.dest || '' 
                });
            }
            pickerModal.style.display = 'none';
        });
        
        pickerList.appendChild(item);
    });
}

// --- LISTENERS CLICS ---

productListContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-add-product-dynamic')) {
        currentPackContext = null;
        openProductPicker();
        return;
    }
    const deleteBtn = e.target.closest('.btn-delete-row');
    if (deleteBtn) {
        if(confirm("Voulez-vous vraiment supprimer ce produit de la liste ?")) {
            const index = parseInt(deleteBtn.dataset.index);
            currentConfig.catalog.splice(index, 1);
            renderCatalog();
            renderPacks();
        }
    }
});

if (addProductBtn) {
    addProductBtn.addEventListener('click', () => {
        currentPackContext = null;
        openProductPicker();
    });
}

packsContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-add-product-dynamic')) {
        currentPackContext = e.target.dataset.pack;
        openProductPicker();
        return;
    }
    
    // Bouton "+" dans le header (classe différente)
    if (e.target.classList.contains('btn-add-pack-item')) {
        currentPackContext = e.target.dataset.pack;
        openProductPicker();
        return;
    }

    const removeBtn = e.target.closest('.btn-remove-pack-item');
    if (removeBtn) {
        const packKey = removeBtn.dataset.pack;
        const index = parseInt(removeBtn.dataset.index);
        currentConfig.packs[packKey].splice(index, 1);
        renderPacks();
    }
});

// --- AUTRES LISTENERS ---

pickerSearch.addEventListener('input', (e) => {
    renderPickerList(e.target.value);
});

btnClosePicker.addEventListener('click', () => pickerModal.style.display = 'none');
pickerModal.addEventListener('mousedown', (e) => {
    if (e.target === pickerModal) pickerModal.style.display = 'none';
});

btnCreateCustom.addEventListener('click', () => {
    const defaultSource = availableFolders.length > 0 ? availableFolders[0] : '';

    if (currentPackContext) {
        // Ajout Pack
        if (!currentConfig.packs[currentPackContext]) {
            currentConfig.packs[currentPackContext] = [];
        }
        currentConfig.packs[currentPackContext].push({
            name: '',
            qty: 1,
            source: defaultSource,
            dest: ''
        });
        renderPacks();
    } else {
        // Ajout Catalogue
        addProductToCatalog({
            key: `custom_${Date.now()}`,
            name: '',
            price: 0,
            type: 'product',
            active: true,
            source_folder: defaultSource,
            destination_folder: ''
        });
    }
    pickerModal.style.display = 'none';
});

function addProductToCatalog(newProduct) {
    currentConfig.catalog.push(newProduct);
    renderCatalog();
    setTimeout(() => {
        const inputs = productListContainer.querySelectorAll('.input-name');
        if (inputs.length > 0) {
            const lastInput = inputs[inputs.length - 1];
            lastInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            lastInput.focus();
            lastInput.select();
        }
    }, 100);
}

// Interactivité Catalogue
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
        target.style.border = ''; target.style.color = ''; target.style.background = '';
    } else if (target.classList.contains('input-dest')) {
        product.destination_folder = target.value;
    } else if (target.classList.contains('input-price')) {
        product.price = parseFloat(target.value);
    } else if (target.classList.contains('check-active')) {
        product.active = target.checked;
        renderCatalog(); 
        renderPacks();
    }
});

// Interactivité Packs
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
        target.style.border = ''; target.style.color = ''; target.style.background = '';
    } else if (target.classList.contains('pack-input-dest')) {
        item.dest = target.value;
    }
});

// GESTION IMPORT
if (btnOpenImport) {
    btnOpenImport.addEventListener('click', async () => {
        const result = await window.api.getSchools();
        if (result.success) {
            importSelect.innerHTML = '<option value="">-- Choisir une école source --</option>';
            const otherSchools = result.schools.filter(s => s.id != currentSchoolId);
            if (otherSchools.length === 0) { alert("Aucune autre école disponible."); return; }
            otherSchools.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.id;
                opt.textContent = s.name;
                importSelect.appendChild(opt);
            });
            importModal.style.display = 'flex';
        }
    });
}
if (btnCancelImport) btnCancelImport.addEventListener('click', () => importModal.style.display = 'none');
if (btnConfirmImport) {
    btnConfirmImport.addEventListener('click', async () => {
        const sourceSchoolId = importSelect.value;
        if (!sourceSchoolId) return;
        const result = await window.api.getSchoolById(sourceSchoolId);
        if (result.success) {
            const importedConfig = result.school.products;
            const missingFolders = new Set();
            if (importedConfig.catalog) {
                importedConfig.catalog.forEach(p => {
                    if (p.active && p.type !== 'bundle' && p.source_folder && !availableFolders.includes(p.source_folder)) {
                        missingFolders.add(p.source_folder);
                    }
                });
            }
            if (importedConfig.packs) {
                Object.values(importedConfig.packs).forEach(packItems => {
                    packItems.forEach(item => {
                        if (item.source && !availableFolders.includes(item.source)) {
                            missingFolders.add(item.source);
                        }
                    });
                });
            }
            if (missingFolders.size > 0) {
                const list = Array.from(missingFolders).join(', ');
                const confirmImport = confirm(`ATTENTION : Certains dossiers utilisés par des produits ACTIFS sont introuvables ici :\n👉 ${list}\n\nVoulez-vous importer quand même ?`);
                if (!confirmImport) return;
            }
            currentConfig = importedConfig;
            renderCatalog();
            renderPacks();
            importModal.style.display = 'none';
            alert("Importation réussie !");
        }
    });
}

function goBack() {
    if (navContext && navContext.from === 'school') {
        window.api.navigateToSchool({
            schoolId: currentSchoolId,
            activeClass: navContext.activeClass
        });
    } else {
        window.api.navigate('index');
    }
}

if (cancelConfigBtn) cancelConfigBtn.addEventListener('click', () => goBack());

if (configForm) {
    configForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const blockingErrors = [];
        if (currentConfig.catalog) {
            currentConfig.catalog.forEach(p => {
                if (p.active === true) {
                    if (!p.name || p.name.trim() === '') blockingErrors.push(`• Produit sans nom.`);
                    if (p.type !== 'bundle' && p.source_folder && !availableFolders.includes(p.source_folder)) {
                        blockingErrors.push(`• Produit "${p.name}" : Dossier "${p.source_folder}" introuvable`);
                    }
                    if (p.type !== 'bundle' && (!p.destination_folder || p.destination_folder.trim() === '')) {
                        blockingErrors.push(`• Produit "${p.name}" : Dossier export manquant`);
                    }
                    if (!p.price || p.price <= 0) blockingErrors.push(`• Produit "${p.name}" : Prix incorrect`);
                }
            });
        }
        if (currentConfig.packs) {
            for (const [packKey, packItems] of Object.entries(currentConfig.packs)) {
                const parentBundle = currentConfig.catalog.find(p => p.key === packKey);
                if (parentBundle && parentBundle.active === false) continue; 
                packItems.forEach(item => {
                    if (item.source && !availableFolders.includes(item.source)) {
                        blockingErrors.push(`• Élément de pack "${item.name}" : Dossier "${item.source}" introuvable`);
                    }
                });
            }
        }
        if (blockingErrors.length > 0) {
            alert("⛔ Impossible d'enregistrer. Erreurs sur produits ACTIFS :\n\n" + blockingErrors.join('\n'));
            return;
        }
        const result = await window.api.saveSchoolConfig({
            schoolId: currentSchoolId,
            config: currentConfig,
            schoolName: schoolNameInput ? schoolNameInput.value : null 
        });
        if (result.success) goBack();
        else alert(`Erreur: ${result.error}`);
    });
}