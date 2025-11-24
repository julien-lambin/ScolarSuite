const fs = require('fs').promises;
const path = require('path');
const ExcelJS = require('exceljs');
const sharp = require('sharp');
const templateManager = require('./templateManager-bdc');

// --- CONFIGURATION DES MODÈLES (Équivalent à ton tableau PHP) ---
const TEMPLATES_CONFIG = {
    'noel': {
        id_placeholders: ['{{ID_ELEVE_1}}', '{{ID_ELEVE_2}}'],
        name_placeholders: ['{{NOM_ELEVE_1}}', '{{NOM_ELEVE_2}}'],
        order_placeholders: ['{{BON_NUM_1}}', '{{BON_NUM_2}}'],
        // Coordonnées des cellules où insérer l'image (Top-Left)
        // Attention : ExcelJS utilise des index 0-based ou des adresses string
        // F2 -> col: 6, row: 2
        photo_anchors: [
            { col: 5, row: 1 }, // F2 (0-based: F=5, 2=1)
            { col: 15, row: 1 } // P2 (0-based: P=15, 2=1)
        ],
        photo_width: 290, // Largeur en pixels
        split_mode: true  // Mode Gauche/Droite (Page 1..N / N+1..2N)
    },
    'indiv': {
        id_placeholders: ['{{ID_ELEVE_1}}', '{{ID_ELEVE_2}}'],
        name_placeholders: ['{{NOM_ELEVE_1}}', '{{NOM_ELEVE_2}}'],
        order_placeholders: ['{{BON_NUM_1}}', '{{BON_NUM_2}}'],
        photo_anchors: [
            { col: 1, row: 2 }, // B3
            { col: 1, row: 22 } // B23
        ],
        photo_width: 170,
        split_mode: false // Mode Séquentiel (1, 2 sur la même page)
    },
    'fratrie': {
        id_placeholders: ['{{ID_ELEVE_1}}', '{{ID_ELEVE_2}}'],
        name_placeholders: ['{{NOM_ELEVE_1}}', '{{NOM_ELEVE_2}}'],
        order_placeholders: ['{{BON_NUM_1}}', '{{BON_NUM_2}}'],
        photo_anchors: [
            { col: 1, row: 2 }, // B3
            { col: 1, row: 24 } // B25
        ],
        photo_width: 175,
        split_mode: false
    }
};

// Regex pour extraire l'ID (à adapter si besoin)
const ID_REGEX = /-(\d{4})\.(?:jpe?g|png)$/i;

/**
 * Fonction utilitaire pour extraire le nom de l'élève
 * (Équivalent à ton extractStudentName PHP)
 */
function extractStudentName(filename) {
    const nameWithoutExt = path.parse(filename).name;
    // Logique : Tout après le dernier chiffre
    // Ex: "1 MAT 1 TOTO Titi" -> "TOTO Titi"
    const match = nameWithoutExt.match(/.*\d\s+(.+)$/);
    if (match && match[1]) {
        return match[1].trim();
    }
    return nameWithoutExt; // Fallback
}

function extractStudentId(filename) {
    const match = filename.match(ID_REGEX);
    return match ? match[1] : null;
}

/**
 * Fonction principale de génération
 */
async function generate(config, eventSender) {
    const { mode, photoFolder, templateFile, outputFolder, subfolders } = config;
    
    // Chargement dynamique du template
    const allTemplates = await templateManager.getTemplates();
    const templateConfig = allTemplates[mode];

    if (!templateConfig) throw new Error(`Mode inconnu : ${mode}`);

    const log = (msg) => {
        console.log(msg);
        if (eventSender) eventSender.send('generator:log', msg);
    };

    log(`--- Démarrage Génération (${mode}) ---`);

    // 1. SCAN DES PHOTOS (MODE AVANCÉ MULTI-DOSSIERS)
    let photos = [];

    if (subfolders && subfolders.length > 0) {
        log(`Scan de ${subfolders.length} sous-dossiers...`);
        
        for (const sub of subfolders) {
            const subPath = path.join(photoFolder, sub);
            try {
                const files = await fs.readdir(subPath);
                const subPhotos = files
                    .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
                    .map(f => path.join(sub, f)); // On garde le chemin relatif "SousDossier/Photo.jpg"
                
                photos = photos.concat(subPhotos);
            } catch (e) {
                log(`Erreur lecture sous-dossier ${sub}: ${e.message}`);
            }
        }
        // Tri global pour respecter l'ordre des classes (3E1 avant 3E2)
        photos.sort(new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'}).compare);

    } else {
        // Mode classique (dossier racine unique)
        const files = await fs.readdir(photoFolder);
        photos = files
            .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
            .sort();
    }

    if (photos.length === 0) {
        throw new Error("Aucune photo trouvée dans le(s) dossier(s) source(s).");
    }
    log(`${photos.length} photos trouvées au total.`);

// 2. Préparation des lots (Batches)
    let batches = [];

    if (templateConfig.split_mode) {
        // MODE GAUCHE / DROITE (LOGIQUE MASSICOT)
        // On divise la liste TOTALE en deux.
        const total = photos.length;
        const half = Math.ceil(total / 2); // Point de coupe (ex: 100 -> 50)
        
        const leftList = photos.slice(0, half);      // Photos 1 à 50
        const rightList = photos.slice(half, total); // Photos 51 à 100

        // On crée autant de pages que la longueur de la liste de gauche
        for (let i = 0; i < leftList.length; i++) {
            // Sur la page i :
            // - Gauche : élément i de la liste gauche
            // - Droite : élément i de la liste droite (s'il existe)
            
            const leftItem = { file: leftList[i], bonNum: i + 1 };
            
            let rightItem = null;
            if (rightList[i]) {
                // Le numéro de bon continue après la fin de la liste gauche
                rightItem = { file: rightList[i], bonNum: half + i + 1 };
            }

            batches.push({
                items: [ leftItem, rightItem ]
            });
        }
        
        log(`Mode Massicot activé : ${total} photos divisées en ${half} pages.`);
        
    } else {
        // MODE SÉQUENTIEL CLASSIQUE (1 et 2 sur la même page)
        let counter = 1;
        for (let i = 0; i < photos.length; i += 2) {
            batches.push({
                items: [
                    { file: photos[i], bonNum: counter++ },
                    photos[i + 1] ? { file: photos[i + 1], bonNum: counter++ } : null
                ]
            });
        }
    }

    // 3. TRAITEMENT
    let fileCounter = 1;
    try { await fs.mkdir(outputFolder, { recursive: true }); } catch (e) {}

    for (const batch of batches) {
        // log(`Génération page ${fileCounter}...`); // Optionnel pour moins de spam

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templateFile);
        const sheet = workbook.worksheets[0];

        for (let i = 0; i < 2; i++) {
            const item = batch.items[i];
            // Note: item.file contient maintenant "SousDossier/Fichier.jpg" ou juste "Fichier.jpg"
            // extractStudentName gère le basename automatiquement grâce à path.parse()
            
            const studentData = item ? {
                name: extractStudentName(path.basename(item.file)),
                id: extractStudentId(path.basename(item.file)) || '',
                bonNum: item.bonNum,
                file: item.file
            } : null;

            // A. Remplacement Textes
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

            // B. Insertion Image
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
                    log(`Erreur image ${studentData.file}: ${imgErr.message}`);
                }
            }
        }

        // Nommage intelligent : si on a scanné des sous-dossiers, on met le nom du premier sous-dossier ou un nom générique
        // Pour simplifier en mode fusionné :
        const fileName = `bon_${mode}_page_${String(fileCounter).padStart(3, '0')}.xlsx`;
        const outputPath = path.join(outputFolder, fileName);
        
        await workbook.xlsx.writeFile(outputPath);
        fileCounter++;
    }

    log("--- Terminé ! ---");
    return { success: true };
}

module.exports = { generate };