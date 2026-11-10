import test from 'node:test';
import assert from 'node:assert/strict';
import {game} from './helpers/game.mjs';

test('game hub lists requested modes but clearly disables unimplemented games',()=>{
  const g=game();
  assert.equal(g.run('HUB_CATALOG.length'),13);
  assert.deepEqual(Array.from(g.run('HUB_CATALOG.filter(x=>x.ready).map(x=>x.id)')),['stickbattle','reversi','connect4']);
  assert.equal(g.run('HUB_CATALOG.find(x=>x.id==="mini-shogi").name'),'5五将棋');
});

test('reversi starts with four discs and four valid opening placements',()=>{
  const g=game();
  assert.equal(g.run('hubNewGame("reversi",["a","b"]).board.filter(Boolean).length'),4);
  assert.deepEqual(Array.from(g.run('hubReversiMoves(hubNewGame("reversi",["a","b"]).board,1)')),[19,26,37,44]);
});

test('reversi enforces turns, flips discs, and preserves prior state',()=>{
  const g=game();
  g.run('const a=hubNewGame("reversi",["a","b"]); const b=hubApplyMove(a,"a",19)');
  assert.equal(g.run('hubApplyMove(a,"b",19)'),null);
  assert.equal(g.run('hubApplyMove(a,"a",0)'),null);
  assert.equal(g.run('a.board[19]'),0);
  assert.equal(g.run('b.board[19]'),1);
  assert.equal(g.run('b.board[27]'),1);
  assert.equal(g.run('b.turn'),1);
});

test('reversi resolves a finished board and awards the higher disc count',()=>{
  const g=game();
  g.run('const r=hubNewGame("reversi",["a","b"]);r.board=Array(64).fill(1);r.board[0]=0;r.board[1]=2;const end=hubApplyMove(r,"a",0)');
  assert.equal(g.run('end.status'),'done');
  assert.equal(g.run('end.winner'),0);
  assert.equal(g.run('hubApplyMove(end,"a",10)'),null);
});

test('connect four respects gravity and rejects wrong player or full column',()=>{
  const g=game();
  g.run('const a=hubNewGame("connect4",["a","b"]); const b=hubApplyMove(a,"a",3)');
  assert.equal(g.run('b.board[38]'),1);
  assert.equal(g.run('b.turn'),1);
  assert.equal(g.run('hubApplyMove(a,"b",3)'),null);
  assert.equal(g.run('hubApplyMove(a,"a",7)'),null);
  g.run('const full=hubNewGame("connect4",["a","b"]);for(let r=0;r<6;r++)full.board[r*7]=r%2+1');
  assert.equal(g.run('hubApplyMove(full,"a",0)'),null);
});

test('connect four wins vertically and prevents post-game moves',()=>{
  const g=game();
  g.run('let s=hubNewGame("connect4",["a","b"]);for(const col of [0,1,0,1,0,1,0])s=hubApplyMove(s,s.players[s.turn],col)');
  assert.equal(g.run('s.status'),'done');
  assert.equal(g.run('s.winner'),0);
  assert.equal(g.run('hubApplyMove(s,"a",2)'),null);
});

test('connect four detects horizontal and both diagonal fours',()=>{
  const g=game();
  assert.equal(g.run('(()=>{const b=Array(42).fill(0);for(let c=0;c<4;c++)b[35+c]=1;return hubConnectWinner(b,5,1,1)})()'),true);
  assert.equal(g.run('(()=>{const b=Array(42).fill(0);for(let i=0;i<4;i++)b[(5-i)*7+i]=1;return hubConnectWinner(b,2,3,1)})()'),true);
  assert.equal(g.run('(()=>{const b=Array(42).fill(0);for(let i=0;i<4;i++)b[(2+i)*7+i]=1;return hubConnectWinner(b,5,3,1)})()'),true);
});
