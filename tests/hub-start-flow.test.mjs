import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {game} from './helpers/game.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('all playable HUB games have a shared GAME START gateway and distinct play scene',()=>{
 const html=read('src/index.template.html'),css=read('src/styles/game-hub.css');
 const flow=read('src/game/26-hub-flow.js');
 const lobby=html.slice(html.indexOf('id="sc-hub-room"'),html.indexOf('id="sc-hub-play"'));
 const play=html.slice(html.indexOf('id="sc-hub-play"'),html.indexOf('id="sc-result"'));
 assert.match(lobby,/id="hub-game-start"/);
 assert.match(lobby,/id="hub-selection-title"/);
 assert.match(lobby,/id="hub-resume-play"/);
 assert.match(play,/id="hub-board"/);
 assert.match(play,/id="hub-game-title"/);
 assert.match(play,/id="hub-actions"/);
 assert.match(play,/id="hub-play-back"/);
 assert.doesNotMatch(lobby,/id="hub-board"/);
 assert.doesNotMatch(play,/id="hub-catalog"/);
 assert.match(flow,/hubPlayGameBeforeFlow\(kind\)/);
 assert.match(flow,/await hostStart\(\)/);
 assert.match(flow,/hubSelection/);
 assert.match(css,/hub-start-btn/);
 assert.doesNotMatch(css,/#sc-hub-play\s*\{[^}]*display:\s*flex\s*!important/);
});

test('game scene switches to play automatically on start, but browsing lobby does not force it open',()=>{
 const g=game();
 g.run('online=true;gmCache={mode:"hub"};show("sc-hub-room");hubGameSnapshot=null;');
 assert.equal(g.run('scene'),'sc-hub-room');
 g.run('hubGameSnapshot=hubNewGame("reversi",["human","hub-cpu-1"]);hubFlowSyncScreen()');
 assert.equal(g.run('scene'),'sc-hub-play');
 assert.equal(g.get('sc-hub-play').style.display,'flex');
 g.run('hubRoomBrowsing=true;show("sc-hub-room");hubFlowSyncScreen()');
 assert.equal(g.run('scene'),'sc-hub-room');
 g.run('hubGameSnapshot=null;hubFlowSyncScreen()');
 assert.equal(g.run('scene'),'sc-hub-room');
 g.run('hubRoomBrowsing=false;hubGameSnapshot=hubNewGame("connect4",["human","hub-cpu-1"]);hubFlowSyncScreen()');
 assert.equal(g.run('scene'),'sc-hub-play');
 g.run('hubGameSnapshot=null;hubFlowSyncScreen()');
 assert.equal(g.run('scene'),'sc-hub-room');
});

test('Stick Battle GAME START supplies CPU for solo host and enters existing combat engine',()=>{
 const g=game();
 assert.deepEqual(Array.from(g.run("hubChooseSeats('stickbattle',['host'])")),['host','hub-cpu-1']);
 assert.deepEqual(Array.from(g.run("hubChooseSeats('stickbattle',['host','friend'])")),['host','friend']);
 assert.equal(g.run("hubChooseSeats('stickbattle',['host'],'0')"),null);
 assert.match(read('src/game/26-hub-flow.js'),/await hostStart\(\)/);
});

test('七並べ may pass strategically three times even when a playable card exists',()=>{
 const g=game();
 g.run('const passState=hubNewGame("shichinarabe",["a","b","cpu"]);passState.hands[0]=[5,8];');
 assert.equal(g.run('hubSevenChoices(passState,0).includes(5)'),true);
 for(let used=0;used<3;used++){
  g.run('passState.passes[0]='+used+';passState.turn=0;');
  g.run('const pass'+used+'=hubApplyMove(passState,"a","pass")');
  assert.equal(g.run('pass'+used+'.passes[0]'),used+1);
  assert.equal(g.run('pass'+used+'.eliminated.length'),0);
 }
 g.run('passState.passes[0]=3;');
 assert.equal(g.run('hubApplyMove(passState,"a","pass")'),null);
});

test('七並べ fourth attempted pass when blocked eliminates without incrementing above three',()=>{
 const g=game();
 g.run('const blocked=hubNewGame("shichinarabe",["a","b","c"]);blocked.hands[0]=[0,1];blocked.passes[0]=3;');
 assert.equal(g.run('hubSevenChoices(blocked,0).length'),0);
 g.run('const retired=hubApplyMove(blocked,"a","pass")');
 assert.equal(g.run('retired.passes[0]'),3);
 assert.equal(g.run('retired.eliminated.includes(0)'),true);
 assert.equal(g.run('retired.hands[0].length'),0);
 assert.equal(g.run('retired.placed[0]&&retired.placed[1]'),true);
 assert.notEqual(g.run('retired.turn'),0);
 assert.equal(g.run('blocked.placed[0]'),false);
});

test('七並べ CPU selects legal cards and never exceeds pass allowance',()=>{
 const g=game();
 g.run('let sim=hubNewGame("shichinarabe",["hub-cpu-1","hub-cpu-2","hub-cpu-3"]);let steps=0;while(sim.status==="play"&&steps<500){const seat=sim.turn,pick=hubCpuChoice(sim);const choices=hubSevenChoices(sim,seat);if(pick!=="pass"&&!choices.includes(pick))throw Error("illegal CPU card");const next=hubApplyMove(sim,sim.players[seat],pick);if(!next)throw Error("invalid move");sim=next;steps++;}');
 assert.equal(g.run('sim.status'),'done');
 assert.equal(g.run('sim.passes.every(x=>x<=3)'),true);
 assert.equal(g.run('sim.finish.length'),3);
 assert.ok(g.run('steps')<500);
});

test('enhanced CPU preserves Connect Four immediate win and blocking tactics',()=>{
 const g=game();
 g.run('const win=hubNewGame("connect4",["hub-cpu-1","h"]);win.board[35]=1;win.board[36]=1;win.board[37]=1;');
 assert.equal(g.run('hubCpuChoice(win)'),3);
 g.run('const block=hubNewGame("connect4",["hub-cpu-1","h"]);block.board[35]=2;block.board[36]=2;block.board[37]=2;');
 assert.equal(g.run('hubCpuChoice(block)'),3);
});

test('enhanced CPU chooses legal chess, mini-shogi and Reversi moves',()=>{
 const g=game();
 g.run('const chess=hubNewGame("chess",["hub-cpu-1","h"]);const chessPick=hubCpuChoice(chess)');
 assert.equal(g.run('hubChessLegalMoves(chess).some(m=>m.from===chessPick.from&&m.to===chessPick.to)'),true);
 g.run('const mini=hubNewGame("mini-shogi",["hub-cpu-1","h"]);const miniPick=hubCpuChoice(mini)');
 assert.equal(g.run('hubMiniLegalMoves(mini).some(m=>m.to===miniPick.to&&(m.drop===miniPick.drop)&&m.from===miniPick.from)'),true);
 g.run('const rv=hubNewGame("reversi",["h","hub-cpu-1"]);rv.turn=1;');
 const index=g.run('hubCpuChoice(rv)');
 assert.equal(g.run('hubReversiMoves(rv.board,2).includes('+index+')'),true);
});

test('blackjack CPU considers dealer upcard rather than a fixed hit/stand threshold',()=>{
 const g=game();
 g.run('const bj=hubNewGame("blackjack",["hub-cpu-1","h"]);bj.turn=0;bj.status="play";bj.hands[0]=[9,5];bj.dealer=[5,11];');
 assert.equal(g.run('hubBJTotal(bj.hands[0])'),16);
 assert.equal(g.run('hubCpuChoice(bj)'),'stand');
 g.run('bj.dealer[0]=9;');
 assert.equal(g.run('hubCpuChoice(bj)'),'hit');
});

test('HUB still keeps its 13-game catalog, room invitations, CPU selection and card game controls',()=>{
 const html=read('src/index.template.html');
 assert.match(html,/10 PLAYABLE \/ 13 GAMES/);
 assert.match(html,/id="hub-copy"/);
 assert.match(html,/id="hub-cpu-count"/);
 assert.match(html,/id="hub-game-start"/);
 assert.match(html,/id="hub-play-back"/);
 assert.match(html,/id="online-create"/);
});
