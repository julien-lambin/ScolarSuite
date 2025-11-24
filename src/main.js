// src/main.js

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const dbPromise = require('./database.js');
const sharp = require('sharp');
const excelGenerator = require('./services/excelGenerator-bdc');
const templateManager = require('./services/templateManager-bdc');

// Import du service métier
const orderProcessor = require('./services/orderProcessor');

let mainWindow;
let currentAbortController = null; // Variable globale pour stocker le contrôleur actif
const viewCache = {};

// --- NOUVELLE STRUCTURE DE DONNÉES ---
// On sépare ce qui est vendu (catalog) de ce qui est copié dans les packs (packs)
const DEFAULT_CONFIG = {
    // 1. Ce qui apparait sur le bon de commande
    catalog: [
        // Les Packs (Vendus comme un tout)
        { key: 'pochette_complete', name: 'Pochette Complète', price: 16.00, type: 'bundle', active: true, source_folder: null, destination_folder: null },
        { key: 'pochette_fratrie_sans', name: 'Pochette Fratrie (SANS groupe)', price: 14.00, type: 'bundle', active: true, source_folder: null, destination_folder: null },
        { key: 'pochette_fratrie_avec', name: 'Pochette Fratrie (AVEC groupe)', price: 16.00, type: 'bundle', active: true, source_folder: null, destination_folder: null },
        
        // Les Produits au détail
        { key: 'photo_classe', name: 'Photo de classe', price: 6.00, type: 'product', active: true, source_folder: 'GRJPEG', destination_folder: 'GRJPEG' },
        { key: 'tirage_18x24', name: 'Portrait 18x24', price: 9.00, type: 'product', active: true, source_folder: '18x24', destination_folder: '18x24' },
        { key: 'multiformat_2x', name: 'Multiformat (2x 12x18)', price: 9.00, type: 'product', active: true, source_folder: 'M1824', destination_folder: 'MF VRAC' },
        { key: 'multiformat_mix', name: 'Multiformat (2x 9x12 + 3x 6x8 + 4x 3,5x4,5)', price: 9.00, type: 'product', active: true, source_folder: 'M1 1824', destination_folder: 'MF VRAC' },
        { key: 'magnet', name: 'Magnet 9x13', price: 7.00, type: 'product', active: true, source_folder: '18x24', destination_folder: 'Magnet' },
        { key: 'agrandissement', name: 'Agrandissement 30x40', price: 25.00, type: 'product', active: true, source_folder: '18x24', destination_folder: 'Poster' }
    ],

    // 2. La définition technique du contenu des packs (Modèle Unique)
    packs: {
        'pochette_complete': [
            { name: 'Portrait 18x24', qty: 1, source: '18x24', dest: '18x24 pochette' },
            { name: 'Photo de classe', qty: 1, source: 'GRJPEG', dest: 'GRJPEG' },
            { name: 'Multiformat (2x 12x18)', qty: 1, source: 'M1824', dest: '18x24 pochette' },
            { name: 'Multiformat (2x 9x12 + 3x 6x8 + 4x 3,5x4,5)', qty: 1, source: 'M1 1824', dest: '18x24 pochette' },
            { name: 'Pochette', qty: 1, source: 'pochette', dest: 'pochette' }
        ]
    }
};

const createWindow = async () => {
    mainWindow = new BrowserWindow({
        width: 1400, // Un peu plus large pour les tableaux de config
        height: 900,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        }
    });
    mainWindow.setMenuBarVisibility(false);

    const pageHtml = await buildPage('index.html');
    const baseUrl = `file://${path.join(__dirname, '../')}`;
    
    mainWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(pageHtml)}`, {
        baseURLForDataURL: baseUrl
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });
};

async function buildPage(viewPath) {
    try {
        const basePath = path.join(__dirname, 'views');

        if (!viewCache['_head']) {
            viewCache['_head'] = await fs.readFile(path.join(basePath, 'components', '_head.html'), 'utf-8');
        }
        if (!viewCache['_sidebar']) {
            viewCache['_sidebar'] = await fs.readFile(path.join(basePath, 'components', '_sidebar.html'), 'utf-8');
        }
        
        // En production, décommenter pour le cache
        // if (!viewCache[viewPath]) {
            viewCache[viewPath] = await fs.readFile(path.join(basePath, viewPath), 'utf-8');
        // }

        const viewContent = viewCache[viewPath];
        const headContent = viewCache['_head'];
        const sidebarContent = viewCache['_sidebar'];

        let finalHtml = viewContent
            .replace('<!-- {{> _head.html }} -->', headContent)
            .replace('<!-- {{> _sidebar.html }} -->', sidebarContent);
        
        return finalHtml;
    } catch (error) {
        console.error(`Erreur lors de la construction de la page ${viewPath}:`, error);
        delete viewCache[viewPath];
        return `<h1>Erreur de chargement de la page</h1><p>${error.message}</p>`;
    }
}

async function handleFolderOpen() {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (!canceled) { return filePaths[0]; }
}

async function handleCreateSchool(event, schoolData) {
    try {
        const db = await dbPromise;
        const { name, sourceFolderPath } = schoolData;
        
        // --- CORRECTION : VÉRIFICATION PRÉALABLE ---
        // On vérifie que le dossier source contient bien le dossier '18x24' requis par le système
        const requiredSubfolder = path.join(sourceFolderPath, '18x24');
        try {
            await fs.access(requiredSubfolder);
        } catch (error) {
            // Si le dossier n'existe pas, on renvoie une erreur propre à l'interface
            return { 
                success: false, 
                error: `Le dossier sélectionné est invalide.\n\nLe logiciel ne trouve pas le dossier "18x24" à l'intérieur de :\n"${sourceFolderPath}".\n\nVérifiez que vous avez sélectionné le bon dossier racine de l'école.` 
            };
        }
        // -------------------------------------------

        // On utilise la nouvelle structure DEFAULT_CONFIG
        const productsJSON = JSON.stringify(DEFAULT_CONFIG);
        
        const result = await db.run('INSERT INTO schools (name, sourceFolderPath, products) VALUES (?, ?, ?)', name, sourceFolderPath, productsJSON);
        
        const newSchool = { 
            id: result.lastID, 
            name, 
            sourceFolderPath, 
            products: DEFAULT_CONFIG 
        };
        
        generateThumbnailsForSchool(BrowserWindow.fromWebContents(event.sender), newSchool);

        return { success: true, school: newSchool, isProcessing: true };
    } catch (error) {
        console.error('Erreur handleCreateSchool:', error);
        return { success: false, error: error.message };
    }
}

async function generateThumbnailsForSchool(win, school) {
    try {
        const sourcePath = path.join(school.sourceFolderPath, '18x24');
        const files = await fs.readdir(sourcePath);

        const thumbnailDir = path.join(app.getPath('userData'), 'thumbnails', `school_${school.id}`);
        await fs.mkdir(thumbnailDir, { recursive: true });

        let processedCount = 0;
        const totalFiles = files.filter(f => /\.(jpg|jpeg)$/i.test(f)).length;

        for (const file of files) {
            if (!/\.(jpg|jpeg)$/i.test(file)) continue;
            
            const sourceFile = path.join(sourcePath, file);
            const destFile = path.join(thumbnailDir, file);

            try {
                await fs.access(destFile);
            } catch {
                await sharp(sourceFile)
                    .resize({ width: 300 }) 
                    .jpeg({ quality: 80 })
                    .toFile(destFile);
            }

            processedCount++;
            if (!win.isDestroyed()) {
                win.webContents.send('thumbnail-progress', { processed: processedCount, total: totalFiles });
            }
        }
        if (!win.isDestroyed()) {
            win.webContents.send('thumbnail-complete');
        }

    } catch (error) {
        console.error('Erreur vignettes:', error);
        if (!win.isDestroyed()) {
            win.webContents.send('thumbnail-error', { message: error.message });
        }
    }
}

async function handleGetSchools() {
    try {
        const db = await dbPromise;
        const schools = await db.all('SELECT * FROM schools ORDER BY createdAt DESC');
        
        // Migration à la volée pour les anciennes écoles (pour éviter les crashs)
        schools.forEach(school => { 
            try {
                let config = JSON.parse(school.products);
                // Si c'est l'ancien format (tableau simple), on convertit
                if (Array.isArray(config)) {
                    config = { catalog: config, packs: DEFAULT_CONFIG.packs };
                } else if (!config.catalog) {
                    // Autre format bizarre, on reset
                    config = DEFAULT_CONFIG;
                }
                school.products = config; 
            } catch(e) {
                school.products = DEFAULT_CONFIG;
            }
        });
        return { success: true, schools };
    } catch (error) {
        console.error('Erreur handleGetSchools:', error);
        return { success: false, error: error.message };
    }
}

// -- HANDLERS INCHANGÉS (Mais nécessaires pour que ça marche) --
async function handleGetSchoolById(event, schoolId) {
    try {
        const db = await dbPromise;
        const school = await db.get('SELECT * FROM schools WHERE id = ?', schoolId);
        if (school) {
            try {
                let config = JSON.parse(school.products);
                if (Array.isArray(config) || !config.catalog) config = DEFAULT_CONFIG;
                school.products = config;
            } catch(e) { school.products = DEFAULT_CONFIG; }
            return { success: true, school };
        } else {
            return { success: false, error: `Aucune école trouvée avec l'ID ${schoolId}` };
        }
    } catch (error) {
        console.error('Erreur handleGetSchoolById:', error);
        return { success: false, error: error.message };
    }
}

async function handleGetClasses(event, sourceFolderPath) {
    try {
        const targetPath = path.join(sourceFolderPath, '18x24');
        const files = await fs.readdir(targetPath);
        const classNames = new Set();
        for (const file of files) {
            if (!/\.(jpg|jpeg)$/i.test(file)) continue;
            const fileNameWithoutExt = path.parse(file).name;
            if (fileNameWithoutExt.toUpperCase().startsWith('99 F')) continue;
            const match = fileNameWithoutExt.match(/^(\d+)/);
            if (match && match[1]) classNames.add(match[1]);
        }
        const sortedClasses = Array.from(classNames).sort((a, b) => Number(a) - Number(b));
        return { success: true, classes: sortedClasses };
    } catch (error) {
        console.error('Erreur handleGetClasses:', error);
        return { success: false, error: error.message };
    }
}

async function handleGetPhotosByClass(event, { sourceFolderPath, className }) {
    try {
        const targetPath = path.join(sourceFolderPath, '18x24');
        const files = await fs.readdir(targetPath);
        const photos = [];
        for (const file of files) {
            if (!/\.(jpg|jpeg)$/i.test(file)) continue;
            if (file.startsWith(className + ' ')) {
                photos.push({
                    fileName: file,
                    displayName: path.parse(file).name,
                    filePath: path.join(targetPath, file)
                });
            }
        }
        photos.sort((a, b) => a.displayName.localeCompare(b.displayName));
        return { success: true, photos };
    } catch (error) {
        console.error('Erreur handleGetPhotosByClass:', error);
        return { success: false, error: error.message };
    }
}

async function handleGetFratriePhotos(event, { sourceFolderPath }) {
    return handleGetPhotosByClass(event, { sourceFolderPath, className: '99 F' });
}

function handleNavigateToSchoolConfig(event, schoolId) {
    if (mainWindow) {
        buildPage('school-config.html').then(pageHtml => {
            const baseUrl = `file://${path.join(__dirname, '../')}`;
            mainWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(pageHtml)}`, {
                baseURLForDataURL: baseUrl
            });
            mainWindow.webContents.once('did-finish-load', () => {
                mainWindow.webContents.send('school-config-data', schoolId);
            });
        });
    }
}

// Handler pour supprimer une école
async function handleDeleteSchool(event, schoolId) {
    try {
        const db = await dbPromise;
        
        // 1. Suppression en base
        // Grâce à ON DELETE CASCADE, les orders seront supprimés automatiquement
        await db.run('DELETE FROM schools WHERE id = ?', schoolId);
        
        // 2. Suppression du dossier de vignettes
        const thumbnailDir = path.join(app.getPath('userData'), 'thumbnails', `school_${schoolId}`);
        try {
            await fs.rm(thumbnailDir, { recursive: true, force: true });
        } catch (e) {
            console.error(`Impossible de supprimer les vignettes pour l'école ${schoolId}:`, e);
            // On ne bloque pas le processus pour ça
        }

        return { success: true };
    } catch (error) {
        console.error('Erreur handleDeleteSchool:', error);
        return { success: false, error: error.message };
    }
}

// Handler mis à jour pour la sauvegarde de la config (incluant le renommage)
async function handleSaveSchoolConfig(event, { schoolId, config, schoolName }) {
    try {
        const db = await dbPromise;
        const productsJSON = JSON.stringify(config);
        
        // On met à jour les produits ET le nom si fourni
        if (schoolName) {
            await db.run('UPDATE schools SET products = ?, name = ? WHERE id = ?', productsJSON, schoolName, schoolId);
        } else {
            await db.run('UPDATE schools SET products = ? WHERE id = ?', productsJSON, schoolId);
        }
        
        return { success: true };
    } catch (error) {
        console.error('Erreur handleSaveSchoolConfig:', error);
        return { success: false, error: error.message };
    }
}

// -- NAVIGATION ET AUTRES HANDLERS --
async function handleNavigateToSchool(event, data) {
    const schoolId = typeof data === 'object' ? data.schoolId : data;
    if (mainWindow) {
        try {
            const preloadData = await handleGetInitialSchoolData(event, schoolId);
            if (!preloadData) { return; }
            if (typeof data === 'object' && data.activeClass) preloadData.activeClass = data.activeClass;

            let pageHtml = await buildPage('school.html');
            const dataScript = `<script>window.INITIAL_DATA = ${JSON.stringify(preloadData)};</script>`;
            pageHtml = pageHtml.replace('</head>', `${dataScript}</head>`);
            const baseUrl = `file://${app.getAppPath()}/`;
            await mainWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(pageHtml)}`, { baseURLForDataURL: baseUrl });
        } catch (error) {
            console.error("Erreur de navigation vers l'école:", error);
        }
    }
}

async function handleGetInitialSchoolData(event, schoolId) {
    try {
        const db = await dbPromise;
        const school = await db.get('SELECT * FROM schools WHERE id = ?', schoolId);
        if (!school) throw new Error('École non trouvée');
        
        // Parse sécurisé
        try {
            let config = JSON.parse(school.products);
            if (Array.isArray(config) || !config.catalog) config = DEFAULT_CONFIG;
            school.products = config;
        } catch (e) { school.products = DEFAULT_CONFIG; }

        const classesResult = await handleGetClasses(event, school.sourceFolderPath);
        const orders = await db.all('SELECT * FROM orders WHERE schoolId = ?', schoolId);
        return { school, orders: orders, classes: classesResult.classes };
    } catch (e) {
        console.error("Erreur dans handleGetInitialSchoolData:", e);
        return null;
    }
}

function handleNavigateToOrder(event, { schoolId, photoFileName, categoryName, activeClass }) {
    if (mainWindow) {
        buildPage('order.html').then(pageHtml => {
            const baseUrl = `file://${path.join(__dirname, '../')}`;
            mainWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(pageHtml)}`, {
                baseURLForDataURL: baseUrl
            });
            mainWindow.webContents.once('did-finish-load', () => {
                mainWindow.webContents.send('order-data', { schoolId, photoFileName, categoryName, activeClass });
            });
        });
    }
}

async function handleGetOrdersBySchool(event, schoolId) {
    try {
        const db = await dbPromise;
        const orders = await db.all('SELECT * FROM orders WHERE schoolId = ?', schoolId);
        return { success: true, orders };
    } catch (error) {
        console.error('Erreur handleGetOrdersBySchool:', error);
        return { success: false, error: error.message };
    }
}

async function handleGetOrderForStudent(event, { schoolId, studentIdentifier }) {
    try {
        const db = await dbPromise;
        const order = await db.get('SELECT * FROM orders WHERE schoolId = ? AND studentIdentifier = ?', schoolId, studentIdentifier);
        return { success: true, order: order || null };
    } catch (error) {
        console.error('Erreur handleGetOrderForStudent:', error);
        return { success: false, error: error.message };
    }
}

async function handleSaveOrder(event, orderData) {
    try {
        const db = await dbPromise;
        const { schoolId, studentIdentifier, categoryName, items, totalAmount } = orderData;
        const existingOrder = await db.get('SELECT id FROM orders WHERE schoolId = ? AND studentIdentifier = ?', schoolId, studentIdentifier);
        if (items.length === 0) {
            if (existingOrder) await db.run('DELETE FROM orders WHERE id = ?', existingOrder.id);
        } else {
            const itemsJSON = JSON.stringify(items);
            if (existingOrder) {
                await db.run('UPDATE orders SET categoryName = ?, items = ?, totalAmount = ? WHERE id = ?', categoryName, itemsJSON, totalAmount, existingOrder.id);
            } else {
                await db.run('INSERT INTO orders (schoolId, studentIdentifier, categoryName, items, totalAmount) VALUES (?, ?, ?, ?, ?)', schoolId, studentIdentifier, categoryName, itemsJSON, totalAmount);
            }
        }
        return { success: true };
    } catch (error) {
        console.error('Erreur handleSaveOrder:', error);
        return { success: false, error: error.message };
    }
}

async function handleSaveGroupOrders(event, { schoolId, classPhotos }) {
    try {
        const db = await dbPromise;
        const groupOrderIdentifier = 'GROUP_PHOTO_ONLY';
        const existingOrder = await db.get('SELECT id FROM orders WHERE schoolId = ? AND studentIdentifier = ?', schoolId, groupOrderIdentifier);
        
        const items = [];
        let totalAmount = 0;
        const productKey = 'photo_classe';
        const product = DEFAULT_CONFIG.catalog.find(p => p.key === productKey) || { price: 6.00, name: 'Photo de classe' };

        for (const [className, quantity] of Object.entries(classPhotos)) {
            if (quantity > 0) {
                items.push({ key: `${productKey}_${className}`, name: `${product.name} - Classe ${className}`, quantity: quantity, price: product.price, className: className });
                totalAmount += product.price * quantity;
            }
        }

        if (items.length === 0) {
            if (existingOrder) await db.run('DELETE FROM orders WHERE id = ?', existingOrder.id);
        } else {
            const itemsJSON = JSON.stringify(items);
            if (existingOrder) {
                await db.run('UPDATE orders SET items = ?, totalAmount = ? WHERE id = ?', itemsJSON, totalAmount, existingOrder.id);
            } else {
                await db.run('INSERT INTO orders (schoolId, studentIdentifier, categoryName, items, totalAmount) VALUES (?, ?, ?, ?, ?)', schoolId, groupOrderIdentifier, 'Photos de Classe Seules', itemsJSON, totalAmount);
            }
        }
        return { success: true };
    } catch (error) {
        console.error('Erreur handleSaveGroupOrders:', error);
        return { success: false, error: error.message };
    }
}


async function handleSearchAllPhotos(event, { sourceFolderPath, query }) {
    try {
        const targetPath = path.join(sourceFolderPath, '18x24');
        const files = await fs.readdir(targetPath);
        
        // Nettoyage de la requête
        const normalizedQuery = query.toLowerCase().trim();
        
        if (!normalizedQuery) return { success: true, photos: [] };

        // Filtrage
        const photos = files
            .filter(file => {
                // On garde uniquement les images
                if (!/\.(jpg|jpeg)$/i.test(file)) return false;
                
                // On cherche si le nom contient la requête
                return file.toLowerCase().includes(normalizedQuery);
            })
            .map(file => ({
                fileName: file,
                displayName: path.parse(file).name,
                filePath: path.join(targetPath, file)
            }))
            // Limite pour éviter de faire ramer l'interface si la recherche est trop large ("a")
            .slice(0, 50);

        return { success: true, photos };
    } catch (error) {
        console.error('Erreur handleSearchAllPhotos:', error);
        return { success: false, error: error.message };
    }
}

async function handleProcessOrders(event, data) {
    const schoolId = data.schoolId;
    const { canceled, filePath: destBasePath } = await dialog.showSaveDialog({ 
        title: 'Choisir un emplacement', 
        buttonLabel: 'Démarrer', 
        defaultPath: `Commande_Ecole_${schoolId}` 
    });

    if (canceled || !destBasePath) return { success: false, message: 'Annulé.' };
    
    // CRÉATION DU CONTROLEUR
    currentAbortController = new AbortController();
    
    // Fonction de rappel pour envoyer la progression au frontend
    const onProgress = (progressData) => {
        if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send('process-progress', progressData);
        }
    };

    try {
        const db = await dbPromise;
        // ON PASSE LE SIGNAL
        const result = await orderProcessor.processOrders(db, schoolId, destBasePath, onProgress, currentAbortController.signal);
        currentAbortController = null; // Reset à la fin
        return result;
    } catch (error) {
        currentAbortController = null;
        return { success: false, message: error.message };
    }
}

// AJOUT DU HANDLER D'ANNULATION
ipcMain.on('process:cancel', () => {
    if (currentAbortController) {
        currentAbortController.abort();
        console.log("Annulation demandée par l'utilisateur.");
    }
});

async function handleGetThumbnailPath(event, schoolId) {
    return path.join(app.getPath('userData'), 'thumbnails', `school_${schoolId}`);
}

async function handleGetSubfolders(event, schoolId) {
    try {
        const db = await dbPromise;
        const school = await db.get('SELECT sourceFolderPath FROM schools WHERE id = ?', schoolId);
        
        if (!school) throw new Error("École introuvable");

        const rootPath = school.sourceFolderPath;
        const dirents = await fs.readdir(rootPath, { withFileTypes: true });
        
        // On ne garde que les dossiers, et on exclut les dossiers cachés ou système si besoin
        const folders = dirents
            .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
            .map(dirent => dirent.name)
            .sort(); // Tri alphabétique

        return { success: true, folders };
    } catch (error) {
        console.error('Erreur handleGetSubfolders:', error);
        // Fallback : on renvoie une liste vide ou par défaut si le dossier est inaccessible
        return { success: false, folders: [], error: error.message };
    }
}

// Handler pour ouvrir un fichier (pour le template Excel)
async function handleFileOpen(event, extensions = []) {
    const filters = extensions.length > 0 ? [{ name: 'Fichiers', extensions }] : [];
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: filters
    });
    if (!canceled) { return filePaths[0]; }
}

function handleNavigate(event, viewName) {
    const allowedViews = ['index', 'generate-bdc', 'template-editor-bdc'];

    if (mainWindow && allowedViews.includes(viewName)) {
        const pageName = viewName.endsWith('.html') ? viewName : `${viewName}.html`;
        
        buildPage(pageName).then(pageHtml => {
            const baseUrl = `file://${app.getAppPath()}/`;
            
            mainWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(pageHtml)}`, {
                baseURLForDataURL: baseUrl
            });
        }).catch(err => {
            console.error(`Erreur de navigation vers ${viewName}:`, err);
        });
    }
}


async function handleListSubfolders(event, folderPath) {
    try {
        const dirents = await fs.readdir(folderPath, { withFileTypes: true });
        const folders = dirents
            .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
            .map(dirent => dirent.name)
            .sort(new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'}).compare); // Tri naturel (3E1, 3E2, 3E10)

        return { success: true, folders };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

app.whenReady().then(async () => {
    const { default: contextMenu } = await import('electron-context-menu');
    contextMenu({ showInspectElement: true });
    
    ipcMain.handle('dialog:openDirectory', handleFolderOpen);
    ipcMain.handle('db:createSchool', handleCreateSchool);
    ipcMain.handle('db:getSchools', handleGetSchools);
    ipcMain.handle('db:getSchoolById', handleGetSchoolById);
    ipcMain.handle('config:getDefaultCatalog', () => DEFAULT_CONFIG.catalog); // Changé pour renvoyer le catalogue
    ipcMain.handle('db:saveSchoolConfig', handleSaveSchoolConfig);
    ipcMain.on('navigate:toSchoolConfig', handleNavigateToSchoolConfig);
    ipcMain.handle('school:getInitialData', handleGetInitialSchoolData);
    ipcMain.handle('school:getClasses', handleGetClasses);
    ipcMain.handle('school:getPhotosByClass', handleGetPhotosByClass);
    ipcMain.handle('school:getFratriePhotos', handleGetFratriePhotos);
    ipcMain.handle('db:getOrdersBySchool', handleGetOrdersBySchool);
    ipcMain.handle('db:getOrderForStudent', handleGetOrderForStudent);
    ipcMain.handle('db:saveOrder', handleSaveOrder);
    ipcMain.handle('db:saveGroupOrders', handleSaveGroupOrders);
    ipcMain.handle('school:processOrders', handleProcessOrders);
    ipcMain.handle('get-thumbnail-path', handleGetThumbnailPath);
    ipcMain.handle('navigate:toSchool', handleNavigateToSchool);
    ipcMain.handle('db:deleteSchool', handleDeleteSchool);
    ipcMain.handle('school:searchAllPhotos', handleSearchAllPhotos);
    ipcMain.handle('school:getSubfolders', handleGetSubfolders);
    ipcMain.on('navigate:toOrder', handleNavigateToOrder);


    //Handle pour le générateur de bons Excel
    ipcMain.handle('dialog:openFile', handleFileOpen);

    // NOUVEAU HANDLER : Génération Excel JS
    ipcMain.on('generator:start', async (event, tasks) => {
        try {
            // 'tasks' est maintenant un tableau d'objets config
            // On s'assure que c'est un tableau (rétrocompatibilité si besoin)
            const configs = Array.isArray(tasks) ? tasks : [tasks];

            let count = 1;
            for (const config of configs) {
                event.reply('generator:log', `--- DÉBUT TÂCHE ${count}/${configs.length} [Mode: ${config.mode}] ---`);
                
                // On appelle le générateur pour cette tâche spécifique
                await excelGenerator.generate(config, event.sender);
                
                event.reply('generator:log', `--- FIN TÂCHE ${count} ---`);
                count++;
            }

            event.reply('generator:complete', { success: true });
        } catch (error) {
            console.error("Erreur Générateur:", error);
            event.reply('generator:log', `ERREUR CRITIQUE: ${error.message}`);
            event.reply('generator:complete', { success: false, error: error.message });
        }
    });


    // Handlers pour l'éditeur de templates
    ipcMain.handle('templates:get', async () => {
        return await templateManager.getTemplates();
    });

    ipcMain.handle('templates:save', async (event, templates) => {
        await templateManager.saveTemplates(templates);
        return { success: true };
    });
    
    ipcMain.handle('fs:listSubfolders', handleListSubfolders);


    ipcMain.on('navigate', handleNavigate);

    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});