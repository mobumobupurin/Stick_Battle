// GAME HUB / OLD MAID + FIVE-CARD DRAW POKER (fictional chips; no cash betting).
const HUB_PARTY_EXTRAS=['oldmaid','poker'];
for(const id of HUB_PARTY_EXTRAS)HUB_CATALOG.find(x=>x.id===id).ready=true;
HUB_CATALOG.find(x=>x.id==='oldmaid').description='ジョーカー1枚入り53枚でババ抜き。順に隣の手札からカードを引き、同じ数字を捨てます。';
HUB_CATALOG.find(x=>x.id==='poker').description='5カード・ドローポーカー。手札交換・役・仮想チップでのBET/CALL/FOLDに対応。';
HUB_PLAYERS_MIN.oldmaid=2;HUB_PLAYERS_MAX.oldmaid=8;
HUB_PLAYERS_MIN.poker=2;HUB_PLAYERS_MAX.poker=6;
function hubDeckShuffle(deck){
 for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
 return deck;
}
function hubOldmaidStrip(hand){
 const byRank={};const removed=[];
 for(const c of hand){const rank=c===52?'joker':String(hubRank(c));(byRank[rank]??=[]).push(c);}
 const kept=[];
 for(const cards of Object.values(byRank)){
  if(cards[0]===52){kept.push(...cards);continue;}
  const take=cards.length-cards.length%2;
  removed.push(...cards.slice(0,take));kept.push(...cards.slice(take));
 }
 return {cards:hubDeckShuffle(kept),removed};
}
function hubOldmaidTarget(state,seat){
 const n=state.players.length;
 for(let step=1;step<n;step++){
  const j=(seat+step)%n;
  if((state.hands[j]||[]).length>0)return j;
 }
 return -1;
}
function hubOldmaidNew(players){
 const deck=hubDeckShuffle(Array.from({length:53},(_,i)=>i));
 const hands=players.map(()=>[]);
 deck.forEach((c,i)=>hands[i%players.length].push(c));
 for(let i=0;i<hands.length;i++)hands[i]=hubOldmaidStrip(hands[i]).cards;
 const finish=hands.map((h,i)=>h.length===0?i:-1).filter(i=>i>=0);
 const remaining=hands.map((h,i)=>h.length?i:-1).filter(i=>i>=0);
 return {kind:'oldmaid',players:players.slice(),hands,finish,loser:-1,turn:remaining[0]??-1,
  status:remaining.length>1?'play':'done',winner:finish[0]??-1,
  moves:0,revision:0,created:Date.now()};
}
function hubOldmaidPlay(state,actor,choice){
 if(!state||state.status!=='play'||state.players[state.turn]!==actor||
   !Number.isInteger(choice)||choice<0)return null;
 const seat=state.turn,target=hubOldmaidTarget(state,seat);
 if(target<0||(state.hands[target]||[]).length<=choice)return null;
 const next={...state,players:state.players.slice(),hands:state.hands.map(x=>(x||[]).slice()),
  finish:(state.finish||[]).slice()};
 const drawn=next.hands[target].splice(choice,1)[0];
 next.hands[seat].push(drawn);
 next.hands[seat]=hubOldmaidStrip(next.hands[seat]).cards;
 for(const i of [target,seat])if(next.hands[i].length===0&&!next.finish.includes(i))next.finish.push(i);
 const alive=next.hands.map((h,i)=>h.length?i:-1).filter(i=>i>=0);
 if(alive.length<=1){
  next.status='done';next.turn=-1;next.loser=alive[0]??-1;next.winner=next.finish[0]??-1;
 }else{
  let turn=seat;
  for(let j=0;j<next.players.length;j++){
   turn=(turn+1)%next.players.length;
   if(next.hands[turn].length){next.turn=turn;break;}
  }
 }
 next.moves=(state.moves||0)+1;next.revision=(state.revision||0)+1;
 return next;
}
// High card=0, pair=1, two pairs=2, three-of-a-kind=3, straight=4,
// flush=5, full house=6, four-of-a-kind=7, straight flush=8.
function hubPokerValue(hand){
 if(!Array.isArray(hand)||hand.length!==5||new Set(hand).size!==5)return null;
 const ranks=hand.map(x=>hubRank(x)===1?14:hubRank(x)),values=[...new Set(ranks)].sort((a,b)=>b-a);
 const suits=new Set(hand.map(hubSuit)),flush=suits.size===1;
 const straight=values.length===5&&(values[0]-values[4]===4||values.join(',')==='14,5,4,3,2');
 const straightTop=values.join(',')==='14,5,4,3,2'?5:values[0];
 const counts=new Map();for(const r of ranks)counts.set(r,(counts.get(r)||0)+1);
 const grouped=[...counts].sort((a,b)=>b[1]-a[1]||b[0]-a[0]);
 const order=grouped.flatMap(([rank,num])=>Array(num).fill(rank));
 if(straight&&flush)return [8,straightTop];
 if(grouped[0][1]===4)return [7,...order];
 if(grouped[0][1]===3&&grouped[1][1]===2)return [6,...order];
 if(flush)return [5,...values];
 if(straight)return [4,straightTop];
 if(grouped[0][1]===3)return [3,...order];
 if(grouped[0][1]===2&&grouped[1][1]===2)return [2,...order];
 if(grouped[0][1]===2)return [1,...order];
 return [0,...values];
}
const HUB_POKER_HANDS=['ハイカード','ワンペア','ツーペア','スリーカード','ストレート',
 'フラッシュ','フルハウス','フォーカード','ストレートフラッシュ'];
function hubPokerCompare(a,b){
 for(let i=0;i<Math.max(a?.length||0,b?.length||0);i++){
  const diff=(a?.[i]??0)-(b?.[i]??0);
  if(diff!==0)return Math.sign(diff);
 }
 return 0;
}
const hubPokerPlayers=s=>s.players.map((_,i)=>i).filter(i=>!s.folded[i]);
function hubPokerNew(players){
 const deck=hubShuffle(),hands=players.map(()=>[]);
 for(let i=0;i<5;i++)for(const hand of hands)hand.push(deck.pop());
 return {kind:'poker',players:players.slice(),hands,deck,stack:players.map(()=>95),
   pot:5*players.length,bets:players.map(()=>0),folded:players.map(()=>false),
   acted:players.map(()=>false),exchanged:players.map(()=>false),phase:'bet1',raises:0,currentBet:0,
   results:[],winners:[],winner:-1,turn:0,status:'play',moves:0,revision:0,created:Date.now()};
}
function hubPokerShowdown(state){
 const active=hubPokerPlayers(state);
 if(!active.length){state.status='done';state.winner=-1;state.turn=-1;return;}
 let winners=[],top=null;
 for(const i of active){
  const value=hubPokerValue(state.hands[i]);
  if(!top||hubPokerCompare(value,top)>0){top=value;winners=[i];}
  else if(hubPokerCompare(value,top)===0)winners.push(i);
 }
 state.winners=winners;state.winner=winners.length===1?winners[0]:-1;
 state.results=state.hands.map((hand,i)=>({rank:hubPokerValue(hand),folded:state.folded[i]}));
 state.stack=winners.reduce((arr,i,k)=>{arr[i]+=Math.floor(state.pot/winners.length)+(k<state.pot%winners.length?1:0);return arr;},state.stack);
 state.phase='done';state.status='done';state.turn=-1;
}
function hubPokerTurnFrom(state,seat){
 for(let i=1;i<=state.players.length;i++){
  const j=(seat+i)%state.players.length;
  if(!state.folded[j])return j;
 }
 return -1;
}
function hubPokerNextPhase(state){
 const active=hubPokerPlayers(state);
 if(active.length<=1){
  const winner=active[0]??-1;state.winners=winner>=0?[winner]:[];state.winner=winner;
  if(winner>=0)state.stack[winner]+=state.pot;
  state.status='done';state.phase='done';state.turn=-1;
  return;
 }
 if(state.phase==='bet1'){
  state.phase='draw';state.turn=active[0];state.exchanged=state.players.map(()=>false);
 }else if(state.phase==='draw'){
  state.phase='bet2';state.turn=active[0];state.currentBet=0;
  state.bets=state.players.map(()=>0);state.acted=state.players.map(()=>false);state.raises=0;
 }else if(state.phase==='bet2')hubPokerShowdown(state);
}
function hubPokerPlay(state,actor,choice){
 if(!state||state.status!=='play'||state.players[state.turn]!==actor||state.folded[state.turn])return null;
 const next={...state,players:state.players.slice(),hands:state.hands.map(h=>h.slice()),
  deck:state.deck.slice(),stack:state.stack.slice(),bets:state.bets.slice(),
  folded:state.folded.slice(),acted:state.acted.slice(),exchanged:state.exchanged.slice()};
 const i=state.turn;
 if(next.phase==='draw'){
  const discard=choice?.discard;
  if(!Array.isArray(discard)||discard.length>3||new Set(discard).size!==discard.length||
     discard.some(x=>!Number.isInteger(x)||x<0||x>=5)||next.deck.length<discard.length)return null;
  next.hands[i]=next.hands[i].filter((_,idx)=>!discard.includes(idx));
  for(let n=0;n<discard.length;n++)next.hands[i].push(next.deck.pop());
  next.exchanged[i]=true;
  const active=hubPokerPlayers(next);
  if(active.every(j=>next.exchanged[j]))hubPokerNextPhase(next);
  else{
   let candidate=i;
   for(let k=0;k<next.players.length;k++){
    candidate=(candidate+1)%next.players.length;
    if(!next.folded[candidate]&&!next.exchanged[candidate]){next.turn=candidate;break;}
   }
  }
 }else if(['bet1','bet2'].includes(next.phase)){
  if(typeof choice!=='string')return null;
  const owe=next.currentBet-next.bets[i],increment=10;
  if(choice==='fold'){next.folded[i]=true;next.acted[i]=true;}
  else if(choice==='check'){if(owe!==0)return null;next.acted[i]=true;}
  else if(choice==='call'){
   if(owe<=0||next.stack[i]<owe)return null;
   next.stack[i]-=owe;next.bets[i]+=owe;next.pot+=owe;next.acted[i]=true;
  }else if(choice==='bet'||choice==='raise'){
   if((choice==='bet'&&next.currentBet!==0)||(choice==='raise'&&next.currentBet===0)||
      next.raises>=2||next.stack[i]<owe+increment)return null;
   const amount=owe+increment;next.stack[i]-=amount;next.bets[i]+=amount;
   next.pot+=amount;next.currentBet+=increment;next.raises++;
   next.acted=next.acted.map((_,seat)=>next.folded[seat]);next.acted[i]=true;
  }else return null;
  const active=hubPokerPlayers(next);
  if(active.length<=1){
   hubPokerNextPhase(next);
  }else if(active.every(j=>next.acted[j]&&next.bets[j]===next.currentBet)){
   hubPokerNextPhase(next);
  }else next.turn=hubPokerTurnFrom(next,i);
 }else return null;
 next.moves=(state.moves||0)+1;next.revision=(state.revision||0)+1;
 return next;
}
function hubPokerCpuDiscard(hand){
 const rankCount=new Map();for(const c of hand)rankCount.set(hubRank(c),(rankCount.get(hubRank(c))||0)+1);
 const type=hubPokerValue(hand)?.[0]??0;
 if(type>=4)return [];
 const singles=hand.map((c,i)=>({i,rank:hubRank(c),n:rankCount.get(hubRank(c))}))
  .filter(x=>x.n===1).sort((a,b)=>a.rank-b.rank);
 return singles.slice(0,3).map(x=>x.i);
}
function hubPokerCpuAction(state){
 if(state.phase==='draw')return {discard:hubPokerCpuDiscard(state.hands[state.turn])};
 const owe=state.currentBet-state.bets[state.turn],strength=hubPokerValue(state.hands[state.turn])?.[0]??0;
 if(owe>0)return owe>10&&strength===0&&Math.random()<.3?'fold':'call';
 if(strength>=2&&state.raises<2&&state.stack[state.turn]>=10&&Math.random()<.65)
   return state.currentBet===0?'bet':'raise';
 return 'check';
}
const hubPartyEarlierNew=hubNewGame,hubPartyEarlierMove=hubApplyMove,hubPartyEarlierCpu=hubCpuChoice;
hubNewGame=function(kind,players){
 if(HUB_PARTY_EXTRAS.includes(kind)){
  if(players.length<(HUB_PLAYERS_MIN[kind]||2)||players.length>(HUB_PLAYERS_MAX[kind]||8)||
     new Set(players).size!==players.length)return null;
  return kind==='oldmaid'?hubOldmaidNew(players):hubPokerNew(players);
 }
 return hubPartyEarlierNew(kind,players);
};
hubApplyMove=function(state,actor,choice){
 if(state?.kind==='oldmaid')return hubOldmaidPlay(state,actor,choice);
 if(state?.kind==='poker')return hubPokerPlay(state,actor,choice);
 return hubPartyEarlierMove(state,actor,choice);
};
hubCpuChoice=function(state){
 if(!hubIsCpu(state?.players?.[state?.turn]))return hubPartyEarlierCpu(state);
 if(state.kind==='oldmaid'){
  const target=hubOldmaidTarget(state,state.turn);
  return target<0?null:Math.floor(Math.random()*(state.hands[target]?.length||1));
 }
 if(state.kind==='poker')return hubPokerCpuAction(state);
 return hubPartyEarlierCpu(state);
};
