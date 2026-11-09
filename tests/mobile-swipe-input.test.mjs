import test from 'node:test';
import assert from 'node:assert/strict';
import {game} from './helpers/game.mjs';
function setup(mode='swipe'){
 const g=game();g.run(`scene='battle';prefs.specialInput='${mode}';`);
 const button=g.get('btn-s');const fire=(type,x=100,y=100,id=17)=>button.dispatch(type,{pointerId:id,pointerType:'touch',clientX:x,clientY:y});
 return {g,fire};
}
test('tap dispatches neutral B even when shorter than one game frame',()=>{
 const {g,fire}=setup();fire('pointerdown');fire('pointerup');
 g.run('readHuman()');assert.equal(g.run('hin.s&&hin.neutralSpecial&&hin.sc===1'),true);
 g.run('readHuman()');assert.equal(g.run('hin.s'),false);
});
test('special button swipes to up, down, both horizontal directions',()=>{
 for(const [x,y,key,dir] of [[100,65,'v',0],[100,135,'g',0],[145,100,'h',1],[55,100,'h',-1]]){
  const {g,fire}=setup();fire('pointerdown');fire('pointermove',x,y);fire('pointerup',x,y);
  g.run('readHuman()');
  assert.equal(g.run('hin.sc'),1);
  assert.equal(g.run('hin.neutralSpecial'),false);
  assert.equal(g.run(key==='v'?'hin.u':key==='g'?'hin.gd':'hin.sideSpecial'),dir||true);
  if(key==='h')assert.equal(g.run('hin.sideSpecial'),dir);
 }
});
test('swipe and movement stick can be used simultaneously',()=>{
 const {g,fire}=setup();g.run('st.x=-1;st.y=0');
 fire('pointerdown');fire('pointermove',145,100);fire('pointerup',145,100);
 g.run('readHuman()');
 assert.equal(g.run('hin.l'),true);assert.equal(g.run('hin.sideSpecial'),1);
});
test('pointer cancel and blur never create ghost attacks',()=>{
 const {g,fire}=setup();fire('pointerdown');fire('pointercancel');
 g.run('readHuman()');assert.equal(g.run('hin.s'),false);
 fire('pointerdown');fire('pointermove',145,100);g.run('resetTouch();readHuman()');
 assert.equal(g.run('hin.s'),false);
});
test('classic mode still activates the dedicated special button on press',()=>{
 const {g,fire}=setup('classic');
 fire('pointerdown');g.run('readHuman()');
 assert.equal(g.run('hin.neutralSpecial&&hin.s&&hin.sc===1'),true);
 fire('pointerup');g.run('readHuman()');assert.equal(g.run('hin.s'),false);
});
