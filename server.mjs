import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {getResults} from './tse.mjs';
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:8765');
  try {
    if (url.pathname === '/api/results') {
      const body = await getResults({force: url.searchParams.get('refresh') === '1',cargo:url.searchParams.get('cargo')||'1',turn:url.searchParams.get('turn')||'auto'});
      res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'});
      res.end(JSON.stringify(body));
    } else if(url.pathname==='/app.js'){
      res.writeHead(200,{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-store'});res.end(await readFile(new URL('./dist/app.js',import.meta.url)));
    } else if(url.pathname==='/brasil-uf.geojson'){
      res.writeHead(200,{'Content-Type':'application/geo+json'});res.end(await readFile(new URL('./dist/brasil-uf.geojson',import.meta.url)));
    } else if (url.pathname === '/' || url.pathname === '/index.html') {
      res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'});
      res.end(await readFile(new URL('./dist/index.html', import.meta.url)));
    } else { res.writeHead(404); res.end('Não encontrado'); }
  } catch (error) {
    res.writeHead(502, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'});
    res.end(JSON.stringify({error: error.message}));
  }
});
server.listen(8765, '127.0.0.1', () => console.log('Apuração TSE: http://127.0.0.1:8765'));
