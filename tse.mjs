const BASE = 'https://resultados.tse.jus.br/oficial/';
const UFS = 'ac al ap am ba ce df es go ma mt ms mg pa pb pr pe pi rj rn rs ro rr sc sp se to'.split(' ');
const caches=new Map(), flights=new Map();let election, configAt = 0;
const lastGood = new Map();
const timestamp = value => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}:\d{2}:\d{2})$/.exec(value);
  return match ? Date.parse(`${match[3]}-${match[2]}-${match[1]}T${match[4]}-03:00`) : NaN;
};
const number = value => {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  if (!Number.isFinite(parsed) || value == null || value === '') throw new Error('Campo numérico ausente no TSE');
  return parsed;
};
async function official(path) {
  const response = await fetch(BASE + path, { signal: AbortSignal.timeout(15000), headers: {Accept: 'application/json'} });
  if (!response.ok) throw new Error(`TSE respondeu HTTP ${response.status}`);
  return response.json();
}
async function discover(cargo) {
  if (!election || Date.now() - configAt >= 300000) {
  const config = await official('comum/config/ele-c.json');
  if (config.f !== 'o') throw new Error('Configuração não é do ambiente oficial');
  election = config.pl;
  configAt = Date.now();
  }
  const today = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const eligible = election.filter(p=>p.c==='ele2026' && timestamp(`${p.dt} 00:00:00`) <= Date.parse(today+'T23:59:59-03:00')).flatMap(p=>p.e.filter(e=>e.tp===(cargo==='1'?'8':'1') && e.abr.some(a=>a.cp.some(c=>c.cd===cargo))).map(e=>({cycle:p.c,id:e.cd,date:p.dt,title:e.nm,turn:e.t,cargo,applicableUfs:e.abr.map(a=>a.cd.toLowerCase())}))).sort((a,b)=>timestamp(`${b.date} 00:00:00`)-timestamp(`${a.date} 00:00:00`));
  if (!eligible.length) throw new Error('Eleição não encontrada no TSE para este cargo');
  return eligible[0];
}
function normalize(raw, uf, source, e) {
  if (raw.f !== 'o' || String(raw.ele) !== String(e.id) || raw.t !== e.turn || raw.cdabr?.toLowerCase() !== uf) throw new Error('Dados incompatíveis com a eleição selecionada');
  const generated = timestamp(`${raw.dg} ${raw.hg}`);
  if (!Number.isFinite(generated) || generated < timestamp(`${e.date} 00:00:00`)) throw new Error('Data de geração inválida no TSE');
  const cargo = raw.carg?.find(c => c.cd === e.cargo);
  if (!cargo || !raw.s || !raw.v) throw new Error('Resposta sem resultado presidencial');
  const candidates = (cargo.agr ?? []).flatMap(a => (a.par ?? []).flatMap(p => (p.cand ?? []).map(c => ({name: c.nmu || c.nm, number: c.n, party: p.sg, votes: number(c.vap), percent: number(c.pvapn ?? c.pvap), elected: c.e === 's',status:c.st||'',destination:c.dvt||''})))).sort((a,b) => b.votes - a.votes);
  return {uf: uf.toUpperCase(), cargo:e.cargo, vacancies:Number(cargo.nv), sections: number(raw.s.ts), countedSections: number(raw.s.st), percent: number(raw.s.pstn ?? raw.s.pst), validVotes: number(raw.v.vvc), totalVotes: number(raw.v.tv), candidates, generatedAt: `${raw.dg} ${raw.hg}`, totalizedAt: `${raw.dt || raw.dg} ${raw.ht || raw.hg}`, source, version: raw.idg, complete: raw.tf === 's', stale: false};
}
async function loadUf(uf, e) {
  if (!e.applicableUfs.includes('br') && !e.applicableUfs.includes(uf)) return {uf:uf.toUpperCase(),unavailable:true,notApplicable:true};
  if(e.cargo==='8'&&uf!=='df')return {uf:uf.toUpperCase(),unavailable:true,notApplicable:true};
  if(e.cargo==='7'&&uf==='df')e={...e,cargo:'8'};
  const key=e.id+':'+e.cargo+':'+uf;
  const path = `${e.cycle}/${e.id}/dados/${uf}/${uf}-c${e.cargo.padStart(4,'0')}-e${e.id.padStart(6,'0')}-u.json`;
  try {
    const normalized = normalize(await official(path), uf, BASE + path, e);
    const previous = lastGood.get(key);
    if (previous && timestamp(normalized.generatedAt) < timestamp(previous.generatedAt)) return {...previous, stale: true, error: 'TSE retornou uma versão anterior; mantendo a última leitura'};
    lastGood.set(key, normalized);
    return normalized;
  } catch (error) {
    const previous = lastGood.get(key);
    return previous ? {...previous, stale: true, error: error.message} : {uf: uf.toUpperCase(), unavailable: true, source: BASE + path, error: error.message};
  }
}
async function refresh(cargo) {
  const e = await discover(cargo);
  const locations = cargo==='1'?['br', ...UFS]:UFS, records = new Array(locations.length);
  let cursor = 0;
  await Promise.all(Array.from({length: 6}, async () => {
    while (cursor < locations.length) {
      const index = cursor++;
      records[index] = await loadUf(locations[index], e);
    }
  }));
  const national = cargo==='1'?records[0]:null;
  if (national?.unavailable) throw new Error(national.error);
  const cached = {election: e, national, states: cargo==='1'?records.slice(1):records, fetchedAt: new Date().toISOString(), refreshSeconds: 30, partial: records.some(r => r.stale || (r.unavailable&&!r.notApplicable))};
  caches.set(cargo,cached);
  return cached;
}
export async function getResults({force = false,cargo='1'} = {}) {
  if(!['1','3','5','6','7','8'].includes(cargo))throw new Error('Cargo inválido');
  const cached=caches.get(cargo);
  if (!force && cached && Date.now() - Date.parse(cached.fetchedAt) < 30000) return cached;
  if (!flights.has(cargo)) flights.set(cargo,refresh(cargo).finally(() => {flights.delete(cargo);}));
  try { return await flights.get(cargo); }
  catch (error) {
    if (cached) return {...cached, partial: true, stale: true, error: error.message};
    throw error;
  }
}
