import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function core(){const ctx={};vm.createContext(ctx);vm.runInContext(read('world/core.js')+';globalThis.C=WorldCore',ctx);return ctx.C;}

test('video slot pays lines left to right with wilds, scatters trigger free games, and the win is capped',()=>{
 const C=core();
 const G=cols=>cols.map(c=>c.split(','));
 // middle row: seven seven wild seven gem -> four sevens on line 0
 let e=C.vsEvaluate(G(['bar,seven,gem','gem,seven,bar','star,wild,clover','spark,seven,clover','gem,gem,bar']),100);
 assert.equal(e.wins.find(w=>w.line===0).count,4);
 assert.equal(e.wins.find(w=>w.line===0).amount,C.VS_PAY.seven[1]*10);
 e=C.vsEvaluate(G(['scatter,gem,bar','gem,bar,scatter','star,clover,spark','scatter,bar,clover','gem,spark,bar']),100);
 assert.equal(e.free,8);assert.ok(e.wins.some(w=>w.sym==='scatter'&&w.amount===200));
 const rng=n=>Math.floor(Math.random()*n);
 for(let i=0;i<300;i++){const r=C.vsSpin(100,rng);assert.ok(r.total<=100*C.VS_CAP);assert.ok(r.free.length===0||[8,10,15].includes(r.free.length));}
 const p=C.start(),r=C.apply(p,'slot',{amount:20},0,rng);
 assert.equal(r.profile.cash,5000-20+r.result.total);assert.equal(r.profile.plays,1);
 assert.throws(()=>C.apply(p,'slot',{amount:30},0,rng));
 assert.throws(()=>C.apply({...p,cash:5},'slot',{amount:10},0,rng));
});

test('baccarat follows the third-card table and pays 1:1, 0.95:1 and 8:1',()=>{
 const C=core();
 assert.equal(C.bacValue([6,7]),5);assert.equal(C.bacValue([9,12]),0);
 assert.equal(C.bacPayout('banker',100,'banker'),195);assert.equal(C.bacPayout('player',100,'tie'),100);assert.equal(C.bacPayout('tie',100,'tie'),900);assert.equal(C.bacPayout('tie',100,'player'),0);
 const seq=(...v)=>{let i=0;return ()=>v[i++];};
 // player 2+3=5 draws 4 -> 9 ; banker 3+3=6, third card 4 -> banker stands
 const d=C.bacDeal(seq(1,2,2,2,3));assert.deepEqual([...d.player],[1,2,3]);assert.deepEqual([...d.banker],[2,2]);assert.equal(d.winner,'player');
 const r=C.apply(C.start(),'baccarat',{amount:100,side:'player'},0,seq(1,2,2,2,3));assert.equal(r.profile.cash,5100);
 assert.throws(()=>C.apply(C.start(),'baccarat',{amount:100,side:'both'},0,seq(1,2,2,2,3)));
});

test('video poker ranks Jacks or Better hands and validates the final hand',()=>{
 const C=core(),H=s=>s.split(' ').map(x=>({r:'A23456789TJQK'.indexOf(x[0]),s:'shdc'.indexOf(x[1])}));
 assert.equal(C.vpRank(H('Ts Js Qs Ks As')),'royal');assert.equal(C.vpRank(H('As 2d 3h 4s 5c')),'straight');
 assert.equal(C.vpRank(H('Jh Jd 3h 5s 8c')),'jacks');assert.equal(C.vpRank(H('Th Td 3h 5s 8c')),null);
 const p=C.start();
 assert.equal(C.apply(p,'videopoker',{amount:30,hand:H('Ts Js Qs Ks As')},0,()=>0).profile.cash,5000-30+24000);
 assert.equal(C.apply(p,'videopoker',{amount:10,hand:H('Th Td 3h 5s 8c')},0,()=>0).profile.cash,4990);
 assert.throws(()=>C.apply(p,'videopoker',{amount:10,hand:H('As As 3h 5s 8c')},0,()=>0));
 assert.throws(()=>C.apply(p,'videopoker',{amount:40,hand:H('Th Td 3h 5s 8c')},0,()=>0));
});

test('blackjack settles win, blackjack, push, loss and doubled hands',()=>{
 const C=core();const p=C.start();
 assert.equal(C.apply(p,'blackjack',{amount:100,outcome:'win'},0,()=>0).profile.cash,5100);
 assert.equal(C.apply(p,'blackjack',{amount:100,outcome:'blackjack'},0,()=>0).profile.cash,5150);
 assert.equal(C.apply(p,'blackjack',{amount:100,outcome:'push'},0,()=>0).profile.cash,5000);
 assert.equal(C.apply(p,'blackjack',{amount:100,doubled:true,outcome:'win'},0,()=>0).profile.cash,5200);
 assert.equal(C.apply(p,'blackjack',{amount:100,doubled:true,outcome:'lose'},0,()=>0).profile.cash,4800);
 assert.throws(()=>C.apply(p,'blackjack',{amount:100,doubled:true,outcome:'blackjack'},0,()=>0));
 assert.throws(()=>C.apply(p,'blackjack',{amount:5000,outcome:'win'},0,()=>0));
 assert.throws(()=>C.apply(p,'blackjack',{amount:100,outcome:'cheat'},0,()=>0));
});

test('online rules allow one bounded casino play and nothing else extra',()=>{
 const rules=JSON.parse(read('database.rules.json')).rules.stick_world.profiles.$uid['.write'];
 assert.match(rules,/newData\.child\('plays'\)\.val\(\) === data\.child\('plays'\)\.val\(\) \+ 1 && \(newData\.child\('wins'\)/);
 assert.match(rules,/newData\.child\('cash'\)\.val\(\) - data\.child\('cash'\)\.val\(\) <= 30000/);
 assert.match(rules,/data\.child\('cash'\)\.val\(\) - newData\.child\('cash'\)\.val\(\) <= 2000/);
 const spark=read('world/spark.js');
 assert.match(spark,/case 'slot':case 'blackjack':case 'baccarat':case 'videopoker':/);
});

test('lucky wheel: equal segments, BONUS spins the bonus wheel, return stays under 100%',()=>{
 const C=core();
 assert.equal(C.WH_WHEEL.length,48);assert.equal(C.WH_BONUS.length,12);
 assert.ok(C.whRtp()>0.9&&C.whRtp()<0.97);
 const seq=(...v)=>{let i=0;return ()=>v[i++];};
 let r=C.whSpin(10,seq(0,0));assert.equal(r.mult,50);assert.ok(r.jackpot);assert.equal(r.won,500);
 r=C.whSpin(10,seq(12));assert.equal(r.mult,5);assert.equal(r.bonusIndex,null);
 const p=C.start(),a=C.apply(p,'wheel',{amount:100},0,seq(1));
 assert.equal(a.profile.cash,4900);assert.equal(a.profile.plays,1);assert.equal(a.profile.wins,0);
 assert.throws(()=>C.apply(p,'wheel',{amount:30},0,seq(1)));
 // biggest single win fits the online per-write limit
 assert.ok(100*Math.max(...C.WH_BONUS)<=30000);
});

test('coin pusher settles bounded batches of medals',()=>{
 const C=core();const p=C.start();
 let r=C.apply(p,'pusher',{spent:120,won:300},0,()=>0);
 assert.equal(r.profile.cash,5180);assert.equal(r.profile.plays,1);assert.equal(r.profile.wins,1);
 r=C.apply(p,'pusher',{spent:50,won:0},0,()=>0);assert.equal(r.profile.cash,4950);assert.equal(r.profile.wins,0);
 assert.throws(()=>C.apply(p,'pusher',{spent:0,won:0},0,()=>0));
 assert.throws(()=>C.apply(p,'pusher',{spent:C.PU_MAX_SPENT+1,won:0},0,()=>0));
 assert.throws(()=>C.apply(p,'pusher',{spent:10,won:C.PU_MAX_WON+1},0,()=>0));
 assert.throws(()=>C.apply({...p,cash:5},'pusher',{spent:10,won:0},0,()=>0));
 assert.ok(C.PU_MAX_SPENT<=2000&&C.PU_MAX_WON<=30000);
 assert.match(read('world/spark.js'),/case 'wheel':case 'pusher':/);
});

test('coin pusher field pushes medals off the front and loses some in the side gutters',()=>{
 const ctx={Math};vm.createContext(ctx);vm.runInContext(read('world/pushersim.js')+';globalThis.P=PusherSim',ctx);const P=ctx.P;
 const s=P.create();assert.ok(s.coins.length>=90);
 let front=0,lost=0;for(let k=0;k<300;k++){P.drop(s,8+(k*37%84));for(let f=0;f<14;f++){const r=P.step(s);front+=r.front;lost+=r.lost;}}
 assert.ok(front>150,'front '+front);assert.ok(lost>20,'lost '+lost);
 assert.ok(s.coins.every(c=>c.x>=P.R-1e-9&&c.x<=100-P.R+1e-9&&c.y>=s.face+P.R-1e-6));
 assert.equal(P.LOTTERY[P.lottery(P.lotteryTotal-1)][0],'SEVEN');assert.ok(P.STAGE2.includes('JP'));assert.ok(P.STAGE1.includes('UP'));
 // FEVER walls: nothing is lost while the walls are up
 s.wall=200;let lostWall=0;for(let k=0;k<60;k++){P.drop(s,6);for(let f=0;f<3;f++)lostWall+=P.step(s).lost;}assert.equal(lostWall,0);
});

test('card games read their pacing from WorldPace (じっくり / ふつう / はやい)',()=>{
 const store={};const ctx={localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v);}},setTimeout};vm.createContext(ctx);
 vm.runInContext(read('world/pace.js')+';globalThis.P=WorldPace',ctx);const P=ctx.P;
 assert.equal(P.level,'slow');assert.equal(P.ms(1000),1000);
 P.next();assert.equal(P.level,'normal');assert.ok(P.ms(1000)<1000);
 P.next();assert.equal(P.level,'fast');assert.ok(P.ms(1000)<=250);assert.equal(store['stick-royale-pace'],'fast');
 for(const f of ['baccarat','blackjack','videopoker'])assert.match(read('world/'+f+'.js'),/WorldPace\.button\(\)/);
 assert.match(read('world/index.html'),/pace\.js\?v=/);
});

test('coin pusher JP balls go to the JP lottery from the front and roll back from the gutters',()=>{
 const ctx={Math};vm.createContext(ctx);vm.runInContext(read('world/pushersim.js')+';globalThis.P=PusherSim',ctx);const P=ctx.P;
 const s=P.create(0);s.coins.push({x:50,y:100.5,ball:true});let r=P.step(s);assert.equal(r.balls,1);assert.equal(s.coins.length,0);
 s.coins.push({x:3,y:100.5,ball:true});r=P.step(s);assert.equal(r.balls,0);assert.equal(s.coins.filter(c=>c.ball).length,1);
 for(const T of [P.LOTTERY,P.LOTTERY_KAKUHEN])assert.equal(T.map(l=>l[0]).join(),'MISS,1,2,3,4,5,6,BALL,SEVEN');
 assert.ok(P.total(P.LOTTERY_KAKUHEN)===P.total(P.LOTTERY));
});

test('FEVER STAGE: physics decides bumper WIN, OUT blocks end the game, JP CHANCE returns to the stage',()=>{
 const ctx={Math};vm.createContext(ctx);vm.runInContext(read('world/feversim.js')+';globalThis.F=FeverSim',ctx);const F=ctx.F;
 let total=0,games=400,jpcs=0,maxFrames=0;
 for(let i=0;i<games;i++){const r=F.simulate(Math.random,()=>500);total+=r.total;jpcs+=r.jpcs;maxFrames=Math.max(maxFrames,r.frames);assert.ok(r.win>=0&&r.frames>0);}
 assert.ok(total/games>40&&total/games<600,'avg '+total/games);assert.ok(jpcs>0);assert.ok(maxFrames<60*300);
 // a ball entering the open hole starts the dish; the dish ends in a pocket and play resumes
 const s=F.create(Math.random);s.gateOpen=true;s.shield=0;s.ball={x:F.HOLE.x,y:F.HOLE.y,vx:0,vy:0};F.step(s,Math.random);assert.ok(s.jpc);
 let g=0,pocket=null,returned=false;while(g++<4000&&!returned){F.step(s,Math.random);for(const e of s.events){if(e.type==='pocket')pocket=e.value;if(e.type==='return')returned=true;}}
 assert.ok(pocket!==null&&returned&&!s.over);
 assert.match(read('world/index.html'),/feversim\.js\?v=/);
});

test('coin pusher upper stage: medals ride the pusher, get held by the back edge and drop to the lower field',()=>{
 const ctx={Math};vm.createContext(ctx);vm.runInContext(read('world/pushersim.js')+';globalThis.P=PusherSim',ctx);const P=ctx.P;
 const s=P.create(),u={coins:[]};let fell=0;
 for(let k=0;k<800;k++){u.coins.push({x:10+(k*31%80),y:-12+P.R+.5});for(let f=0;f<12;f++){const f0=s.face;P.step(s);fell+=P.stepUpper(u,s.face,s.face-f0,-12).length;}}
 assert.ok(fell>600,'fell '+fell);assert.ok(u.coins.length<80);assert.ok(u.coins.every(c=>c.y>=-12+P.R-1e-6&&c.y<=s.face+0.6+1e-6));
});
