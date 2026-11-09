import test from 'node:test';
import assert from 'node:assert/strict';
import {game} from './helpers/game.mjs';

const battle=`settings.cid='naruto';startBattleCommon([
 {id:myId,cid:'naruto',label:'P1',owner:myId,cpu:0},
 {id:'cpu0',cid:'karate',label:'CPU',owner:myId,cpu:1}
 ],'std',false,3);bt.phase='play';`;
const remoteBattle=`online=true;curRound=1;startBattleCommon([
 {id:myId,cid:'karate',label:'P1',owner:myId,cpu:0},
 {id:'peer',cid:'naruto',label:'P2',owner:'peer',cpu:0}
 ],'std',false,3);bt.phase='play';
 const peer=byId('peer');peer.x=500;peer.y=380;
 const cloneState={...stateOf(peer),sc:1,so:'peer',cid:'naruto',rd:1,ts:Date.now(),sq:1};`;

test('kumite advances past two opponents with a living player shadow clone',()=>{
 const g=game();g.run(battle+`offlineMode='kumite';byId(myId).energy=100;shadowCloneSummon(byId(myId));
 byId('cpu0').out=true;checkEnd();
 fighters.find(f=>f.cpu&&!f.shadowClone).out=true;checkEnd();`);
 assert.equal(g.run('kumiteCount'),2);
 assert.equal(g.run('fighters.filter(f=>f.cpu&&!f.shadowClone&&!f.out).length'),1);
 assert.equal(g.run('!!shadowCloneAlive(myId)'),true);
});

test('invalid clone snapshots cannot create fighters or block subsequent valid snapshots',()=>{
 const g=game();g.run(remoteBattle+`onP({key:'sclone_peer_1',val:()=>({...cloneState,x:null})});`);
 assert.equal(g.run('fighters.length'),2);
 g.run(`onP({key:'sclone_peer_2',val:()=>cloneState});`);
 assert.equal(g.run('fighters.length'),3);
 assert.equal(g.run("byId('sclone_peer_2').buf.length"),1);
});

test('clone knockout snapshot retires it without recording a roster elimination',()=>{
 const g=game();g.run(remoteBattle+`onP({key:'sclone_peer_1',val:()=>cloneState});
 onP({key:'sclone_peer_1',val:()=>({...cloneState,o:1,s:0,sq:2})});updateRemote();`);
 assert.equal(g.run("byId('sclone_peer_1').out"),true);
 assert.equal(g.run("shadowCloneGone.has('sclone_peer_1')"),true);
 assert.equal(g.run('elim.length'),0);
 g.run(`byId('sclone_peer_1').shadowGoneAt=Date.now()-1000;shadowClonePrune();`);
 assert.equal(g.run("!!byId('sclone_peer_1')"),false);
});

const roster=['karate','bomber','ninja','sumo','boxer','yankee','swordsman','lancer','gunman','archer','rubber','berserker','goku','gojo','tanjiro','naruto','jotaro','eren','kaneki'];
test('roster contains all 19 characters and CPU pools partition it',()=>{
 const g=game();assert.deepEqual(Array.from(g.run('Object.keys(CHARS)')),roster);
 assert.equal(g.run('new Set([...cpuCharacterPool("normal"),...cpuCharacterPool("special")]).size'),19);
});
for(const cid of roster)test(`${cid}: move, jump, normal/charged attack and directional specials simulate`,()=>{
 const g=game();g.run(battle+`byId(myId).cid=${JSON.stringify(cid)};animeInit(byId(myId));`);
 g.run(`const p=byId(myId);p.x=stage.w/2;p.y=stage.plats[0].y;p.inv=0;
 let input=blankInput();input.r=true;stepFighter(p,input);`);
 assert.ok(g.run('p.vx>0'));
 g.run('input.jc++;stepFighter(p,input);');assert.ok(g.run('p.vy<0&&!p.g'));
 g.run('clearActs(p);fireAttack(p,1);');assert.ok(g.run('!!p.mv&&p.a>0&&Number.isFinite(p.mv.dm)'));
 g.run('clearActs(p);fireAttack(p,CH_FULL);');assert.ok(g.run('!!p.mv&&p.a>0&&Number.isFinite(p.mv.dm)'));
 for(const direction of ['neutral','up','side','down']){
  g.run(`respawn(p);p.x=stage.w/2;p.y=stage.plats[0].y;p.g=true;p.inv=0;p.spc=0;p.cd=0;p.energy=100;p.erenGauge=100;p.kanekiGauge=100;p.ko=100;p.rage=100;p.senku=100;p.gearM=100;
   input=blankInput();p.prev=blankInput();input.sc=1;input.s=true;
   input.u=${direction==='up'};input.d=${direction==='down'};input.r=${direction==='side'};
   stepFighter(p,input);
   var specialStarted=!!(p.mv||p.spc>0||p.sph>0||p.rageT>0||p.gear>1||p.modeT>0||p.domainT>0||p.timeStopSelfT>0||p.rec||senkuActive||p.erenForm||p.erenWire||p.kanekiTime);
   for(let i=0;i<36;i++)stepFighter(p,input);
   input.s=false;stepFighter(p,input);`);
  assert.ok(g.run('[p.x,p.y,p.vx,p.vy,p.d,p.energy].every(Number.isFinite)'),direction);
  assert.equal(g.run('specialStarted'),true,direction);
 }
});

test('melee hits once, respects team immunity, counters, and invulnerability',()=>{
 const g=game();g.run(battle+`const a=byId(myId),t=byId('cpu0');a.cid='karate';a.x=400;a.y=400;a.f=1;t.x=430;t.y=400;t.inv=0;
 fireAttack(a,1);a.a=a.mv.act0;meleeCheck(a);const first=t.d;meleeCheck(a);`);
 assert.ok(g.run('first>0'));assert.equal(g.run('t.d'),g.run('first'));
 g.run('t.d=0;t.inv=50;a.hit={};meleeCheck(a);');assert.equal(g.run('t.d'),0);
 g.run('t.inv=0;battleTeamMode=true;a.team=t.team=1;a.hit={};meleeCheck(a);');assert.equal(g.run('t.d'),0);
 g.run('battleTeamMode=false;t.ct=CT_ON;t.f=-1;fireAttack(a,CH_FULL);a.a=a.mv.act0;meleeCheck(a);');
 assert.equal(g.run('fzType'),'counter');assert.equal(g.run('t.stats.counters'),1);assert.equal(g.run('t.d'),0);
});

test('projectile collision damages an enemy once and removes the projectile',()=>{
 const g=game();g.run(battle+`const a=byId(myId),t=byId('cpu0');a.cid='karate';a.x=400;a.y=400;a.f=1;t.x=435;t.y=400;t.inv=0;
 spawnProj(a,'hado');stepProjs();const damage=t.d;stepProjs();`);
 assert.ok(g.run('damage>0'));assert.equal(g.run('t.d'),g.run('damage'));assert.equal(g.run('projs.length'),0);
});

test('keyboard, touch and gamepad edge inputs clear on blur/cancellation',()=>{
 const g=game();g.run(battle);
 g.dispatch('keydown',{keyCode:68});g.dispatch('keydown',{keyCode:74});g.run('readHuman();');
 assert.equal(g.run('hin.r&&hin.a&&hin.ac===1'),true);
 g.dispatch('blur');g.run('readHuman();');assert.equal(g.run('hin.r||hin.a||heldKeys.size>0'),false);
 g.dispatch('focus');g.run("prefs.specialInput='classic'");g.get('btn-s').dispatch('pointerdown',{pointerId:7});g.run('readHuman();byId(myId).sph=10;');
 assert.equal(g.run('hin.s'),true);
 g.dispatch('pointercancel',{pointerId:7});g.run('readHuman();');assert.equal(g.run('hin.s'),false);assert.equal(g.run('byId(myId).sph'),0);
 g.ctx.navigator.getGamepads=()=>[{connected:true,index:0,axes:[1,0],buttons:Array.from({length:16},(_,i)=>({pressed:i===1}))}];
 g.run('readHuman();');assert.equal(g.run('hin.r&&hin.a'),true);
});

test('Naruto short special preserves rasenshuriken and hold summons once per press and allows a second clone',()=>{
 const g=game();g.run(battle+`const p=byId(myId);p.energy=100;
 let input=blankInput();input.sc++;input.s=true;stepFighter(p,input);input.s=false;stepFighter(p,input);`);
 assert.equal(g.run('projs.some(q=>q.kind==="rasenshuriken")'),true);
 g.run(`p.spc=0;clearActs(p);input.sc++;input.s=true;for(let i=0;i<40;i++)stepFighter(p,input);`);
 assert.equal(g.run('fighters.filter(f=>f.shadowClone&&!f.out).length'),1);
 g.run('p.energy=100;p.spc=0;shadowCloneSummon(p);');assert.equal(g.run('fighters.filter(f=>f.shadowClone&&!f.out).length'),2);
 g.run('p.energy=100;p.spc=0;shadowCloneSummon(p);');assert.equal(g.run('fighters.filter(f=>f.shadowClone&&!f.out).length'),2);
});

test('normal/team victory ignores clones, training resets, and tournament progresses to a champion',()=>{
 const g=game();g.run(battle+`byId(myId).energy=100;shadowCloneSummon(byId(myId));byId('cpu0').out=true;checkEnd();`);
 assert.equal(g.run('bt.winner===myId'),true);
 g.run(battle+`battleTeamMode=true;byId(myId).team=1;byId('cpu0').team=2;byId('cpu0').out=true;checkEnd();`);
 assert.equal(g.run('bt.winnerTeam'),1);
 g.run(battle+`offlineMode='training';byId('cpu0').d=150;trainingReset(true);`);
 assert.equal(g.run("byId('cpu0').d"),0);assert.equal(g.run('byId(myId).energy'),100);
 g.run(`offlineMode='tournament';const tour=newSoloTournament();let played=0;while(!tour.champion&&played++<8)progressTournament(tour,tour.matches[tour.index][0]);`);
 assert.equal(g.run('played'),7);assert.equal(g.run('tour.history.length'),3);assert.ok(g.run('tour.champion'));
});

test('remote clone database deletion uses the same retirement path as a pop event',async()=>{
 const g=game();const handlers=new Map();
 const gm={protocol:g.run('NET_PROTOCOL'),cpuN:0};
 function ref(path=''){
  return {child:p=>ref(path+'/'+p),once:async()=>({val:()=>path==='/gm'?gm:{}}),
   on:(event,fn)=>handlers.set(path+':'+event,fn),onDisconnect:()=>({remove(){}}),set:async()=>{}};
 }
 g.ctx.fakeRoom=ref();g.run(remoteBattle+`roomRef=fakeRoom;show=()=>{};renderLobby=()=>{};`);
 assert.equal(await g.run('joinCommon()'),true);
 g.run(`onP({key:'sclone_peer_1',val:()=>cloneState});`);
 handlers.get('/p:child_removed')({key:'sclone_peer_1'});
 assert.equal(g.run("byId('sclone_peer_1').out&&!!byId('sclone_peer_1').shadowGoneAt"),true);
 assert.equal(g.run('elim.length'),0);
 // Normal disconnects must still count as eliminations.
 handlers.get('/p:child_removed')({key:'peer'});assert.equal(g.run('elim[0]'),'peer');
});

test('remote state rejects stale rounds, duplicate/out-of-order snapshots and malformed numbers',()=>{
 const g=game();g.run(remoteBattle);
 for(const key of ['x','y','vx','r','d','s','ts'])for(const value of [null,NaN,Infinity]){
  g.ctx.badValue=value;g.ctx.badKey=key;
  g.run(`onP({key:'sclone_peer_1',val:()=>({...cloneState,[badKey]:badValue})});`);
  assert.equal(g.run('fighters.length'),2,key);
 }
 g.run(`onP({key:'peer',val:()=>({...cloneState,sc:0,x:500,sq:3})});
 onP({key:'peer',val:()=>({...cloneState,sc:0,x:900,sq:2})});
 onP({key:'peer',val:()=>({...cloneState,sc:0,x:900,sq:3})});
 onP({key:'peer',val:()=>({...cloneState,sc:0,x:900,sq:4,rd:0})});`);
 assert.equal(g.run('peer.buf.length'),1);assert.equal(g.run('peer.buf[0].x'),500);
});

test('two simulated clients transport clone state, a hit, and a deduplicated pop',async()=>{
 const owner=game(),guest=game();const ownerId=owner.run('myId'),guestId=guest.run('myId');
 const roster=[{id:ownerId,cid:'naruto',label:'owner',owner:ownerId,cpu:0},{id:guestId,cid:'karate',label:'guest',owner:guestId,cpu:0}];
 const states=[],ownerEvents=[],guestEvents=[];
 for(const [g,events]of [[owner,ownerEvents],[guest,guestEvents]]){
  g.ctx.fakeRoom={child:path=>({update:async payload=>{states.push(payload)},push:()=>({set:async data=>{events.push(data)}})})};
  g.run(`online=true;curRound=1;startBattleCommon(${JSON.stringify(roster)},'std',false,3);bt.phase='play';roomRef=fakeRoom;`);
 }
 owner.run('byId(myId).energy=100;shadowCloneSummon(byId(myId));sendLocal();');
 for(const [id,state]of Object.entries(states[0]))guest.ctx.onP({key:id,val:()=>state});
 const cloneId=owner.run('shadowCloneAlive(myId).id');
 assert.equal(guest.run(`byId(${JSON.stringify(cloneId)}).remote`),true);
 guest.run(`writeEvent({k:'mh',to:${JSON.stringify(cloneId)},a:myId,ax:400,f:1,mv:{type:'normal',kind:'normal',dm:6,k0:4.5,ks:.05,up:.6}});`);
 owner.ctx.onEvent(guestEvents.at(-1));assert.equal(owner.run('shadowCloneAlive(myId)'),null);
 const pop=ownerEvents.find(e=>e.k==='shadow-pop');assert.ok(pop);
 guest.ctx.onEvent(pop);const particleCount=guest.run('particles.length');guest.ctx.onEvent(pop);
 assert.equal(guest.run('particles.length'),particleCount);
 assert.equal(guest.run(`byId(${JSON.stringify(cloneId)}).out`),true);
 assert.equal(guest.run('elim.length'),0);
 await Promise.resolve();
});

test('clone AI targets an enemy, pursues it, attacks, and disappears on an enemy hit',()=>{
 const g=game();g.run(battle+`const owner=byId(myId),enemy=byId('cpu0');owner.energy=100;owner.x=250;owner.y=stage.plats[0].y;
 shadowCloneSummon(owner);const clone=shadowCloneAlive(myId);clone.x=300;clone.y=stage.plats[0].y;
 enemy.x=700;enemy.y=clone.y;aiLv=3;clone.ai.t=1;
 for(let i=0;i<20;i++)aiStep(clone);`);
 assert.equal(g.run('nearestFoe(clone).id'),'cpu0');assert.equal(g.run('clone.ai.inp.r'),true);
 // Fix the random stream for a reproducible close-range decision, without changing AI code.
 g.run('Math=Object.create(Math);Math.random=()=>.5;enemy.x=clone.x+40;clone.ai.t=1;for(let i=0;i<20;i++)aiStep(clone);');
 assert.equal(g.run('clone.ai.inp.ac>0||clone.ai.inp.sc>0'),true);
 g.run('stepFighter(clone,clone.ai.inp);');assert.ok(g.run('clone.ch>0||clone.sph>0||!!clone.mv'));
 g.run(`resolveMelee({id:enemy.id,x:enemy.x,f:-1,mv:{type:'normal',kind:'normal',dm:6,k0:4.5,ks:.05,up:.6}},clone);`);
 assert.equal(g.run('clone.out'),true);assert.equal(g.run('owner.s'),3);
});
