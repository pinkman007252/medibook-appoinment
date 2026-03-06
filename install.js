const { spawnSync } = require('child_process');
const path = require('path');

const NPM = path.join(__dirname, '.npm-bin', 'package', 'lib', 'cli.js');

function install(dir) {
    console.log('\n=== Installing in:', dir, '===');
    const result = spawnSync(process.execPath, [NPM, 'install', '--legacy-peer-deps', '--loglevel=verbose'], {
        cwd: dir,
        stdio: ['ignore', process.stdout, process.stderr],
        encoding: 'utf8'
    });
    console.log('Exit code:', result.status);
    if (result.error) console.error('Error:', result.error.message);
}

install(path.join(__dirname, 'backend'));
install(path.join(__dirname, 'frontend'));
console.log('\nDone.');
