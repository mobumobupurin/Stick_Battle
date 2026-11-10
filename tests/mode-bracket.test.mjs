import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('src/index.template.html'),modes=read('src/game/06-game-modes.js');
test('mode cards and all linked buttons exist exactly once',()=>{
 for(const id of ['go-cpu','go-online','go-more','go-hub','go-howto','extra-training','extra-kumite','extra-tournament','extra-ranking','tour-offline','tour-network']){
  assert.equal(html.split('id="'+id+'"').length-1,1,id);
 }
 assert.ok(html.indexOf('03 / CHALLENGES')<html.indexOf('04 / GAME HUB'));
 assert.ok(html.indexOf('04 / GAME HUB')<html.indexOf('05 / BEGINNER GUIDE'));
 assert.ok(html.includes('全キャラのCPUが次々に登場'));
 assert.ok(!html.includes('最強固定'));
});
test('kumite pulls from the full fighter roster on first match and every subsequent match',()=>{
 assert.ok(modes.includes("cpuCharacterPool(offlineMode==='kumite'?'all':settings.cpuPool)"));
 assert.ok(modes.includes("const main=stage.plats[0],keys=cpuCharacterPool('all')"));
 assert.ok(modes.includes("offlineMode==='kumite'?'none':'flex'"));
 assert.ok(modes.includes('const KUMITE_CPU_LEVEL=3'),'existing scoring stays compatible');
});
test('top-to-bottom DOM depicts winner at top, final, semifinal, and opening round at bottom',()=>{
 const code=read('src/game/06b-tournament-bracket.js');
 const ctx={
  MAPS:{std:{name:'Standard'}},settings:{stocks:3},DEFAULT_STOCK:3,
  esc:s=>String(s||''),tourName:(t,id)=>String(id||'未決定'),
  tourFighterHTML:(t,id,w)=>'<div class="tour-fighter">'+id+'</div>'
 };
 vm.createContext(ctx);vm.runInContext(code,ctx);
 const entrants=Array.from({length:8},(_,i)=>({id:'p'+i}));
 const t={entrants,map:'std',stocks:3,round:1,index:0,matches:[[ 'p0','p1'],['p2','p3'],['p4','p5'],['p6','p7']],winners:[],history:[],details:[]};
 let out=ctx.tourBoardHTML(t);
 assert.ok(out.indexOf('bracket-champion')<out.indexOf('GRAND FINAL'));
 assert.ok(out.indexOf('GRAND FINAL')<out.indexOf('SEMI FINAL'));
 assert.ok(out.indexOf('SEMI FINAL')<out.indexOf('ROUND 1'));
 assert.equal((out.match(/class="bracket-match /g)||[]).length,7);
 assert.equal((out.match(/class="bracket-links"/g)||[]).length,2);
 t.round=3;t.index=0;t.history=[{round:1,pairs:[{ids:['p0','p1'],winner:'p0'},{ids:['p2','p3'],winner:'p2'},{ids:['p4','p5'],winner:'p4'},{ids:['p6','p7'],winner:'p6'}]},{round:2,pairs:[{ids:['p0','p2'],winner:'p0'},{ids:['p4','p6'],winner:'p4'}]}];
 t.matches=[['p0','p4']];out=ctx.tourBoardHTML(t);assert.ok(out.includes('p0'));assert.ok(out.includes('p4'));
 t.champion='p4';t.history.push({round:3,pairs:[{ids:['p0','p4'],winner:'p4'}]});out=ctx.tourBoardHTML(t);assert.ok(out.includes('is-complete'));assert.ok(out.includes('7 試合'));
});
