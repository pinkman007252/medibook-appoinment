/**
 * bootstrap.js — Downloads npm and installs all dependencies for MediBook
 * Run with: node bootstrap.js
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const os = require('os');

const NODE = process.execPath;
const ROOT = __dirname;
const NPM_VERSION = '10.9.2';
const NPM_DIR = path.join(ROOT, '.npm-bin');
const NPM_CLI = path.join(NPM_DIR, 'npm', 'cli.js');

function download(url) {
    return new Promise((res, rej) => {
        https.get(url, resp => {
            if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
                return download(resp.headers.location).then(res).catch(rej);
            }
            const chunks = [];
            resp.on('data', c => chunks.push(c));
            resp.on('end', () => res(Buffer.concat(chunks)));
            resp.on('error', rej);
        }).on('error', rej);
    });
}

async function extractTgz(buffer, dest) {
    fs.mkdirSync(dest, { recursive: true });
    const tmpTar = path.join(os.tmpdir(), 'npm.tar.gz');
    fs.writeFileSync(tmpTar, buffer);
    // Use node's built-in zlib + tar-stream via child_process
    // Try system tar first
    try {
        execSync(`tar -xzf "${tmpTar}" -C "${dest}"`, { stdio: 'inherit' });
        console.log('✅ Extracted npm using system tar');
    } catch {
        // Manual extraction using node's zlib
        console.log('System tar not available, extracting manually...');
        const zlib = require('zlib');
        const gunzipped = zlib.gunzipSync(buffer);
        // Write raw tar and use node to stream it
        const tmpRaw = path.join(os.tmpdir(), 'npm.tar');
        fs.writeFileSync(tmpRaw, gunzipped);
        console.log('⚠️ Manual tar extraction needed. Please extract manually from:', tmpRaw);
    }
}

async function ensureNpm() {
    if (fs.existsSync(NPM_CLI)) {
        console.log('✅ npm already available at', NPM_CLI);
        return;
    }
    console.log(`📥 Downloading npm ${NPM_VERSION}...`);
    const buf = await download(`https://registry.npmjs.org/npm/-/npm-${NPM_VERSION}.tgz`);
    console.log(`✅ Downloaded (${(buf.length / 1024 / 1024).toFixed(1)} MB)`);
    await extractTgz(buf, NPM_DIR);
}

function npmInstall(dir) {
    console.log(`\n📦 Installing packages in: ${dir}`);
    execSync(`"${NODE}" "${NPM_CLI}" install --legacy-peer-deps`, {
        cwd: dir,
        stdio: 'inherit',
        env: { ...process.env, PATH: process.env.PATH }
    });
    console.log(`✅ Packages installed in ${path.basename(dir)}`);
}

async function main() {
    console.log(`\n🚀 MediBook Bootstrap — Node.js ${process.version}\n`);
    await ensureNpm();

    // Install backend
    npmInstall(path.join(ROOT, 'backend'));

    // Install frontend
    npmInstall(path.join(ROOT, 'frontend'));

    console.log(`
✅ All dependencies installed!

📋 Next steps:
  1. Start backend:   node "${path.join(ROOT, '.npm-bin', 'npm', 'cli.js')}" --prefix backend start
     OR: cd backend && "${NODE}" server.js

  2. Start frontend:  cd frontend && "${NODE}" "${NPM_CLI}" start

  OR run the generated start.ps1 script.
`);

    // Write convenience start script
    fs.writeFileSync(path.join(ROOT, 'start-backend.ps1'), `$env:PATH = "${path.dirname(NODE)};$env:PATH"\nSet-Location "${path.join(ROOT, 'backend')}"\n& "${NODE}" server.js`);
    fs.writeFileSync(path.join(ROOT, 'start-frontend.ps1'), `$env:PATH = "${path.dirname(NODE)};$env:PATH"\nSet-Location "${path.join(ROOT, 'frontend')}"\n& "${NODE}" "${NPM_CLI}" start`);
    console.log('📝 Created start-backend.ps1 and start-frontend.ps1');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
