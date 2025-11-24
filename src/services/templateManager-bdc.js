const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

const CONFIG_PATH = path.join(app.getPath('userData'), 'templates-config.json');

// TES TEMPLATES PAR DÉFAUT (C'est ici que tu en rajoutes)
const DEFAULT_TEMPLATES = {
    'noel': {
        label: "Bons de Noël",
        id_placeholders: ['{{ID_ELEVE_1}}', '{{ID_ELEVE_2}}'],
        name_placeholders: ['{{NOM_ELEVE_1}}', '{{NOM_ELEVE_2}}'],
        order_placeholders: ['{{BON_NUM_1}}', '{{BON_NUM_2}}'],
        photo_anchors: [ { col: 5, row: 1 }, { col: 15, row: 1 } ],
        photo_width: 290,
        split_mode: true
    },
    'indiv': {
        label: "Individuel",
        id_placeholders: ['{{ID_ELEVE_1}}', '{{ID_ELEVE_2}}'],
        name_placeholders: ['{{NOM_ELEVE_1}}', '{{NOM_ELEVE_2}}'],
        order_placeholders: ['{{BON_NUM_1}}', '{{BON_NUM_2}}'],
        photo_anchors: [ { col: 1, row: 2 }, { col: 1, row: 22 } ],
        photo_width: 160,
        split_mode: true
    },
    'fratrie': {
        label: "Fratrie",
        id_placeholders: ['{{ID_ELEVE_1}}', '{{ID_ELEVE_2}}'],
        name_placeholders: ['{{NOM_ELEVE_1}}', '{{NOM_ELEVE_2}}'],
        order_placeholders: ['{{BON_NUM_1}}', '{{BON_NUM_2}}'],
        photo_anchors: [ { col: 1, row: 2 }, { col: 1, row: 24 } ],
        photo_width: 165,
        split_mode: true
    }
    // AJOUTE TES NOUVEAUX TEMPLATES ICI
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