// GAME HUB / CPU DIFFICULTY: 0 easy, 1 normal, 2 hard.
// All CPU choices pass through the existing legal-move rules and share the
// per-round setting saved in Firebase; no knowledge of human hidden hands.
const HUB_CPU_LEVEL_NAMES=['弱い','ふつう','強い'];
function hubCpuLevel(state){
 const level=Number(state?.cpuLevel);
 return Number.isInteger(level)&&level>=0&&level<=2?level:1;
}
function hubCpuEasy(state){
 if(!state||state.status!=='play'||!hubIsCpu(state.players?.[state.turn]))return null;
 const pick=xs=>xs.length?xs[Math.floor(Math.random()*xs.length)]:null;
 if(state.kind==='reversi')return pick(hubReversiMoves(state.board,state.turn+1));
 if(state.kind==='connect4')return pick(Array.from({length:7},(_,c)=>c).filter(c=>!state.board[c]));
 if(state.kind==='chess'){
   const m=pick(hubChessLegalMoves(state));return m?{from:m.from,to:m.to,promotion:'Q'}:null;
 }
 if(state.kind==='mini-shogi')return pick(hubMiniLegalMoves(state));
 if(state.kind==='shichinarabe')return pick(hubSevenChoices(state,state.turn))??'pass';
 if(state.kind==='blackjack')return hubBJTotal(state.hands[state.turn])<15?'hit':'stand';
 if(state.kind==='baccarat')return pick(['player','banker','tie']);
 if(state.kind==='poker'){
   const seat=state.turn;
   if(state.phase==='draw')return {discard:hubPokerCpuDiscard(state.hands[seat]).slice(0,3)};
   const owe=state.currentBet-state.bets[seat];
   if(owe>0)return owe>10&&Math.random()<.5?'fold':'call';
   return 'check';
 }
 // Old Maid is an imperfect-information game; every card back is equivalent.
 return hubDifficultyOriginal(state);
}
function hubConnectEvaluate(board,color){
 const opponent=3-color;
 const win=hubConnectThreats(board,color),lose=hubConnectThreats(board,opponent);
 let score=win.length*47-lose.length*52;
 for(let r=0;r<6;r++)for(let c=0;c<7;c++){
   const v=Number(board[r*7+c]);
   if(v)score+=(v===color?1:-1)*(4-Math.abs(c-3))*1.8;
 }
 // Windows of length four help the CPU build threats before a 3-in-a-row.
 const dirs=[[1,0],[0,1],[1,1],[1,-1]];
 for(let r=0;r<6;r++)for(let c=0;c<7;c++)for(const [dr,dc] of dirs){
   const er=r+dr*3,ec=c+dc*3;
   if(er<0||er>=6||ec<0||ec>=7)continue;
   let a=0,b=0;
   for(let n=0;n<4;n++){
     const v=Number(board[(r+dr*n)*7+c+dc*n]);
     if(v===color)a++;else if(v===opponent)b++;
   }
   if(a&&!b)score+=[0,1,4,18,500][a];
   if(b&&!a)score-=[0,1,4,18,500][b];
 }
 return score;
}
function hubConnectHard(state){
 const side=state.turn;
 function explore(position,depth,alpha,beta){
   if(position.status==='done'){
     if(position.winner<0)return 0;
     return position.winner===side?120000+depth:-120000-depth;
   }
   if(depth===0)return hubConnectEvaluate(position.board,side+1);
   const maximizing=position.turn===side;
   let best=maximizing?-Infinity:Infinity;
   const columns=[3,2,4,1,5,0,6].filter(c=>!position.board[c]);
   for(const c of columns){
     const after=hubApplyMove(position,position.players[position.turn],c);
     if(!after)continue;
     const score=explore(after,depth-1,alpha,beta);
     best=maximizing?Math.max(best,score):Math.min(best,score);
     if(maximizing)alpha=Math.max(alpha,best);else beta=Math.min(beta,best);
     if(alpha>=beta)break;
   }
   return Number.isFinite(best)?best:hubConnectEvaluate(position.board,side+1);
 }
 const moves=[3,2,4,1,5,0,6].filter(c=>!state.board[c]);
 if(!moves.length)return null;
 const winning=hubConnectThreats(state.board,side+1);
 if(winning.length)return winning[0];
 let best=moves[0],value=-Infinity;
 for(const c of moves){
   const next=hubApplyMove(state,state.players[state.turn],c);
   if(!next)continue;
   const score=explore(next,4,-Infinity,Infinity)+Math.random()*.01;
   if(score>value){value=score;best=c;}
 }
 return best;
}
function hubChessEval(state,seat){
 let value=0;
 for(let i=0;i<64;i++){
   const piece=state.board[i];if(!piece)continue;
   const sign=piece[0]===(seat===0?'w':'b')?1:-1;
   const type=piece[1],weight=HUB_CHESS_VAL[type]||0;
   value+=sign*weight*100;
   if(type!=='K')value+=sign*(3.5-Math.abs(i%8-3.5)+3.5-Math.abs(Math.floor(i/8)-3.5));
 }
 if(hubChessCheck(state.board,seat))value-=45;
 if(hubChessCheck(state.board,1-seat))value+=32;
 return value;
}
function hubChessHard(state){
 const seat=state.turn,legal=hubChessLegalMoves(state);
 if(!legal.length)return null;
 let best=legal[0],value=-Infinity;
 for(const move of legal){
   const after=hubChessMoveRaw(state,move);
   const next={...after,turn:1-seat},replies=hubChessLegalMoves(next);
   let score;
   if(!replies.length){
     score=hubChessCheck(next.board,1-seat)?100000:0;
   }else{
     let worst=Infinity;
     for(const reply of replies){
       const response=hubChessMoveRaw(next,reply);
       worst=Math.min(worst,hubChessEval(response,seat));
     }
     score=worst;
   }
   score+=Math.random()*2;
   if(score>value){value=score;best=move;}
 }
 return {from:best.from,to:best.to,promotion:'Q'};
}
function hubMiniEval(state,seat){
 const pieces=hubMiniBoard(state),hands=hubMiniHands(state),own=hubMiniColor(seat);
 let score=0;
 for(const piece of pieces){
   if(!piece)continue;
   const val=HUB_MINI_VAL[hubMiniType(piece)]||0;
   score+=(piece[0]===own?1:-1)*val*10;
 }
 for(let i=0;i<2;i++)for(const [type,num] of Object.entries(hands[i]))
   score+=(i===seat?1:-1)*(HUB_MINI_VAL[type]||1)*Number(num)*9;
 if(hubMiniCheck(pieces,seat))score-=17;
 if(hubMiniCheck(pieces,1-seat))score+=13;
 return score;
}
function hubMiniHard(state){
 const seat=state.turn,legal=hubMiniLegalMoves(state);if(!legal.length)return null;
 let best=legal[0],value=-Infinity;
 for(const move of legal){
   const after=hubMiniRaw(state,move);
   if(!after)continue;
   const next={...after,turn:1-seat};
   const replies=hubMiniLegalMoves(next);
   let score;
   if(!replies.length)score=hubMiniCheck(next.board,1-seat)?100000:0;
   else{
     // Capping replies avoids long pauses on mobile with many drop choices.
     const ranked=replies.map(reply=>({
       reply,priority:next.board[reply.to]?(HUB_MINI_VAL[hubMiniType(next.board[reply.to])]||1):0
     })).sort((a,b)=>b.priority-a.priority).slice(0,24);
     let worst=Infinity;
     for(const {reply} of ranked){
       const response=hubMiniRaw(next,reply);
       if(response)worst=Math.min(worst,hubMiniEval(response,seat));
     }
     score=worst;
   }
   score+=Math.random()*1.5;
   if(score>value){value=score;best=move;}
 }
 return best;
}
function hubReversiHard(state){
 const seat=state.turn,color=seat+1,choices=hubReversiMoves(state.board,color);
 if(!choices.length)return null;
 let best=choices[0],value=-Infinity;
 for(const choice of choices){
   const next=hubApplyMove(state,state.players[seat],choice);
   if(!next)continue;
   let score=hubRevPosition(next.board,color);
   if(next.status==='done'){
     score=next.winner===seat?100000:next.winner<0?0:-100000;
   }else if(next.turn!==seat){
     const enemyMoves=hubReversiMoves(next.board,3-color);
     let worst=Infinity;
     for(const enemyMove of enemyMoves){
       const answer=hubApplyMove(next,next.players[next.turn],enemyMove);
       if(!answer)continue;
       let bestContinuation=hubRevPosition(answer.board,color);
       if(answer.status==='play'&&answer.turn===seat){
         const follow=hubReversiMoves(answer.board,color);
         for(const followMove of follow){
           const continuation=hubApplyMove(answer,answer.players[answer.turn],followMove);
           if(continuation)bestContinuation=Math.max(bestContinuation,hubRevPosition(continuation.board,color));
         }
       }
       worst=Math.min(worst,bestContinuation);
     }
     if(worst!==Infinity)score=score*.25+worst*.75;
   }
   score+=Math.random()*1.3;
   if(score>value){value=score;best=choice;}
 }
 return best;
}
const hubDifficultyOriginal=hubCpuChoice;
hubCpuChoice=function(state){
 if(!state||state.status!=='play'||!hubIsCpu(state.players?.[state.turn]))return null;
 const level=hubCpuLevel(state);
 if(level===0)return hubCpuEasy(state);
 if(level===1)return hubDifficultyOriginal(state);
 if(state.kind==='connect4')return hubConnectHard(state);
 if(state.kind==='chess')return hubChessHard(state);
 if(state.kind==='mini-shogi')return hubMiniHard(state);
 if(state.kind==='reversi')return hubReversiHard(state);
 if(state.kind==='shichinarabe')return hubSevenSmart(state);
 if(state.kind==='blackjack')return hubBJSmart(state);
 if(state.kind==='baccarat')return 'banker';
 return hubDifficultyOriginal(state);
};
