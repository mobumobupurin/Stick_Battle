// GAME HUB / CHESS — orthodox king-safety, castling, en passant, and promotions.
const HUB_BOARD_EXTRAS=['chess','mini-shogi'];
for(const id of HUB_BOARD_EXTRAS){const entry=HUB_CATALOG.find(g=>g.id===id);entry.ready=true;}
HUB_CATALOG.find(g=>g.id==='chess').description='王手・詰み・キャスリング・アンパッサンに対応。昇格はクイーンを初期選択。';
HUB_PLAYERS_MIN.chess=2;HUB_PLAYERS_MAX.chess=2;
const HUB_CHESS_VAL={P:1,N:3,B:3,R:5,Q:9,K:1000};
function hubChessNew(players){
 const board=Array(64).fill(0),back=['R','N','B','Q','K','B','N','R'];
 for(let c=0;c<8;c++){board[c]='b'+back[c];board[8+c]='bP';board[48+c]='wP';board[56+c]='w'+back[c];}
 return {kind:'chess',players:players.slice(),board,turn:0,status:'play',winner:-1,
   castle:'KQkq',ep:-1,half:0,moves:0,revision:0,created:Date.now()};
}
const hubChessSide=i=>i===0?'w':'b';
function hubChessAttacked(board,target,bySeat){
 const y=Math.floor(target/8),x=target%8,side=hubChessSide(bySeat);
 const pawnRow=y+(bySeat===0?1:-1);
 for(const dc of [-1,1])if(pawnRow>=0&&pawnRow<8&&x+dc>=0&&x+dc<8&&board[pawnRow*8+x+dc]===side+'P')return true;
 for(const [dr,dc] of [[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]]){
  const r=y+dr,c=x+dc;if(r>=0&&r<8&&c>=0&&c<8&&board[r*8+c]===side+'N')return true;
 }
 for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
  const diag=!!dr&&!!dc;let r=y+dr,c=x+dc,n=1;
  while(r>=0&&r<8&&c>=0&&c<8){
   const piece=board[r*8+c];
   if(piece){
    if(piece[0]===side&&(piece[1]==='Q'||n===1&&piece[1]==='K'||diag&&piece[1]==='B'||!diag&&piece[1]==='R'))return true;
    break;
   }
   r+=dr;c+=dc;n++;
  }
 }
 return false;
}
function hubChessCheck(board,seat){
 const king=board.indexOf(hubChessSide(seat)+'K');
 return king<0||hubChessAttacked(board,king,1-seat);
}
function hubChessCandidates(state,seat){
 const board=state.board,side=hubChessSide(seat),other=hubChessSide(1-seat);
 const list=[],push=(from,to,promotion='Q')=>{
  const dest=board[to];if(dest&&dest[0]===side||dest===other+'K')return;
  list.push({from,to,promotion});
 };
 for(let from=0;from<64;from++){
  const piece=board[from];if(typeof piece!=='string'||piece[0]!==side)continue;
  const type=piece[1],y=Math.floor(from/8),x=from%8;
  if(type==='P'){
   const dir=seat===0?-1:1,next=y+dir,promo=seat===0?0:7;
   if(next>=0&&next<8){
    const target=next*8+x;
    if(!board[target]){
     push(from,target);
     const start=seat===0?6:1,twice=y+dir*2;
     if(y===start&&!board[twice*8+x])push(from,twice*8+x);
    }
    for(const dc of [-1,1])if(x+dc>=0&&x+dc<8){
     const to=next*8+x+dc;
     if(board[to]&&board[to][0]===other||to===state.ep&&
       board[y*8+x+dc]===other+'P')push(from,to);
    }
   }
   continue;
  }
  if(type==='N'){
   for(const [dr,dc] of [[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]]){
    const r=y+dr,c=x+dc;if(r>=0&&r<8&&c>=0&&c<8)push(from,r*8+c);
   }
   continue;
  }
  const directions=type==='B'?[[1,1],[1,-1],[-1,1],[-1,-1]]:
    type==='R'?[[1,0],[-1,0],[0,1],[0,-1]]:
    [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  for(const [dr,dc] of directions){
   const max=type==='K'?1:8;
   for(let step=1;step<=max;step++){
    const r=y+dr*step,c=x+dc*step;
    if(r<0||r>7||c<0||c>7)break;
    const to=r*8+c;
    if(board[to]){
      if(board[to][0]!==side)push(from,to);
      break;
    }
    push(from,to);
   }
  }
  if(type==='K'&&from===(seat===0?60:4)&&!hubChessCheck(board,seat)){
   const rights=state.castle||'',k=seat===0?'K':'k',q=seat===0?'Q':'q';
   if(rights.includes(k)&&board[from+1]===0&&board[from+2]===0&&board[from+3]===side+'R'&&
     !hubChessAttacked(board,from+1,1-seat)&&!hubChessAttacked(board,from+2,1-seat))push(from,from+2);
   if(rights.includes(q)&&board[from-1]===0&&board[from-2]===0&&board[from-3]===0&&board[from-4]===side+'R'&&
     !hubChessAttacked(board,from-1,1-seat)&&!hubChessAttacked(board,from-2,1-seat))push(from,from-2);
  }
 }
 return list;
}
function hubChessMoveRaw(state,move){
 const from=move.from,to=move.to,board=state.board.slice(),piece=board[from],dest=board[to],seat=piece[0]==='w'?0:1;
 const next={...state,board,players:state.players.slice(),castle:state.castle||'',ep:-1};
 if(piece[1]==='K'){
  next.castle=next.castle.replace(seat===0?/[KQ]/g:/[kq]/g,'');
  if(Math.abs(to-from)===2){
   const rookFrom=to>from?from+3:from-4,rookTo=to>from?from+1:from-1;
   board[rookTo]=board[rookFrom];board[rookFrom]=0;
  }
 }
 if(piece[1]==='R'){
  if(from===63)next.castle=next.castle.replace('K','');
  if(from===56)next.castle=next.castle.replace('Q','');
  if(from===7)next.castle=next.castle.replace('k','');
  if(from===0)next.castle=next.castle.replace('q','');
 }
 if(dest&&dest[1]==='R'){
  if(to===63)next.castle=next.castle.replace('K','');
  if(to===56)next.castle=next.castle.replace('Q','');
  if(to===7)next.castle=next.castle.replace('k','');
  if(to===0)next.castle=next.castle.replace('q','');
 }
 if(piece[1]==='P'){
  if(to===state.ep&&!dest&&to%8!==from%8)board[Math.floor(from/8)*8+to%8]=0;
  if(Math.abs(to-from)===16)next.ep=(to+from)/2;
  if(Math.floor(to/8)===(seat===0?0:7))board[to]=piece[0]+(move.promotion||'Q');
  else board[to]=piece;
 }else board[to]=piece;
 board[from]=0;
 next.half=(piece[1]==='P'||dest?0:(state.half||0)+1);
 return next;
}
function hubChessLegalMoves(state,seat=state.turn){
 if(!state||!Array.isArray(state.board)||state.board.length!==64)return [];
 return hubChessCandidates(state,seat).filter(m=>!hubChessCheck(hubChessMoveRaw(state,m).board,seat));
}
function hubChessPlay(state,actor,choice){
 if(!state||state.status!=='play'||state.players[state.turn]!==actor||!choice||
  !Number.isInteger(choice.from)||!Number.isInteger(choice.to))return null;
 const legal=hubChessLegalMoves(state);
 const chosen=legal.find(m=>m.from===choice.from&&m.to===choice.to);
 if(!chosen)return null;
 const promotion=['Q','R','B','N'].includes(choice.promotion)?choice.promotion:'Q';
 const next=hubChessMoveRaw(state,{...chosen,promotion});
 next.turn=1-state.turn;next.revision=(state.revision||0)+1;next.moves=(state.moves||0)+1;
 if(!hubChessLegalMoves(next).length){
  next.status='done';next.winner=hubChessCheck(next.board,next.turn)?state.turn:-1;next.turn=-1;
 }else if(next.half>=100||next.moves>=300){
  next.status='done';next.winner=-1;next.turn=-1;
 }
 return next;
}
function hubChessBot(state){
 const legal=hubChessLegalMoves(state);
 if(!legal.length)return null;
 let best=null,score=-Infinity;
 for(const m of legal){
  const captured=state.board[m.to],after=hubChessMoveRaw(state,m);
  const row=Math.floor(m.to/8),col=m.to%8;
  let value=(captured?HUB_CHESS_VAL[captured[1]]*10:0)+(hubChessCheck(after.board,1-state.turn)?5:0)
    +(3.5-Math.abs(row-3.5))+(3.5-Math.abs(col-3.5))+Math.random()*5;
  if(state.board[m.from][1]==='P'&&Math.floor(m.to/8)===(state.turn===0?0:7))value+=85;
  if(value>score){score=value;best=m;}
 }
 return best?{from:best.from,to:best.to,promotion:'Q'}:null;
}
const hubChessEarlierNew=hubNewGame,hubChessEarlierMove=hubApplyMove,hubChessEarlierCpu=hubCpuChoice;
hubNewGame=function(kind,players){
 if(kind==='chess'&&players.length===2&&new Set(players).size===2)return hubChessNew(players);
 return hubChessEarlierNew(kind,players);
};
hubApplyMove=function(state,actor,choice){
 if(state?.kind==='chess')return hubChessPlay(state,actor,choice);
 return hubChessEarlierMove(state,actor,choice);
};
hubCpuChoice=function(state){
 if(state?.kind==='chess'&&hubIsCpu(state.players?.[state.turn]))return hubChessBot(state);
 return hubChessEarlierCpu(state);
};
