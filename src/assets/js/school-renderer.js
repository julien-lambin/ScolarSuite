// src/assets/js/school-renderer.js

// --- SÉLECTION DES ÉLÉMENTS DU DOM ---
const schoolNameDisplay = document.getElementById('school-name-display');
const totalAmountDisplay = document.getElementById('total-amount-display');
const categoryButtonsDiv = document.getElementById('category-buttons');
const trombinoscopeGrid = document.getElementById('trombinoscope-grid');
const finalActionsFooter = document.querySelector('.final-actions');
const editConfigBtn = document.getElementById('edit-config-btn');
const studentSearchInput = document.getElementById('student-search-input'); // Barre de recherche

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
        const processBtn = document.createElement('button');
        processBtn.id = 'process-orders-btn';
        processBtn.className = 'btn-primary-green';
        processBtn.textContent = '🚀 Lancer le Traitement Final';
        
        processBtn.addEventListener('click', async () => {
            if (!currentSchool) return;
            
            // Afficher la modale
            const modal = document.getElementById('processing-modal');
            const progressBar = document.getElementById('process-progress-bar');
            const statusText = document.getElementById('process-status-text');
            const cancelBtn = document.getElementById('cancel-process-btn');
            
            modal.style.display = 'flex';
            progressBar.value = 0;
            statusText.textContent = "Démarrage...";
            processBtn.disabled = true;

            // Gestion du clic Annuler
            cancelBtn.onclick = () => {
                window.api.cancelProcess();
                statusText.textContent = "Annulation en cours...";
                cancelBtn.disabled = true;
            };

            const result = await window.api.processOrders({ schoolId: currentSchool.id });
            
            // Cacher la modale
            modal.style.display = 'none';
            processBtn.disabled = false;
            cancelBtn.disabled = false;

            if (result.cancelled) {
                alert("Traitement annulé par l'utilisateur.");
            } else {
                alert(result.message);
            }
        });
        finalActionsFooter.appendChild(processBtn);

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

    renderFooter('default');

    window.api.getThumbnailPath(currentSchool.id).then(path => {
        thumbnailFolderPath = path;
        
        schoolNameDisplay.innerHTML = `<span class="icon">🏫</span> ${currentSchool.name}`;
        updateTotalAmountDisplay();
        displayCategoryButtons(schoolClasses);

        let buttonToClick;
        if (data.activeClass) {
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
            window.api.navigateToSchoolConfig(currentSchool.id);
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

    // --- CAS 1 : Clic sur une carte élève (Navigation vers commande) ---
    const card = target.closest('.student-card');
    if (card) {
        const photoFileName = card.dataset.fileName;
        
        if (photoFileName && currentSchool) {
            // LOGIQUE DE DÉTECTION DE LA CLASSE
            let determinedClass = null;
            let determinedCategoryName = 'Inconnue';

            // 1. On essaie de trouver la classe qui correspond au début du nom de fichier
            // On trie par longueur décroissante pour éviter qu'une classe "10" soit détectée comme "1"
            const sortedClasses = [...schoolClasses].sort((a, b) => b.length - a.length);
            
            for (const cls of sortedClasses) {
                // On vérifie si le fichier commence par "NUMERO " (ex: "1 MAT 1...")
                // ou si c'est une fratrie "99 F..."
                if (photoFileName.startsWith(cls + ' ')) {
                    determinedClass = cls;
                    determinedCategoryName = (cls === '99 F') ? 'Fratries' : `Classe ${cls}`;
                    break;
                }
            }

            // 2. Si la détection par nom échoue, on regarde le bouton actif (cas classique hors recherche)
            if (!determinedClass) {
                const activeCategoryButton = categoryButtonsDiv.querySelector('.category-btn.active');
                if (activeCategoryButton) {
                    determinedClass = activeCategoryButton.dataset.className;
                    determinedCategoryName = activeCategoryButton.textContent;
                }
            }

            // 3. Navigation avec les bonnes infos
            window.api.navigateToOrder({
                schoolId: currentSchool.id,
                photoFileName: photoFileName,
                categoryName: determinedCategoryName, // Sera "Classe 1" au lieu de "Recherche"
                activeClass: determinedClass          // Sera "1"
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