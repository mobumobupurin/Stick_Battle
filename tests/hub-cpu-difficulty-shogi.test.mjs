import test from 'node:test';
import assert from 'node:assert/strict';
import {game} from './helpers/game.mjs';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('CPU strength is available in hub setup and freezes in match state',()=>{
  const html=read('src/index.template.html');
  const flow=read('src/game/26-hub-flow.js');
  const ui=read('src/game/21-hub-ui.js');
  assert.match(html,/id="hub-cpu-level"/);
  for(const value of ['0','1','2'])assert.match(html,new RegExp('option value="'+value+'"'));
  assert.match(ui,/game\.cpuLevel=/);
  assert.match(flow,/selectedLevel/);
  assert.match(flow,/cpuLv:Number\.isInteger\(selectedLevel\)/);
  assert.match(flow,/level\.onchange/);
  assert.match(read('src/manifest.json'),/28-hub-difficulty\.js/);
});

test('CPU levels validate input and default older game records to normal',()=>{
 const g=game();
 assert.equal(g.run('hubCpuLevel({})'),1);
 assert.equal(g.run('hubCpuLevel({cpuLevel:0})'),0);
 assert.equal(g.run('hubCpuLevel({cpuLevel:1})'),1);
 assert.equal(g.run('hubCpuLevel({cpuLevel:2})'),2);
 assert.equal(g.run('hubCpuLevel({cpuLevel:20})'),1);
 assert.equal(g.run('hubCpuLevel({cpuLevel:"bad"})'),1);
});

test('easy/normal/hard CPU returns valid moves for all chess and 5x5 shogi difficulties',()=>{
 const g=game();
 for(const level of [0,1,2]){
  g.run('const chess'+level+'=hubNewGame("chess",["hub-cpu-1","person"]);chess'+level+'.cpuLevel='+level+';');
  g.run('const chMove'+level+'=hubCpuChoice(chess'+level+')');
  assert.equal(g.run('hubChessLegalMoves(chess'+level+').some(m=>m.from===chMove'+level+'.from&&m.to===chMove'+level+'.to)'),true);
  g.run('const mini'+level+'=hubNewGame("mini-shogi",["hub-cpu-1","person"]);mini'+level+'.cpuLevel='+level+';');
  g.run('const miniMove'+level+'=hubCpuChoice(mini'+level+')');
  assert.equal(g.run('hubMiniLegalMoves(mini'+level+').some(m=>m.to===miniMove'+level+'.to&&m.from===miniMove'+level+'.from&&m.drop===miniMove'+level+'.drop&&!!m.promote===!!miniMove'+level+'.promote)'),true);
 }
});

test('easy/normal/hard CPU produces only legal Reversi and Connect Four moves',()=>{
 const g=game();
 for(const level of [0,1,2]){
  g.run('const rv'+level+'=hubNewGame("reversi",["human","hub-cpu-1"]);rv'+level+'.turn=1;rv'+level+'.cpuLevel='+level+';');
  const rv=g.run('hubCpuChoice(rv'+level+')');
  assert.equal(g.run('hubReversiMoves(rv'+level+'.board,2).includes('+rv+')'),true);
  g.run('const c'+level+'=hubNewGame("connect4",["hub-cpu-1","human"]);c'+level+'.cpuLevel='+level+';');
  const c=g.run('hubCpuChoice(c'+level+')');
  assert.equal(Number.isInteger(c),true);
  assert.equal(g.run('c'+level+'.board['+c+']'),0);
 }
});

test('strong Connect Four CPU takes forced wins instead of overlooking immediate mates',()=>{
 const g=game();
 g.run('const pos=hubNewGame("connect4",["hub-cpu-1","human"]);pos.cpuLevel=2;pos.board[35]=1;pos.board[36]=1;pos.board[37]=1;');
 assert.equal(g.run('hubCpuChoice(pos)'),3);
 g.run('const reply=hubApplyMove(pos,pos.players[pos.turn],3)');
 assert.equal(g.run('reply.status'),'done');
 assert.equal(g.run('reply.winner'),0);
});

test('shogi snapshot normalization accepts sparse Firebase object boards',()=>{
 const g=game();
 g.run('const sh=hubNewGame("mini-shogi",["a","b"]);sh.board={4:"gK",9:"gP",15:"sP",20:"sK"};sh.hand={"0":{"R":1}};');
 assert.equal(g.run('hubMiniBoard(sh).length'),25);
 assert.equal(g.run('hubMiniBoard(sh)[20]'),'sK');
 assert.equal(g.run('hubMiniHands(sh)[0].R'),1);
 assert.equal(g.run('hubMiniHands(sh)[1].P'),undefined);
 assert.equal(g.run('hubMiniCheck(sh.board,0)'),false);
 assert.equal(g.run('hubMiniLegalMoves(sh).length>0'),true);
 const count=g.run("hubMiniLegalMoves(sh).filter(m=>m.drop==='R').length");
 assert.ok(count>0);
});

test('shogi moves and drops continue when Firebase returns hands as numeric-key object',()=>{
 const g=game();
 g.run('const sh2=hubNewGame("mini-shogi",["a","b"]);sh2.board={"4":"gK","20":"sK"};sh2.hand={"0":{"P":1},"1":{"S":2}};');
 const drop=g.run("hubMiniLegalMoves(sh2).find(x=>x.drop==='P'&&x.to%5===2)?.to");
 assert.ok(Number.isInteger(drop));
 g.run('const next=hubApplyMove(sh2,"a",{drop:"P",to:'+drop+'})');
 assert.equal(g.run('next.board['+drop+']'),'sP');
 assert.equal(g.run('next.hand[0].P'),undefined);
 assert.equal(g.run('next.hand[1].S'),2);
 assert.equal(g.run('next.revision'),1);
 assert.equal(g.run('sh2.hand[0].P'),1);
});

test('shogi reject drops from missing pieces and convert captured promoted pawn into ordinary pawn',()=>{
 const g=game();
 g.run('const x=hubNewGame("mini-shogi",["a","b"]);x.board=Array(25).fill(0);x.board[20]="sK";x.board[4]="gK";x.board[15]="sR";x.board[10]="g+P";x.hand=[{},{}];');
 assert.equal(g.run('hubMiniRaw(x,{drop:"B",to:6})'),null);
 g.run('const xAfter=hubApplyMove(x,"a",{from:15,to:10,promote:false})');
 assert.equal(g.run('xAfter.board[10]'),'sR');
 assert.equal(g.run('xAfter.hand[0].P'),1);
 assert.equal(g.run('hubMiniBoard(xAfter).length'),25);
});

test('shogi UI discards stale selected squares when a new move changes revision',()=>{
 const g=game();
 g.run('const s=hubNewGame("mini-shogi",["a","b"]);hubExtraSync(s);hubExtraSelected=20;hubExtraDrop="P";');
 assert.equal(g.run('hubExtraSelected'),20);
 g.run('const later={...s,revision:1,turn:1};hubExtraSync(later)');
 assert.equal(g.run('hubExtraSelected'),null);
 assert.equal(g.run('hubExtraDrop'),'');
});

test('CPU and shogi source contain robustness rules but regular full board shogi remains unreleased',()=>{
 const g=game();
 assert.equal(g.run('HUB_CATALOG.find(x=>x.id==="mini-shogi").ready'),true);
 assert.equal(g.run('HUB_CATALOG.find(x=>x.id==="shogi").ready'),false);
 assert.match(read('src/game/23-hub-mini-shogi.js'),/hubMiniHands/);
 assert.match(read('src/game/25-hub-more-ui.js'),/hubExtraMoveKey/);
 assert.match(read('src/styles/game-hub.css'),/hub-cpu-level/);
});
