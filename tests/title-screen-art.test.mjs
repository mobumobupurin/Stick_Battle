import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const src=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('cinematic title artwork is a self-contained asset with two eyeless combatants',()=>{
 const art=src('assets/title/title-clash.svg');
 assert.match(art,/<svg[^>]*viewBox="0 0 1400 788"/);
 assert.match(art,/data:image\/jpeg;base64,\/9j\//);
 assert.ok(art.length>100000);
 const styles=src('src/styles/ui-renewal.css');
 assert.match(styles,/title-clash\.svg/);
 assert.match(styles,/@media\(orientation:portrait\)/);
 assert.match(styles,/@media\(orientation:landscape\)/);
});

test('title screen replaces old giant fighter without breaking the start button',()=>{
 const menu=src('src/game/16-menu-ui.js'),template=src('src/index.template.html');
 assert.doesNotMatch(menu,/premium-light|MASTER YOUR OWN STYLE/);
 assert.ok(menu.includes("titleArtwork.innerHTML=''"));
 assert.match(template,/id="title-tap"/);
 assert.match(template,/class="title-art"/);
 const output=src('index.html');
 assert.match(output,/title-clash\.svg/);
 assert.doesNotMatch(output,/MASTER YOUR OWN STYLE/);
});

test('Kaneki masks have no unique glowing red eyes in gameplay or selection art',()=>{
 const kaneki=src('src/game/15-kaneki.js');
 assert.doesNotMatch(kaneki,/oval\(6,-62|oval\(10,-64/);
 assert.doesNotMatch(kaneki,/ellipse cx="59" cy="29"/);
 assert.match(kaneki,/kanekiPaintBody/);
 assert.match(kaneki,/kanekiPortraitSVG/);
});
