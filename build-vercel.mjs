import {mkdirSync, copyFileSync} from 'node:fs';
mkdirSync('public', {recursive:true});
for (const file of ['index.html','app.js','brasil-uf.geojson']) {
  copyFileSync(`dist/${file}`, `public/${file}`);
}
