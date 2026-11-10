import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {game} from './helpers/game.mjs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('one human can fill a Reversi or Connect Four room with CPU, and two humans need none',()=>{
  const g=game();
  assert.deepEqual(Array.from(g.run("hubChooseSeats('reversi',['human'])")),['human','hub-cpu-1']);
  assert.deepEqual(Array.from(g.run("hubChooseSeats('connect4',['human'])")),['human','hub-cpu-1']);
  assert.deepEqual(Array.from(g.run("hubChooseSeats('connect4',['alice','bob'])")),['alice','bob']);
  assert.equal(g.run("hubChooseSeats('reversi',['human'],'0')"),null);
  assert.equal(g.run("hubIsCpu('hub-cpu-1')"),true);
  assert.equal(g.run("hubIsCpu('fake-user')"),false);
});

test('party games top up the minimum seats and accept real friends alongside CPU',()=>{
  const g=game();
  assert.deepEqual(Array.from(g.run("hubChooseSeats('shichinarabe',['host'])")),['host','hub-cpu-1','hub-cpu-2']);
  assert.deepEqual(Array.from(g.run("hubChooseSeats('shichinarabe',['host','friend'])")),['host','friend','hub-cpu-1']);
  assert.deepEqual(Array.from(g.run("hubChooseSeats('blackjack',['host'])")),['host','hub-cpu-1']);
  assert.deepEqual(Array.from(g.run("hubChooseSeats('baccarat',['host'])")),['host','hub-cpu-1']);
  assert.equal(g.run("hubChooseSeats('shichinarabe',['host'],'0')"),null);
  assert.equal(g.run("hubChooseSeats('shichinarabe',['host'],'2').length"),3);
  assert.equal(g.run("hubChooseSeats('baccarat',['a','b','c'],'4').length"),7);
});

test('CPU Reversi always selects a legal move, with no direct turn manipulation',()=>{
  const g=game();
  g.run("const rv=hubNewGame('reversi',['human','hub-cpu-1']);rv.turn=1");
  const choice=g.run("hubCpuChoice(rv)");
  assert.equal(g.run("hubReversiMoves(rv.board,2).includes("+choice+")"),true);
  g.run("const rv2=hubApplyMove(rv,'hub-cpu-1',"+choice+")");
  assert.equal(g.run("rv2.revision"),1);
  assert.equal(g.run("rv.board.filter(Boolean).length"),4);
  assert.equal(g.run("rv2.board.filter(Boolean).length"),5);
});

test('Connect Four CPU prefers immediate wins and blocks opponents',()=>{
  const g=game();
  g.run("const win=hubNewGame('connect4',['hub-cpu-1','user']);win.board[35]=1;win.board[36]=1;win.board[37]=1");
  assert.equal(g.run("hubCpuChoice(win)"),3);
  g.run("const block=hubNewGame('connect4',['hub-cpu-1','user']);block.board[35]=2;block.board[36]=2;block.board[37]=2");
  assert.equal(g.run("hubCpuChoice(block)"),3);
  assert.equal(g.run("hubApplyMove(win,'hub-cpu-1',hubCpuChoice(win)).winner"),0);
});

test('七並べ deals 52 unique cards, automatically opens sevens and allows only neighboring cards',()=>{
  const g=game();
  g.run("const seven=hubNewGame('shichinarabe',['a','b','hub-cpu-1'])");
  assert.equal(g.run("seven.placed.filter(Boolean).length"),4);
  assert.equal(g.run("seven.hands.reduce((n,h)=>n+h.length,0)"),48);
  assert.equal(g.run("new Set([...seven.hands.flat(),...seven.placed.flatMap((v,i)=>v?[i]:[])]).size"),52);
  assert.equal(g.run("hubSevenLegal(seven,5)"),true);
  assert.equal(g.run("hubSevenLegal(seven,7)"),true);
  assert.equal(g.run("hubSevenLegal(seven,4)"),false);
  assert.equal(g.run("hubSevenLegal(seven,6)"),false);
});

test('七並べ rejects illegal cards and passing when playable, and supports blocked passes',()=>{
  const g=game();
  g.run("const seven=hubNewGame('shichinarabe',['a','b','hub-cpu-1']);seven.hands[0]=[0];seven.finish=[]");
  assert.equal(g.run("hubApplyMove(seven,'a',0)"),null);
  assert.equal(g.run("hubApplyMove(seven,'a',5)"),null);
  g.run("const passed=hubApplyMove(seven,'a','pass')");
  assert.equal(g.run("passed.turn"),1);
  assert.equal(g.run("passed.passes[0]"),1);
  assert.equal(g.run("passed.revision"),1);
});

test('七並べ can complete an entire CPU-only table with pass turns',()=>{
  const g=game();
  g.run("let sevenAuto=hubNewGame('shichinarabe',['hub-cpu-1','hub-cpu-2','hub-cpu-3']);let sevenSteps=0;while(sevenAuto.status==='play'&&sevenSteps<500){const actor=sevenAuto.players[sevenAuto.turn],pick=hubCpuChoice(sevenAuto),next=hubApplyMove(sevenAuto,actor,pick);if(!next)throw Error('bad seven move: '+pick);sevenAuto=next;sevenSteps++;}");
  assert.equal(g.run("sevenAuto.status"),'done');
  assert.equal(g.run("sevenAuto.finish.length"),3);
  assert.equal(g.run("sevenAuto.winner"),g.run("sevenAuto.finish[0]"));
  assert.ok(g.run("sevenSteps")<500);
});

test('blackjack handles ace totals, hit/stand, CPU dealer, and completed results',()=>{
  const g=game();
  assert.equal(g.run("hubBJTotal([0,9])"),21);
  assert.equal(g.run("hubBJTotal([0,13,26,8])"),12);
  g.run("let blackjack=hubNewGame('blackjack',['hub-cpu-1','hub-cpu-2']);let bjSteps=0;while(blackjack.status==='play'&&bjSteps<70){const actor=blackjack.players[blackjack.turn],pick=hubCpuChoice(blackjack),next=hubApplyMove(blackjack,actor,pick);if(!next)throw Error('invalid blackjack choice');blackjack=next;bjSteps++;}");
  assert.equal(g.run("blackjack.status"),'done');
  assert.equal(g.run("blackjack.results.length"),2);
  assert.ok(g.run("hubBJTotal(blackjack.dealer)")>=17||g.run("hubBJNatural(blackjack.dealer)"));
  assert.equal(g.run("hubApplyMove(blackjack,'hub-cpu-1','hit')"),null);
});

test('baccarat banker/player natural rule stands at 8 or 9, and all bets resolve',()=>{
  const g=game();
  g.run("const bac=hubBaccaratOutcome([27,15,3,2,12,7])");
  assert.equal(g.run("bac.playerTotal"),8);
  assert.equal(g.run("bac.bankerTotal"),7);
  assert.equal(g.run("bac.player.length"),2);
  assert.equal(g.run("bac.banker.length"),2);
  assert.equal(g.run("bac.winner"),'player');
  g.run("let baccarat=hubNewGame('baccarat',['a','hub-cpu-1']);baccarat=hubApplyMove(baccarat,'a','player');baccarat=hubApplyMove(baccarat,'hub-cpu-1','banker')");
  assert.equal(g.run("baccarat.status"),'done');
  assert.equal(g.run("baccarat.result.player.length>=2&&baccarat.result.player.length<=3"),true);
  assert.equal(g.run("baccarat.result.banker.length>=2&&baccarat.result.banker.length<=3"),true);
  assert.equal(g.run("baccarat.score.length"),2);
  assert.equal(g.run("hubApplyMove(baccarat,'a','tie')"),null);
});

test('table card UI and bot selection remain accessible without affecting the battle controls',()=>{
  const html=read('src/index.template.html'),js=read('src/game/21-hub-ui.js'),css=read('src/styles/game-hub.css');
  assert.match(html,/id="hub-cpu-count"/);
  assert.match(html,/id="hub-actions"/);
  assert.match(html,/10 PLAYABLE \/ 13 GAMES/);
  assert.match(js,/hubCpuTimer\(\)/);
  assert.match(css,/\.hub-seven-layout/);
  assert.match(css,/\.hub-playing-card/);
  assert.match(css,/\.hub-cpu-settings/);
  assert.match(html,/id="go-cpu"/);
  assert.match(html,/id="online-create"/);
});
