const schoolNameInput = document.getElementById('school-name-input');
const productListContainer = document.getElementById('product-list-container');
const packsContainer = document.getElementById('packs-container');
const configForm = document.getElementById('school-config-form');
const addProductBtn = document.getElementById('add-product-btn');
const cancelConfigBtn = document.getElementById('cancel-config-btn');

// Éléments Import
const btnOpenImport = document.getElementById('btn-open-import');
const importModal = document.getElementById('import-modal');
const importSelect = document.getElementById('import-school-select');
const btnCancelImport = document.getElementById('btn-cancel-import');
const btnConfirmImport = document.getElementById('btn-confirm-import');

// CORRECTION : On initialise vide. On ne force plus 'GRJPEG' ou '18x24'.
let availableFolders = []; 

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
        // CORRECTION : On utilise UNIQUEMENT les dossiers trouvés sur le disque.
        availableFolders = foldersResult.folders.sort();
        console.log("Dossiers réels disponibles :", availableFolders);
    } else {
        console.warn("Aucun sous-dossier détecté ou erreur scan:", foldersResult.error);
        availableFolders = []; // Sécurité
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
        
        // NOUVEAU : Si désactivé, on grise la ligne
        if (!product.active) {
            row.style.opacity = '0.5';
            row.style.pointerEvents = 'auto'; // On garde les interactions possibles (surtout le switch)
        }
        
        const isBundle = product.type === 'bundle';
        const currentSource = product.source_folder || '18x24';
        const currentDest = product.destination_folder || product.name;
        
        // Validation : Le dossier source existe-t-il ?
        const sourceExists = availableFolders.includes(currentSource);
        
        // Construction des options
        let folderOptions = availableFolders.map(f => 
            `<option value="${f}" ${currentSource === f ? 'selected' : ''}>${f}</option>`
        ).join('');

        // Ajout visuel si dossier manquant
        if (!isBundle && !sourceExists) {
            folderOptions = `<option value="${currentSource}" selected>⚠️ ${currentSource} (Introuvable)</option>` + folderOptions;
        }
        
        // NOUVEAU : Le style rouge ne s'applique QUE si le produit est ACTIF
        const warningStyle = (!isBundle && !sourceExists && product.active) ? 'border: 2px solid red; color: #d32f2f; background: #ffebee;' : '';

        row.innerHTML = `
            <div class="col-name">
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
                <button type="button" class="btn-primary btn-small btn-add-pack-item" data-pack="${packKey}">+ Ajouter un élément</button>
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
            
            // Validation
            const sourceExists = availableFolders.includes(currentSource);
            const warningStyle = !sourceExists ? 'border: 2px solid red; color: #d32f2f; background: #ffebee;' : '';

            // Construction Options
            let folderOptions = availableFolders.map(f => 
                `<option value="${f}" ${currentSource === f ? 'selected' : ''}>${f}</option>`
            ).join('');
            
            // Ajout visuel si dossier manquant
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
        // Reset style
        target.style.border = '';
        target.style.color = '';
        target.style.background = '';
    } else if (target.classList.contains('input-dest')) {
        product.destination_folder = target.value;
    } else if (target.classList.contains('input-price')) {
        product.price = parseFloat(target.value);
    } else if (target.classList.contains('check-active')) {
        product.active = target.checked;
        // NOUVEAU : On re-rend tout le catalogue pour mettre à jour :
        // 1. L'opacité de la ligne
        // 2. La bordure rouge (qui doit disparaître si désactivé)
        renderCatalog();
        renderPacks(); // Pour mettre à jour les dépendances éventuelles
    }
});

// Ajout Produit
if (addProductBtn) {
    addProductBtn.addEventListener('click', () => {
        const newKey = `custom_${Date.now()}`;
        // On prend le premier dossier dispo ou un placeholder
        const defaultSource = availableFolders.length > 0 ? availableFolders[0] : '';
        
        currentConfig.catalog.push({
            key: newKey, name: 'Nouveau Produit', price: 10.00, type: 'product',
            active: true, source_folder: defaultSource, destination_folder: 'Nouveau Dossier'
        });
        renderCatalog();
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
        
        const defaultSource = availableFolders.length > 0 ? availableFolders[0] : '';
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
        // Reset style
        target.style.border = '';
        target.style.color = '';
        target.style.background = '';
    } else if (target.classList.contains('pack-input-dest')) {
        item.dest = target.value;
    }
});


// --- GESTION DE L'IMPORTATION ---

if (btnOpenImport) {
    btnOpenImport.addEventListener('click', async () => {
        const result = await window.api.getSchools();
        if (result.success) {
            importSelect.innerHTML = '<option value="">-- Choisir une école source --</option>';
            const otherSchools = result.schools.filter(s => s.id != currentSchoolId);
            
            if (otherSchools.length === 0) {
                alert("Aucune autre école disponible pour l'import.");
                return;
            }

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

if (btnCancelImport) {
    btnCancelImport.addEventListener('click', () => {
        importModal.style.display = 'none';
    });
}

if (btnConfirmImport) {
    btnConfirmImport.addEventListener('click', async () => {
        const sourceSchoolId = importSelect.value;
        if (!sourceSchoolId) return;

        const result = await window.api.getSchoolById(sourceSchoolId);
        if (result.success) {
            const importedConfig = result.school.products;
            
            // --- VALIDATION DES DOSSIERS ---
            const missingFolders = new Set();

            if (importedConfig.catalog) {
                importedConfig.catalog.forEach(p => {
                    // Vérif uniquement si actif
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
                
                const confirmImport = confirm(
                    `ATTENTION : Incohérence de dossiers détectée.\n\n` +
                    `La configuration importée contient des produits ACTIFS faisant référence à des dossiers inexistants :\n` +
                    `👉 ${list}\n\n` +
                    `Voulez-vous importer quand même ?\n`
                );

                if (!confirmImport) return;
            }

            // Si tout est OK
            currentConfig = importedConfig;
            renderCatalog();
            renderPacks();
            importModal.style.display = 'none';
            
            if (missingFolders.size > 0) {
                alert("Configuration importée.\nVeuillez corriger ou désactiver les produits en erreur (marqués en rouge).");
            } else {
                alert("Configuration importée avec succès !");
            }

        } else {
            alert("Erreur lors de la récupération de l'école source.");
        }
    });
}

// --- BOUTONS FOOTER & SAUVEGARDE BLOQUANTE ---

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

        // --- VALIDATION BLOQUANTE AVANT SAUVEGARDE ---
        const blockingErrors = [];

        // 1. Vérif Catalogue
        if (currentConfig.catalog) {
            currentConfig.catalog.forEach(p => {
                // CORRECTION : On ne valide QUE si le produit est ACTIF (switch on)
                if (p.active === true) {
                    // Si ce n'est pas un bundle et que le dossier source n'est pas dans la liste dispo
                    if (p.type !== 'bundle' && p.source_folder && !availableFolders.includes(p.source_folder)) {
                        blockingErrors.push(`• Produit "${p.name}" : Dossier "${p.source_folder}" introuvable`);
                    }
                }
            });
        }

        // 2. Vérif Packs
        if (currentConfig.packs) {
            // Pour chaque pack (ex: pochette_complete)
            for (const [packKey, packItems] of Object.entries(currentConfig.packs)) {
                
                // On vérifie si le produit parent (le bundle) est actif dans le catalogue
                const parentBundle = currentConfig.catalog.find(p => p.key === packKey);
                // Si le bundle est inactif, pas besoin de valider son contenu technique
                if (parentBundle && parentBundle.active === false) {
                    continue; 
                }

                packItems.forEach(item => {
                    if (item.source && !availableFolders.includes(item.source)) {
                        blockingErrors.push(`• Élément de pack "${item.name}" : Dossier "${item.source}" introuvable`);
                    }
                });
            }
        }

        // SI ERREURS -> ALERTE + STOP
        if (blockingErrors.length > 0) {
            alert(
                "⛔ Impossible d'enregistrer la configuration.\n\n" +
                "Des produits ACTIFS utilisent des dossiers introuvables :\n\n" +
                blockingErrors.join('\n') + "\n\n" +
                "👉 Solution : Corrigez le dossier source ou DÉSACTIVEZ le produit."
            );
            return; // ON NE SAUVEGARDE PAS
        }

        // --- SAUVEGARDE SI TOUT EST OK ---
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