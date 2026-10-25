import {test} from 'node:test';
import assert from 'node:assert/strict';

test('seleciona segundo turno, preserva cargos do primeiro e aceita geração posterior', async()=>{
  const original=globalThis.fetch;
  const entry=(id,t,tp,cargos,ufs=['br'])=>({cd:id,t,tp,nm:`Turno ${t}`,abr:ufs.map(cd=>({cd,cp:cargos.map(cd=>({cd}))}))});
  const config={f:'o',pl:[{c:'ele2026',dt:'04/10/2026',e:[entry('6257','1','8',['1']),entry('6259','1','1',['3','5','6','7','8'])]},{c:'ele2026',dt:'25/10/2026',e:[entry('6258','2','8',['1']),entry('6260','2','1',['3'],['am'])]}]};
  globalThis.fetch=async url=>{
    if(url.endsWith('ele-c.json'))return Response.json(config);
    const [,id,uf,cargo]=url.match(/ele2026\/(\d+)\/dados\/(\w+)\/\w+-c0*(\d+)-/);
    return Response.json({f:'o',ele:id,t:['6258','6260'].includes(id)?'2':'1',cdabr:uf,dg:'26/10/2026',hg:'00:01:00',s:{ts:'10',st:'5',pst:'50'},v:{vvc:'100',tv:'100'},carg:[{cd:cargo,nv:'1',agr:[]} ]});
  };
  try{
    const {getResults}=await import('./tse.mjs?test');
    const president=await getResults({cargo:'1'});
    assert.equal(president.election.id,'6258');assert.equal(president.national.generatedAt,'26/10/2026 00:01:00');
    const senate=await getResults({cargo:'5'});assert.equal(senate.election.turn,'1');
    const governor=await getResults({cargo:'3'});assert.equal(governor.election.turn,'2');assert.equal(governor.states.filter(s=>!s.unavailable).length,1);assert.equal(governor.partial,false);
  }finally{globalThis.fetch=original;}
});
