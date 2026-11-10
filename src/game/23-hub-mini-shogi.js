// GAME HUB / 5五将棋 — check/checkmate, promotions, captures, drops, nifu and pawn-drop mate.
HUB_CATALOG.find(g=>g.id==='mini-shogi').ready=true;
HUB_CATALOG.find(g=>g.id==='mini-shogi').description='5×5の将棋。王手・詰み・成り・持ち駒・二歩・打ち歩詰めに対応。';
HUB_PLAYERS_MIN['mini-shogi']=2;HUB_PLAYERS_MAX['mini-shogi']=2;
const HUB_MINI_VAL={K:1000,G:6,S:5,B:8,R:9,P:2,'+S':6,'+B':11,'+R':12,'+P':6};
const hubMiniColor=seat=>seat===0?'s':'g';
const hubMiniType=p=>typeof p==='string'?p.slice(1):'';
const hubMiniOwner=p=>typeof p==='string'?p[0]:'';
function hubMiniNew(players){
 const board=Array(25).fill(0),upper=['R','B','S','G','K'],lower=['K','G','S','B','R'];
 for(let i=0;i<5;i++){board[i]='g'+upper[i];board[20+i]='s'+lower[i];}
 board[9]='gP';board[15]='sP';
 return {kind:'mini-shogi',players:players.slice(),board,hand:[{},{}],turn:0,
  status:'play',winner:-1,moves:0,revision:0,created:Date.now(),history:[]};
}
function hubMiniPseudo(state,seat){
 const board=state.board,own=hubMiniColor(seat),enemy=hubMiniColor(1-seat),forward=seat===0?-1:1;
 const out=[],push=(from,to,promote=false,drop=null)=>{out.push(drop?{drop,to}:{from,to,promote});};
 const dirsGold=[[forward,0],[forward,1],[forward,-1],[0,1],[0,-1],[-forward,0]];
 const dirsSilver=[[forward,0],[forward,1],[forward,-1],[-forward,1],[-forward,-1]];
 const directionsKing=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
 const orth=[[1,0],[-1,0],[0,1],[0,-1]],diag=[[1,1],[1,-1],[-1,1],[-1,-1]];
 for(let from=0;from<25;from++){
  const piece=board[from];
  if(!piece||piece[0]!==own)continue;
  const type=hubMiniType(piece),r=Math.floor(from/5),c=from%5;
  const steps=type==='K'?directionsKing:type==='G'||type==='+S'||type==='+P'?dirsGold:
    type==='S'?dirsSilver:type==='P'?[[forward,0]]:type==='R'?orth:type==='B'?diag:
    type==='+R'?directionsKing:type==='+B'?directionsKing:[];
  const sliding=type==='R'||type==='B'||type==='+R'||type==='+B';
  for(const [dr,dc] of steps){
   const canSlide=sliding&&(type==='R'||type==='+R'?!!(dr===0||dc===0):!!dr&&!!dc);
   for(let len=1;len<=(canSlide?5:1);len++){
    const y=r+dr*len,x=c+dc*len;
    if(y<0||y>4||x<0||x>4)break;
    const to=y*5+x,other=board[to];
    if(other&&other[0]===own||other===enemy+'K')break;
    const canPromote=['S','P','R','B'].includes(type)&&
      (r===(seat===0?0:4)||y===(seat===0?0:4));
    if(canPromote){
      if(type!=='P'||y!==(seat===0?0:4))push(from,to,false);
      push(from,to,true);
    }else push(from,to,false);
    if(other)break;
   }
  }
 }
 const holdings=state.hand?.[seat]||{};
 for(const type of ['P','S','G','B','R'])if(Number(holdings[type])>0){
  for(let to=0;to<25;to++){
   if(board[to])continue;
   const row=Math.floor(to/5),col=to%5,far=seat===0?0:4;
   if(type==='P'){
    if(row===far)continue;
    let nifu=false;
    for(let r=0;r<5;r++)if(board[r*5+col]===own+'P')nifu=true;
    if(nifu)continue;
   }
   push(-1,to,false,type);
  }
 }
 return out;
}
function hubMiniRaw(state,move){
 const next={...state,board:state.board.slice(),players:state.players.slice(),
  hand:(state.hand||[{},{}]).map(x=>({...x}))};
 const seat=state.turn,own=hubMiniColor(seat),board=next.board;
 if(move.drop){
  if(Number(next.hand[seat][move.drop])<=0||board[move.to])return null;
  next.hand[seat][move.drop]--;
  board[move.to]=own+move.drop;
 }else{
  const piece=board[move.from],captured=board[move.to];
  if(!piece||piece[0]!==own)return null;
  if(captured){
   const type=hubMiniType(captured).replace('+','');
   if(type==='K')return null;
   next.hand[seat][type]=(next.hand[seat][type]||0)+1;
  }
  board[move.to]=own+(move.promote?'+'+hubMiniType(piece):hubMiniType(piece));
  board[move.from]=0;
 }
 return next;
}
function hubMiniAttacked(board,target,bySeat){
 const other=hubMiniColor(bySeat),own=hubMiniColor(1-bySeat);
 const test={board,hand:[{},{}],turn:bySeat};
 // Only board-piece moves count as attacks; fake the king on the attacked square.
 const copy=board.slice();copy[target]=own+'G';
 return hubMiniPseudo({...test,board:copy},bySeat).some(m=>m.drop===undefined&&m.to===target&&copy[m.from]?.[0]===other);
}
function hubMiniCheck(board,seat){
 const king=board.indexOf(hubMiniColor(seat)+'K');
 return king<0||hubMiniAttacked(board,king,1-seat);
}
function hubMiniLegalMoves(state,seat=state.turn,pawnMate=true){
 if(!state||!Array.isArray(state.board)||state.board.length!==25)return [];
 const temp={...state,turn:seat};
 const legal=[];
 for(const move of hubMiniPseudo(temp,seat)){
  const after=hubMiniRaw(temp,move);
  if(!after||hubMiniCheck(after.board,seat))continue;
  if(pawnMate&&move.drop==='P'&&hubMiniCheck(after.board,1-seat)){
   after.turn=1-seat;
   if(!hubMiniLegalMoves(after,1-seat,false).length)continue;
  }
  legal.push(move);
 }
 return legal;
}
function hubMiniSignature(state){
 return state.board.join(',')+'|'+JSON.stringify(state.hand)+'|'+state.turn;
}
function hubMiniPlay(state,actor,choice){
 if(!state||state.status!=='play'||state.players[state.turn]!==actor||!choice||!Number.isInteger(choice.to))return null;
 const legal=hubMiniLegalMoves(state);
 const selected=legal.find(m=>m.to===choice.to&&(m.drop?m.drop===choice.drop:m.from===choice.from&&!!m.promote===!!choice.promote));
 if(!selected)return null;
 const next=hubMiniRaw(state,selected);
 if(!next)return null;
 next.turn=1-state.turn;next.revision=(state.revision||0)+1;next.moves=(state.moves||0)+1;
 next.history=Array.isArray(state.history)?state.history.slice(-100):[];
 const key=hubMiniSignature(next);
 next.history.push(key);
 if(!hubMiniLegalMoves(next).length){
  next.status='done';next.winner=hubMiniCheck(next.board,next.turn)?state.turn:-1;next.turn=-1;
 }else if(next.history.filter(x=>x===key).length>=4||next.moves>=250){
  next.status='done';next.winner=-1;next.turn=-1;
 }
 return next;
}
function hubMiniBot(state){
 const legal=hubMiniLegalMoves(state);if(!legal.length)return null;
 let best=null,score=-Infinity;
 for(const m of legal){
  const target=state.board[m.to];
  let value=(target?(HUB_MINI_VAL[hubMiniType(target)]||1)*10:0)+
    (m.promote?10:0)+(m.drop?4:0)+(2-Math.abs(2-Math.floor(m.to/5)))+Math.random()*6;
  const after=hubMiniRaw(state,m);
  if(after&&hubMiniCheck(after.board,1-state.turn))value+=8;
  if(value>score){score=value;best=m;}
 }
 return best;
}
const hubMiniEarlierNew=hubNewGame,hubMiniEarlierMove=hubApplyMove,hubMiniEarlierCpu=hubCpuChoice;
hubNewGame=function(kind,players){
 if(kind==='mini-shogi'&&players.length===2&&new Set(players).size===2)return hubMiniNew(players);
 return hubMiniEarlierNew(kind,players);
};
hubApplyMove=function(state,actor,choice){
 if(state?.kind==='mini-shogi')return hubMiniPlay(state,actor,choice);
 return hubMiniEarlierMove(state,actor,choice);
};
hubCpuChoice=function(state){
 if(state?.kind==='mini-shogi'&&hubIsCpu(state.players?.[state.turn]))return hubMiniBot(state);
 return hubMiniEarlierCpu(state);
};
