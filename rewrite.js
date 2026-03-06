const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'backend', 'routes');
const middlewareDir = path.join(__dirname, 'backend', 'middleware');
const seedFile = path.join(__dirname, 'backend', 'seed.js');

const processFile = (filePath) => {
    let content = fs.readFileSync(filePath, 'utf-8');

    // Replace { db } = require(...) with getDb
    content = content.replace(/const { db } = require\('\.\.\/config\/db'\);/g, "const { getDb } = require('../config/db');\nconst db = getDb();");

    // Replace db.prepare(...).get(...)
    content = content.replace(/db\.prepare\((.*?)\)\.get\((.*?)\)/g, 'await getDb().get($1, $2)');
    content = content.replace(/db\.prepare\((.*?)\)\.get\(\)/g, 'await getDb().get($1)');

    // Replace db.prepare(...).all(...)
    content = content.replace(/db\.prepare\((.*?)\)\.all\((.*?)\)/g, 'await getDb().all($1, $2)');
    content = content.replace(/db\.prepare\((.*?)\)\.all\(\)/g, 'await getDb().all($1)');

    // Replace db.prepare(...).run(...)
    content = content.replace(/db\.prepare\((.*?)\)\.run\((.*?)\)/g, 'await getDb().run($1, $2)');
    content = content.replace(/db\.prepare\((.*?)\)\.run\(\)/g, 'await getDb().run($1)');

    // Replace db.transaction
    content = content.replace(/const transaction = db\.transaction\(\(.*?\) => {([\s\S]*?)}\);[\s\S]*?transaction\(\);/g, "await getDb().run('BEGIN TRANSACTION');\n        try {$1\n            await getDb().run('COMMIT');\n        } catch(e) {\n            await getDb().run('ROLLBACK');\n            throw e;\n        }");

    // Replace synchronous route handlers with async
    content = content.replace(/router\.(get|post|put|delete)\('(.*?)', (protect,\s*(authorize\(.*?\),\s*)?)?\(req, res\)/g, "router.$1('$2', $3async (req, res)");

    // Fix require db path in seed
    if (filePath.includes('seed.js')) {
        content = content.replace(/const db = require.*?;/g, "const { getDb } = require('./config/db');");
        content = content.replace(/setupDatabase\(\);/, "await setupDatabase();");
    }

    if (filePath.includes('auth.js') && filePath.includes('middleware')) {
        content = content.replace(/getDb\(\)\.get\(/g, "await getDb().get(");
    }

    fs.writeFileSync(filePath, content);
};

// Also fix config/db
const dbJs = path.join(__dirname, 'backend', 'config', 'db.js');

if (fs.existsSync(routesDir)) {
    fs.readdirSync(routesDir).forEach(f => {
        if (f.endsWith('.js')) processFile(path.join(routesDir, f));
    });
}
if (fs.existsSync(middlewareDir)) {
    fs.readdirSync(middlewareDir).forEach(f => {
        if (f.endsWith('.js')) processFile(path.join(middlewareDir, f));
    });
}
if (fs.existsSync(seedFile)) {
    processFile(seedFile);
}

console.log('Codebase refactored for async sqlite!');
