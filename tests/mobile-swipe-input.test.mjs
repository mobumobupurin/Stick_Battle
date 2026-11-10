import test from 'node:test';
import assert from 'node:assert/strict';
import {game} from './helpers/game.mjs';

function setup(mode='direction'){
  const g=game();
  g.run('scene="battle";prefs.specialInput='+JSON.stringify(mode));
  const b=g.get('btn-s');
  const fire=(type,id=17)=>b.dispatch(type,{pointerId:id,pointerType:'touch',clientX:100,clientY:100});
  return {g,fire};
}
test('direction + B is the default for both new and migrated users',()=>{
  const {g}=setup();
  assert.equal(g.run('prefs.specialInput'),'direction');
  assert.equal(g.run('directionTouchEnabled()'),true);
});
test('quick neutral B tap survives a frame delay and triggers only once',()=>{
  const {g,fire}=setup();
  fire('pointerdown');fire('pointerup');
  g.run('readHuman()');
  assert.equal(g.run('hin.s&&hin.neutralSpecial&&hin.sc===1'),true);
  g.run('readHuman()');
  assert.equal(g.run('hin.s'),false);
  assert.equal(g.run('hin.sc'),1);
});
test('left stick + B captures up, down, left and right specials',()=>{
  for(const [x,y,dir,expected] of [[0,-1,'u',-1],[0,1,'d',-1],[-1,0,'l',-1],[1,0,'r',1]]){
    const {g,fire}=setup();
    g.run('st.x='+x+';st.y='+y+';stickUp='+(y===-1));
    fire('pointerdown');
    g.run('readHuman()');
    assert.equal(g.run('hin.sc'),1,dir);
    assert.equal(g.run('hin.neutralSpecial'),false,dir);
    if(dir==='u'){assert.equal(g.run('hin.u'),true);assert.equal(g.run('hin.jc'),0,'up+B should not cause a jump');}
    if(dir==='d'){assert.equal(g.run('hin.gd'),true);assert.equal(g.run('hin.dc'),0,'down+B must not trigger platform drop');}
    if(dir==='l'||dir==='r')assert.equal(g.run('hin.sideSpecial'),expected,dir);
    fire('pointerup');
  }
});
test('special direction is captured on B press, even if the stick returns to center before simulation',()=>{
  const {g,fire}=setup();
  g.run('st.x=1');
  fire('pointerdown');fire('pointerup');
  g.run('st.x=0;st.y=0;readHuman()');
  assert.equal(g.run('hin.sideSpecial'),1);
  assert.equal(g.run('hin.r'),true);
  assert.equal(g.run('hin.neutralSpecial'),false);
});
test('up+B and down+B remain protected from jump and platform drop during a long B hold',()=>{
  for(const dir of ['u','d']){
    const {g,fire}=setup();
    g.run(dir==='u'?'st.y=-1;stickUp=true':'st.y=1');
    fire('pointerdown');
    for(let i=0;i<4;i++){
      g.run('readHuman()');
      assert.equal(g.run(dir==='u'?'hin.jc':'hin.dc'),0,dir);
      assert.equal(g.run('hin.s'),true);
    }
    assert.equal(g.run('hin.sc'),1);
    fire('pointerup');g.run('readHuman()');
    assert.equal(g.run('hin.s'),false);
  }
});
test('B can be held for charge-based specials without repeated special presses',()=>{
  const {g,fire}=setup();
  fire('pointerdown');g.run('readHuman()');
  assert.equal(g.run('hin.s&&hin.sc===1'),true);
  for(let i=0;i<20;i++)g.run('readHuman()');
  assert.equal(g.run('hin.s'),true);
  assert.equal(g.run('hin.sc'),1);
  fire('pointerup');g.run('readHuman()');
  assert.equal(g.run('hin.s'),false);
});
test('pointercancel, reset and blur never create a phantom B press',()=>{
  const {g,fire}=setup();
  g.run('st.x=1');fire('pointerdown');fire('pointercancel');
  g.run('readHuman()');assert.equal(g.run('hin.s'),false);
  fire('pointerdown');g.run('resetTouch();readHuman()');
  assert.equal(g.run('hin.s'),false);
  fire('pointerdown');g.dispatch('blur');g.run('readHuman()');
  assert.equal(g.run('hin.s'),false);
  assert.equal(g.run('specialTouchDirection'), '');
});
test('classic settings keep neutral B and separate up/down/side skill buttons',()=>{
  const {g,fire}=setup('classic');
  g.run('st.x=1');
  fire('pointerdown');g.run('readHuman()');
  assert.equal(g.run('hin.neutralSpecial'),true);
  fire('pointerup');g.run('readHuman()');
  const up=g.get('btn-v');up.dispatch('pointerdown',{pointerId:22});
  g.run('readHuman()');
  assert.equal(g.run('hin.u'),true);
  assert.equal(g.run('hin.neutralSpecial'),false);
});
test('swiping on B is no longer required or used to select directional specials',()=>{
  const {g,fire}=setup();
  const b=g.get('btn-s');
  fire('pointerdown');
  b.dispatch('pointermove',{pointerId:17,clientX:100,clientY:30});
  g.run('readHuman()');
  assert.equal(g.run('hin.neutralSpecial'),true);
  assert.equal(g.run('hin.u'),false);
});
