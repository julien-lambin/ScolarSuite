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
const headerBackBtn = document.getElementById('header-back-btn');

let currentOrderData = {};
let schoolClasses = [];
let schoolCatalog = []; 

function getProductFromCatalog(key) {
    return schoolCatalog.find(p => p.key === key);
}

function updateSelectState(row) {
    const input = row.querySelector('.quantity-input');
    const select = row.querySelector('.class-selector');
    if (!select || !input) return;
    const quantity = parseInt(input.value);
    select.disabled = quantity <= 0;
    select.required = quantity > 0;
    if (quantity <= 0) select.value = "";
}

function cloneClassPhotoRow(sourceRow) {
    if (!sourceRow) sourceRow = productList.querySelector('.product-item-row[data-key="photo_classe"]');
    if (!sourceRow) return;

    const newRow = sourceRow.cloneNode(true);
    newRow.classList.add('cloned-row');
    newRow.querySelector('.quantity-input').value = 1;
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
    const classPhotos = items.filter(item => item.key === 'photo_classe');
    if (classPhotos.length > 1) {
        let lastRow = productList.querySelector('.product-item-row[data-key="photo_classe"]');
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
    productList.querySelectorAll('.quantity-input').forEach(input => {
        const quantity = parseInt(input.value);
        if (quantity > 0) {
            const product = getProductFromCatalog(input.dataset.key);
            if (product) total += product.price * quantity;
        }
    });
    totalPriceEl.textContent = `${total.toFixed(2)} €`;
}

// --- CHARGEMENT DES DONNÉES ---
window.api.onOrderData(async ({ schoolId, photoFileName, categoryName, activeClass, hasExplicitFratrie }) => {
    currentOrderData = { schoolId, photoFileName, categoryName, activeClass };
    
    // 1. Chargement Données École
    const schoolResult = await window.api.getSchoolById(schoolId);
    if (!schoolResult.success) { alert("Erreur: impossible de charger les données de l'école."); return; }
    const school = schoolResult.school;

    if (school.products && school.products.catalog) schoolCatalog = school.products.catalog;
    else { alert("Erreur critique : Configuration de l'école invalide."); return; }

    const classesResult = await window.api.getClasses(school.sourceFolderPath);
    if (classesResult.success) schoolClasses = classesResult.classes;
    
    // 2. Affichage Photo
    const photoPath = `${school.sourceFolderPath}/18x24/${photoFileName}`.replace(/\\/g, '/');
    const tempImage = new Image();
    tempImage.onload = () => {
        photoContainer.style.aspectRatio = `${tempImage.naturalWidth} / ${tempImage.naturalHeight}`;
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

    // --- 3. LOGIQUE MÉTIER AVANCÉE (FILTRAGE & SÉLECTEURS) ---
    
    const isFratriePhoto = photoFileName.toUpperCase().startsWith('99 F');
    const hasClassPhotoProduct = schoolCatalog.some(p => p.key === 'photo_classe' && p.active);

    // A. FILTRAGE : Quels produits afficher ?
    const availableProducts = schoolCatalog.filter(p => {
        if (!p.active) return false;
        const isFratrieProduct = p.key.includes('fratrie');

        if (hasExplicitFratrie) {
            // MODE EXPLICITE
            if (isFratriePhoto) {
                // Photo Fratrie : Tout SAUF la Pochette Complète (réservée Indiv)
                return p.key !== 'pochette_complete';
            } else {
                // Photo Standard : Tout SAUF les produits Fratrie
                return !isFratrieProduct;
            }
        } else {
            // MODE MÉLANGÉ (IMPLICITE)
            if (hasClassPhotoProduct) {
                // Cas B : Photo de classe dispo -> On affiche TOUT (Indiv + Fratrie)
                return true; 
            } else {
                // Cas A : Pas de photo de classe -> Indiv uniquement
                return !isFratrieProduct;
            }
        }
    });
    
    // --- RENDU DE LA LISTE ---
    productList.innerHTML = '';
    
    availableProducts.forEach(product => {
        const productKey = product.key;
        const icon = PRODUCT_ICONS[productKey] || PRODUCT_ICONS['default'];
        
        const productDiv = document.createElement('div');
        productDiv.className = 'product-item-row';
        productDiv.dataset.key = productKey;
        
        // B. SÉLECTEUR : Faut-il demander la classe ?
        let showClassSelector = false;

        // Cas spécifiques pour les pochettes fratrie
        if (productKey === 'pochette_fratrie_sans') {
            showClassSelector = false; // Jamais de classe pour "Sans groupe"
        }
        else if (productKey === 'pochette_fratrie_avec') {
            showClassSelector = true; // Toujours une classe pour "Avec groupe"
        }
        // Cas général "photo de classe" (vendue seule ou ajoutée)
        else if (productKey === 'photo_classe') {
            if (hasExplicitFratrie) {
                 // Explicite : Oui si c'est une photo 99 F, Non si c'est un élève
                 showClassSelector = isFratriePhoto;
            } else {
                // Mélangé : Oui si le produit est en vente (Cas B), Non sinon
                showClassSelector = hasClassPhotoProduct;
            }
        }

        const isAddableClassPhoto = productKey === 'photo_classe' && showClassSelector;
        
        const topRowHtml = `
            <div class="product-header">
                <label class="product-name">
                    ${isAddableClassPhoto ? '<button type="button" class="add-row-btn">+</button>' : ''}
                    ${icon} ${product.name}
                </label>
                <div class="quantity-selector">
                    <button class="quantity-btn minus" data-key="${productKey}">-</button>
                    <input type="number" value="0" min="0" class="quantity-input" data-key="${productKey}" readonly>
                    <button class="quantity-btn plus" data-key="${productKey}">+</button>
                </div>
            </div>
        `;
        
        let bottomRowHtml = '';
        if (showClassSelector) {
            const options = schoolClasses.map(c => `<option value="${c}">${c}</option>`).join('');
            bottomRowHtml = `
                <div class="class-selector-wrapper">
                    <label>Classe pour photo de groupe :</label>
                    <select class="class-selector" data-key="${productKey}"><option value="" disabled selected>-- Choisir une classe --</option>${options}</select>
                </div>
            `;
        }
        productDiv.innerHTML = topRowHtml + bottomRowHtml;
        productList.appendChild(productDiv);
        updateSelectState(productDiv);
    });

    const existingOrderResult = await window.api.getOrderForStudent({ schoolId, studentIdentifier: photoFileName });
    if (existingOrderResult.success && existingOrderResult.order) {
        populateFormWithOrder(JSON.parse(existingOrderResult.order.items));
    }
});

// --- GESTION DES ÉVÉNEMENTS ---
productList.addEventListener('click', (event) => {
    const target = event.target;
    const row = target.closest('.product-item-row');
    if (!row) return;

    if (target.matches('.quantity-btn')) {
        const input = row.querySelector(`.quantity-input[data-key="${target.dataset.key}"]`);
        let quantity = parseInt(input.value);
        if (target.matches('.plus')) quantity++;
        else if (target.matches('.minus') && quantity > 0) quantity--;
        input.value = quantity;
        updateSelectState(row);
        updateTotal();
    }
    if (target.matches('.add-row-btn')) cloneClassPhotoRow(row);
    if (target.matches('.remove-row-btn')) { row.remove(); updateTotal(); }
});

const navigateBack = () => {
    window.api.navigateToSchool({
        schoolId: currentOrderData.schoolId,
        activeClass: currentOrderData.activeClass
    });
};

if (cancelBtn) cancelBtn.addEventListener('click', navigateBack);
if (headerBackBtn) headerBackBtn.addEventListener('click', navigateBack);

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
            if (selector && selector.value === "") {
                const product = getProductFromCatalog(key);
                alert(`Veuillez choisir une classe pour "${product.name}".`);
                selector.style.borderColor = "#dc3545";
                selector.focus();
                return;
            }
            if(selector) classChoice = selector.value;
            
            const product = getProductFromCatalog(key);
            if (!product) continue;
            const item = { key, name: product.name, quantity, price: product.price };
            if (classChoice) item.classChoice = classChoice;
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
    if (result.success) navigateBack();
    else alert(`Erreur sauvegarde : ${result.error}`);
});