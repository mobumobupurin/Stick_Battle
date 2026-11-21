import {game as gameRuntime} from './helpers/game.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../src/game/'+p,import.meta.url),'utf8');
function game(){return gameRuntime().run;}
test('kumite counts the real opponent once across waves, ignoring live and defeated clones',()=>{
 const run=game();
 run(`offlineMode='kumite';const me=makeFighter({id:myId,cid:'naruto',owner:myId},0);
 const rival=makeFighter({id:'cpu1',cid:'karate',cpu:1,owner:myId},1);
 const clone=makeFighter({id:'clone',cid:'naruto',cpu:1,owner:myId},2);
 clone.shadowClone=true;clone.shadowOwner=myId;fighters=[me,rival,clone];rival.out=true;checkEnd();`);
 assert.equal(run('kumiteCount'),1);
 run('checkEnd()');assert.equal(run('kumiteCount'),1,'live clone must not hide the next opponent');
 run('clone.out=true;checkEnd()');assert.equal(run('kumiteCount'),1,'clone death must not count as a win');
 run('fighters.find(f=>f.cpu&&!f.shadowClone).out=true;checkEnd()');
 assert.equal(run('kumiteCount'),2,'next real opponent must count');
});
test('malformed remote clone snapshots cannot reserve a clone slot',()=>{
 const run=game();
 run(`online=true;curRound=1;fighters=[makeFighter({id:'peer',cid:'naruto',owner:'peer'},0)];
 const invalid={sc:1,so:'peer',rd:1,x:NaN,y:200,o:0};`);
 assert.equal(run("shadowCloneReceiveSnapshot('sclone_peer_1',invalid)"),null);
 assert.equal(run('fighters.length'),1);
 assert.equal(run("!!shadowCloneReceiveSnapshot('sclone_peer_2',{...invalid,x:200})"),true);
});
test('all 19 characters initialize and produce finite normal and charged melee moves',()=>{
 const run=game();
 assert.equal(run('Object.keys(CHARS).length'),19);
 for(const cid of run('Object.keys(CHARS)')){
  for(const charge of [0,50]){
   run(`fighters=[makeFighter({id:myId,cid:${JSON.stringify(cid)},owner:myId},0)];fireAttack(fighters[0],${charge});`);
   assert.equal(run("['dm','k0','ks','reach','R','act0','act1','end'].every(k=>Number.isFinite(fighters[0].mv[k]))"),true,cid);
  }
 }
});
test('melee geometry hits only in range and only once per swing',()=>{
 const run=game();
 run(`fighters=[makeFighter({id:myId,cid:'karate',owner:myId},0),makeFighter({id:'enemy',cid:'karate',owner:myId},1)];
 const a=fighters[0],t=fighters[1];a.x=100;a.y=t.y=300;a.f=1;t.x=700;
 fireAttack(a,0);a.a=a.mv.act0;meleeCheck(a);`);
 assert.equal(run('t.d'),0);
 run('t.x=130;meleeCheck(a)');assert.ok(run('t.d')>0);
 const damage=run('t.d');run('meleeCheck(a)');assert.equal(run('t.d'),damage);
});
test('invulnerability and teams protect against melee and projectile damage',()=>{
 const run=game();
 run(`fighters=[makeFighter({id:myId,cid:'karate',owner:myId,team:1},0),makeFighter({id:'enemy',cid:'karate',owner:myId,team:1},1)];
 const a=fighters[0],t=fighters[1];const h={dm:10,k0:5,ks:.1,up:.6,type:'normal',kind:'normal'};
 t.inv=10;resolveMelee({id:a.id,x:0,f:1,mv:h},t);resolveProj({...h,o:a.id,x:0,vx:1},t);`);
 assert.equal(run('t.d'),0);
 run('t.inv=0;battleTeamMode=true;t.team=a.team=1;resolveMelee({id:a.id,x:0,f:1,mv:h},t);resolveProj({...h,o:a.id,x:0,vx:1},t)');
 assert.equal(run('t.d'),0);
});
test('eight-player tournament advances seven matches to a champion',()=>{
 const run=game();run('const tour=newSoloTournament();');
 for(let i=0;i<7;i++)assert.equal(run('progressTournament(tour,tour.matches[tour.index][0])'),true);
 assert.equal(run('tour.history.length'),3);assert.ok(run('tour.champion'));
});
test('snapshot receiver rejects missing numeric fields before creating remote clones and drops old sequences',()=>{
 const run=game();
 const ui=read('13-ui-and-menus.js');
 run(ui.slice(ui.indexOf('function onPPolished(s){'),ui.indexOf('function updateRemotePolished(){')));
 run(`online=true;curRound=1;fighters=[makeFighter({id:'peer',cid:'naruto',owner:'peer'},0)];
 const packet={sc:1,so:'peer',rd:1,x:200,y:300,vx:0,r:0,d:0,s:1,ts:Date.now(),sq:2,o:0};
 onPPolished({key:'sclone_peer_1',val:()=>({...packet,vx:null})});`);
 assert.equal(run('fighters.length'),1);
 run("onPPolished({key:'sclone_peer_2',val:()=>packet});");
 assert.equal(run('fighters.length'),2);assert.equal(run('fighters[1].buf.length'),1);
 run("onPPolished({key:'sclone_peer_2',val:()=>({...packet,sq:1,x:500})});");
 assert.equal(run('fighters[1].buf.length'),1);assert.equal(run('fighters[1].buf[0].x'),200);
});
test('keyboard, touch, gamepad and blur reset use the shared input safely',()=>{
 const handlers=new Map(),elements=new Map();
 const el=id=>{
  if(!elements.has(id))elements.set(id,{style:{},classList:{remove(){},add(){}},textContent:id,
   setAttribute(){},addEventListener(){},hasPointerCapture:()=>false});
  return elements.get(id);
 };
 const ctx=vm.createContext({URLSearchParams,location:{search:''},console,innerWidth:800,innerHeight:450,
  UP_ARROW:38,DOWN_ARROW:40,LEFT_ARROW:37,RIGHT_ARROW:39,
  window:{addEventListener:(k,f)=>handlers.set(k,f)},
  document:{hidden:false,activeElement:null,getElementById:el,querySelectorAll:()=>[],addEventListener(){}},
  navigator:{getGamepads:()=>[]},settingsDialog:{open:false},actx:null});
 vm.runInContext(read('01-game-data.js'),ctx);
 vm.runInContext('function byId(){return null;} function requestEventReplay(){}',ctx);
 vm.runInContext(read('12-input.js'),ctx);
 const run=code=>vm.runInContext(code,ctx);
 run("scene='battle'");handlers.get('keydown')({keyCode:74,target:null});run('readHuman()');
 assert.equal(run('hin.a'),true);assert.equal(run('hin.ac'),1);
 run('readHuman()');assert.equal(run('hin.ac'),1,'held attack must not generate repeated press edges');
 handlers.get('blur')();assert.equal(run('hin.a'),false);assert.equal(run('heldKeys.size'),0);
 handlers.get('focus')();run('touch.s=true;readHuman()');assert.equal(run('hin.s'),true);
 run('resetTouch();navigator.getGamepads=()=>[{connected:true,index:0,id:"Pro Controller (Vendor: 057e Product: 2009)",mapping:"standard",axes:[1,0],buttons:[{pressed:true}]}];readHuman()');
 assert.equal(run('hin.r&&hin.s'),true);
 run('settingsDialog.open=true;readHuman()');assert.equal(run('hin.r||hin.s'),false);
});
