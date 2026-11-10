import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('GAME HUB has one entry with consistent branding and no random match inside hub screen',()=>{
  const html=read('src/index.template.html');
  const hub=html.slice(html.indexOf('<div id="sc-hub-room"'),html.indexOf('<div id="sc-result"'));
  const entry=html.slice(html.indexOf('<div id="sc-online"'),html.indexOf('<div id="sc-chars"'));
  assert.match(html,/id="go-hub"[^>]*>[\s\S]*?<b>ゲームHUB<\/b>/);
  assert.match(hub,/ゲーム<span>HUB<\/span>/);
  assert.match(hub,/id="hub-versus"/);
  assert.match(hub,/id="hub-game-title"/);
  assert.match(hub,/id="hub-roster"/);
  assert.doesNotMatch(hub,/ランダムマッチ|id="online-quick"/);
  assert.match(entry,/id="online-quick-zone"/);
  assert.match(entry,/id="online-quick"/);
});

test('Connect Four token palette is red and yellow, while Reversi remains neutral',()=>{
  const css=read('src/styles/game-hub.css');
  const js=read('src/game/19-game-hub.js');
  assert.match(js,/kind==='connect4'\?\(value===1\?'red':'yellow'\)/);
  assert.match(css,/\.hub-player-disc\.red,\.hub-disc\.red\s*\{/);
  assert.match(css,/\.hub-player-disc\.yellow,\.hub-disc\.yellow\s*\{/);
  assert.match(css,/\.hub-player-disc\.dark,\.hub-disc\.dark\s*\{/);
  assert.match(css,/\.hub-player-disc\.light,\.hub-disc\.light\s*\{/);
});

test('HUB hides quick-match via attribute and CSS even if entry is refreshed',()=>{
  const css=read('src/styles/game-hub.css');
  assert.match(css,/#sc-online\[data-online-mode="hub"\] \.hub-quick-zone/);
  assert.match(css,/#sc-online\[data-online-mode="hub"\] #online-quick-status/);
  assert.match(css,/#sc-online\[data-online-mode="tournament"\] \.hub-quick-zone/);
  assert.match(css,/\.hub-shell\{display:grid;/);
  assert.match(css,/@media\s*\(max-width:740px\)/);
});
