// On garde juste une association visuelle pour les icônes, car elles ne sont pas en BDD
const PRODUCT_ICONS = {
    'pochette_complete': '📦',
    'pochette_fratrie_sans': '👨‍👩‍👧',
    'pochette_fratrie_avec': '👨‍👩‍👧‍👦',
    'photo_classe': '🖼️',
    'tirage_18x24': '🖼️',
    'multiformat_2x': '🖼️',
    'multiformat_mix': '🖼️',
    'magnet': '✨',
    'agrandissement': '📐',
    'default': '🔹' // Icône par défaut pour les nouveaux produits créés
};

const photoContainer = document.getElementById('order-photo-container');
const studentPhoto = document.getElementById('student-photo');
const photoPlaceholder = document.getElementById('photo-placeholder');
const studentName = document.getElementById('student-name');
const studentCategory = document.getElementById('student-category');
const productList = document.getElementById('product-list');
const totalPriceEl = document.getElementById('total-price');
const cancelBtn = document.getElementById('cancel-btn');
const saveBtn = document.getElementById('save-btn');

let currentOrderData = {};
let schoolClasses = [];
// NOUVEAU : On stocke le catalogue de l'école chargée ici
let schoolCatalog = []; 

/**
 * Récupère les infos d'un produit depuis le catalogue chargé
 */
function getProductFromCatalog(key) {
    return schoolCatalog.find(p => p.key === key);
}

/**
 * Active ou désactive le select d'une ligne en fonction de la quantité.
 */
function updateSelectState(row) {
    const input = row.querySelector('.quantity-input');
    const select = row.querySelector('.class-selector');
    if (!select || !input) return;

    const quantity = parseInt(input.value);
    if (quantity > 0) {
        select.disabled = false;
        select.required = true;
    } else {
        select.disabled = true;
        select.required = false;
        select.value = "";
    }
}

/**
 * Crée et ajoute une nouvelle ligne "Photo de classe" clonée.
 */
function cloneClassPhotoRow(sourceRow) {
    if (!sourceRow) {
        sourceRow = productList.querySelector('.product-item-row[data-key="photo_classe"]');
    }
    if (!sourceRow) return;

    const newRow = sourceRow.cloneNode(true);
    newRow.classList.add('cloned-row');
    
    const input = newRow.querySelector('.quantity-input');
    input.value = 1; 
    
    const select = newRow.querySelector('.class-selector');
    if (select) {
        select.value = "";     
        select.disabled = false; 
        select.required = true; 
    }

    const headerLabel = newRow.querySelector('.product-name');
    const existingRemove = headerLabel.querySelector('.remove-row-btn');
    if (existingRemove) existingRemove.remove();

    const removeButton = document.createElement('button');
    removeButton.className = 'remove-row-btn';
    removeButton.innerHTML = '&times;';
    removeButton.type = 'button';
    headerLabel.prepend(removeButton);
    
    sourceRow.after(newRow);
    updateTotal();
}

function populateFormWithOrder(items) {
    // Gestion des lignes multiples pour photo de classe
    const classPhotos = items.filter(item => item.key === 'photo_classe');
    
    if (classPhotos.length > 1) {
        let lastRow = productList.querySelector('.product-item-row[data-key="photo_classe"]');
        // On s'assure qu'on a bien trouvé une ligne de départ (cas où le produit aurait été désactivé entre temps)
        if (lastRow) {
            for (let i = 1; i < classPhotos.length; i++) {
                cloneClassPhotoRow(lastRow);
                lastRow = lastRow.nextElementSibling; 
            }
        }
    }

    const allClassPhotoRows = productList.querySelectorAll('.product-item-row[data-key="photo_classe"]');

    items.forEach(item => {
        let rowToUpdate;
        if (item.key === 'photo_classe') {
            rowToUpdate = Array.from(allClassPhotoRows).find(row => !row.hasAttribute('data-populated'));
        } else {
            rowToUpdate = productList.querySelector(`.product-item-row[data-key="${item.key}"]`);
        }

        if (rowToUpdate) {
            const input = rowToUpdate.querySelector(`.quantity-input`);
            if (input) input.value = item.quantity;
            
            if (item.classChoice) {
                const selector = rowToUpdate.querySelector(`.class-selector`);
                if (selector) selector.value = item.classChoice;
            }
            
            updateSelectState(rowToUpdate);
            rowToUpdate.setAttribute('data-populated', 'true');
        }
    });

    productList.querySelectorAll('[data-populated]').forEach(el => el.removeAttribute('data-populated'));
    updateTotal();
}

function updateTotal() {
    let total = 0;
    const inputs = productList.querySelectorAll('.quantity-input');
    inputs.forEach(input => {
        const quantity = parseInt(input.value);
        if (quantity > 0) {
            const key = input.dataset.key;
            const product = getProductFromCatalog(key);
            if (product) {
                total += product.price * quantity;
            }
        }
    });
    totalPriceEl.textContent = `${total.toFixed(2)} €`;
}

// --- CHARGEMENT DES DONNÉES ---
window.api.onOrderData(async ({ schoolId, photoFileName, categoryName, activeClass }) => {
    currentOrderData = { schoolId, photoFileName, categoryName, activeClass };

    const schoolResult = await window.api.getSchoolById(schoolId);
    if (!schoolResult.success) {
        alert("Erreur: impossible de charger les données de l'école.");
        return;
    }
    const school = schoolResult.school;

    // 1. CHARGEMENT DU CATALOGUE DYNAMIQUE
    // school.products contient maintenant { catalog: [...], pochetteComponents: [...] }
    // ou, pour les vieilles écoles, un tableau simple (rétrocompatibilité gérée dans main.js, mais vérifions)
    if (school.products && school.products.catalog) {
        schoolCatalog = school.products.catalog;
    } else {
        // Fallback extrême si jamais main.js n'a pas fait le job
        alert("Erreur critique : Configuration de l'école invalide.");
        return;
    }

    // Chargement des classes
    const classesResult = await window.api.getClasses(school.sourceFolderPath);
    if (classesResult.success) {
        schoolClasses = classesResult.classes;
    }
    
    // Chargement Image
    const photoPath = `${school.sourceFolderPath}/18x24/${photoFileName}`.replace(/\\/g, '/');
    const tempImage = new Image();
    tempImage.onload = () => {
        const width = tempImage.naturalWidth;
        const height = tempImage.naturalHeight;
        photoContainer.style.aspectRatio = `${width} / ${height}`;
        studentPhoto.src = tempImage.src;
        studentPhoto.classList.add('loaded');
        photoPlaceholder.style.display = 'none';
    };
    tempImage.onerror = () => {
        photoContainer.style.aspectRatio = '1 / 1';
        photoPlaceholder.innerHTML = '<span>Erreur de chargement</span>';
    };
    tempImage.src = `file://${photoPath}`;

    studentName.textContent = photoFileName.replace(/\.(jpg|jpeg)$/i, '');
    studentCategory.textContent = `Catégorie : ${categoryName}`;

    // --- FILTRAGE DU CATALOGUE ---
    const isFratrieOrder = photoFileName.toUpperCase().startsWith('99 F');
    
    // On filtre le catalogue chargé depuis la BDD
    const availableProducts = schoolCatalog.filter(product => {
        // 1. Doit être actif
        if (!product.active) return false;

        // 2. Logique Fratrie vs Individuel
        if (isFratrieOrder) {
            // En fratrie, pas de pochette complète standard
            if (product.key === 'pochette_complete') return false;
        } else {
            // En individuel, pas de pochettes fratrie
            if (product.key === 'pochette_fratrie_sans' || product.key === 'pochette_fratrie_avec') return false;
        }

        return true;
    });
    
    // --- RENDU DE LA LISTE ---
    productList.innerHTML = '';
    
    availableProducts.forEach(product => {
        const productKey = product.key;
        const icon = PRODUCT_ICONS[productKey] || PRODUCT_ICONS['default'];
        
        const productDiv = document.createElement('div');
        productDiv.className = 'product-item-row';
        productDiv.dataset.key = productKey; 
        
        const needsClassSelector = isFratrieOrder && (productKey === 'pochette_fratrie_avec' || productKey === 'photo_classe');
        const isAddableClassPhoto = isFratrieOrder && productKey === 'photo_classe';
        
        // En-tête
        let namePrefix = '';
        if (isAddableClassPhoto) {
            namePrefix = `<button type="button" class="add-row-btn">+</button>`;
        }

        const topRowHtml = `
            <div class="product-header">
                <label class="product-name">
                    ${namePrefix}
                    ${icon} ${product.name} - ${product.price.toFixed(2)}€
                </label>
                <div class="quantity-selector">
                    <button class="quantity-btn minus" data-key="${productKey}">-</button>
                    <input type="number" value="0" min="0" class="quantity-input" data-key="${productKey}">
                    <button class="quantity-btn plus" data-key="${productKey}">+</button>
                </div>
            </div>
        `;

        // Selecteur
        let bottomRowHtml = '';
        if (needsClassSelector) {
            const defaultOption = `<option value="" disabled selected>-- Choisir une classe --</option>`;
            const options = schoolClasses.map(c => `<option value="${c}">${c}</option>`).join('');
            bottomRowHtml = `
                <div class="class-selector-wrapper">
                    <label>Classe pour photo de groupe :</label>
                    <select class="class-selector" data-key="${productKey}">
                        ${defaultOption}
                        ${options}
                    </select>
                </div>
            `;
        }

        productDiv.innerHTML = topRowHtml + bottomRowHtml;
        productList.appendChild(productDiv);
        
        updateSelectState(productDiv);
    });

    const existingOrderResult = await window.api.getOrderForStudent({ schoolId, studentIdentifier: photoFileName });
    if (existingOrderResult.success && existingOrderResult.order) {
        const savedItems = JSON.parse(existingOrderResult.order.items);
        populateFormWithOrder(savedItems);
    }
});

// --- GESTION DES ÉVÉNEMENTS ---

productList.addEventListener('click', (event) => {
    const target = event.target;
    const row = target.closest('.product-item-row');

    if (target.matches('.quantity-btn')) {
        const key = target.dataset.key;
        const input = row.querySelector(`.quantity-input[data-key="${key}"]`);
        if (input) {
            let quantity = parseInt(input.value);
            if (target.matches('.plus')) quantity++;
            else if (target.matches('.minus') && quantity > 0) quantity--;
            input.value = quantity;
            updateSelectState(row);
            updateTotal();
        }
    }
    if (target.matches('.add-row-btn')) {
        cloneClassPhotoRow(row);
    }
    if (target.matches('.remove-row-btn')) {
        row.remove();
        updateTotal();
    }
});

cancelBtn.addEventListener('click', () => {
    const navData = {
        schoolId: currentOrderData.schoolId,
        activeClass: currentOrderData.activeClass
    };
    window.api.navigateToSchool(navData);
});

saveBtn.addEventListener('click', async () => {
    const items = [];
    const productRows = productList.querySelectorAll('.product-item-row');
    
    document.querySelectorAll('.class-selector').forEach(el => el.style.borderColor = '');

    for (const row of productRows) {
        const input = row.querySelector('.quantity-input');
        const quantity = parseInt(input.value);
        
        if (quantity > 0) {
            const key = input.dataset.key;
            const selector = row.querySelector('.class-selector');
            let classChoice = null;

            // Validation du select
            if (selector) {
                if (selector.value === "") {
                    // On récupère le nom depuis le catalogue pour l'alerte
                    const product = getProductFromCatalog(key);
                    const productName = product ? product.name : "Produit inconnu";
                    
                    alert(`Attention : Vous n'avez pas sélectionné de classe pour le produit "${productName}".\n\nVeuillez choisir une classe avant d'enregistrer.`);
                    selector.style.borderColor = "#dc3545";
                    selector.focus();
                    return; 
                }
                classChoice = selector.value;
            }

            const product = getProductFromCatalog(key);
            const item = {
                key: key,
                name: product ? product.name : key,
                quantity: quantity,
                price: product ? product.price : 0
            };
            
            if (classChoice) {
                item.classChoice = classChoice;
            }
            items.push(item);
        }
    }

    const orderData = {
        schoolId: currentOrderData.schoolId,
        studentIdentifier: currentOrderData.photoFileName,
        categoryName: currentOrderData.categoryName,
        items: items,
        totalAmount: parseFloat(totalPriceEl.textContent)
    };
    
    const result = await window.api.saveOrder(orderData);
    if (result.success) {
        window.api.navigateToSchool({
            schoolId: currentOrderData.schoolId,
            activeClass: currentOrderData.activeClass
        });
    } else {
        alert(`Erreur lors de la sauvegarde : ${result.error}`);
    }
});

const headerBackBtn = document.getElementById('header-back-btn');
if (headerBackBtn) {
    headerBackBtn.addEventListener('click', () => {
        // On utilise la même logique que le bouton Annuler du bas
        const navData = {
            schoolId: currentOrderData.schoolId,
            activeClass: currentOrderData.activeClass
        };
        window.api.navigateToSchool(navData);
    });
}