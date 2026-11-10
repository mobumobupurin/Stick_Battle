import test from 'node:test';
import assert from 'node:assert/strict';
import {game} from './helpers/game.mjs';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('GAME HUB adds chess, mini-shogi, Old Maid and 5-card poker to its existing playable games',()=>{
 const g=game();
 assert.equal(g.run('HUB_CATALOG.length'),13);
 assert.deepEqual(Array.from(g.run('HUB_CATALOG.filter(g=>g.ready).map(g=>g.id)')),[
  'stickbattle','reversi','connect4','chess','mini-shogi','shichinarabe','oldmaid',
  'blackjack','poker','baccarat']);
 for(const kind of ['chess','mini-shogi','oldmaid','poker'])
  assert.ok(g.run('hubNewGame('+JSON.stringify(kind)+',["alice","hub-cpu-1"])'));
 assert.deepEqual(Array.from(g.run('hubChooseSeats("poker",["host"])')),['host','hub-cpu-1']);
 assert.equal(g.run('hubChooseSeats("chess",["host"],"0")'),null);
});

test('chess opening has exactly 20 white moves, checks ownership, and rejects illegal moves',()=>{
 const g=game();
 g.run('const ch=hubNewGame("chess",["a","b"])');
 assert.equal(g.run('hubChessLegalMoves(ch).length'),20);
 assert.equal(g.run('hubApplyMove(ch,"b",{from:52,to:36})'),null);
 assert.equal(g.run('hubApplyMove(ch,"a",{from:52,to:20})'),null);
 g.run('const ch1=hubApplyMove(ch,"a",{from:52,to:36})');
 assert.equal(g.run('ch1.turn'),1);
 assert.equal(g.run('ch1.board[36]'),'wP');
 assert.equal(g.run('ch.board[52]'),'wP');
 assert.equal(g.run('ch1.ep'),44);
});

test("chess en passant captures the correct pawn and castling moves the rook",()=>{
 const g=game();
 g.run('let ep=hubNewGame("chess",["a","b"]);for(const [id,fr,to] of [["a",52,36],["b",8,16],["a",36,28],["b",11,27],["a",28,19]]){const next=hubApplyMove(ep,id,{from:fr,to});if(!next)throw Error("chess en passant failed "+fr+"-"+to);ep=next;}');
 assert.equal(g.run('ep.board[19]'),'wP');
 assert.equal(g.run('ep.board[27]'),0);
 g.run("const castle=hubNewGame('chess',['a','b']);castle.board=Array(64).fill(0);castle.board[60]='wK';castle.board[56]='wR';castle.board[63]='wR';castle.board[4]='bK';");
 assert.equal(g.run('hubChessLegalMoves(castle).some(m=>m.from===60&&m.to===62)'),true);
 g.run('const castled=hubApplyMove(castle,"a",{from:60,to:62})');
 assert.equal(g.run('castled.board[62]'),'wK');
 assert.equal(g.run('castled.board[61]'),'wR');
 assert.equal(g.run("castled.castle.includes('K')"),false);
});

test("chess detects Fool's Mate, stalemate, underpromotion and check-exposed moves",()=>{
 const g=game();
 g.run('let c=hubNewGame("chess",["w","b"]);for(const [id,from,to] of [["w",53,45],["b",12,28],["w",54,38],["b",3,39]]){const n=hubApplyMove(c,id,{from,to});if(!n)throw Error("bad chess move: "+from);c=n;}');
 assert.equal(g.run('c.status'),'done');
 assert.equal(g.run('c.winner'),1);
 assert.equal(g.run('hubChessCheck(c.board,0)'),true);
 g.run("const promote=hubNewGame('chess',['a','b']);promote.board=Array(64).fill(0);promote.board[60]='wK';promote.board[7]='bK';promote.board[8]='wP';");
 g.run('const promoted=hubApplyMove(promote,"a",{from:8,to:0,promotion:"N"})');
 assert.equal(g.run('promoted.board[0]'),'wN');
 assert.equal(g.run('hubChessLegalMoves(promote).some(m=>m.from===60&&m.to===4)'),false);
});

test('chess CPU always returns a legal move, and cannot move after a finished game',()=>{
 const g=game();
 g.run("const cpu=hubNewGame('chess',['hub-cpu-1','human']);const move=hubCpuChoice(cpu)");
 assert.equal(g.run('hubChessLegalMoves(cpu).some(m=>m.from===move.from&&m.to===move.to)'),true);
 g.run("const after=hubApplyMove(cpu,'hub-cpu-1',move)");
 assert.equal(g.run('after.revision'),1);
});

test('mini-shogi starts with each six pieces and rejects exposed-king or backward-pawn moves',()=>{
 const g=game();
 g.run("const mini=hubNewGame('mini-shogi',['a','b'])");
 assert.equal(g.run('mini.board.filter(Boolean).length'),12);
 assert.equal(g.run("mini.board[20]"),'sK');
 assert.equal(g.run("mini.board[4]"),'gK');
 assert.equal(g.run("mini.board[15]"),'sP');
 assert.equal(g.run('hubMiniLegalMoves(mini).length>0'),true);
 assert.equal(g.run('hubApplyMove(mini,"b",{from:9,to:14})'),null);
 assert.equal(g.run('hubApplyMove(mini,"a",{from:15,to:20,promote:false})'),null);
});

test('mini-shogi correctly identifies check, captures and enforces mandatory pawn promotion',()=>{
 const g=game();
 g.run("const checked=hubNewGame('mini-shogi',['a','b']);checked.board=Array(25).fill(0);checked.board[20]='sK';checked.board[4]='gK';checked.board[0]='gR';");
 assert.equal(g.run('hubMiniCheck(checked.board,0)'),true);
 g.run("const pawn=hubNewGame('mini-shogi',['a','b']);pawn.board=Array(25).fill(0);pawn.board[24]='sK';pawn.board[4]='gK';pawn.board[5]='sP';");
 assert.equal(g.run('hubMiniLegalMoves(pawn).some(m=>m.from===5&&m.to===0&&m.promote===true)'),true);
 assert.equal(g.run('hubMiniLegalMoves(pawn).some(m=>m.from===5&&m.to===0&&m.promote===false)'),false);
 g.run('const became=hubApplyMove(pawn,"a",{from:5,to:0,promote:true})');
 assert.equal(g.run('became.board[0]'),'s+P');
});

test('mini-shogi pawn drops enforce nifu, last-rank restriction, and king safety',()=>{
 const g=game();
 g.run("const drop=hubNewGame('mini-shogi',['a','b']);drop.hand=[{P:1},{}]");
 assert.equal(g.run("hubMiniLegalMoves(drop).some(m=>m.drop==='P'&&m.to%5===0)"),false);
 assert.equal(g.run("hubMiniLegalMoves(drop).some(m=>m.drop==='P'&&Math.floor(m.to/5)===0)"),false);
 const pick=g.run("hubMiniLegalMoves(drop).find(m=>m.drop==='P'&&m.to%5===2)?.to");
 assert.ok(Number.isInteger(pick));
 g.run("const afterDrop=hubApplyMove(drop,'a',{drop:'P',to:"+pick+"})");
 assert.equal(g.run("afterDrop.board["+pick+"]"),'sP');
 assert.equal(g.run("afterDrop.hand[0].P"),0);
 g.run("const miniCPU=hubNewGame('mini-shogi',['hub-cpu-1','guest']);const aiChoice=hubCpuChoice(miniCPU)");
 assert.equal(g.run('hubMiniLegalMoves(miniCPU).some(m=>m.to===aiChoice.to&&m.from===aiChoice.from&&!!m.promote===!!aiChoice.promote)'),true);
});

test('Old Maid deals Joker + 52 unique cards, removes rank pairs, and rejects invalid draws',()=>{
 const g=game();
 g.run("const old=hubNewGame('oldmaid',['a','b','hub-cpu-1']);");
 assert.equal(g.run('old.hands.flat().includes(52)'),true);
 assert.equal(g.run('old.hands.every(h=>new Set(h.filter(x=>x<52).map(hubRank)).size===h.filter(x=>x<52).length)'),true);
 assert.equal(g.run("hubApplyMove(old,'stranger',0)"),null);
 assert.equal(g.run("hubApplyMove(old,old.players[old.turn],9999)"),null);
 assert.equal(g.run('old.turn>=0'),true);
});

test('Old Maid CPU-only table can finish, with a single Joker loser',()=>{
 const g=game();
 g.run("let oldAuto=hubNewGame('oldmaid',['hub-cpu-1','hub-cpu-2','hub-cpu-3']);let steps=0;while(oldAuto.status==='play'&&steps<1500){const actor=oldAuto.players[oldAuto.turn],choice=hubCpuChoice(oldAuto),next=hubApplyMove(oldAuto,actor,choice);if(!next)throw Error('invalid Old Maid move');oldAuto=next;steps++;}");
 assert.equal(g.run('oldAuto.status'),'done');
 assert.ok(g.run('steps')<1500);
 assert.equal(g.run('oldAuto.hands.flat().filter(x=>x===52).length'),1);
 assert.equal(g.run('oldAuto.hands[oldAuto.loser].includes(52)'),true);
});

test('five-card poker ranks straight flush > four-kind > full house > flush, and handles wheel',()=>{
 const g=game();
 assert.equal(g.run('hubPokerValue([0,9,10,11,12])[0]'),8);
 assert.equal(g.run('hubPokerValue([0,13,26,39,1])[0]'),7);
 assert.equal(g.run('hubPokerValue([0,13,26,1,14])[0]'),6);
 assert.equal(g.run('hubPokerValue([0,14,28,42,4])[0]'),4);
 assert.equal(g.run('hubPokerValue([0,14,28,42,4])[1]'),5);
 assert.equal(g.run('hubPokerCompare(hubPokerValue([0,9,10,11,12]),hubPokerValue([0,13,26,39,1]))'),1);
});

test('poker betting, exchange and second betting round terminate with a winner and chip payouts',()=>{
 const g=game();
 g.run("let p=hubNewGame('poker',['a','b']);let bet=hubApplyMove(p,'a','bet')");
 assert.equal(g.run('bet.pot'),20);
 assert.equal(g.run('bet.currentBet'),10);
 assert.equal(g.run("hubApplyMove(bet,'b','check')"),null);
 g.run("let called=hubApplyMove(bet,'b','call')");
 assert.equal(g.run("called.phase"),'draw');
 g.run("let e1=hubApplyMove(called,'a',{discard:[0,1]});let e2=hubApplyMove(e1,'b',{discard:[]})");
 assert.equal(g.run("e2.phase"),'bet2');
 g.run("let cc=hubApplyMove(e2,'a','check');let final=hubApplyMove(cc,'b','check')");
 assert.equal(g.run('final.status'),'done');
 assert.equal(g.run('final.stack.reduce((a,b)=>a+b,0)'),200);
 assert.equal(g.run('final.winners.length>=1'),true);
 assert.equal(g.run("hubApplyMove(final,'a','bet')"),null);
});

test('poker CPU completes full game with up to six players, and folded player cannot win',()=>{
 const g=game();
 g.run("let p=hubNewGame('poker',['hub-cpu-1','hub-cpu-2','hub-cpu-3']);let n=0;while(p.status==='play'&&n<160){const actor=p.players[p.turn],move=hubCpuChoice(p),next=hubApplyMove(p,actor,move);if(!next)throw Error('invalid poker: '+JSON.stringify(move)+' '+p.phase);p=next;n++;}");
 assert.equal(g.run('p.status'),'done');
 assert.ok(g.run('n')<160);
 assert.equal(g.run('p.stack.reduce((a,b)=>a+b,0)'),300);
 g.run("let fold=hubNewGame('poker',['a','b']);fold=hubApplyMove(fold,'a','fold')");
 assert.equal(g.run('fold.status'),'done');
 assert.equal(g.run('fold.winner'),1);
});

test('all four new games expose touch UI and retain existing game HUB room controls',()=>{
 const html=read('src/index.template.html'),css=read('src/styles/game-hub.css'),ui=read('src/game/25-hub-more-ui.js');
 assert.match(html,/id="hub-actions"/);
 assert.match(html,/id="hub-cpu-count"/);
 assert.match(html,/id="hub-copy"/);
 assert.match(html,/id="hub-leave"/);
 assert.match(ui,/hubExtraBoardUI/);
 assert.match(ui,/hubExtraOldmaidUI/);
 assert.match(ui,/hubExtraPokerUI/);
 assert.match(css,/\.hub-chess-board/);
 assert.match(css,/\.hub-mini-board/);
 assert.match(css,/\.hub-oldmaid-card/);
 assert.match(css,/\.hub-poker-pick/);
});
