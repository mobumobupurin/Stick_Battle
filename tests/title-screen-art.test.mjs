import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('arcade title fight is native vector geometry drawn in code, not bitmap artwork',()=>{
 const ui=src('src/game/13-ui-and-menus.js'),css=src('src/styles/arcade.css');
 const art=ui.split('function titleIllustration(){')[1]?.split('\n}\n')[0];
 assert.ok(art,'title illustration function exists');
 assert.match(art,/<svg viewBox="0 0 1600 900"/);
 assert.match(art,/class="ax-f-left"/);
 assert.match(art,/class="ax-f-right"/);
 assert.match(art,/class="ax-burst"/);
 assert.match(art,/axBlade/,'swordsman keeps a drawn blade');
 assert.doesNotMatch(art,/<image\b|data:image\/|href="https?:/);
 assert.match(ui,/document\.querySelector\('\.title-art'\)\.innerHTML=titleIllustration\(\)/);
 assert.match(css,/@media\(max-aspect-ratio:4\/5\)/,'portrait framing keeps both fighters visible');
 assert.match(css,/prefers-reduced-motion/);
 assert.equal(existsSync(new URL('../assets/title/title-clash.svg',import.meta.url)),false);
});

test('title fighters have blank faces and the logo is real editable text',()=>{
 const template=src('src/index.template.html'),ui=src('src/game/13-ui-and-menus.js');
 const art=ui.split('function titleIllustration(){')[1]?.split('\n}\n')[0];
 assert.ok(art);
 assert.doesNotMatch(art,/data-eye=|class="eye|glowing.eye|pupil|iris/);
 assert.match(template,/<h1 class="ax-logo" aria-label="STICK BATTLE ONLINE"><span class="ax-logo-stick">STICK<\/span><span class="ax-logo-battle">BATTLE<\/span><span class="ax-logo-online">ONLINE<\/span><\/h1>/);
 assert.match(template,/id="title-tap"/);
 assert.match(template,/class="title-art ax-title-art"/);
 const output=src('index.html');
 assert.match(output,/STICK BATTLE ONLINE — ARCADE UI/);
 assert.doesNotMatch(output,/title-clash\.svg/);
});

test('Kaneki gameplay and portrait show a blank face without a unique red eye',()=>{
 const k=src('src/game/15-kaneki.js');
 assert.doesNotMatch(k,/oval\(6,-62|oval\(10,-64/);
 assert.doesNotMatch(k,/ellipse cx="59" cy="29"/);
 assert.match(k,/oval\(1,-61,9\.5,11\.5,'#151d2c'\)/);
 assert.match(k,/Featureless shadowed face, no pupil/);
 assert.match(k,/kanekiPortraitSVG/);
 assert.match(k,/kanekiPaintBody/);
});
