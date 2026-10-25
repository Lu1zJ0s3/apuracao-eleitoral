const states=[['RO','Rondônia',11,-63,-11],['AC','Acre',12,-70,-9],['AM','Amazonas',13,-64,-4],['RR','Roraima',14,-61,2],['PA','Pará',15,-53,-4],['AP','Amapá',16,-52,1.3],['TO','Tocantins',17,-48.2,-10.1],['MA','Maranhão',21,-45,-5],['PI','Piauí',22,-42.5,-7.5],['CE','Ceará',23,-39.5,-5],['RN','Rio Grande do Norte',24,-36.5,-5.7],['PB','Paraíba',25,-36.7,-7.2],['PE','Pernambuco',26,-38,-8.7],['AL','Alagoas',27,-36.5,-9.6],['SE','Sergipe',28,-37.5,-10.7],['BA','Bahia',29,-41.5,-13],['MG','Minas Gerais',31,-44.3,-18.5],['ES','Espírito Santo',32,-40.6,-19.5],['RJ','Rio de Janeiro',33,-42.7,-22.3],['SP','São Paulo',35,-48.5,-22],['PR','Paraná',41,-51.5,-24.5],['SC','Santa Catarina',42,-50.5,-27],['RS','Rio Grande do Sul',43,-53,-30],['MS','Mato Grosso do Sul',50,-54.5,-20],['MT','Mato Grosso',51,-56,-13],['GO','Goiás',52,-49.7,-16],['DF','Distrito Federal',53,-47.8,-15.8]];
const cargos={'1':'Presidente','3':'Governador','5':'Senador','6':'Deputado federal','7':'Deputado estadual','8':'Deputado distrital'};
const el=id=>document.getElementById(id),fmt=new Intl.NumberFormat('pt-BR'),pct=n=>new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n)+'%';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colors={'22':'#267bc8','13':'#c84865','55':'#9575e8','70':'#b1842d','14':'#397c68','30':'#ba6f32'},color=n=>colors[n]||'#63758b';
const project=([x,y])=>[(x+74)*17+14,(5.5-y)*17+8];
let data=null,geometry=null,selected='BR',cargo='1',limit=50,controller=null,requestId=0;
const cache=new Map();
const name=()=>selected==='BR'?'Brasil':states.find(s=>s[0]===selected)?.[1];
const current=()=>selected==='BR'?data?.national:data?.states.find(s=>s.uf===selected);
const progressColor=p=>p>=100?'#34d5b4':p>=75?'#239db4':p>=50?'#1d78a9':p>=25?'#265a89':'#263b5b';
function select(uf){if(cargo==='8'&&uf!=='DF')return;selected=uf;el('uf').value=uf;limit=50;el('search').value='';render();}
function configure(){
 el('uf').innerHTML=(cargo==='1'?'<option value="BR">Brasil</option>':'')+states.filter(s=>cargo!=='8'||s[0]==='DF').sort((a,b)=>a[1].localeCompare(b[1],'pt-BR')).map(s=>`<option value="${s[0]}">${s[1]} · ${s[0]}</option>`).join('');
 if(cargo==='8')selected='DF';else if(selected==='BR'&&cargo!=='1')selected='CE';
 el('uf').value=selected;
}
function pathFor(g){const polys=g.type==='MultiPolygon'?g.coordinates:[g.coordinates];return polys.map(p=>p.map(r=>r.map((coord,i)=>(i?'L':'M')+project(coord).map(v=>v.toFixed(2)).join(',')).join(' ')+'Z').join(' ')).join(' ');}
function renderMap(){
 if(!geometry)return;
 el('map').innerHTML=geometry.features.map(f=>{const s=states.find(s=>String(s[2])===String(f.properties.codarea));if(!s)return '';const r=data?.states.find(r=>r.uf===s[0]),leader=r?.candidates?.[0],fill=r&&!r.unavailable?(cargo==='1'&&leader?color(leader.number):progressColor(r.percent)):'#233047';const [x,y]=project([s[3],s[4]]);const callout=['RN','PB','PE','AL','SE','ES','RJ','DF'].includes(s[0]);const ty=callout?({'RN':195,'PB':225,'PE':255,'AL':285,'SE':315,'ES':465,'RJ':515,'DF':380}[s[0]]):y;const tx=callout?(s[0]==='DF'?540:700):x;return `<g class="state ${selected===s[0]?'active':''}" tabindex="0" role="button" data-uf="${s[0]}" aria-label="${esc(s[1])}: ${r&&!r.unavailable?pct(r.percent)+' apurado':'sem leitura'}"><title>${esc(s[1])} · ${r&&!r.unavailable?pct(r.percent)+' das seções apuradas':'sem leitura'}</title><path d="${pathFor(f.geometry)}" fill="${fill}"/>${callout?`<line x1="${x}" y1="${y}" x2="${tx-18}" y2="${ty-4}"/>`:''}<text x="${tx}" y="${ty}" text-anchor="middle">${s[0]}</text></g>`}).join('');
 document.querySelectorAll('.state').forEach(g=>{g.onclick=()=>select(g.dataset.uf);g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(g.dataset.uf)}}});
 el('mapHelp').textContent=cargo==='1'?'A cor indica quem lidera para presidente. Clique em uma UF para ver os votos.':'A cor mostra o percentual de seções apuradas. Clique em uma UF para ver seus candidatos.';
 el('legend').innerHTML=cargo==='1'&&data?.national?data.national.candidates.slice(0,4).map(c=>`<span><i style="background:${color(c.number)}"></i>${esc(c.name)}</span>`).join(''):['0–24%','25–49%','50–74%','75–99%','100%'].map((n,i)=>`<span><i style="background:${progressColor(i*25)}"></i>${n}</span>`).join('');
}
function ranking(){
 const r=current(),query=el('search').value.trim().normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
 const candidates=(r?.candidates||[]).filter(c=>`${c.name} ${c.party} ${c.number}`.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().includes(query));
 el('ranking').innerHTML=candidates.length?candidates.slice(0,limit).map((c,i)=>`<div class="row"><div class="row-top"><b>${i+1}. ${esc(c.name)}</b><span>${pct(c.percent)}</span></div><small>${esc(c.party)} · ${esc(c.number)} · ${fmt.format(c.votes)} votos ${c.elected?'<span class="badge">· Eleito conforme TSE</span>':''}</small>${c.status?`<small>${esc(c.status)}</small>`:''}${c.destination&&c.destination!=='Válido'?`<small>${esc(c.destination)}</small>`:''}<div class="bar"><i style="width:${Math.min(100,Math.max(0,c.percent))}%;background:${cargo==='1'?color(c.number):'#31b9be'}"></i></div></div>`).join(''):r&&!r.unavailable?'Nenhum candidato corresponde à busca.':'Aguardando uma leitura válida do TSE para este cargo e localidade.';
 el('more').hidden=candidates.length<=limit;el('more').textContent=`Mostrar mais (${Math.min(limit,candidates.length)} de ${candidates.length})`;
}
function render(){
 if(data)document.querySelector('.eyebrow').textContent=`Eleições Brasil · 2026 · ${data.election.turn}º turno · ${data.election.date}`;
 renderMap();const r=current(),title=cargo==='7'&&selected==='DF'?cargos['8']:cargos[cargo];
 el('rankingTitle').textContent=`${title} · ${name()}`;el('label').textContent=r&&!r.unavailable?pct(r.percent)+' apurado':'sem leitura';
 el('sectionsLabel').textContent='Seções apuradas · '+selected;el('votesLabel').textContent='Votos válidos · '+selected;
 el('sections').textContent=r&&!r.unavailable?pct(r.percent):'—';el('votes').textContent=r&&!r.unavailable?fmt.format(r.validVotes):'—';el('ufs').textContent=data?data.states.filter(s=>!s.unavailable).length+' / '+data.states.filter(s=>!s.notApplicable).length:'—';el('time').textContent=r&&!r.unavailable?r.generatedAt.split(' ')[1]:'—';
 el('detail').innerHTML=r&&!r.unavailable?`<strong>${esc(name())} · ${title}</strong><p>${pct(r.percent)} das seções apuradas · ${fmt.format(r.countedSections)} de ${fmt.format(r.sections)}</p><p>${fmt.format(r.validVotes)} votos válidos · ${r.vacancies} ${r.vacancies===1?'vaga':'vagas'}</p><p>Totalização ${esc(r.totalizedAt)} (Brasília)</p><p><a href="${esc(r.source)}" target="_blank" rel="noopener">Dados oficiais desta localidade</a></p>`:`<strong>${esc(name())}</strong><p>Carregando o cargo selecionado…</p>`;
 el('resultNote').textContent=['6','7','8'].includes(cargo)?'A ordem de votos não determina sozinha quem será eleito. Deputados dependem da distribuição de vagas por partido/federação. A situação exibida vem do TSE.':cargo==='5'?'Em 2026 são duas vagas de senador por UF. Percentuais conforme os votos divulgados pelo TSE; a apuração parcial não é resultado final.':'Percentuais conforme o TSE. Apuração parcial não é resultado final.';
 ranking();
 if(r?.unavailable&&!r.notApplicable){el('status').textContent='Aguardando dados desta UF';el('notice').textContent=`O TSE ainda não retornou uma leitura válida de ${title} nesta localidade. Nova consulta em 30 segundos.`;}
 if(r?.notApplicable){el('status').textContent='Sem disputa nesta UF';el('notice').textContent=`${title}: não há disputa nesta UF no ${data.election.turn}º turno. Selecione outra localidade.`;el('ranking').textContent='Não há disputa deste cargo nesta UF no turno selecionado.';el('detail').textContent='Sem disputa nesta UF neste turno.';}
 if(data&&r&&!r.unavailable){const [d,m,y]=r.generatedAt.split(' ')[0].split('/'),age=Date.now()-Date.parse(`${y}-${m}-${d}T${r.generatedAt.split(' ')[1]}-03:00`),stale=data.stale||r.stale||age>300000;el('live').classList.toggle('offline',stale);el('status').textContent=stale?'Últimos dados do TSE':'Conectado ao TSE';el('notice').classList.toggle('ok',!stale);el('notice').textContent=`TSE · ${title} · ${name()} · Gerado em ${r.generatedAt} (Brasília). ${age>300000?'O arquivo da fonte está há mais de 5 minutos sem nova geração. ':''}Consultado às ${new Date(data.fetchedAt).toLocaleTimeString('pt-BR',{timeZone:'America/Fortaleza'})}. Atualização automática a cada 30 segundos.`;}
}
async function update(){
 const id=++requestId,requested=cargo;controller?.abort();controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),60000);
 try{const res=await fetch('/api/results?cargo='+requested,{cache:'no-store',signal:controller.signal});const next=await res.json();if(id!==requestId)return;if(!res.ok||next.election?.cargo!==requested)throw new Error(next.error||'Resposta incompatível');cache.set(requested,next);data=next;render();}
 catch(error){if(id!==requestId)return;el('live').classList.add('offline');el('status').textContent='Falha na consulta';el('notice').classList.remove('ok');el('notice').textContent='Não foi possível consultar este cargo no TSE. '+(data?'Mantida a última leitura válida. ':'')+'Nova tentativa automática em 30 segundos.';}
 finally{clearTimeout(timer);}
}
el('cargo').onchange=()=>{cargo=el('cargo').value;data=cache.get(cargo)||null;limit=50;el('search').value='';configure();render();el('status').textContent='Consultando TSE…';el('notice').textContent='Buscando '+cargos[cargo]+' no TSE…';update()};
el('uf').onchange=()=>select(el('uf').value);el('search').oninput=()=>{limit=50;ranking()};el('more').onclick=()=>{limit+=50;ranking()};
configure();render();update();fetch('/brasil-uf.geojson').then(r=>{if(!r.ok)throw new Error();return r.json()}).then(g=>{geometry=g;renderMap()}).catch(()=>{el('mapHelp').textContent='Não foi possível carregar o mapa. Use a seleção de localidade acima.'});
setInterval(()=>{if(!document.hidden)update()},30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)update()});
