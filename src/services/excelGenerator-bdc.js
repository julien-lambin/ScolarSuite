// src/services/excelGenerator-bdc.js
const fs = require('fs').promises;
const path = require('path');
const ExcelJS = require('exceljs');
const sharp = require('sharp');
const templateManager = require('./templateManager-bdc');
const { app } = require('electron');

// Détection des chemins (Prod vs Dev)
const isPackaged = app.isPackaged;
const TEMPLATES_DIR = isPackaged
    ? path.join(process.resourcesPath, 'templates-bdc')
    : path.join(__dirname, '../assets/templates-bdc');

const ID_REGEX = /-(\d{4})\.(?:jpe?g|png)$/i;

function extractStudentName(filename) {
    const nameWithoutExt = path.parse(filename).name;
    const match = nameWithoutExt.match(/.*\d\s+(.+)$/);
    if (match && match[1]) {
        return match[1].trim();
    }
    return nameWithoutExt;
}

function extractStudentId(filename) {
    const match = filename.match(ID_REGEX);
    return match ? match[1] : null;
}

/**
 * Fonction principale de génération avec support Annulation et Progression
 */
/**
 * Fonction principale de génération avec support Annulation et Progression
 */
async function generate(config, eventSender, abortSignal) {
    const { mode, photoFolder, templateFile, outputFolder, subfolders } = config;
    
    // 1. Chargement Config
    const allTemplates = await templateManager.getTemplates();
    const templateConfig = allTemplates[mode];
    if (!templateConfig) throw new Error(`Mode inconnu : ${mode}`);

    // Helper pour envoyer la progression
    const reportProgress = (percent, status) => {
        if (eventSender) eventSender.send('generator:progress', { percent, status });
    };

    reportProgress(0, "Initialisation...");

    // 2. Détermination Template Excel (PRIORITÉ UTILISATEUR)
    let excelPathToLoad = templateFile; // Valeur par défaut (tâche manuelle)

    // A. Si le template a un chemin utilisateur défini (via le bouton "Modifier Excel")
    if (templateConfig.user_file_path) {
        excelPathToLoad = templateConfig.user_file_path;
    } 
    // B. Sinon, on utilise le fichier système interne
    else if (templateConfig.systemFile) {
        excelPathToLoad = path.join(TEMPLATES_DIR, templateConfig.systemFile);
    }

    // Vérification existence
    try {
        // Si aucun chemin n'est défini nulle part
        if (!excelPathToLoad) throw new Error("Aucun fichier Excel défini pour ce modèle.");
        
        await fs.access(excelPathToLoad);
    } catch (e) {
        throw new Error(`Fichier Excel introuvable : ${excelPathToLoad}`);
    }

    if (abortSignal.aborted) throw new Error("Annulé par l'utilisateur");

    // ... (Le reste de la fonction est inchangé, je le remets pour être complet) ...
    // 3. Scan des Photos
    let photos = []; 
    reportProgress(5, "Scan des dossiers...");

    if (subfolders && subfolders.length > 0) {
        // --- MODE MULTI-DOSSIERS ---
        for (const sub of subfolders) {
            if (abortSignal.aborted) throw new Error("Annulé par l'utilisateur");
            const subPath = path.join(photoFolder, sub);
            try {
                const files = await fs.readdir(subPath);
                const subPhotos = files
                    .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
                    .sort(new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'}).compare);
                
                const totalInSub = subPhotos.length;
                const processedSubPhotos = subPhotos.map((f, index) => ({
                    file: path.join(sub, f),
                    bonLabel: `${index + 1}/${totalInSub}`
                }));
                photos = photos.concat(processedSubPhotos);
            } catch (e) {
                console.warn(`Erreur lecture sous-dossier ${sub}: ${e.message}`);
            }
        }
    } else {
        // --- MODE DOSSIER UNIQUE ---
        const files = await fs.readdir(photoFolder);
        const rawPhotos = files
            .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
            .sort(new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'}).compare);

        const totalGlobal = rawPhotos.length;
        photos = rawPhotos.map((f, index) => ({
            file: f,
            bonLabel: `${index + 1}/${totalGlobal}`
        }));
    }

    if (photos.length === 0) throw new Error("Aucune photo trouvée.");
    reportProgress(10, `${photos.length} photos trouvées.`);

    // 4. Préparation des Lots
    let batches = [];
    if (templateConfig.split_mode) {
        // Mode Massicot
        const total = photos.length;
        const half = Math.ceil(total / 2);
        const leftList = photos.slice(0, half);
        const rightList = photos.slice(half, total);

        for (let i = 0; i < leftList.length; i++) {
            batches.push({
                items: [ leftList[i], rightList[i] || null ]
            });
        }
    } else {
        // Mode Séquentiel
        for (let i = 0; i < photos.length; i += 2) {
            batches.push({
                items: [ photos[i], photos[i + 1] || null ]
            });
        }
    }

    // 5. Génération Excel
    let fileCounter = 1;
    try { await fs.mkdir(outputFolder, { recursive: true }); } catch (e) {}

    const totalBatches = batches.length;

    for (let bIndex = 0; bIndex < totalBatches; bIndex++) {
        if (abortSignal.aborted) throw new Error("Annulé par l'utilisateur");

        const batch = batches[bIndex];
        const currentPercent = 10 + Math.round(((bIndex + 1) / totalBatches) * 90);
        reportProgress(currentPercent, `Génération page ${fileCounter}/${totalBatches}`);

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(excelPathToLoad);
        const sheet = workbook.worksheets[0];

        for (let i = 0; i < 2; i++) {
            const item = batch.items[i];
            
            const studentData = item ? {
                name: extractStudentName(path.basename(item.file)),
                id: extractStudentId(path.basename(item.file)) || '',
                bonNum: item.bonLabel,
                file: item.file
            } : null;

            sheet.eachRow((row) => {
                row.eachCell((cell) => {
                    if (typeof cell.value === 'string') {
                        if (cell.value.includes(templateConfig.name_placeholders[i])) {
                            cell.value = cell.value.replace(templateConfig.name_placeholders[i], studentData ? studentData.name : '');
                        }
                        if (cell.value.includes(templateConfig.id_placeholders[i])) {
                            cell.value = cell.value.replace(templateConfig.id_placeholders[i], studentData ? studentData.id : '');
                        }
                        if (cell.value.includes(templateConfig.order_placeholders[i])) {
                            cell.value = cell.value.replace(templateConfig.order_placeholders[i], studentData ? studentData.bonNum : '');
                        }
                    }
                });
            });

            if (studentData) {
                const sourcePath = path.join(photoFolder, studentData.file);
                try {
                    const imageBuffer = await sharp(sourcePath)
                        .resize({ width: 800 })
                        .jpeg({ quality: 85 })
                        .toBuffer();

                    const imageId = workbook.addImage({
                        buffer: imageBuffer,
                        extension: 'jpeg',
                    });
                    const anchor = templateConfig.photo_anchors[i];
                    sheet.addImage(imageId, {
                        tl: { col: anchor.col, row: anchor.row },
                        ext: { width: templateConfig.photo_width, height: templateConfig.photo_width * 1.5 }
                    });
                } catch (imgErr) {
                    console.warn(`Erreur image: ${imgErr.message}`);
                }
            }
        }

        const fileName = `bon_${mode}_page_${String(fileCounter).padStart(3, '0')}.xlsx`;
        await workbook.xlsx.writeFile(path.join(outputFolder, fileName));
        fileCounter++;
    }

    reportProgress(100, "Terminé.");
    return { success: true };
}

module.exports = { generate };