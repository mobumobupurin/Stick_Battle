import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {game} from './helpers/game.mjs';

const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Tanjiro has the exact lightweight knockback weight and UI rating of ninja',()=>{
 const g=game();
 assert.equal(g.run("CC('tanjiro').wt"),g.run("CC('ninja').wt"));
 assert.equal(g.run("CC('tanjiro').wt"),1.25);
 assert.equal(g.run("CC('tanjiro').st[2]"),g.run("CC('ninja').st[2]"));
 assert.equal(g.run("CC('tanjiro').st[2]"),1);
});

test('every fighter has explanations for normal, charged and 4 special directions',()=>{
 const g=game();
 const roster=g.run("Object.keys(CHARS)");
 assert.equal(roster.length,19);
 for(const id of roster){
  const guide=g.run("fighterMoveGuide("+JSON.stringify(id)+")");
  assert.equal(guide.name,g.run("CC("+JSON.stringify(id)+").name"));
  assert.equal(guide.moves.length,6,id);
  assert.deepEqual(Array.from(guide.moves,move=>move.key),['A','長押しA','B','横+B','上+B','下+B'],id);
  assert.ok(guide.role&&guide.lead&&guide.ability,id);
  for(const move of guide.moves)assert.ok(move.label&&move.desc&&move.desc.length>=12,id+' '+move.key);
 }
});

test('Tanjiro and Kaneki guides describe their distinct directional moves and transformations',()=>{
 const g=game();
 const tanjiro=g.run("fighterMoveGuide('tanjiro')");
 assert.match(tanjiro.moves[2].desc,/水面斬り/);
 assert.match(tanjiro.moves[3].desc,/流流舞い/);
 assert.match(tanjiro.moves[4].desc,/水車/);
 assert.match(tanjiro.moves[5].desc,/ヒノカミ神楽|幻日虹/);
 const kaneki=g.run("fighterMoveGuide('kaneki')");
 assert.match(kaneki.moves[3].desc,/赫子捕縛/);
 assert.match(kaneki.moves[3].desc,/中断/);
 assert.match(kaneki.moves[5].desc,/半赫者/);
});

test('visible fighter guide button and native accessible dialog exist in source and bundle',()=>{
 for(const path of ['src/index.template.html','index.html']){
  const html=src(path);
  assert.match(html,/id="fighter-guide-open"[^>]*aria-haspopup="dialog"/);
  assert.match(html,/id="fighter-guide-dialog"[^>]*aria-labelledby="fighter-guide-name"/);
  assert.match(html,/id="fighter-guide-moves"/);
  assert.match(html,/id="fighter-guide-close"/);
  assert.match(html,/id="fighter-guide-done"/);
 }
 const css=src('src/styles/ui-renewal.css');
 assert.match(css,/\.fighter-guide-dialog::backdrop/);
 assert.match(css,/@media\(max-width:680px\)/);
});

test('move guide opens for currently selected character rather than the previous selection',()=>{
 const g=game(),dialog=g.get('fighter-guide-dialog');
 dialog.showModal=()=>{dialog.open=true;};
 dialog.close=()=>{dialog.open=false;};
 g.get('fighter-guide-moves').replaceChildren=()=>{};
 g.get('fighter-guide-close').focus=()=>{};
 g.run("settings.cid='tanjiro';openFighterGuide()");
 assert.equal(dialog.open,true);
 assert.match(g.get('fighter-guide-name').textContent,/竈門炭治郎/);
 dialog.close();
 g.run("settings.cid='kaneki';openFighterGuide()");
 assert.match(g.get('fighter-guide-name').textContent,/金木/);
 assert.equal(dialog.open,true);
});
