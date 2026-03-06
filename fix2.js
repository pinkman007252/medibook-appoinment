const fs = require('fs');
const path = require('path');

const dirs = [
    path.join(__dirname, 'backend', 'routes'),
    path.join(__dirname, 'backend', 'middleware')
];

const fixFile = (filePath) => {
    let content = fs.readFileSync(filePath, 'utf-8');

    // Fix db.prepare(...).run/get/all 
    content = content.replace(/db\.prepare\(`([\s\S]*?)`\)\.run\((.*?)\);/g, "await getDb().run(`$1`, $2);");
    content = content.replace(/db\.prepare\(`([\s\S]*?)`\)\.get\((.*?)\);/g, "await getDb().get(`$1`, $2);");
    content = content.replace(/db\.prepare\(`([\s\S]*?)`\)\.all\((.*?)\);/g, "await getDb().all(`$1`, $2);");

    content = content.replace(/db\.prepare\('(.*?)'\)\.run\((.*?)\)/g, "await getDb().run('$1', $2)");
    content = content.replace(/db\.prepare\('(.*?)'\)\.get\((.*?)\)/g, "await getDb().get('$1', $2)");
    content = content.replace(/db\.prepare\('(.*?)'\)\.all\((.*?)\)/g, "await getDb().all('$1', $2)");

    // Fix the transaction error in appointments
    content = content.replace(/const generateTokenNumber = \(doctorId, date\) => \{([\s\S]*?)\};/, 'const generateTokenNumber = async (doctorId, date) => {\n$1\n};');

    // Remove extraneous transaction blocks that have await not inside async
    fs.writeFileSync(filePath, content);
}

dirs.forEach(d => fs.readdirSync(d).forEach(f => {
    if (f.endsWith('.js')) fixFile(path.join(d, f));
}));
console.log('Fixed');
