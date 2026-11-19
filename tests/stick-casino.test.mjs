import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function core(){const ctx={};vm.createContext(ctx);vm.runInContext(read('world/core.js')+';globalThis.C=WorldCore',ctx);return ctx.C;}

test('slot machine pays triples and first-two pairs, keeps about 96% return',()=>{
 const C=core();
 assert.equal(C.slotPayout(['seven','seven','seven'],10),3000);
 assert.equal(C.slotPayout(['spark','spark','gem'],10),20);
 assert.equal(C.slotPayout(['gem','spark','spark'],10),0);
 const rtp=C.slotRtp();assert.ok(rtp>0.93&&rtp<0.99,'rtp '+rtp);
 let p=C.start();
 const r=C.apply(p,'slot',{amount:20},0,()=>99);
 assert.deepEqual([...r.result.reels],['spark','spark','spark']);
 assert.equal(r.profile.cash,5000-20+120);assert.equal(r.profile.plays,1);assert.equal(r.profile.wins,1);
 assert.throws(()=>C.apply(p,'slot',{amount:30},0,()=>0));
 assert.throws(()=>C.apply({...p,cash:5},'slot',{amount:10},0,()=>0));
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
 assert.match(spark,/case 'slot':case 'blackjack':/);
});
