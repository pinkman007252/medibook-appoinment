const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../database.sqlite');
let dbInstance = null;

const setupDatabase = async () => {
    dbInstance = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        await dbInstance.exec(schema);
        console.log('✅ SQLite Database Connected and Schema Initialized');
    }
};

const getDb = () => dbInstance;

module.exports = {
    setupDatabase,
    getDb
};
