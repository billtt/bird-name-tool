const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'bird-names.json');

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
};

function send(res, status, body, headers = {}) {
    res.writeHead(status, headers);
    res.end(body);
}

async function handleBirdNames(req, res) {
    if (req.method === 'GET') {
        try {
            const data = await fs.promises.readFile(DATA_FILE, 'utf8');
            send(res, 200, data, { 'Content-Type': 'application/json; charset=utf-8' });
        } catch (e) {
            if (e.code === 'ENOENT') {
                send(res, 200, '[]', { 'Content-Type': 'application/json; charset=utf-8' });
            } else {
                send(res, 500, JSON.stringify({ error: e.message }), { 'Content-Type': 'application/json' });
            }
        }
        return;
    }
    if (req.method === 'PUT') {
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', async () => {
            try {
                const parsed = JSON.parse(body);
                if (!Array.isArray(parsed) || !parsed.every((n) => typeof n === 'string')) {
                    throw new Error('Expected a JSON array of strings');
                }
                await fs.promises.writeFile(DATA_FILE, JSON.stringify(parsed, null, 2) + '\n', 'utf8');
                send(res, 200, '{"ok":true}', { 'Content-Type': 'application/json' });
            } catch (e) {
                send(res, 400, JSON.stringify({ error: e.message }), { 'Content-Type': 'application/json' });
            }
        });
        return;
    }
    send(res, 405, 'Method Not Allowed');
}

async function handleStatic(req, res, pathname) {
    let rel = pathname === '/' ? '/index.html' : pathname;
    const filePath = path.normalize(path.join(ROOT, rel));
    if (!filePath.startsWith(ROOT)) {
        send(res, 403, 'Forbidden');
        return;
    }
    try {
        const data = await fs.promises.readFile(filePath);
        const ext = path.extname(filePath).toLowerCase();
        send(res, 200, data, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    } catch (e) {
        send(res, 404, 'Not Found');
    }
}

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === '/api/bird-names') {
        handleBirdNames(req, res);
    } else {
        handleStatic(req, res, url.pathname);
    }
});

server.listen(PORT, () => {
    console.log(`Bird name tool running at http://localhost:${PORT}`);
});
