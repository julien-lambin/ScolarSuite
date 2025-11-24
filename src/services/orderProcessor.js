// src/services/orderProcessor.js
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * Nettoie un nom de fichier/dossier.
 * Gère aussi les noms réservés Windows (CON, PRN, etc.)
 */
function sanitizeName(name) {
    if (!name) return 'Inconnu';
    let sanitized = name.normalize('NFKC').replace(/[^a-z0-9àâçéèêëîïôûùüÿñæœ \-\(\)\.]/gi, '_').trim();
    s = sanitized.replace(/[ .]+$/g, '');
    if (s.length > 200) s = s.slice(0, 200);

    const parsed = path.parse(s);
    const baseUpper = parsed.name.toUpperCase();
    if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/.test(baseUpper)) {
        s = '_' + s;
    }
    
    if (!s) s = 'Inconnu';
    return s;
}

async function fileExists(filePath) {
    try { await fs.access(filePath); return true; } catch { return false; }
}

/**
 * SÉCURITÉ : Vérifie que le chemin cible est bien à l'intérieur du dossier parent autorisé.
 */
function isPathSafe(rootPath, targetPath) {
    const resolvedRoot = path.resolve(rootPath);
    const resolvedTarget = path.resolve(targetPath);
    
    if (os.platform() === 'win32') {
        return resolvedTarget.toLowerCase().startsWith(resolvedRoot.toLowerCase());
    }
    return resolvedTarget.startsWith(resolvedRoot);
}

/**
 * SÉCURITÉ DOSSIER SYSTÈME
 */
function isSystemPath(p) {
    const resolved = path.resolve(p).toLowerCase();
    const sysCandidates = [
        path.resolve('/').toLowerCase(), 
        path.resolve(os.homedir(), '..').toLowerCase(),
        path.resolve(process.env.SystemRoot || 'C:\\Windows').toLowerCase(),
        path.resolve(process.env['ProgramFiles'] || 'C:\\Program Files').toLowerCase(),
        path.resolve(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)').toLowerCase()
    ];
    
    if (path.parse(resolved).root.toLowerCase() === resolved) return true;
    return sysCandidates.some(s => resolved === s || resolved.startsWith(s + path.sep));
}

/**
 * RECHERCHE FICHIER INSENSIBLE À LA CASSE
 */
async function findSourceFileCaseInsensitive(dir, baseName) {
    try {
        const files = await fs.readdir(dir);
        const lowerBase = baseName.toLowerCase();
        const allowedExts = ['.jpg', '.jpeg', '.png'];

        for (const f of files) {
            const parsed = path.parse(f);
            if (parsed.name.toLowerCase() === lowerBase && allowedExts.includes(parsed.ext.toLowerCase())) {
                return path.join(dir, f);
            }
            if (f.toLowerCase() === lowerBase && allowedExts.includes(path.extname(f).toLowerCase())) {
                return path.join(dir, f);
            }
        }
        
        for (const ext of allowedExts) {
            const candidate = path.join(dir, baseName + ext);
            if (await fileExists(candidate)) return candidate;
        }
    } catch (e) {
        return null;
    }
    return null;
}

/**
 * SÉCURITÉ : Copie vérifiée
 */
async function copyFileVerified(source, dest) {
    await fs.copyFile(source, dest);
    const [statSrc, statDest] = await Promise.all([fs.stat(source), fs.stat(dest)]);
    
    if (statSrc.size !== statDest.size) {
        await fs.unlink(dest).catch(() => {}); 
        throw new Error(`Erreur intégrité : Taille différente (${statSrc.size} vs ${statDest.size})`);
    }
}

/**
 * MAIN PROCESS
 * Ajout des paramètres : onProgress, abortSignal
 */
async function processOrders(db, schoolId, destBasePath, onProgress, abortSignal) {
    try {
        if (!destBasePath) throw new Error("Chemin de destination non défini.");

        // --- A. VALIDATION SÉCURITÉ DOSSIER ---
        const resolvedDest = path.resolve(destBasePath);
        if (isSystemPath(resolvedDest)) {
            throw new Error(`SÉCURITÉ : Refus d'utiliser le dossier système ou racine "${destBasePath}". Veuillez choisir un sous-dossier utilisateur ou un lecteur externe.`);
        }

        if (!(await fileExists(resolvedDest))) {
             await fs.mkdir(resolvedDest, { recursive: true });
        }

        const school = await db.get('SELECT * FROM schools WHERE id = ?', schoolId);
        const safeFolderName = sanitizeName(`${school.name}_Export`); 
        const exportPath = path.join(resolvedDest, safeFolderName);

        if (await fileExists(exportPath)) {
            await fs.rm(exportPath, { recursive: true, force: true });
        }
        await fs.mkdir(exportPath, { recursive: true });

        // --- B. CHARGEMENT DONNÉES ---
        const orders = await db.all('SELECT * FROM orders WHERE schoolId = ?', schoolId);
        if (orders.length === 0) return { success: false, message: "Aucune commande." };

        let schoolConfig;
        try { schoolConfig = JSON.parse(school.products); } catch (e) { return { success: false, message: "Config corrompue." }; }

        const catalog = schoolConfig.catalog || [];
        const packsConfig = schoolConfig.packs || {}; 
        const productMap = new Map(catalog.map(p => [p.key, p]));

        let groupDestFolderName = 'Photos_Groupe'; 
        const groupProduct = catalog.find(p => p.source_folder === 'GRJPEG');
        if (groupProduct && groupProduct.destination_folder) {
            groupDestFolderName = sanitizeName(groupProduct.destination_folder);
        }

        const sourceBasePath = school.sourceFolderPath;
        let log = [];
        let stats = {
            individual: { expected: 0, copied: 0, errors: 0 },
            group: { expected: 0, copied: 0, errors: 0 }
        };

        // --- C. ANALYSE (PASSE 1) ---
        if (onProgress) onProgress({ step: 'Analyse des commandes...', percent: 0 });

        let tasksToProcess = []; 
        let groupPhotoCounts = {};

        for (const order of orders) {
            // CHECK ANNULATION
            if (abortSignal && abortSignal.aborted) throw new Error("Opération annulée par l'utilisateur.");

            const items = JSON.parse(order.items);
            const isGroupOnlyOrder = order.studentIdentifier === 'GROUP_PHOTO_ONLY';

            if (isGroupOnlyOrder) {
                for (const item of items) {
                    if (item.className && item.quantity > 0) {
                        groupPhotoCounts[item.className] = (groupPhotoCounts[item.className] || 0) + item.quantity;
                    }
                }
                continue; 
            }
            
            const studentIdentifier = order.studentIdentifier;
            
            for (const item of items) {
                const productKey = item.key;
                const quantity = item.quantity;
                const productConfig = productMap.get(productKey);

                if (!productConfig) {
                    log.push(`ERREUR CRITIQUE: Produit inconnu '${productKey}' pour ${studentIdentifier}`);
                    continue;
                }

                let elementsToProcess = [];

                if (productConfig.type === 'bundle') {
                    // On utilise le pack maître
                    const packItems = packsConfig['pochette_complete']; 
                    if (packItems && Array.isArray(packItems)) {
                        const isSansGroupe = productKey === 'pochette_fratrie_sans';
                        elementsToProcess = packItems
                            .filter(pi => {
                                if (isSansGroupe && pi.source === 'GRJPEG') return false;
                                return true;
                            })
                            .map(pi => ({
                                source: pi.source,
                                dest: pi.dest,
                                name: pi.name,
                                packQty: pi.qty || 1 // Gestion de la quantité dans le pack
                            }));
                    } else {
                        log.push(`ATTENTION: Pack maître non configuré.`);
                    }
                } else {
                    elementsToProcess.push({
                        source: productConfig.source_folder || '18x24',
                        dest: productConfig.destination_folder || productConfig.name,
                        name: productConfig.name,
                        packQty: 1
                    });
                }

                for (const el of elementsToProcess) {
                    const sourceName = el.source;
                    // Calcul quantité totale = quantité client * quantité pack
                    const totalQty = quantity * el.packQty;

                    if (sourceName === 'GRJPEG') {
                        let className = item.classChoice || order.categoryName.replace('Classe ', '').trim();
                        if (className) {
                            groupPhotoCounts[className] = (groupPhotoCounts[className] || 0) + totalQty;
                        } else {
                             log.push(`AVERTISSEMENT: Pas de classe définie pour ${studentIdentifier} (Produit: ${el.name})`);
                        }
                    } else {
                        const destName = sanitizeName(el.dest);
                        tasksToProcess.push({
                            studentIdentifier,
                            sourceFolderName: sourceName,
                            destFolderName: destName,
                            quantity: totalQty
                        });
                        stats.individual.expected += totalQty;
                    }
                }
            }
        }

        // --- CALCUL TOTAL POUR PROGRESSION ---
        // On estime : 1 op par fichier individuel + 1 op par photo de groupe à traiter
        const classesToProcess = Object.entries(groupPhotoCounts).filter(([_, total]) => total > 0);
        stats.group.expected = classesToProcess.length;
        
        const totalOperations = stats.individual.expected + stats.group.expected;
        let currentOperation = 0;

        // --- D. COPIE INDIVIDUELLE (PASSE 2) ---
        for (const task of tasksToProcess) {
            // CHECK ANNULATION
            if (abortSignal && abortSignal.aborted) throw new Error("Opération annulée par l'utilisateur.");

            // PROGRESSION (tous les 5 fichiers pour éviter le spam IPC)
            if (onProgress && currentOperation % 5 === 0) {
                const percent = totalOperations > 0 ? Math.round((currentOperation / totalOperations) * 100) : 0;
                onProgress({ step: `Copie fichiers individuels...`, percent });
            }

            if (!task.sourceFolderName || !sourceBasePath) {
                log.push(`ERREUR TECHNIQUE: Chemin source invalide pour ${task.studentIdentifier}`);
                stats.individual.errors += task.quantity;
                currentOperation += task.quantity;
                continue;
            }

            const srcDir = path.join(sourceBasePath, task.sourceFolderName);
            const destDir = path.join(exportPath, task.destFolderName);
            
            if (!isPathSafe(sourceBasePath, srcDir) || !isPathSafe(exportPath, destDir)) {
                log.push(`SÉCURITÉ ALERTE: Tentative d'accès hors dossier pour ${task.studentIdentifier}`);
                stats.individual.errors += task.quantity;
                currentOperation += task.quantity;
                continue;
            }

            try { await fs.mkdir(destDir, { recursive: true }); } catch (e) {}
            
            const sourceFile = await findSourceFileCaseInsensitive(srcDir, task.studentIdentifier);

            if (sourceFile) {
                const ext = path.extname(sourceFile);
                const studentBaseName = path.parse(task.studentIdentifier).name;
                
                for (let q = 0; q < task.quantity; q++) {
                    let suffix = 1;
                    let safetyLimit = 0;
                    while (safetyLimit < 1000) {
                        const newName = `${studentBaseName}_${suffix}${ext}`;
                        const destPath = path.join(destDir, newName);
                        
                        if (await fileExists(destPath)) {
                            suffix++;
                            safetyLimit++;
                        } else {
                            try {
                                await copyFileVerified(sourceFile, destPath);
                                stats.individual.copied++;
                            } catch (copyError) {
                                log.push(`ERREUR COPIE: ${copyError.message} (${path.basename(sourceFile)})`);
                                stats.individual.errors++;
                            }
                            break;
                        }
                    }
                    if (safetyLimit >= 1000) {
                        log.push(`ERREUR: Trop de fichiers homonymes pour ${studentBaseName}`);
                        stats.individual.errors++;
                    }
                    currentOperation++;
                }
            } else {
                log.push(`MANQUANT: ${task.studentIdentifier} (Dossier: ${task.sourceFolderName})`);
                stats.individual.errors += task.quantity;
                currentOperation += task.quantity;
            }
        }

        // --- E. GROUPES (PASSE 3) ---
        if (stats.group.expected > 0) {
            const groupSourceFolder = path.join(sourceBasePath, 'GRJPEG');
            const groupDestFolder = path.join(exportPath, groupDestFolderName);
            await fs.mkdir(groupDestFolder, { recursive: true });
            
            let allGroupFiles = [];
            try { allGroupFiles = await fs.readdir(groupSourceFolder); } catch (e) { /* Ignoré */ }

            for (const [classNumber, total] of classesToProcess) {
                // CHECK ANNULATION
                if (abortSignal && abortSignal.aborted) throw new Error("Opération annulée par l'utilisateur.");
                
                if (onProgress) {
                    const percent = totalOperations > 0 ? Math.round((currentOperation / totalOperations) * 100) : 99;
                    onProgress({ step: `Traitement des groupes...`, percent });
                }

                const groupFileName = allGroupFiles.find(f => {
                    if (!f.startsWith(classNumber)) return false;
                    const charAfter = f.charAt(classNumber.length);
                    return charAfter === '.' || charAfter === ' ' || charAfter === '-' || charAfter === '_';
                });
                
                if (groupFileName) {
                    try {
                        const srcG = path.join(groupSourceFolder, groupFileName);
                        const ext = path.extname(groupFileName);
                        const destG = path.join(groupDestFolder, `${path.parse(groupFileName).name} (${total})${ext}`);
                        await copyFileVerified(srcG, destG);
                        stats.group.copied++;
                        log.push(`OK: Groupe ${groupFileName} copié (Total: ${total})`);
                    } catch (e) {
                        log.push(`ERREUR COPIE GROUPE: ${e.message} (${groupFileName})`);
                        stats.group.errors++;
                    }
                } else {
                    log.push(`MANQUANT GROUPE: Classe '${classNumber}'`);
                    stats.group.errors++;
                }
                currentOperation++;
            }
        }

        // --- F. BILAN ---
        const isSuccess = (stats.individual.expected === stats.individual.copied) && (stats.group.expected === stats.group.copied);
        let statusMessage = isSuccess ? "SUCCÈS TOTAL" : "ATTENTION : DES ERREURS SONT SURVENUES";
        
        const summary = `
==========================================
BILAN DU TRAITEMENT : ${statusMessage}
==========================================
FICHIERS INDIVIDUELS : ${stats.individual.copied} / ${stats.individual.expected} (Erreurs: ${stats.individual.errors})
PHOTOS DE GROUPE     : ${stats.group.copied} / ${stats.group.expected} (Erreurs: ${stats.group.errors})
------------------------------------------
${log.join('\n')}
        `;

        await fs.writeFile(path.join(exportPath, 'rapport.txt'), summary);
        
        if (isSuccess) {
            return { success: true, message: `Traitement terminé avec succès !\nDossier créé : ${safeFolderName}\n\n${stats.individual.copied} fichiers copiés.\n${stats.group.copied} groupes traités.` };
        } else {
            return { 
                success: true, 
                message: `Traitement terminé AVEC DES ERREURS.\nDossier : ${safeFolderName}\n\nConsultez le fichier rapport.txt pour voir les détails.\n\nManquants: ${stats.individual.errors} individuels, ${stats.group.errors} groupes.` 
            };
        }

    } catch (error) {
        // Gestion propre de l'annulation
        if (error.message === "Opération annulée par l'utilisateur.") {
            return { success: false, cancelled: true, message: "Traitement annulé par l'utilisateur." };
        }
        console.error("CRASH ORDER PROCESSOR:", error);
        return { success: false, message: "Erreur critique du script : " + error.message };
    }
}

module.exports = { processOrders };