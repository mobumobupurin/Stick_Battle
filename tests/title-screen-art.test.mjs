import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('title fight is built from native vector geometry, not encoded bitmap artwork',()=>{
 const html=src('src/index.template.html'),css=src('src/styles/ui-renewal.css');
 const art=html.split('class="title-art title-code-art"')[1]?.split('</svg>')[0];
 assert.ok(art,'inline title illustration exists in source template');
 assert.match(art,/class="title-vector"/);
 assert.match(art,/data-fighter="karate"/);
 assert.match(art,/data-fighter="swordsman"/);
 assert.match(art,/class="title-impact"/);
 assert.match(art,/class="title-sword-arc"/);
 assert.match(art,/viewBox="0 0 1440 820"/);
 assert.doesNotMatch(art,/<image\b|data:image\/|href="https?:/);
 assert.match(css,/TITLE CLASH \/ V4/);
 assert.doesNotMatch(css,/title-clash\.svg|background[^;\n]*\.png/);
 assert.match(css,/@media\(orientation:portrait\)/);
 assert.match(css,/@media\(orientation:landscape\)/);
 assert.match(css, /prefers-reduced-motion/);
 assert.equal(existsSync(new URL('../assets/title/title-clash.svg',import.meta.url)),false);
});

test('code-drawn fighters have blank faces and real editable text branding',()=>{
 const template=src('src/index.template.html'),menu=src('src/game/16-menu-ui.js');
 const scene=template.split('class="title-art title-code-art"')[1]?.split('</svg>')[0];
 assert.ok(scene);
 assert.doesNotMatch(scene,/data-eye=|class="eye|glowing.eye|pupil|iris/);
 assert.match(scene,/circle cx="123" cy="115" r="56"/);
 assert.match(scene,/circle cx="120" cy="112" r="55"/);
 assert.match(template,/<h1 class="logo">STICK<em>BATTLE<\/em><small>ONLINE<\/small><\/h1>/);
 assert.match(template,/id="title-tap"/);
 assert.match(menu,/title artwork is authored as inline SVG/);
 assert.doesNotMatch(menu,/titleArtwork\.innerHTML\s*=\s*''/);
 assert.doesNotMatch(menu,/premium-light|MASTER YOUR OWN STYLE/);
 const output=src('index.html');
 assert.match(output,/class="title-art title-code-art"/);
 assert.match(output,/TITLE CLASH \/ V4/);
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
