import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('title display declaration cannot override screen switching with !important',()=>{
  const css=read('src/styles/ui-renewal.css');
  const titleRules=[...css.matchAll(/#sc-title\s*\{([^}]*)\}/g)].map(m=>m[1]);
  assert.ok(titleRules.length>0,'title CSS rule should exist');
  for(const rule of titleRules){
    assert.doesNotMatch(rule,/(?:^|;)\s*display\s*:\s*flex\s*!important\b/i,
      'forcing the title visible with !important hides the battle beneath it');
  }
  assert.match(css,/#sc-title\s*\{[^}]*display\s*:\s*flex\s*;/,
    'title should default to flex only while the screen is active');
});

test('scene switching hides title while starting CPU battle, and restores it on return',()=>{
  const source=read('src/game/13-ui-and-menus.js');
  const begin=source.indexOf('function show(id) {');
  const end=source.indexOf('\nfunction seg(',begin);
  assert.ok(begin>=0&&end>begin,'show() exists in the menu source');
  const screens=['sc-title','sc-mode','sc-stage'].map(id=>({id,style:{display:''}}));
  const game={style:{display:'none'}};
  const byId=Object.fromEntries([...screens,game].map((el,i)=>[el.id||'game',el]));
  const ctx=vm.createContext({
    scene:'sc-title',document:{
      querySelectorAll:s=>s==='.screen'?screens:[],
      getElementById:id=>byId[id],
    },resetTouch(){},stopGokuAudio(){},stopJotaroTimeStopBgm(){}
  });
  vm.runInContext(source.slice(begin,end),ctx);
  vm.runInContext("show('battle')",ctx);
  assert.equal(byId['sc-title'].style.display,'none');
  assert.equal(game.style.display,'flex');
  assert.equal(vm.runInContext('scene',ctx),'battle');
  vm.runInContext("show('sc-title')",ctx);
  assert.equal(byId['sc-title'].style.display,'flex');
  assert.equal(game.style.display,'none');
});
