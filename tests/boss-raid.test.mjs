import test from 'node:test';
import assert from 'node:assert/strict';
import {game} from './helpers/game.mjs';
function raidGame(cid='jotaro',count=3){const g=game();g.ctx.character=cid;g.ctx.cpuCount=count;g.run(`frameCount=0;offlineMode='raid';settings.cid=character;raidParty.count=cpuCount;startBattleOffline();bt.phase='play';`);return g;}
function finishCutins(g){g.run('for(let n=0;n<400&&freezeT>0;n++){frameCount++;simulateFrame()}');}
function stop(g){g.run('raidBeginWorld()');finishCutins(g);g.run('raid.at=30');}
function ground(g){g.run(`var hero=byId(myId),boss=byId(RAID_BOSS_ID);hero.x=500;hero.y=stage.plats[0].y;hero.g=true;hero.groundPl=0;hero.inv=0;boss.x=570;boss.y=stage.plats[0].y;boss.g=true;boss.groundPl=0;boss.inv=0;boss.f=-1;`);}
test('selectable 0–3 ally CPUs share normal two-stock rules; only DIO has HP',()=>{
 const g=raidGame('kaneki',0);assert.equal(g.run('raidHeroes().length'),1);
 g.run(`raidParty.count=3;raidParty.cids=['eren','jotaro','gojo'];startBattleOffline();`);
 assert.deepEqual(Array.from(g.run('raidHeroes().map(p=>p.cid)')),['kaneki','eren','jotaro','gojo']);
 assert.equal(g.run('raidHeroes().every(p=>p.team===1&&p.raidHp===undefined&&p.s===2&&p.d===0)'),true);
 assert.equal(g.run('byId(RAID_BOSS_ID).raidHp'),6400);assert.equal(g.run('Object.hasOwn(CHARS,"dio")'),false);
 assert.equal(g.run('fighterSize(byId(RAID_BOSS_ID))'),1);assert.equal(g.run('stage===RAID_CITY&&stage.w>MAPS.wide.w&&stage.plats[0].w>1500'),true);
});
test('ordinary hits accumulate percentage and knockback, and only ring-outs consume ally stocks',()=>{
 const g=raidGame('kaneki',0);ground(g);
 g.run(`applyHit(hero,{dm:150,k0:7,ks:.1,up:.6,f:1},false,boss.id);`);
 assert.equal(g.run('hero.d'),150);assert.equal(g.run('hero.s'),2);assert.ok(g.run('hero.vx')>0&&g.run('hero.vx')<15);assert.ok(g.run('hero.kb')>0);
 g.run(`hero.x=-130;hero.kb=0;hero.vx=hero.vy=0;stepFighter(hero,blankInput());`);
 assert.equal(g.run('hero.s'),1);assert.equal(g.run('hero.d'),0);assert.equal(g.run('hero.raidHp'),undefined);
 g.run('koFighter(hero);raidTick()');assert.equal(g.run('hero.out'),true);assert.equal(g.run('raid.result'),'failed');
});
test('DIO is a normal-sized CPU using movement, gravity, jump and ordinary attack frames',()=>{
 const g=raidGame('karate',0);ground(g);g.run(`hero.x=250;boss.x=800;var oldX=boss.x;for(let i=0;i<40;i++){frameCount++;raidTick();aiStep(boss);stepFighter(boss,boss.ai.inp);}`);
 assert.equal(g.run('boss.cpu'),true);assert.ok(g.run('boss.x')<g.run('oldX')-50);
 g.run(`boss.a=0;boss.mv=null;boss.cd=0;boss.y=500;boss.vy=0;boss.g=false;boss.prev=blankInput();stepFighter(boss,blankInput())`);assert.ok(g.run('boss.y')>500);
});
test('NPC melee damages only touching victims during active attack frames',()=>{
 const g=raidGame('karate',0);ground(g);g.run(`dioMove(boss,'dioJab');boss.a=1;meleeCheck(boss);`);assert.equal(g.run('hero.d'),0);
 g.run('boss.a=3;meleeCheck(boss);meleeCheck(boss)');assert.equal(g.run('hero.d'),8);assert.equal(g.run('hero.s'),2);
 g.run(`hero.d=0;hero.x=100;boss.hit={};meleeCheck(boss);`);assert.equal(g.run('hero.d'),0);
});
test('Muda rush ends with an ordinary knockback smash',()=>{
 const g=raidGame('karate',0);ground(g);g.run(`dioMove(boss,'dioRush');boss.a=31;meleeCheck(boss);`);
 assert.equal(g.run('hero.d'),10);assert.ok(g.run('Math.abs(hero.vx)')>0&&g.run('Math.abs(hero.vx)')<7);assert.equal(g.run('hero.s'),2);
});
test('knives and road rollers are moving projectiles, with no instant arena-wide damage',()=>{
 const g=raidGame('karate',0);ground(g);g.run(`boss.x=750;dioProjectile(boss,'dioKnife',hero);`);
 assert.equal(g.run('projs.length'),3);assert.equal(g.run('hero.d'),0);
 g.run('for(let i=0;i<15;i++)stepProjs()');assert.ok(g.run('hero.d')>0);assert.equal(g.run('hero.s'),2);
 g.run(`projs=[];hero.d=0;hero.x=200;boss.x=850;dioProjectile(boss,'dioRoller',hero);var q=projs[0],oldY=q.y;stepProjs();`);
 assert.ok(g.run('q.y')>g.run('oldY'));assert.equal(g.run('hero.d'),0);assert.equal(g.run('q.kind'),'dioRoller');
});
test('ordinary Gojo infinity and player invulnerability still protect against DIO projectiles',()=>{
 const g=raidGame('gojo',0);ground(g);g.run(`resolveProj({o:boss.id,x:boss.x,vx:-19,dm:12,k0:7,ks:.065,up:.3},hero)`);assert.equal(g.run('hero.d'),0);
 g.run(`hero.cid='karate';hero.inv=20;resolveProj({o:boss.id,x:boss.x,vx:-19,dm:12,k0:7,ks:.065,up:.3},hero)`);assert.equal(g.run('hero.d'),0);
});
test('DIO can act during his own World; only a countering Jotaro can stop him and fight back',()=>{
 const g=raidGame('kaneki',3);ground(g);stop(g);g.run(`var j=raidHeroes().find(p=>p.cid==='jotaro'),oldX=hero.x;`);
 assert.equal(g.run('raidFrozen(boss)'),false);assert.equal(g.run('raidCounter(hero)'),false);
 g.run(`stepFighter(hero,{...blankInput(),r:true});raidBossDamage(hero,100);`);assert.equal(g.run('hero.x'),g.run('oldX'));assert.equal(g.run('boss.raidHp'),6400);
 g.run('j.energy=100');assert.equal(g.run('raidCounter(j)'),true);assert.equal(g.run('raidFrozen(boss)'),true);assert.equal(g.run('raidFrozen(j)'),false);
 assert.equal(g.run('raidHeroes().filter(p=>p!==j).every(p=>raidFrozen(p))'),true);
 assert.equal(g.run('raidBossDamage(j,35)'),35);assert.equal(g.run('boss.raidHp'),6365);assert.equal(g.run('raidBossDamage(hero,90)'),0);
});
test('DIO time-stop counter requires 100 gauge even while frozen, and consumes it',()=>{
 const g=raidGame('jotaro',0);ground(g);stop(g);
 g.run(`raid.at=225;hero.energy=0;hero.spc=99;hero.kb=40;stepFighter(hero,{...blankInput(),sc:1,gd:true,s:true})`);
 assert.equal(g.run('raid.counterIds.includes(myId)'),false);
 assert.equal(g.run('hero.kb'),40);
 g.run(`hero.energy=100;stepFighter(hero,{...blankInput(),sc:2,gd:true,s:true})`);
 assert.equal(g.run('raid.counterIds.includes(myId)'),true);assert.equal(g.run('hero.kb'),0);assert.equal(g.run('hero.energy'),0);
 assert.equal(g.run('raid.breakDamage'),undefined);
});
test('stopped normal hits queue and resume as percentage and knockback; time expiry does not cause a global hit',()=>{
 const g=raidGame('karate',0);ground(g);stop(g);
 g.run(`applyHit(hero,{dm:20,k0:10,ks:.08,up:.5,f:-1},false,boss.id)`);assert.equal(g.run('hero.d'),0);assert.equal(g.run('hero.stoppedHits.length'),1);
 g.run('raid.at=239;raidTick()');assert.equal(g.run('hero.d'),40);assert.equal(g.run('hero.s'),2);assert.ok(g.run('hero.vx')<0);
 const empty=raidGame('karate',0);stop(empty);empty.run('raid.at=239;raidTick()');assert.equal(empty.run('byId(myId).d'),0);assert.equal(empty.run('byId(myId).s'),2);
});
test('DIO loses HP and reacts with physics, while instant-KO flags cannot bypass the HP objective',()=>{
 const g=raidGame('boxer',0);ground(g);
 g.run(`resolveMelee({id:myId,x:hero.x,f:1,mv:{dm:30,k0:22,ks:.16,up:1.5,ko:true,kind:'upper'}},boss)`);
 assert.equal(g.run('boss.raidHp'),6370);assert.equal(g.run('boss.d'),0);assert.ok(g.run('boss.kb')>0);assert.ok(g.run('boss.kb')<=10);
 g.run(`koFighter(boss)`);assert.equal(g.run('boss.out'),false);assert.equal(g.run('boss.raidHp'),6370);
});
test('ordinary counter damage is credited against DIO HP instead of an unused percentage',()=>{
 const g=raidGame('karate',0);ground(g);g.run(`hero.f=1;hero.ct=CT_ON;resolveMelee({id:boss.id,x:boss.x,f:-1,mv:{type:'heavy',kind:'dioKick',dm:23,k0:13,ks:.12,up:.6}},hero);endFreeze()`);
 assert.ok(g.run('boss.raidHp')<6400);assert.equal(g.run('boss.d'),0);assert.ok(g.run('hero.stats.dealt')>0);
});
test('CPU Jotaro counters and uses normal attacks on the stopped NPC',()=>{
 const g=raidGame('kaneki',1);ground(g);g.run(`var j=raidHeroes()[1];j.x=500;j.y=stage.plats[0].y;j.g=true;j.groundPl=0;`);stop(g);
 g.run('j.energy=100;for(let i=0;i<150;i++){frameCount++;simulateFrame()}');
 assert.equal(g.run('raid.counterIds.includes(j.id)'),true);assert.ok(g.run('j.stats.dealt')>0);assert.ok(g.run('boss.raidHp')<6400);assert.equal(g.run('j.s'),2);
});
test('Jotaro full-gauge time stop freezes DIO and ALL allied fighters, not Jotaro',()=>{
 const g=raidGame('jotaro',2);
 g.run('var j=byId(myId);j.energy=100;animeTimeStop(j)');
 assert.equal(g.run('j.energy'),0);
 assert.equal(g.run('raidFrozen(j)'),false);
 assert.equal(g.run('raidFrozen(byId(RAID_BOSS_ID))'),true);
 assert.equal(g.run('raidHeroes().filter(p=>p!==j).every(p=>raidFrozen(p))'),true);
 assert.equal(g.run('byId(RAID_BOSS_ID).timeStopT'),0);
 g.run('raid.jotaroStopId="";j.timeStopSelfT=0');
 assert.equal(g.run('raidFrozen(byId(RAID_BOSS_ID))'),false);
 assert.equal(g.run('raidHeroes().filter(p=>p!==j).every(p=>!raidFrozen(p))'),true);
});
test('clear, rematch and normal-mode cleanup use separate victory conditions',()=>{
 const g=raidGame('kaneki',2);g.run(`byId(RAID_BOSS_ID).raidHp=10;raidBossDamage(byId(myId),12)`);assert.equal(g.run('raid.result'),'clear');assert.equal(g.run('bt.winnerTeam'),1);
 g.run('startBattleOffline()');assert.equal(g.run('byId(RAID_BOSS_ID).raidHp'),6400);assert.equal(g.run('raidHeroes().every(p=>p.s===2&&p.d===0&&p.raidHp===undefined)'),true);
 g.run(`bt.phase='play';raid.frame=18000;raidTick()`);assert.equal(g.run('bt.phase'),'play');
 g.run(`offlineMode='normal';startBattleOffline()`);assert.equal(g.run('raid'),null);assert.equal(g.run('fighters.some(p=>p.raidBoss)'),false);
});
test('online host publishes at most four selectable allies with ordinary stocks and the same arena',async()=>{
 const g=game(),writes=[];g.ctx.room={update:async()=>{},child:()=>({set:async value=>writes.push(value)})};
 g.run(`online=true;isHost=true;roomRef=room;memCache={};memCache[myId]={cid:'kaneki',protocol:NET_PROTOCOL,slot:0};memCache.peer={cid:'eren',protocol:NET_PROTOCOL,slot:1};gmCache={mode:'raid',raidCpuN:3,raidCpuCids:['jotaro','gojo','goku'],round:0};`);
 await g.run('hostStart()');assert.equal(writes[0].players.length,4);assert.deepEqual(Array.from(writes[0].players,p=>p.cid),['kaneki','eren','jotaro','gojo']);assert.equal(writes[0].stocks,2);assert.equal(writes[0].map,'wide');
});
function linkedRaid(){
 const host=game(),guest=game(),hostId=host.run('myId'),guestId=guest.run('myId');for(const [g,owner]of [[host,true],[guest,false]]){g.ctx.hostId=hostId;g.ctx.guestId=guestId;g.ctx.hostFlag=owner;g.run(`frameCount=0;online=true;isHost=hostFlag;curRound=1;gmCache={mode:'raid',hostId,map:'metro',teamMode:1,stocks:2,players:[{id:hostId,cid:'kaneki',label:'HOST',cpu:0},{id:guestId,cid:'jotaro',label:'GUEST',cpu:0}]};startBattleOnline();bt.phase='play';`);}
 const hostWrites=[],guestWrites=[];
 for(const [g,out]of [[host,hostWrites],[guest,guestWrites]])g.ctx.transport={child:()=>({push:()=>({set:async e=>out.push(e),remove:async()=>{}}),update:async()=>{}})};
 host.run('roomRef=transport');guest.run('roomRef=transport');
 const snapshot=()=>{const s=host.run(`({...stateOf(byId(RAID_BOSS_ID)),rd:1,sq:++netSeq,ts:Date.now()})`);guest.ctx.wire=JSON.parse(JSON.stringify(s));guest.run(`onP({key:RAID_BOSS_ID,val:()=>wire})`);};
 return {host,guest,hostWrites,guestWrites,snapshot};
}
test('two clients: guest Jotaro counters, host HP resolves once, and owner acknowledgment restores control',()=>{
 const {host,guest,guestWrites,snapshot}=linkedRaid();stop(host);snapshot();assert.equal(guest.run('raid.at'),30);
 guest.run('byId(myId).energy=100;byId(myId).spc=99;byId(myId).kb=40;raidCounter(byId(myId))');host.run('byId(guestId).energy=100');host.ctx.event=guestWrites[0];host.run('receiveNetEvent(event)');snapshot();
 assert.equal(guest.run('byId(myId).spc+byId(myId).kb'),0);assert.equal(host.run('raidFrozen(byId(myId))'),true);assert.equal(host.run('raidFrozen(byId(RAID_BOSS_ID))'),true);
 guest.run(`send({k:'mh',to:RAID_BOSS_ID,a:myId,ax:500,f:1,c:'#fff',mv:{dm:30,k0:3,ks:0,up:0,kind:'ora'}})`);
 host.ctx.event=guestWrites.at(-1);host.run('receiveNetEvent(event);receiveNetEvent(event)');finishCutins(host);assert.equal(host.run('byId(RAID_BOSS_ID).raidHp'),6370);snapshot();assert.equal(guest.run('byId(RAID_BOSS_ID).raidHp'),6370);
 assert.equal(guest.run('byId(myId).raidHp'),undefined);
});
test('two clients: NPC hits use victim percentage and stock transport with duplicate and owner checks',()=>{
 const {host,guest,hostWrites,snapshot}=linkedRaid();
 host.run(`send({k:'mh',to:guestId,a:RAID_BOSS_ID,ax:byId('raid_dio').x,f:-1,c:'#fff',mv:{type:'normal',kind:'dioJab',dm:11,k0:5,ks:.055,up:.35}})`);
 guest.ctx.event=hostWrites.at(-1);guest.run('receiveNetEvent(event);receiveNetEvent(event)');assert.equal(guest.run('byId(myId).d'),11);assert.equal(guest.run('byId(myId).s'),2);
 stop(host);snapshot();host.run(`raidAcceptCounter({id:guestId,serial:raid.serial,by:'imposter'})`);assert.equal(host.run('raid.counterIds.length'),0);
 guest.run(`receiveNetEvent({...event,uid:'old-round',rd:0})`);assert.equal(guest.run('byId(myId).d'),11);
});
test('two clients: stopped-hit knockback resumes on the victim owner after the host ends World',()=>{
 const {host,guest,hostWrites,snapshot}=linkedRaid();stop(host);snapshot();
 guest.run(`var h=byId(myId);h.cid='karate'`);
 host.run(`send({k:'mh',to:guestId,a:RAID_BOSS_ID,ax:byId(RAID_BOSS_ID).x,f:-1,c:'#fff',mv:{type:'normal',kind:'dioJab',dm:11,k0:5,ks:.055,up:.35}})`);
 guest.ctx.event=hostWrites.at(-1);guest.run('receiveNetEvent(event)');assert.equal(guest.run('h.d'),0);assert.equal(guest.run('h.stoppedHits.length'),1);
 host.run('raid.at=239;raidTick()');snapshot();assert.equal(guest.run('h.d'),22);assert.equal(guest.run('h.s'),2);assert.ok(guest.run('h.vx')<0);
});
test('normal combat is survivable while the same stopped-time strike is lethal and not scaled twice',()=>{
 const g=raidGame('karate',0);ground(g);
 g.run(`hero.d=80;applyHit(hero,{dm:20,k0:10,ks:.08,up:.5,f:-1},false,boss.id);var normalSpeed=Math.abs(hero.vx);hero.d=80;hero.vx=hero.vy=hero.kb=0;hero.inv=0;`);
 stop(g);g.run(`applyHit(hero,{dm:20,k0:10,ks:.08,up:.5,f:-1},false,boss.id);raid.at=239;raidTick()`);
 assert.equal(g.run('hero.d'),120);assert.ok(g.run('Math.abs(hero.vx)')>g.run('normalSpeed')*3);assert.ok(g.run('Math.abs(hero.vx)')>=30);assert.equal(g.run('hero.s'),2);
});
test('DIO cut-in pauses the encounter clock; Jotaro cannot move or attack without activation',()=>{
 const g=raidGame('jotaro',0);ground(g);g.run(`raidBeginWorld();var startAt=raid.at,oldX=hero.x;for(let i=0;i<20;i++){frameCount++;simulateFrame()}`);
 assert.equal(g.run('fz.dioWorld'),true);assert.equal(g.run('raid.at'),g.run('startAt'));assert.ok(g.run('freezeT')>0);finishCutins(g);
 g.run(`stepFighter(hero,{...blankInput(),r:true});`);assert.equal(g.run('hero.x'),g.run('oldX'));assert.equal(g.run('raidFrozen(hero)'),true);assert.equal(g.run('raidFrozen(boss)'),false);
 g.run(`stepFighter(hero,{...blankInput(),sc:1,gd:true,s:true});`);assert.equal(g.run('raid.counterIds.length'),0);
 g.run(`hero.energy=100;stepFighter(hero,{...blankInput(),sc:2,gd:true,s:true});`);
 assert.equal(g.run('fz.att'),g.run('myId'));assert.ok(g.run('freezeT')>0);assert.equal(g.run('raidFrozen(boss)'),true);
});
test('World strikes bypass ordinary passive defenses only after actual collision',()=>{
 const g=raidGame('gojo',0);ground(g);stop(g);
 g.run(`resolveProj({o:boss.id,x:boss.x,vx:-19,dir:-1,dm:6,k0:5,ks:.045,up:.3},hero);raid.at=239;raidTick()`);assert.equal(g.run('hero.d'),12);
 const ss=raidGame('goku',0);ground(ss);ss.run('hero.form=3;hero.energy=100');stop(ss);assert.equal(ss.run('isInvuln(hero)'),false);
});
test('Cairo arena and camera keep ordinary-sized fighters within a larger traversable street',()=>{
 const g=raidGame('karate',3);g.run('var camera=raidCameraTarget()');assert.equal(g.run('stage.w'),1800);assert.ok(g.run('stage.plats[0].w')>1500);assert.equal(g.run('Object.keys(MAPS).length'),10);
 assert.equal(g.run('fighters.every(p=>p.x>=camera.x&&p.x<=camera.x+camera.w)'),true);assert.equal(g.run('fighterSize(byId(RAID_BOSS_ID))'),1);
});
test('world cut-in and its counter synchronize through host-owned cinematic events',()=>{
 const {host,guest,hostWrites,guestWrites,snapshot}=linkedRaid();host.run('raidBeginWorld()');
 const dio=hostWrites.find(e=>e.k==='cinx');assert.equal(dio.kind,'timestop');assert.ok(dio.data.raidWorld);
 guest.ctx.event=JSON.parse(JSON.stringify(dio));guest.run('receiveNetEvent(event)');assert.equal(guest.run('fz.dioWorld'),true);assert.ok(guest.run('freezeT')>0);assert.equal(guest.run('raidFrozen(byId(myId))'),true);
 finishCutins(host);finishCutins(guest);snapshot();guest.run('byId(myId).energy=100;raidCounter(byId(myId))');host.run('byId(guestId).energy=100');host.ctx.event=guestWrites.find(e=>e.k==='raid-counter');host.run('receiveNetEvent(event)');
 const counter=hostWrites.find(e=>e.k==='cinx'&&e.data?.raidCounter);guest.ctx.event=JSON.parse(JSON.stringify(counter));guest.run('receiveNetEvent(event)');assert.equal(guest.run('fz.att'),guest.run('myId'));assert.equal(guest.run('raidFrozen(byId(RAID_BOSS_ID))'),true);
 const invalid=linkedRaid();invalid.guest.ctx.event={...dio,by:'imposter',rd:1,uid:'forged',cid:'forged'};invalid.guest.run('receiveNetEvent(event)');assert.equal(invalid.guest.run('freezeT'),0);
});
test('after the cut-in DIO really moves and attacks while an unactivated Jotaro stays frozen',()=>{
 const g=raidGame('jotaro',0);ground(g);stop(g);
 g.run(`var victimX=hero.x,startX=boss.x;for(let i=0;i<50;i++){frameCount++;simulateFrame()}`);
 assert.equal(g.run('hero.x'),g.run('victimX'));assert.equal(g.run('hero.d'),0);assert.equal(g.run('raid.counterIds.length'),0);
 assert.notEqual(g.run('boss.x'),g.run('startX'));assert.ok(g.run('hero.stoppedHits?.length||0')>0);
});

test('DIO gains a telegraphed heavy strike and enters a final escalation under 1,250 HP',()=>{
 const g=raidGame('karate',0);ground(g);
 g.run("dioMove(boss,'dioSlam');boss.a=15;meleeCheck(boss)");
 assert.ok(g.run('hero.d')>=25);
 g.run('boss.raidHp=3200;raidTick()');assert.equal(g.run('raid.phase'),2);
 g.run('boss.raidHp=1250;raidTick()');assert.equal(g.run('raid.phase'),3);
 assert.ok(g.run('raidFx.some(q=>q.kind==="phase"&&q.phase===3)'));
 assert.ok(g.run('fighterConfig(boss).spd')>1.5);
});
test('a no-gauge Jotaro CPU never gets a free DIO counter',()=>{
 const g=raidGame('kaneki',1);ground(g);stop(g);
 g.run('var j=raidHeroes()[1];j.energy=0;raid.at=30;for(let i=0;i<25;i++){frameCount++;aiStep(j)}');
 assert.equal(g.run('raid.counterIds.length'),0);
 assert.equal(g.run('raidFrozen(j)'),true);
});
test('remote Jotaro time stop locks all allies via owner-verified area event',()=>{
 const {host,guest,guestWrites,snapshot}=linkedRaid();
 guest.run('var j=byId(myId);j.energy=100;animeTimeStop(j)');
 const ev=guestWrites.find(e=>e.k==='animearea'&&e.kind==='timestop');
 assert.ok(ev);
 host.ctx.event=ev;host.run('receiveNetEvent(event)');
 assert.equal(host.run('raidJotaroStopId()'),guest.run('myId'));
 assert.equal(host.run('raidFrozen(byId(RAID_BOSS_ID))'),true);
 assert.equal(host.run('raidHeroes().filter(p=>p.id!==guestId).every(p=>raidFrozen(p))'),true);
 snapshot();
 assert.equal(guest.run('raidFrozen(byId(hostId))'),true);
});
