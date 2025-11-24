// src/database.js

const { app } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

// Chemin vers le fichier de la base de données.
// app.getPath('userData') est le dossier standard et recommandé
// pour stocker les données d'une application Electron.
// C'est un emplacement sûr qui persiste entre les lancements.
const dbPath = path.join(app.getPath('userData'), 'scolarsuite.sqlite');

module.exports = open({
    filename: dbPath,
    driver: sqlite3.Database
}).then(async (db) => {
    console.log('Connexion à la base de données SQLite réussie.');
    await db.run('PRAGMA foreign_keys = ON;');

    // Création de la table 'schools' (inchangée)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS schools (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            sourceFolderPath TEXT NOT NULL,
            products TEXT NOT NULL,
            createdAt DATETIME NOT NULL DEFAULT (datetime('now','localtime'))
        );
    `);

    // --- NOUVEL AJOUT CI-DESSOUS ---
    // Création de la table 'orders' pour stocker les commandes individuelles
    await db.exec(`
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            schoolId INTEGER NOT NULL,
            studentIdentifier TEXT NOT NULL,
            categoryName TEXT NOT NULL,
            items TEXT NOT NULL,
            totalAmount REAL NOT NULL,
            createdAt DATETIME NOT NULL DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (schoolId) REFERENCES schools (id) ON DELETE CASCADE,
            -- ON AJOUTE UNE CONTRAINTE D'UNICITÉ
            UNIQUE (schoolId, studentIdentifier)
        );
    `);
    // --- FIN DE L'AJOUT ---

    return db;
});