// GAME HUB EXPANSION — pure state transitions for CPU and card/table games.
// All scoring is for entertainment only: no cash, deposits, or real-money stakes.
const HUB_CPU_PREFIX='hub-cpu-';
const hubIsCpu=id=>typeof id==='string'&&/^hub-cpu-[1-8]$/.test(id);
const HUB_NEW_GAMES=['shichinarabe','blackjack','baccarat'];
const HUB_PLAYERS_MIN={stickbattle:2,reversi:2,connect4:2,shichinarabe:3,blackjack:2,baccarat:2};
const HUB_PLAYERS_MAX={stickbattle:8,reversi:2,connect4:2,shichinarabe:8,blackjack:8,baccarat:8};
for(const game of HUB_CATALOG)if(HUB_NEW_GAMES.includes(game.id)){
  game.ready=true;
  if(game.id==='shichinarabe')game.description='7を中心に同じマークのカードを左右へ並べよう。出せないときはパス。';
  if(game.id==='blackjack')game.description='21を超えずにディーラーに勝とう。ヒット／スタンドの本格ルール。';
  if(game.id==='baccarat')game.description='PLAYER／BANKER／TIEを予想。3枚目ルールで勝敗を自動判定。';
}
const hubShuffle=()=>{const d=Array.from({length:52},(_,i)=>i);for(let i=d.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]];}return d;};
const hubRank=c=>c%13+1;
const hubSuit=c=>Math.floor(c/13);
const hubCardPoint=c=>Math.min(10,hubRank(c));
function hubBJTotal(hand){
  let sum=0,aces=0;
  for(const c of hand){const rank=hubRank(c);if(rank===1){sum+=11;aces++;}else sum+=Math.min(rank,10);}
  while(sum>21&&aces){sum-=10;aces--;}
  return sum;
}
function hubBJNatural(hand){return hand.length===2&&hubBJTotal(hand)===21;}
function hubBaccaratTotal(hand){return hand.reduce((t,c)=>t+hubCardPoint(c),0)%10;}
function hubBaccaratOutcome(deck){
  const d=deck.slice();
  const player=[d.pop(),d.pop()],banker=[d.pop(),d.pop()];
  let pt=hubBaccaratTotal(player),bt=hubBaccaratTotal(banker),third=-1;
  if(pt<8&&bt<8){
    if(pt<=5){third=d.pop();player.push(third);}
    const tr=third<0?-1:hubCardPoint(third)%10;
    const bankDraw=tr<0?bt<=5:
      bt<=2?true:
      bt===3?tr!==8:
      bt===4?tr>=2&&tr<=7:
      bt===5?tr>=4&&tr<=7:
      bt===6?tr===6||tr===7:false;
    if(bankDraw)banker.push(d.pop());
    pt=hubBaccaratTotal(player);bt=hubBaccaratTotal(banker);
  }
  return {player,banker,playerTotal:pt,bankerTotal:bt,winner:pt===bt?'tie':pt>bt?'player':'banker'};
}
function hubSevenLegal(state,index){
  if(!Number.isInteger(index)||index<0||index>=52||state.placed?.[index])return false;
  const base=hubSuit(index)*13,rank=hubRank(index);
  return rank>1&&state.placed[base+rank-2]||rank<13&&state.placed[base+rank];
}
function hubSevenChoices(state,seat){
  return (state.hands?.[seat]||[]).filter(i=>hubSevenLegal(state,i));
}
function hubNewTableGame(kind,players){
  if(!HUB_NEW_GAMES.includes(kind)||!Array.isArray(players)||players.length<(HUB_PLAYERS_MIN[kind]||2)||players.length>(HUB_PLAYERS_MAX[kind]||8)||new Set(players).size!==players.length)return null;
  const deck=hubShuffle();
  const state={kind,players:players.slice(),deck,turn:0,status:'play',winner:-1,moves:0,revision:0,created:Date.now()};
  if(kind==='shichinarabe'){
    state.placed=Array(52).fill(false);state.hands=players.map(()=>[]);
    for(const card of deck){if(hubRank(card)===7)state.placed[card]=true;}
    for(let i=0;i<deck.length;i++){
      const card=deck[i];if(hubRank(card)!==7)state.hands[i%players.length].push(card);
    }
    for(const hand of state.hands)hand.sort((a,b)=>a-b);
    state.passes=players.map(()=>0);state.finish=[];state.eliminated=[];state.deck=[];
  }else if(kind==='blackjack'){
    state.dealer=[deck.pop()];state.hands=players.map(()=>[deck.pop()]);
    state.dealer.push(deck.pop());
    for(const hand of state.hands)hand.push(deck.pop());
    state.stood=state.hands.map(hand=>hubBJNatural(hand));
    state.results=[];
    state.turn=state.stood.findIndex(x=>!x);
    if(state.turn<0||hubBJNatural(state.dealer))hubBJSettle(state);
  }else if(kind==='baccarat'){
    state.bets={};state.score=players.map(()=>0);state.result=null;
  }
  return state;
}
function hubBJSettle(state){
  const dealerTotal=hubBJTotal(state.dealer),dealerNatural=hubBJNatural(state.dealer);
  if(!dealerNatural){
    while(hubBJTotal(state.dealer)<17&&state.deck.length)state.dealer.push(state.deck.pop());
  }
  const total=hubBJTotal(state.dealer);
  state.results=state.hands.map(hand=>{
    const value=hubBJTotal(hand);
    if(value>21)return 'lose';
    if(hubBJNatural(hand)&&!dealerNatural)return 'blackjack';
    if(dealerNatural&&!hubBJNatural(hand))return 'lose';
    if(total>21||value>total)return 'win';
    if(value===total)return 'push';
    return 'lose';
  });
  state.winner=state.results.findIndex(x=>x==='blackjack'||x==='win');
  state.status='done';state.turn=-1;
}
function hubTableMove(state,actor,choice){
  if(!state||state.status!=='play'||state.players?.[state.turn]!==actor)return null;
  const next={...state,players:state.players.slice(),deck:(state.deck||[]).slice()};
  const seat=state.turn;
  if(state.kind==='shichinarabe'){
    next.hands=state.hands.map(hand=>Array.isArray(hand)?hand.slice():[]);
    next.placed=state.placed.slice();next.passes=state.passes.slice();
    next.finish=Array.isArray(state.finish)?state.finish.slice():[];
    next.eliminated=Array.isArray(state.eliminated)?state.eliminated.slice():[];
    const choices=hubSevenChoices(next,seat),used=Number(next.passes[seat]||0);
    if(choice==='pass'){
      if(used<3){
        // Any player may strategically pass, but only three times in total.
        next.passes[seat]=used+1;
      }else if(choices.length===0){
        // No fourth pass: the player is out, remaining cards are revealed to
        // keep both wings of the table reachable by the survivors.
        next.eliminated.push(seat);
        for(const card of next.hands[seat])next.placed[card]=true;
        next.hands[seat]=[];
      }else return null;
    }else if(Number.isInteger(choice)&&choices.includes(choice)){
      next.hands[seat]=next.hands[seat].filter(card=>card!==choice);
      next.placed[choice]=true;
      if(next.hands[seat].length===0)next.finish.push(seat);
    }else return null;
    const alive=next.hands.map((hand,i)=>hand.length&&!next.eliminated.includes(i)?i:-1)
      .filter(i=>i>=0);
    if(alive.length<=1){
      if(alive.length===1&&!next.finish.includes(alive[0]))next.finish.push(alive[0]);
      // Earlier eliminated players finish lower in the final ranking.
      next.finish.push(...next.eliminated.slice().reverse());
      next.status='done';next.turn=-1;next.winner=next.finish[0]??-1;
    }else{
      let candidate=seat;
      for(let i=0;i<next.players.length;i++){
        candidate=(candidate+1)%next.players.length;
        if(alive.includes(candidate)){next.turn=candidate;break;}
      }
    }
  }else if(state.kind==='blackjack'){
    next.hands=state.hands.map(hand=>Array.isArray(hand)?hand.slice():[]);next.stood=state.stood.slice();
    next.dealer=state.dealer.slice();next.results=Array.isArray(state.results)?state.results.slice():[];
    if(!['hit','stand'].includes(choice)||next.stood[seat])return null;
    if(choice==='hit'){
      if(!next.deck.length)return null;
      next.hands[seat].push(next.deck.pop());
      if(hubBJTotal(next.hands[seat])>=21)next.stood[seat]=true;
    }else next.stood[seat]=true;
    if(next.stood[seat]){
      next.turn=next.stood.findIndex(x=>!x);
      if(next.turn<0)hubBJSettle(next);
    }
  }else if(state.kind==='baccarat'){
    if(!['player','banker','tie'].includes(choice))return null;
    next.bets={...state.bets,[actor]:choice};
    const nextSeat=next.players.findIndex(id=>!Object.prototype.hasOwnProperty.call(next.bets,id));
    if(nextSeat>=0)next.turn=nextSeat;
    else{
      next.result=hubBaccaratOutcome(next.deck);
      next.score=next.players.map(id=>next.bets[id]===next.result.winner?(next.result.winner==='tie'?8:1):0);
      next.winner=next.score.reduce((best,value,i)=>value>next.score[best]?i:best,0);
      next.turn=-1;next.status='done';
    }
  }else return null;
  next.moves=(state.moves||0)+1;
  next.revision=(state.revision||0)+1;
  return next;
}
const hubBoardNewGame=hubNewGame;
hubNewGame=function(kind,players){return HUB_NEW_GAMES.includes(kind)?hubNewTableGame(kind,players):hubBoardNewGame(kind,players);};
const hubBoardApplyMove=hubApplyMove;
hubApplyMove=function(state,actor,choice){return HUB_NEW_GAMES.includes(state?.kind)?hubTableMove(state,actor,choice):hubBoardApplyMove(state,actor,choice);};
function hubCpuChoice(state){
  if(!state||state.status!=='play'||!hubIsCpu(state.players?.[state.turn]))return null;
  if(state.kind==='reversi'){
    const color=state.turn+1,moves=hubReversiMoves(state.board,color);
    if(!moves.length)return null;
    const weight=i=>[0,7,56,63].includes(i)?110:[9,14,49,54].includes(i)?-35:0;
    return moves.map(i=>({i,score:weight(i)+hubReversiFlips(state.board,i,color).length*4+Math.random()*4}))
      .sort((a,b)=>b.score-a.score)[0].i;
  }
  if(state.kind==='connect4'){
    const moves=Array.from({length:7},(_,i)=>i).filter(c=>!state.board[c]);
    if(!moves.length)return null;
    const winning=(color,c)=>{
      const b=state.board.slice();let row=-1;
      for(let r=5;r>=0;r--)if(!b[r*7+c]){row=r;break;}
      if(row<0)return false;
      b[row*7+c]=color;return hubConnectWinner(b,row,c,color);
    };
    const self=state.turn+1,opponent=3-self;
    return moves.find(c=>winning(self,c))??moves.find(c=>winning(opponent,c))??
      moves.map(c=>({c,score:7-Math.abs(c-3)*2+Math.random()*2})).sort((a,b)=>b.score-a.score)[0].c;
  }
  if(state.kind==='shichinarabe'){
    const moves=hubSevenChoices(state,state.turn);
    return moves.length?moves[Math.floor(Math.random()*moves.length)]:'pass';
  }
  if(state.kind==='blackjack'){
    return hubBJTotal(state.hands[state.turn])<17?'hit':'stand';
  }
  if(state.kind==='baccarat'){
    return Math.random()<.49?'player':'banker';
  }
  return null;
}
