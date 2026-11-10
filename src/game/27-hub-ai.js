// GAME HUB / MID-LEVEL CPU: positional play, tactical threats and informed card decisions.
// CPU picks from legal actions only; card opponents' hidden values are not used.
const HUB_REV_WEIGHTS=[
  110,-26,20,5,5,20,-26,110,
  -26,-45,-5,-5,-5,-5,-45,-26,
  20,-5,13,3,3,13,-5,20,
  5,-5,3,2,2,3,-5,5,
  5,-5,3,2,2,3,-5,5,
  20,-5,13,3,3,13,-5,20,
  -26,-45,-5,-5,-5,-5,-45,-26,
  110,-26,20,5,5,20,-26,110
];
function hubRevPosition(board,color){
  let material=0,position=0,occupied=0;
  for(let i=0;i<64;i++){
    const piece=Number(board[i]);
    if(!piece)continue;
    occupied++;
    const sign=piece===color?1:-1;
    material+=sign;
    position+=sign*HUB_REV_WEIGHTS[i];
  }
  const mobility=hubReversiMoves(board,color).length-hubReversiMoves(board,3-color).length;
  const phase=occupied<40?.7:occupied<52?.55:.35;
  return position*phase+mobility*5+material*(occupied>48?4:1);
}
function hubRevSmart(state){
  const color=state.turn+1,moves=hubReversiMoves(state.board,color);
  if(!moves.length)return null;
  let best=moves[0],score=-Infinity;
  for(const m of moves){
    const next=hubApplyMove(state,state.players[state.turn],m);
    if(!next)continue;
    let value=hubRevPosition(next.board,color);
    if(next.status==='done'){
      value+=next.winner===state.turn?100000:next.winner<0?0:-100000;
    }else if(next.turn!==state.turn){
      // Penalize giving the opponent a strong reply; keep the CPU beatable.
      const replies=hubReversiMoves(next.board,3-color);
      let worst=Infinity;
      for(const reply of replies){
        const after=hubApplyMove(next,next.players[next.turn],reply);
        if(after)worst=Math.min(worst,hubRevPosition(after.board,color));
      }
      if(worst!==Infinity)value=value*.5+worst*.5;
    }
    value+=Math.random()*2.2;
    if(value>score){score=value;best=m;}
  }
  return best;
}
function hubConnectThreats(board,color){
  const threats=[];
  for(let c=0;c<7;c++){
    if(board[c])continue;
    const copy=board.slice();let row=-1;
    for(let r=5;r>=0;r--)if(!copy[r*7+c]){row=r;break;}
    if(row<0)continue;
    copy[row*7+c]=color;
    if(hubConnectWinner(copy,row,c,color))threats.push(c);
  }
  return threats;
}
function hubConnectSmart(state){
  const board=state.board,available=Array.from({length:7},(_,c)=>c).filter(c=>!board[c]);
  const color=state.turn+1,other=3-color;
  if(!available.length)return null;
  const canWin=hubConnectThreats(board,color),mustBlock=hubConnectThreats(board,other);
  if(canWin.length)return canWin[Math.floor(Math.random()*canWin.length)];
  let best=available[0],score=-Infinity;
  for(const c of available){
    const next=hubApplyMove(state,state.players[state.turn],c);
    if(!next)continue;
    const opponentImmediate=hubConnectThreats(next.board,other);
    const selfFuture=hubConnectThreats(next.board,color);
    let value=11-Math.abs(c-3)*3+Math.random()*3;
    if(mustBlock.includes(c))value+=170;
    if(opponentImmediate.length)value-=1500;
    if(selfFuture.length>=2)value+=230;
    else if(selfFuture.length)value+=27;
    // Prevent creating a losing fork: inspect each safe opponent reply.
    if(next.status==='play'){
      let danger=0;
      for(let op=0;op<7;op++){
        if(next.board[op])continue;
        const response=hubApplyMove(next,next.players[next.turn],op);
        if(!response)continue;
        if(response.status==='done'&&response.winner===1-state.turn)danger=Math.max(danger,1000);
        else if(hubConnectThreats(response.board,other).length>=2&&
          !hubConnectThreats(response.board,color).length)danger=Math.max(danger,60);
      }
      value-=danger;
    }
    if(value>score){score=value;best=c;}
  }
  return best;
}
function hubSevenSmart(state){
  const seat=state.turn,hand=state.hands[seat]||[];
  const moves=hubSevenChoices(state,seat),passes=Number(state.passes?.[seat]||0);
  if(!moves.length)return 'pass';
  let best=moves[0],score=-Infinity;
  for(const card of moves){
    const rank=hubRank(card),suit=hubSuit(card),base=suit*13;
    const next=rank===7?0:rank<7?card-1:card+1;
    const unlock=next>=base&&next<base+13&&hand.includes(next);
    const ownShape=hand.filter(c=>hubSuit(c)===suit).length;
    const importance=unlock?15:0;
    // Prefer opening a chain for ourselves; avoid handing away blockers too soon.
    let value=importance+Math.max(0,7-Math.abs(7-rank))*1.5+ownShape*.65;
    if(rank===1||rank===13)value+=2;
    if(hand.length<=3)value+=12;
    value+=Math.random()*3;
    if(value>score){score=value;best=card;}
  }
  // Save a blocking card occasionally only while several passes remain.
  if(passes===0&&hand.length>4&&moves.length===1&&score<9&&Math.random()<.13)return 'pass';
  return best;
}
function hubBJSmart(state){
  const cards=state.hands[state.turn],total=hubBJTotal(cards),up=hubRank(state.dealer[0]);
  const dealer=up===1?11:Math.min(up,10);
  const hasAce=cards.some(c=>hubRank(c)===1);
  const raw=cards.reduce((n,c)=>n+Math.min(10,hubRank(c)),0);
  const soft=hasAce&&total===raw+10;
  if(soft){
    if(total>=19)return 'stand';
    if(total===18)return dealer>=9?'hit':'stand';
    return 'hit';
  }
  if(total>=17)return 'stand';
  if(total>=13&&dealer<=6)return 'stand';
  if(total===12&&dealer>=4&&dealer<=6)return 'stand';
  return 'hit';
}
function hubChessSmart(state){
  const moves=hubChessLegalMoves(state),seat=state.turn;
  if(!moves.length)return null;
  let best=moves[0],score=-Infinity;
  for(const m of moves){
    const piece=state.board[m.from],other=state.board[m.to],after=hubChessMoveRaw(state,m);
    const val=HUB_CHESS_VAL[piece[1]]||1;
    const targetRisk=hubChessAttacked(after.board,m.to,1-seat);
    const targetDefended=hubChessAttacked(after.board,m.to,seat);
    const oldRisk=hubChessAttacked(state.board,m.from,1-seat);
    const center=3.5-Math.abs(m.to%8-3.5)+3.5-Math.abs(Math.floor(m.to/8)-3.5);
    let value=other?(HUB_CHESS_VAL[other[1]]||0)*13:0;
    value+=center*.75+(oldRisk&&!targetRisk?val*1.3:0);
    if(targetRisk)value-=val*(targetDefended?6.7:10.5);
    if(hubChessCheck(after.board,1-seat))value+=6;
    if(piece[1]==='P')value+=seat===0?(6-Math.floor(m.to/8))*.6:(Math.floor(m.to/8)-1)*.6;
    if(piece[1]==='P'&&Math.floor(m.to/8)===(seat===0?0:7))value+=85;
    if(piece[1]==='K'&&Math.abs(m.to-m.from)===2)value+=5;
    value+=Math.random()*4.5;
    if(value>score){score=value;best=m;}
  }
  return {from:best.from,to:best.to,promotion:'Q'};
}
function hubMiniSmart(state){
  const moves=hubMiniLegalMoves(state),seat=state.turn;
  if(!moves.length)return null;
  let best=moves[0],score=-Infinity;
  for(const m of moves){
    const piece=m.drop?null:state.board[m.from],captured=state.board[m.to],after=hubMiniRaw(state,m);
    if(!after)continue;
    const val=m.drop?(HUB_MINI_VAL[m.drop]||1):(HUB_MINI_VAL[hubMiniType(piece)]||1);
    const attacked=hubMiniAttacked(after.board,m.to,1-seat);
    const ownCover=hubMiniAttacked(after.board,m.to,seat);
    let value=(captured?(HUB_MINI_VAL[hubMiniType(captured)]||1)*12:0)+
      (m.promote?11:0)+(m.drop?2:0)+(2-Math.abs(m.to%5-2));
    if(attacked)value-=val*(ownCover?5:9);
    if(hubMiniCheck(after.board,1-seat))value+=6;
    value+=Math.random()*5;
    if(value>score){score=value;best=m;}
  }
  return best;
}
const hubMidCpuEarlier=hubCpuChoice;
hubCpuChoice=function(state){
  if(!state||state.status!=='play'||!hubIsCpu(state.players?.[state.turn]))return null;
  if(state.kind==='reversi')return hubRevSmart(state);
  if(state.kind==='connect4')return hubConnectSmart(state);
  if(state.kind==='shichinarabe')return hubSevenSmart(state);
  if(state.kind==='blackjack')return hubBJSmart(state);
  if(state.kind==='chess')return hubChessSmart(state);
  if(state.kind==='mini-shogi')return hubMiniSmart(state);
  if(state.kind==='baccarat')return Math.random()<.55?'banker':'player';
  return hubMidCpuEarlier(state);
};
