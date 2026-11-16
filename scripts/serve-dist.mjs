// dist を GitHub Pages と同じ形（/<リポジトリ名>/ 配下）で配信する簡易サーバー（依存なし）
// 使い方: node scripts/serve-dist.mjs [distDir] [base] [port]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const [, , distDir = 'dist', base = process.env.BASE_PATH || '/kanrikanriapp2/', port = '4173'] = process.argv;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
};

http
  .createServer((req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    if (!url.startsWith(base)) {
      res.writeHead(404).end('not found');
      return;
    }
    let rel = url.slice(base.length) || 'index.html';
    const root = path.resolve(distDir);
    let file = path.join(root, rel);
    if (!file.startsWith(root)) {
      res.writeHead(403).end();
      return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  })
  .listen(Number(port), () => console.log(`serving ${distDir} at http://localhost:${port}${base}`));
