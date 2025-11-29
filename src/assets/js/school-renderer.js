// src/assets/js/school-renderer.js

// --- SÉLECTION DES ÉLÉMENTS DU DOM ---
const schoolNameDisplay = document.getElementById('school-name-display');
const totalAmountDisplay = document.getElementById('total-amount-display');
const categoryButtonsDiv = document.getElementById('category-buttons');
const trombinoscopeGrid = document.getElementById('trombinoscope-grid');
const finalActionsFooter = document.querySelector('.final-actions');
const editConfigBtn = document.getElementById('edit-config-btn');
const studentSearchInput = document.getElementById('student-search-input'); // Barre de recherche
const showStatsBtn = document.getElementById('show-stats-btn');
const statsModal = document.getElementById('stats-modal');
const closeStatsBtn = document.getElementById('close-stats-btn');

// --- VARIABLES GLOBALES ---
let currentSchool = null;
let schoolOrders = [];
let schoolClasses = [];
let thumbnailFolderPath = '';
let searchTimeout = null; // Pour le délai de recherche
let lastActiveCategory = null;

// --- FONCTIONS UTILITAIRES ---

function updateTotalAmountDisplay() {
    const total = schoolOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    totalAmountDisplay.textContent = `${total.toFixed(2)} €`;
}

/**
 * FONCTION CENTRALE DE GESTION DU FOOTER
 */
function renderFooter(mode) {
    finalActionsFooter.innerHTML = '';
    finalActionsFooter.className = 'final-actions'; 

    const backBtn = document.createElement('button');
    backBtn.className = 'btn-secondary';
    backBtn.textContent = '← Retour à la liste des écoles';
    backBtn.addEventListener('click', () => {
        window.api.navigate('index');
    });
    finalActionsFooter.appendChild(backBtn);

    if (mode === 'default') {
        
        // Conteneur pour grouper les boutons à droite
        const rightGroup = document.createElement('div');
        rightGroup.style.display = 'flex';
        rightGroup.style.gap = '10px';
        rightGroup.style.marginLeft = 'auto'; // Pousse tout à droite

        // A. Bouton Stats (Icone seule)
        const statsBtn = document.createElement('button');
        statsBtn.id = 'show-stats-footer-btn'; // ID unique
        statsBtn.className = 'btn-secondary'; // Style rond
        statsBtn.innerHTML = '📊';
        statsBtn.title = "Statistiques";
        statsBtn.style.fontSize = "1.2rem";
        
        // Logique du clic (identique à avant)
        statsBtn.addEventListener('click', async () => {
            if (!currentSchool) return;
            const result = await window.api.getSchoolStats(currentSchool.id);
            
            if (result.success) {
                const stats = result.stats;
                document.getElementById('stat-ca').textContent = stats.totalRevenue.toFixed(2) + ' €';
                document.getElementById('stat-orders').textContent = stats.totalOrders;
                document.getElementById('stat-basket').textContent = stats.averageBasket.toFixed(2) + ' €';

                const tbody = document.getElementById('stats-table-body');
                tbody.innerHTML = '';
                for (const [name, data] of Object.entries(stats.products)) {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="padding: 0.6rem; border-bottom: 1px solid #eee;">${name}</td>
                        <td style="padding: 0.6rem; border-bottom: 1px solid #eee; text-align: center;">${data.qty}</td>
                        <td style="padding: 0.6rem; border-bottom: 1px solid #eee; text-align: right; font-weight: 500;">${data.revenue.toFixed(2)} €</td>
                    `;
                    tbody.appendChild(tr);
                }
                document.getElementById('stats-modal').style.display = 'flex';
            } else {
                alert("Erreur stats : " + result.error);
            }
        });
        
        // B. Bouton Traitement
        const processBtn = document.createElement('button');
        processBtn.id = 'process-orders-btn';
        processBtn.className = 'btn-primary-green';
        processBtn.textContent = '🚀 Lancer le Traitement Final';
        
        processBtn.addEventListener('click', async () => {
            // ... (logique traitement inchangée) ...
            if (!currentSchool || !currentSchool.id) return;
            if (confirm("Lancer le traitement final ?")) {
                processBtn.disabled = true;
                processBtn.textContent = 'En cours...';
                
                // MODALE PROGRESSION
                const modal = document.getElementById('processing-modal');
                const progressBar = document.getElementById('process-progress-bar');
                const statusText = document.getElementById('process-status-text');
                const cancelBtn = document.getElementById('cancel-process-btn');
                
                modal.style.display = 'flex';
                progressBar.value = 0;
                statusText.textContent = "Démarrage...";
                
                cancelBtn.onclick = () => { window.api.cancelProcess(); statusText.textContent = "Annulation..."; cancelBtn.disabled = true; };

                const result = await window.api.processOrders({ schoolId: currentSchool.id });
                
                modal.style.display = 'none';
                processBtn.disabled = false;
                processBtn.textContent = '🚀 Lancer le Traitement Final';
                cancelBtn.disabled = false;

                if (result.cancelled) alert("Annulé.");
                else alert(result.message);
            }
        });

        // Ajout au groupe puis au footer
        rightGroup.appendChild(statsBtn);
        rightGroup.appendChild(processBtn);
        finalActionsFooter.appendChild(rightGroup);

    } else if (mode === 'group_edit') {
        finalActionsFooter.classList.add('no-border'); 

        const saveBtn = document.createElement('button');
        saveBtn.id = 'group-save-btn-footer';
        saveBtn.className = 'btn-primary';
        saveBtn.textContent = 'Enregistrer les modifications';
        
        saveBtn.addEventListener('click', async () => {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Enregistrement...';
            try {
                const classPhotos = {};
                const inputs = document.querySelectorAll('.group-order-container .quantity-input');
                
                inputs.forEach(input => {
                    const quantity = parseInt(input.value);
                    const className = input.dataset.className;
                    if (quantity > 0 && className) {
                        classPhotos[className] = quantity;
                    }
                });
                
                const result = await window.api.saveGroupOrders({ schoolId: currentSchool.id, classPhotos });
                
                if (result.success) {
                    const data = await window.api.getInitialSchoolData(currentSchool.id);
                    schoolOrders = data.orders;
                    updateTotalAmountDisplay();
                    alert('Commandes de photos de classe enregistrées !');
                    displayGroupOrderInterface();
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                console.error(error);
                alert(`Erreur lors de l'enregistrement : ${error.message}`);
                saveBtn.disabled = false;
                saveBtn.textContent = 'Enregistrer les modifications';
            }
        });
        finalActionsFooter.appendChild(saveBtn);
    }
}

function displayTrombinoscope(photos) {
    renderFooter('default');

    trombinoscopeGrid.classList.remove('layout-block');
    const fragment = document.createDocumentFragment();
    
    if (photos.length === 0) {
        trombinoscopeGrid.innerHTML = '<p>Aucune photo trouvée.</p>';
        return;
    }
    
    const studentsWithOrders = new Set(schoolOrders.map(order => order.studentIdentifier));
    
    photos.forEach(photo => {
        const card = document.createElement('div');
        card.className = 'student-card';
        card.dataset.fileName = photo.fileName;
        
        const hasOrder = studentsWithOrders.has(photo.fileName);
        
        card.innerHTML = `
            <div class="student-photo-container">
                <img src="" alt="${photo.displayName}">
                ${hasOrder ? '<div class="order-check-mark">✅</div>' : ''}
            </div>
            <p class="student-name">${photo.displayName}</p>
        `;
        
        const imageElement = card.querySelector('img');
        // Sécurité : on s'assure que thumbnailFolderPath est défini
        const basePath = thumbnailFolderPath || '';
        const imagePath = `${basePath}/${photo.fileName}`.replace(/\\/g, '/');
        
        const tempImage = new Image();
        tempImage.onload = () => {
            imageElement.src = tempImage.src;
            imageElement.classList.add('loaded');
        };
        tempImage.src = `file://${imagePath}`;
        fragment.appendChild(card);
    });
    
    trombinoscopeGrid.innerHTML = '';
    trombinoscopeGrid.appendChild(fragment);
}

function displayCategoryButtons(classes) {
    categoryButtonsDiv.innerHTML = '';
    
    classes.forEach(className => {
        const button = document.createElement('button');
        button.className = 'category-btn';
        button.textContent = `Classe ${className}`;
        button.dataset.className = className;
        categoryButtonsDiv.appendChild(button);
    });
    
    const fratriesButton = document.createElement('button');
    fratriesButton.className = 'category-btn special';
    fratriesButton.textContent = 'Fratries';
    fratriesButton.dataset.className = '99 F';
    categoryButtonsDiv.appendChild(fratriesButton);
    
    const classesButton = document.createElement('button');
    classesButton.className = 'category-btn special';
    classesButton.textContent = 'Classes';
    classesButton.dataset.className = 'CLASSES';
    categoryButtonsDiv.appendChild(classesButton);
}

function displayGroupOrderInterface() {
    trombinoscopeGrid.classList.add('layout-block');
    trombinoscopeGrid.innerHTML = '';
    
    const container = document.createElement('div');
    container.className = 'group-order-container';
    container.innerHTML = `<h3>Commandes de Photos de Classe Seules</h3><p>Indiquez le nombre de photos de classe supplémentaires à commander pour chaque classe.</p>`;
    
    const groupOrder = schoolOrders.find(o => o.studentIdentifier === 'GROUP_PHOTO_ONLY');
    const quantitiesMap = new Map();
    if (groupOrder) {
        const items = JSON.parse(groupOrder.items);
        items.forEach(item => quantitiesMap.set(item.className, item.quantity));
    }

    const listContainer = document.createElement('div');
    listContainer.className = 'group-orders-list';

    schoolClasses.forEach(className => {
        const quantity = quantitiesMap.get(className) || 0;
        const row = document.createElement('div');
        row.className = 'product-item-row group-item'; 
        
        row.innerHTML = `
            <span class="product-name">Classe ${className}</span>
            <div class="quantity-selector">
                <button class="quantity-btn minus" data-class-name="${className}">-</button>
                <input type="number" value="${quantity}" min="0" class="quantity-input" data-class-name="${className}" readonly>
                <button class="quantity-btn plus" data-class-name="${className}">+</button>
            </div>
        `;
        listContainer.appendChild(row);
    });

    container.appendChild(listContainer);
    trombinoscopeGrid.appendChild(container);
    renderFooter('group_edit');
}

function initializePageWithData(data) {
    if (!data) {
        console.error("Données initiales manquantes");
        return;
    }
    
    currentSchool = data.school;
    schoolOrders = data.orders;
    schoolClasses = data.classes;
    hasExplicitFratrie = data.hasExplicitFratrie; // MISE À JOUR

    renderFooter('default');

    window.api.getThumbnailPath(currentSchool.id).then(path => {
        thumbnailFolderPath = path;
        
        schoolNameDisplay.innerHTML = `<span class="icon">🏫</span> ${currentSchool.name}`;
        updateTotalAmountDisplay();
        displayCategoryButtons(schoolClasses);

        let buttonToClick;
        if (data.activeClass && data.activeClass !== 'SEARCH') { // Évite de re-cliquer après une recherche
            buttonToClick = categoryButtonsDiv.querySelector(`.category-btn[data-class-name="${data.activeClass}"]`);
        }
        if (!buttonToClick) {
            buttonToClick = categoryButtonsDiv.querySelector('.category-btn:not(.special)');
        }
        
        if (buttonToClick) {
            buttonToClick.click();
        } else {
            trombinoscopeGrid.innerHTML = '<p>Aucune classe trouvée.</p>';
        }
    });
}

// --- ÉCOUTEURS D'ÉVÉNEMENTS ---

// 1. BOUTON CONFIGURER
if (editConfigBtn) {
    editConfigBtn.addEventListener('click', () => {
        if (currentSchool && currentSchool.id) {
            // NOUVEAU : On passe un objet avec le contexte de navigation
            window.api.navigateToSchoolConfig({
                schoolId: currentSchool.id,
                from: 'school', // On signale qu'on vient de la vue détail
                activeClass: lastActiveCategory // On sauvegarde l'onglet actif
            });
        }
    });
}

// 2. BARRE DE RECHERCHE (NOUVEAU & CORRIGÉ)
if (studentSearchInput) {
    studentSearchInput.addEventListener('input', (e) => {
        const query = e.target.value;
        
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {

        // SI RECHERCHE VIDE -> RETOUR À LA NORMALE
        if (query.length === 0) {
            // On cherche le bouton de la dernière catégorie ou le premier par défaut
            let targetBtn = null;
            if (lastActiveCategory) {
                targetBtn = categoryButtonsDiv.querySelector(`.category-btn[data-class-name="${lastActiveCategory}"]`);
            }
            if (!targetBtn) {
                // Fallback sur le premier bouton (Classe 1)
                targetBtn = categoryButtonsDiv.querySelector('.category-btn:not(.special)');
            }
            
            if (targetBtn) targetBtn.click();
            return;
        }

            // Pas de recherche sous 2 caractères
            if (query.length < 2) return;

            // Désactivation visuelle des boutons de classe
            document.querySelectorAll('.category-btn.active').forEach(b => b.classList.remove('active'));

            try {
                const result = await window.api.searchAllPhotos({ 
                    sourceFolderPath: currentSchool.sourceFolderPath, 
                    query: query 
                });

                if (result.success) {
                    console.log("Résultats trouvés :", result.photos.length); // DEBUG
                    displayTrombinoscope(result.photos);
                } else {
                    console.error("Erreur recherche backend:", result.error);
                }
            } catch (error) {
                console.error("Erreur appel API recherche:", error);
            }
        }, 300);
    });

    // Validation avec Entrée
    studentSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const firstCard = trombinoscopeGrid.querySelector('.student-card');
            if (firstCard) firstCard.click();
        }
    });
}

// 3. CLICS CATÉGORIES
categoryButtonsDiv.addEventListener('click', async (event) => {
    if (!event.target.matches('.category-btn')) return;
    const button = event.target;
    const category = button.dataset.className;

    lastActiveCategory = category;
    
    if (!currentSchool || !category) return;
    
    // Reset de la barre de recherche si on change de classe manuellement
    if (studentSearchInput) studentSearchInput.value = '';

    document.querySelectorAll('.category-btn.active').forEach(b => b.classList.remove('active'));
    button.classList.add('active');
    
    if (category === 'CLASSES') {
        displayGroupOrderInterface();
    } else {
        let result;
        if (category === '99 F') {
            result = await window.api.getFratriePhotos({ sourceFolderPath: currentSchool.sourceFolderPath });
        } else {
            result = await window.api.getPhotosByClass({ sourceFolderPath: currentSchool.sourceFolderPath, className: category });
        }

        if (result && result.success) {
            displayTrombinoscope(result.photos);
        } else if (result) {
            trombinoscopeGrid.innerHTML = `<p style="color: red;">Erreur: ${result.error}</p>`;
        }
    }
});

// 4. CLICS TROMBINOSCOPE
trombinoscopeGrid.addEventListener('click', async (event) => {
    const target = event.target;
    const card = target.closest('.student-card');
    if (card) {
        const photoFileName = card.dataset.fileName;
        
        if (photoFileName && currentSchool) {
            let determinedClass = null;
            let determinedCategoryName = 'Inconnue';

            const getClassFromFilename = (fname) => {
                 const matchStd = fname.match(/^(\d+)/);
                 if (matchStd) return parseInt(matchStd[1], 10).toString();
                 const matchCode = fname.match(/[_-](\d{2})(\d{2})\./);
                 if (matchCode) return parseInt(matchCode[1], 10).toString();
                 return null;
            };

            const fileClass = getClassFromFilename(photoFileName);

            if (fileClass && schoolClasses.includes(fileClass)) {
                determinedClass = fileClass;
                determinedCategoryName = `Classe ${fileClass}`;
            } else if (photoFileName.startsWith('99 F')) {
                determinedClass = '99 F';
                determinedCategoryName = 'Fratries';
            }

            if (!determinedClass) {
                const activeCategoryButton = categoryButtonsDiv.querySelector('.category-btn.active');
                if (activeCategoryButton) {
                    determinedClass = activeCategoryButton.dataset.className;
                    determinedCategoryName = activeCategoryButton.textContent;
                }
            }

            // MISE À JOUR : On passe le flag
            window.api.navigateToOrder({
                schoolId: currentSchool.id,
                photoFileName: photoFileName,
                categoryName: determinedCategoryName,
                activeClass: determinedClass,
                hasExplicitFratrie: hasExplicitFratrie
            });
        }
        return;
    }

    // --- CAS 2 : Clic sur +/- dans l'interface de groupe ---
    if (target.matches('.quantity-btn') && target.dataset.className) {
        const className = target.dataset.className;
        const row = target.closest('.product-item-row');
        const input = row.querySelector(`.quantity-input[data-class-name="${className}"]`);
        let quantity = parseInt(input.value);
        if (target.matches('.plus')) quantity++;
        else if (target.matches('.minus') && quantity > 0) quantity--;
        input.value = quantity;
    }
});

document.addEventListener('DOMContentLoaded', () => {
    if (window.INITIAL_DATA) {
        initializePageWithData(window.INITIAL_DATA);
    } else {
        window.api.onSchoolData(async (schoolId) => {
            const data = await window.api.getInitialSchoolData(schoolId);
            initializePageWithData(data);
        });
    }
});

window.api.onProcessProgress(({ step, percent }) => {
    const progressBar = document.getElementById('process-progress-bar');
    const statusText = document.getElementById('process-status-text');
    if (progressBar) {
        progressBar.value = percent;
        statusText.textContent = `${step} (${percent}%)`;
    }
});


if (showStatsBtn) {
    showStatsBtn.addEventListener('click', async () => {
        if (!currentSchool) return;

        // 1. Charger les stats
        const result = await window.api.getSchoolStats(currentSchool.id);
        
        if (result.success) {
            const stats = result.stats;
            
            // 2. Remplir les KPIs
            document.getElementById('stat-ca').textContent = stats.totalRevenue.toFixed(2) + ' €';
            document.getElementById('stat-orders').textContent = stats.totalOrders;
            document.getElementById('stat-basket').textContent = stats.averageBasket.toFixed(2) + ' €';

            // 3. Remplir le tableau
            const tbody = document.getElementById('stats-table-body');
            tbody.innerHTML = '';
            
            for (const [name, data] of Object.entries(stats.products)) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding: 0.6rem; border-bottom: 1px solid #eee;">${name}</td>
                    <td style="padding: 0.6rem; border-bottom: 1px solid #eee; text-align: center;">${data.qty}</td>
                    <td style="padding: 0.6rem; border-bottom: 1px solid #eee; text-align: right; font-weight: 500;">${data.revenue.toFixed(2)} €</td>
                `;
                tbody.appendChild(tr);
            }

            // 4. Afficher la modale
            statsModal.style.display = 'flex';
        } else {
            alert("Impossible de charger les statistiques : " + result.error);
        }
    });
}

if (closeStatsBtn) {
    closeStatsBtn.addEventListener('click', () => {
        statsModal.style.display = 'none';
    });
}

// Fermer si on clique en dehors de la modale
window.addEventListener('click', (e) => {
    if (e.target === statsModal) {
        statsModal.style.display = 'none';
    }
});