const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

const CONFIG_PATH = path.join(app.getPath('userData'), 'templates-config.json');

const DEFAULT_TEMPLATES = {
    'roubaix_indiv': {
        label: "Roubaix Gambetta - Individuelle",
        systemFile: "roubaix_indiv.xlsx", // Nom du fichier dans assets/templates
        id_placeholders: ['{{ID_ELEVE_1}}', '{{ID_ELEVE_2}}'],
        name_placeholders: ['{{NOM_ELEVE_1}}', '{{NOM_ELEVE_2}}'],
        order_placeholders: ['{{BON_NUM_1}}', '{{BON_NUM_2}}'],
        
        photo_anchors: [ { col: 8, row: 2 }, { col: 21, row: 2 } ], 
        photo_width: 150,
        split_mode: true
    },
    'roubaix_fratrie': {
        label: "Roubaix Gambetta - Fratrie",
        systemFile: "roubaix_fratrie.xlsx",
        id_placeholders: ['{{ID_ELEVE_1}}', '{{ID_ELEVE_2}}'],
        name_placeholders: ['{{NOM_ELEVE_1}}', '{{NOM_ELEVE_2}}'],
        order_placeholders: ['{{BON_NUM_1}}', '{{BON_NUM_2}}'],
        
        photo_anchors: [ { col: 8, row: 2 }, { col: 22, row: 2 } ], 
        photo_width: 155,
        split_mode: true
    },
    'lille_indiv': {
        label: "Lille Hellemmes - Individuelle",
        systemFile: "lille_indiv.xlsx",
        id_placeholders: ['{{ID_ELEVE_1}}', '{{ID_ELEVE_2}}'],
        name_placeholders: ['{{NOM_ELEVE_1}}', '{{NOM_ELEVE_2}}'],
        order_placeholders: ['{{BON_NUM_1}}', '{{BON_NUM_2}}'],
        
        photo_anchors: [ { col: 11, row: 2 }, { col: 26, row: 2 } ], 
        photo_width: 150,
        split_mode: true
    },
    'lille_fratrie': {
        label: "Lille Hellemmes - Fratrie",
        systemFile: "lille_fratrie.xlsx",
        id_placeholders: ['{{ID_ELEVE_1}}', '{{ID_ELEVE_2}}'],
        name_placeholders: ['{{NOM_ELEVE_1}}', '{{NOM_ELEVE_2}}'],
        order_placeholders: ['{{BON_NUM_1}}', '{{BON_NUM_2}}'],
        
        photo_anchors: [ { col: 8, row: 1 }, { col: 23, row: 1 } ], 
        photo_width: 150,
        split_mode: true
    },
    'santes_indiv': {
        label: "Santes - Individuelle",
        systemFile: "santes_indiv.xlsx",
        id_placeholders: ['{{ID_ELEVE_1}}', '{{ID_ELEVE_2}}'],
        name_placeholders: ['{{NOM_ELEVE_1}}', '{{NOM_ELEVE_2}}'],
        order_placeholders: ['{{BON_NUM_1}}', '{{BON_NUM_2}}'],
        
        photo_anchors: [ { col: 8, row: 1 }, { col: 21, row: 1 } ], 
        photo_width: 150,
        split_mode: true
    },
    'santes_fratrie': {
        label: "Santes - Fratrie",
        systemFile: "santes_fratrie.xlsx",
        id_placeholders: ['{{ID_ELEVE_1}}', '{{ID_ELEVE_2}}'],
        name_placeholders: ['{{NOM_ELEVE_1}}', '{{NOM_ELEVE_2}}'],
        order_placeholders: ['{{BON_NUM_1}}', '{{BON_NUM_2}}'],
        
        photo_anchors: [ { col: 8, row: 1 }, { col: 21, row: 1 } ], 
        photo_width: 150,
        split_mode: true
    },
    'halluin_indiv': {
        label: "Halluin - Individuelle",
        systemFile: "halluin_indiv.xlsx",
        // CES LIGNES SONT OBLIGATOIRES :
        id_placeholders: ['{{ID_ELEVE_1}}', '{{ID_ELEVE_2}}'],
        name_placeholders: ['{{NOM_ELEVE_1}}', '{{NOM_ELEVE_2}}'],
        order_placeholders: ['{{BON_NUM_1}}', '{{BON_NUM_2}}'],
        
        photo_anchors: [ { col: 1, row: 2 }, { col: 1, row: 22 } ], 
        photo_width: 170,
        split_mode: true
    },
    'halluin_fratrie': {
        label: "Halluin - Fratrie",
        systemFile: "halluin_fratrie.xlsx",
        id_placeholders: ['{{ID_ELEVE_1}}', '{{ID_ELEVE_2}}'],
        name_placeholders: ['{{NOM_ELEVE_1}}', '{{NOM_ELEVE_2}}'],
        order_placeholders: ['{{BON_NUM_1}}', '{{BON_NUM_2}}'],
        
        photo_anchors: [ { col: 1, row: 2 }, { col: 1, row: 24 } ], 
        photo_width: 180,
        split_mode: true
    },
    'noel': {
        label: "Noël (Indiv/Fratrie)",
        systemFile: "noel.xlsx",
        id_placeholders: ['{{ID_ELEVE_1}}', '{{ID_ELEVE_2}}'],
        name_placeholders: ['{{NOM_ELEVE_1}}', '{{NOM_ELEVE_2}}'],
        order_placeholders: ['{{BON_NUM_1}}', '{{BON_NUM_2}}'],
        
        photo_anchors: [ { col: 5, row: 1 }, { col: 15, row: 1 } ], 
        photo_width: 290,
        split_mode: true
    }
};

async function getTemplates() {
    try {
        const data = await fs.readFile(CONFIG_PATH, 'utf-8');
        let userTemplates = JSON.parse(data);

        // --- FUSION INTELLIGENTE ---
        // On vérifie si des clés par défaut manquent dans la config utilisateur
        let hasNewTemplates = false;
        
        for (const [key, template] of Object.entries(DEFAULT_TEMPLATES)) {
            if (!userTemplates[key]) {
                console.log(`Nouveau template détecté et ajouté : ${key}`);
                userTemplates[key] = template;
                hasNewTemplates = true;
            }
        }

        // Si on a ajouté des choses, on sauvegarde le fichier mis à jour
        if (hasNewTemplates) {
            await saveTemplates(userTemplates);
        }

        return userTemplates;

    } catch (error) {
        // Si fichier inexistant, on crée tout
        await saveTemplates(DEFAULT_TEMPLATES);
        return DEFAULT_TEMPLATES;
    }
}

async function saveTemplates(templates) {
    await fs.writeFile(CONFIG_PATH, JSON.stringify(templates, null, 2), 'utf-8');
}

module.exports = { getTemplates, saveTemplates };