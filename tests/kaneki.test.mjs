import test from 'node:test';
import assert from 'node:assert/strict';
import {game} from './helpers/game.mjs';
const setup=`frameCount=0;startBattleCommon([{id:myId,cid:'kaneki',owner:myId,label:'金木',cpu:0},{id:'enemy',cid:'karate',owner:myId,label:'Enemy',cpu:1}],'std',false,3);bt.phase='play';const p=byId(myId),t=byId('enemy');p.x=400;p.y=390;p.inv=0;t.x=460;t.y=390;t.inv=0;p.g=true;`;
function env(){const g=game();g.run(setup);return g;}
function hit(g,kind='kanekiJab',phase=0){g.run(`kanekiMove(p,'${kind}');resolveMelee({id:p.id,x:p.x,f:1,mv:{...p.mv,kanekiPhase:${phase}}},t);`);}
test('white-haired Kaneki is a special selectable fighter with eleven registered moves',()=>{const g=env();assert.ok(g.run('cpuCharacterPool("special").includes("kaneki")'));assert.equal(g.run('Object.keys(KANEKI_MOVES).length'),11);assert.equal(g.run('fighterConfig(p).wt'),1.18);assert.match(g.run('portrait("kaneki")'),/svg/);});
test('A and fully charged A deal their intended damage using normal knockback',()=>{const g=env();hit(g);assert.equal(g.run('t.d'),8);g.run('t.inv=0;t.kb=0;kanekiAttack(p,CH_FULL);resolveMelee({id:p.id,x:p.x,f:1,mv:p.mv},t);');assert.equal(g.run('t.d'),33);assert.ok(g.run('t.kb>0'));assert.equal(g.run('!!p.mv.ko'),false);});
test('four dance phases apply once each and duplicate delivery cannot increase damage',()=>{const g=env();g.run(`kanekiMove(p,'kanekiDance');for(let phase=0;phase<4;phase++){t.inv=0;t.kb=0;const A={id:p.id,x:p.x,f:1,mv:{...p.mv,kanekiPhase:phase}};resolveMelee(A,t);resolveMelee(A,t);}`);assert.equal(g.run('t.d'),32);assert.equal(g.run('p.kanekiHits'),1);assert.equal(g.run('p.kanekiGauge'),16);});
test('real moving combat executes all four dance phases without phantom guaranteed hits',()=>{const g=env();g.run(`t.x=475;kanekiSpecial(p,{neutralSpecial:true});let peak=0;for(let i=0;i<50;i++){stepFighter(p,blankInput());stepFighter(t,blankInput());if(p.mv)meleeCheck(p);peak=Math.max(peak,t.d);}`);assert.ok(g.run('peak>0&&peak<=32'));assert.ok(g.run('p.a===0'));});
test('bind pulls victim toward Kaneki, expires, and cannot immediately bind again',()=>{const g=env();g.run('t.x=540;');hit(g,'kanekiBind');assert.ok(g.run('!!t.kanekiPull'));const x=g.run('t.x');g.run('for(let i=0;i<32;i++)stepFighter(t,blankInput());');assert.ok(g.run('t.x')<x);assert.equal(g.run('t.kanekiPull'),null);g.run('t.inv=0;');hit(g,'kanekiBind');assert.equal(g.run('t.kanekiPull'),null);});
test('bind whiff retains recovery; invulnerability, teams and giants prevent capture',()=>{for(const state of ['t.inv=30','battleTeamMode=true;p.team=t.team=1','t.cid="eren";erenReset(t);t.erenForm=1;t.erenTime=1080']){const g=env();g.run(state);hit(g,'kanekiBind');assert.equal(g.run('t.kanekiPull'),null);}const g=env();g.run('t.x=750;kanekiSpecial(p,{sideSpecial:1});p.a=10;meleeCheck(p);');assert.equal(g.run('t.d'),0);assert.equal(g.run('p.mv.end'),48);assert.equal(g.run('p.spc'),80);});
test('capture releases when attacker is hit, disappears, transforms or target is KOed',()=>{for(const state of ['p.kb=10','p.out=true','p.kanekiTime=900','t.out=true','fighters=fighters.filter(f=>f!==p)']){const g=env();hit(g,'kanekiBind');g.run(state+';kanekiPullTick(t);');assert.equal(g.run('t.kanekiPull'),null);}});
test('confirmed bind accepts a timed follow-up and recovery restricts whiffs',()=>{const g=env();hit(g,'kanekiBind');g.run(`p.a=13;const i=blankInput();i.sc=1;i.s=true;i.neutralSpecial=true;stepFighter(p,i);`);assert.equal(g.run('p.mv.kind'),'kanekiDance');});
test('regeneration uses three distinct confirmed attacks, actual healing and cooldown',()=>{const g=env();g.run('p.d=1;');for(let i=0;i<3;i++){g.run('t.inv=t.kb=0;');hit(g);}assert.equal(g.run('p.d'),0);assert.equal(g.run('p.kanekiHealed'),1);assert.equal(g.run('p.kanekiRegenCd'),360);g.run('p.d=10;');for(let i=0;i<3;i++){g.run('t.inv=t.kb=0;');hit(g);}assert.equal(g.run('p.d'),10);});
test('regeneration cannot exceed twenty percent per stock or heal while idle',()=>{const g=env();g.run('p.d=50;p.kanekiHealed=19;p.kanekiHits=2;');hit(g);assert.equal(g.run('p.d'),49);assert.equal(g.run('p.kanekiHealed'),20);g.run('for(let i=0;i<1000;i++)kanekiTick(p);p.kanekiHits=2;t.inv=t.kb=0;');hit(g);assert.equal(g.run('p.d'),49);});
test('awakening needs MAX, lasts 900 active ticks and pauses for cinematic/time stop',()=>{const g=env();assert.equal(g.run('kanekiTransform(p)'),false);g.run('p.kanekiGauge=100;kanekiTransform(p);for(let i=0;i<20;i++)stepFighter(p,blankInput());');assert.equal(g.run('p.kanekiTime'),900);g.run('freezeT=0;p.timeStopT=20;stepFighter(p,blankInput());');assert.equal(g.run('p.kanekiTime'),900);g.run('p.timeStopT=0;for(let i=0;i<900;i++)kanekiTick(p);');assert.equal(g.run('p.kanekiTime'),0);assert.equal(g.run('p.kanekiFatigue'),24);assert.equal(g.run('p.kanekiGauge'),0);});
test('all awakened inputs work; awakening is vulnerable and does not refill gauge',()=>{for(const i of ['{neutralSpecial:true}','{sideSpecial:1}','{u:true}','{d:true}']){const g=env();g.run(`p.kanekiTime=900;kanekiSpecial(p,${i});`);assert.match(g.run('p.mv.kind'),/^kakuja/);}const g=env();g.run('p.kanekiTime=900;applyHit(p,{dm:20,k0:1,ks:0,up:.2,f:1},false,t.id);');assert.equal(g.run('p.d'),20);assert.equal(g.run('p.kanekiGauge'),0);});
test('up special is limited once per airtime and burst has independent long cooldown',()=>{const g=env();g.run('kanekiSpecial(p,{u:true});p.spc=0;p.vy=0;kanekiSpecial(p,{u:true});');assert.equal(g.run('p.vy'),0);g.run('p.kanekiTime=900;p.spc=0;kanekiSpecial(p,{d:true});p.spc=0;clearActs(p);kanekiSpecial(p,{d:true});');assert.equal(g.run('p.mv'),null);assert.equal(g.run('p.kanekiBurstCd'),300);});
test('KO resets awakening, capture, regeneration budget and attack generation',()=>{const g=env();g.run('const life=p.kanekiLife;p.kanekiTime=500;p.kanekiHealed=20;p.inv=0;koFighter(p);');assert.equal(g.run('p.kanekiTime'),0);assert.equal(g.run('p.kanekiHealed'),0);assert.ok(g.run('p.kanekiLife>life'));});
test('snapshot bounds all numeric fields and rejects unknown captors',()=>{const g=env();g.run('const s=stateOf(p);s.kn.time=Infinity;s.kn.healed=200;s.kn.gauge=-1;s.kg={by:"missing",t:18,dir:1,token:"x"};kanekiRestore(p,s);');assert.equal(g.run('p.kanekiTime'),0);assert.equal(g.run('p.kanekiHealed'),20);assert.equal(g.run('p.kanekiGauge'),0);assert.equal(g.run('p.kanekiPull'),null);});
test('four organic tail poses differ and awake silhouette has longer reach',()=>{const g=env();assert.equal(g.run('new Set([0,1,2,3].map(i=>JSON.stringify(kanekiTailPose(p,i,50)))).size'),4);g.run('const x=kanekiTailPose(p,3,50).x;p.kanekiTime=900;');assert.ok(g.run('Math.abs(kanekiTailPose(p,3,50).x)>Math.abs(x)'));});
test('forged remote hits/confirmations cannot capture or heal',()=>{const g=env();g.run(`kanekiMove(p,'kanekiBind');handleGameplayEvent({k:'mh',by:'forged',to:t.id,a:p.id,ax:p.x,f:1,mv:p.mv});p.d=10;p.kanekiHits=2;handleGameplayEvent({k:'fx',by:'forged',a:p.id,t:t.id,res:'hit',kanekiToken:p.mv.kanekiToken});`);assert.equal(g.run('t.kanekiPull'),null);assert.equal(g.run('p.d'),10);});
test('two owners transport bind, victim position, deduplicated healing and awakening',()=>{
 const owner=game(),guest=game(),aid=owner.run('myId'),bid=guest.run('myId');
 const roster=[{id:aid,cid:'kaneki',owner:aid,label:'Kaneki'},{id:bid,cid:'karate',owner:bid,label:'Guest'}],events=[],writes=[];
 for(const g of [owner,guest]){g.ctx.room={child:()=>({update:async s=>writes.push(s),push:()=>({set:async e=>events.push(e)})})};g.run(`online=true;curRound=1;scene='battle';startBattleCommon(${JSON.stringify(roster)},'std',false,3);bt.phase='play';roomRef=room;fighters.forEach(f=>{f.x=f.cid==='kaneki'?400:530;f.y=390;f.inv=f.ivf=0;});`);}
 owner.run('byId(myId).d=10;byId(myId).kanekiHits=2;sendLocal();');
 for(const [id,s]of Object.entries(writes[0]))guest.ctx.onP({key:id,val:()=>s});guest.run('updateRemote();');
 owner.run('kanekiMove(byId(myId),"kanekiBind");byId(myId).a=10;meleeCheck(byId(myId));');
 const mh=events.find(e=>e.k==='mh');assert.ok(mh);guest.ctx.onEvent(mh);guest.ctx.onEvent(mh);
 assert.equal(guest.run('byId(myId).d'),8);assert.ok(guest.run('!!byId(myId).kanekiPull'));
 const fx=events.find(e=>e.k==='fx'&&e.kanekiToken);assert.ok(fx);owner.ctx.onEvent(fx);owner.ctx.onEvent(fx);
 const ack=events.find(e=>e.k==='kaneki-capture');assert.ok(ack);owner.ctx.onEvent(ack);owner.ctx.onEvent(ack);assert.equal(owner.run('byId(myId).kanekiAttacks.get(byId(myId).mv.kanekiToken).captured'),true);
 assert.equal(owner.run('byId(myId).d'),8);assert.equal(owner.run('byId(myId).kanekiHealed'),2);
 guest.run('stepFighter(byId(myId),blankInput());sendLocal();');
 const state=writes.at(-1)[bid];assert.ok(state.kg);owner.ctx.snapshot=state;
 owner.run(`kanekiRestore(byId('${bid}'),snapshot);`);assert.ok(owner.run(`!!byId('${bid}').kanekiPull`));
 owner.run('byId(myId).kanekiGauge=100;kanekiTransform(byId(myId));');
 const cin=events.find(e=>e.k==='cinx'&&e.kind==='kakuja');assert.ok(cin);guest.ctx.onEvent(cin);assert.equal(guest.run('fzType'),'kakuja');
 guest.run(`freezeT=0;fighters=fighters.filter(p=>p.id!=='${aid}');kanekiPullTick(byId(myId));`);assert.equal(guest.run('byId(myId).kanekiPull'),null);
});
test('capture immunity expires on ordinary fighters and stale remote pull snapshots clear',()=>{const g=env();hit(g,'kanekiBind');g.run('t.kanekiPull=null;for(let i=0;i<120;i++)stepFighter(t,blankInput());');assert.equal(g.run('t.kanekiPullImmune'),0);g.run('t.kanekiPull={by:p.id,t:1,dir:1,token:"x"};kanekiRestore(t,{});');assert.equal(g.run('t.kanekiPull'),null);});
test('counter and armor handle bind without leaving a pull',()=>{const g=env();g.run('t.f=-1;t.ct=CT_ON;');hit(g,'kanekiBind');assert.equal(g.run('t.kanekiPull'),null);assert.equal(g.run('fzType'),'counter');const a=env();a.run('t.cid="berserker";t.arm=30;');hit(a,'kanekiBind');assert.equal(a.run('t.kanekiPull'),null);});
test('forged move flags cannot turn Kaneki attacks into fixed-KO or excess damage',()=>{const g=env();g.run('kanekiMove(p,"kanekiJab");resolveMelee({id:p.id,x:p.x,f:1,mv:{...p.mv,dm:999,ko:true,pierce:true}},t);');assert.equal(g.run('t.d'),8);assert.ok(g.run('Number.isFinite(t.vx)&&Math.abs(t.vx)<15'));});
test('one bind cast cannot pull an entire group and impossible extra phases are rejected',()=>{const g=env();g.run('const third=makeFighter({id:"third",cid:"karate",owner:myId},2);third.x=480;third.y=390;third.inv=0;fighters.push(third);kanekiMove(p,"kanekiBind");p.a=10;meleeCheck(p);');assert.equal(g.run('fighters.filter(f=>f.kanekiPull).length'),1);g.run('resolveMelee({id:p.id,x:p.x,f:1,mv:{...p.mv,kanekiPhase:5}},third);');assert.equal(g.run('third.d'),0);});
test('gauge reaches MAX after seven committed dances at three-second intervals (21s target)',()=>{const g=env();g.run('for(let n=0;n<7;n++){t.inv=t.kb=0;kanekiMove(p,"kanekiDance");resolveMelee({id:p.id,x:p.x,f:1,mv:p.mv},t);for(let f=0;f<180;f++)kanekiTick(p);}');assert.equal(g.run('p.kanekiGauge'),100);});
test('attacker stock change releases an old pull even after immediate respawn',()=>{const g=env();hit(g,'kanekiBind');g.run('koFighter(p);p.x=400;p.y=390;p.out=false;kanekiPullTick(t);');assert.equal(g.run('t.kanekiPull'),null);});
test('resting kagune stay fixed across time and movement without touching network state',()=>{const g=env();g.run('const before=JSON.stringify(stateOf(p));const rest=JSON.stringify([0,1,2,3].map(i=>kanekiTailPose(p,i,0)));p.vx=9;const later=JSON.stringify([0,1,2,3].map(i=>kanekiTailPose(p,i,900)));p.vx=0;');assert.equal(g.run('rest'),g.run('later'));assert.equal(g.run('JSON.stringify(stateOf(p))'),g.run('before'));g.run('p.kanekiTime=900;const awakened=JSON.stringify(kanekiTailPose(p,0,0));');assert.equal(g.run('awakened'),g.run('JSON.stringify(kanekiTailPose(p,0,900))'));});
test('attack poses differ from fixed stance and dance phases choose individual tails before the four-tail finish',()=>{const g=env();g.run('const rest=JSON.stringify(kanekiTailPose(p,0,0));kanekiMove(p,"kanekiDance");p.a=4;');assert.notEqual(g.run('rest'),g.run('JSON.stringify(kanekiTailPose(p,0,0))'));for(let phase=0;phase<4;phase++){g.run(`p.a=4+${phase}*7;`);assert.equal(g.run('[0,1,2,3].filter(i=>kanekiTailPose(p,i,0).extend).length'),phase===3?4:1);if(phase<3)assert.equal(g.run('[0,1,2,3].find(i=>kanekiTailPose(p,i,0).extend)'),phase);}});
test('dance ends with one bounded heavy smash and greater knockback, including remote canonicalization',()=>{for(const kind of ['kanekiDance','kakujaDance']){const g=env();g.run(`online=true;kanekiMove(p,'${kind}');const def=KANEKI_MOVES[p.mv.kind],last=Math.floor((def.act1-def.act0)/def.multi);t.d=0;resolveMelee({id:p.id,x:p.x,f:1,mv:{...p.mv,kanekiPhase:last,dm:999,k0:999}},t);const vx=t.vx,damage=t.d;resolveMelee({id:p.id,x:p.x,f:1,mv:{...p.mv,kanekiPhase:last}},t);`);assert.equal(g.run('t.d'),kind==='kanekiDance'?14:16);assert.equal(g.run('t.d'),g.run('damage'));assert.ok(g.run('Math.abs(vx)>=14'));assert.equal(g.run('kanekiHitSpec(p.mv.kind,last).ko||false'),false);}});
test('mashing neutral special cannot cancel the final smash or restart a confirmed dance',()=>{const g=env();g.run(`online=true;kanekiMove(p,'kanekiDance');p.kanekiAttacks.get(p.mv.kanekiToken).connected=true;const token=p.mv.kanekiToken;const input=blankInput();input.neutralSpecial=true;for(let i=0;i<43;i++){input.sc++;input.s=true;stepFighter(p,input);if(p.mv)meleeCheck(p);} `);assert.equal(g.run('p.kanekiSwing'),1);assert.ok(g.run('!p.mv||p.mv.kanekiToken===token'));assert.ok(g.run('t.d>0'));});
test('final smash still obeys counter, invulnerability and team rules',()=>{for(const state of ['t.inv=30','battleTeamMode=true;p.team=t.team=1','t.ct=CT_ON;t.f=-1']){const g=env();g.run(state);g.run('kanekiMove(p,"kanekiDance");p.a=25;meleeCheck(p);');assert.equal(g.run('t.d'),0);}});
test('up special can recover during ordinary special cooldown but only once in the air',()=>{const g=env();g.run('p.g=false;p.y=480;p.spc=70;const i=blankInput();i.u=i.s=i.r=true;i.sc=1;stepFighter(p,i);const vy=p.vy;');assert.equal(g.run('p.mv.kind'),'kanekiRise');assert.ok(g.run('vy<-15'));assert.ok(g.run('p.vx>0'));g.run('p.vy=0;kanekiSpecial(p,{u:true});');assert.equal(g.run('p.vy'),0);});
test('recovery climbs from below the main floor and lands; awakened recovery climbs farther',()=>{const heights=[];for(const awake of [false,true]){const g=env();g.run(`p.kanekiTime=${awake?900:0};p.x=stage.w/2;p.y=stage.plats[0].y+100;p.g=false;p.spc=50;const startY=p.y;kanekiSpecial(p,{u:true});let low=p.y;for(let n=0;n<75;n++){stepFighter(p,blankInput());low=Math.min(low,p.y);}`);heights.push(g.run('startY-low'));assert.ok(g.run('p.g'));assert.equal(g.run('p.rec'),false);assert.ok(heights.at(-1)>190);}assert.ok(heights[1]>heights[0]);});
test('CPU uses the same cooldown-independent once-per-airtime recovery input',()=>{const g=env();g.run('p.spc=70;p.g=false;p.rec=false;p.ai={upCd:0};const input=blankInput();const ok=aiUpSpecial(p,input,p.ai);stepFighter(p,input);');assert.equal(g.run('ok'),true);assert.equal(g.run('p.mv.kind'),'kanekiRise');g.run('p.ai.upCd=0;');assert.equal(g.run('aiUpSpecial(p,blankInput(),p.ai)'),false);});
test('two owners deliver the final smash through hit transport exactly once',()=>{const owner=game(),guest=game(),aid=owner.run('myId'),bid=guest.run('myId'),events=[];const roster=[{id:aid,cid:'kaneki',owner:aid,label:'K'},{id:bid,cid:'karate',owner:bid,label:'T'}];for(const g of [owner,guest]){g.ctx.room={child:()=>({push:()=>({set:async e=>events.push(e)})})};g.run(`online=true;scene='battle';curRound=1;startBattleCommon(${JSON.stringify(roster)},'std',false,3);bt.phase='play';roomRef=room;fighters.forEach(f=>{f.x=f.cid==='kaneki'?400:470;f.y=390;f.inv=f.ivf=0;});`);}guest.ctx.snapshot=owner.run('stateOf(byId(myId))');guest.run(`kanekiRestore(byId('${aid}'),snapshot);`);owner.run('kanekiMove(byId(myId),"kanekiDance");byId(myId).a=25;meleeCheck(byId(myId));');const mh=events.find(e=>e.k==='mh');assert.equal(mh.mv.kanekiPhase,3);guest.ctx.onEvent(mh);guest.ctx.onEvent(mh);assert.equal(guest.run('byId(myId).d'),14);assert.ok(guest.run('Math.abs(byId(myId).vx)>=14'));const fx=events.find(e=>e.k==='fx'&&e.kanekiToken);owner.ctx.onEvent(fx);assert.equal(owner.run('byId(myId).kanekiAttacks.get(byId(myId).mv.kanekiToken).finished'),true);});
test('successful capture immediately cancels an enemy attack before the next melee pass',()=>{const g=env();g.run('fireAttack(t,1);t.a=t.mv.act0;t.f=-1;');hit(g,'kanekiBind');assert.equal(g.run('t.mv'),null);g.run('meleeCheck(t);');assert.equal(g.run('p.d'),0);});
test('special buffered before capture becomes dance immediately after confirmed hit',()=>{const g=env();g.run(`kanekiMove(p,'kanekiBind');p.a=5;const i=blankInput();i.sc=1;i.s=i.neutralSpecial=true;stepFighter(p,i);p.a=10;meleeCheck(p);stepFighter(p,i);`);assert.equal(g.run('p.mv.kind'),'kanekiDance');assert.equal(g.run('p.kanekiSwing'),2);});
test('buffered whiff cannot erase bind recovery',()=>{const g=env();g.run(`t.x=750;kanekiMove(p,'kanekiBind');p.spc=80;p.a=5;const i=blankInput();i.sc=1;i.s=i.neutralSpecial=true;for(let n=0;n<24;n++){stepFighter(p,i);if(p.mv)meleeCheck(p);}`);assert.equal(g.run('p.mv.kind'),'kanekiBind');assert.ok(g.run('p.spc>0'));assert.equal(g.run('p.kanekiSwing'),1);});
test('pulling victim cannot attack, dodge or counter; timeout gives only a bounded handoff',()=>{const g=env();hit(g,'kanekiBind');g.run(`const i=blankInput();i.ac=i.cc=i.sc=1;i.a=i.s=i.r=true;for(let n=0;n<29;n++){stepFighter(t,i);meleeCheck(t);} `);assert.equal(g.run('p.d'),0);assert.ok(g.run('!!t.kanekiPull'));g.run('stepFighter(t,i);');assert.equal(g.run('t.kanekiPull'),null);assert.ok(g.run('t.stn>0&&t.stn<=8'));g.run('for(let n=0;n<10;n++)stepFighter(t,blankInput());');assert.equal(g.run('t.stn'),0);});
test('forged capture acknowledgement cannot unlock a whiff or a different attack',()=>{const g=env();g.run(`kanekiMove(p,'kanekiBind');handleGameplayEvent({k:'kaneki-capture',by:'forged',a:p.id,t:t.id,token:p.mv.kanekiToken});`);assert.equal(g.run('!!p.kanekiAttacks.get(p.mv.kanekiToken).captured'),false);});

test('extended bind catches a fighter at long range, not just the kagune tip',()=>{
 const g=env();
 g.run("t.x=614;t.y=390;p.f=1;kanekiMove(p,'kanekiBind');p.a=9;meleeCheck(p);");
 assert.equal(g.run('t.d'),8);
 assert.equal(g.run('!!t.kanekiPull'),true);
 assert.equal(g.run('KANEKI_MOVES.kanekiBind.reach'),235);
 assert.ok(g.run('p.kanekiAttacks.get(p.mv.kanekiToken).captured'));
});
test('a fighter anywhere along the bind line can be grabbed and interrupted',()=>{
 const g=env();
 g.run("t.x=520;t.y=428;fireAttack(t,1);t.a=t.mv.act0;kanekiMove(p,'kanekiBind');p.f=1;p.a=13;meleeCheck(p)");
 assert.equal(g.run('!!t.kanekiPull'),true);
 assert.equal(g.run('t.mv'),null);
 assert.equal(g.run('t.d'),8);
 g.run('meleeCheck(t)');
 assert.equal(g.run('p.d'),0);
});
test('bind catches the nearest fighter along the path even when roster order is reversed',()=>{
 const g=env();
 g.run(`t.x=615;
 const front=makeFighter({id:'midway',cid:'karate',owner:myId,label:'Midway',cpu:0},2);
 front.x=498;front.y=390;front.inv=0;fighters.push(front);
 p.f=1;kanekiMove(p,'kanekiBind');p.a=10;meleeCheck(p);`);
 assert.equal(g.run("byId('midway').d"),8);
 assert.equal(g.run("!!byId('midway').kanekiPull"),true);
 assert.equal(g.run('t.d'),0);
 assert.equal(g.run('Object.keys(p.hit).length'),1);
});
test('expanded line stays fair to counter, invulnerability, teams and temporary grab immunity',()=>{
 for(const condition of ['t.inv=25','t.ct=CT_ON;t.f=-1','battleTeamMode=true;p.team=t.team=1','t.kanekiPullImmune=100']){
  const g=env();
  g.run("t.x=611;t.y=390;p.f=1;");
  g.run(condition+";kanekiMove(p,'kanekiBind');p.a=12;meleeCheck(p);");
  assert.equal(g.run('!!t.kanekiPull'),false,condition);
 }
});
test('Kaneki in-battle mask and portrait do not draw an isolated red eye',()=>{
 const g=env();
 assert.doesNotMatch(g.run('kanekiPaintBody.toString()'),/oval\(6,-62|oval\(10,-64/);
 assert.doesNotMatch(g.run('portrait("kaneki")'),/ellipse cx="59" cy="29"/);
 assert.match(g.run('portrait("kaneki")'),/#[0-9a-f]{6}/i);
});
