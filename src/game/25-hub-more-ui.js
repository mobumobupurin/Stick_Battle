// GAME HUB — board, hand and poker-table controls (mobile-first; server moves remain transactional).
const HUB_EXTRA_GAME_NAMES={chess:'チェス','mini-shogi':'5五将棋',oldmaid:'ババ抜き',poker:'ポーカー'};
const HUB_CHESS_GLYPH={wK:'♔',wQ:'♕',wR:'♖',wB:'♗',wN:'♘',wP:'♙',
 bK:'♚',bQ:'♛',bR:'♜',bB:'♝',bN:'♞',bP:'♟'};
const HUB_MINI_GLYPH={K:'玉',G:'金',S:'銀',B:'角',R:'飛',P:'歩',
 '+S':'全','+B':'馬','+R':'龍','+P':'と'};
let hubExtraBoardKey='',hubExtraSelected=null,hubExtraDrop='',hubExtraPromote=true,hubChessPromotionPref='Q';
let hubExtraMoveKey='';
let hubPokerPickKey='',hubPokerPicked=new Set();
function hubExtraSync(state){
 const key=state.kind+':'+(state.created||0);
 if(key!==hubExtraBoardKey){
  hubExtraBoardKey=key;hubExtraSelected=null;hubExtraDrop='';hubExtraPromote=true;hubChessPromotionPref='Q';
 }
 // Old square/drop choices must not survive an opponent move, an AI move or a new round.
 const moveKey=key+':'+state.revision+':'+state.turn;
 if(hubExtraMoveKey!==moveKey){
   hubExtraMoveKey=moveKey;hubExtraSelected=null;hubExtraDrop='';
 }
 const pk=key+':'+state.phase+':'+state.turn;
 if(pk!==hubPokerPickKey){hubPokerPickKey=pk;hubPokerPicked=new Set();}
}
function hubExtraInfo(state,text,footerText){
 hubEl('hub-game-title').textContent=HUB_EXTRA_GAME_NAMES[state.kind]||state.kind;
 hubEl('hub-game-meta').textContent=(state.kind==='mini-shogi'?'MINI SHOGI':state.kind.toUpperCase())+' / '+(state.status==='done'?'RESULT':'IN PROGRESS');
 hubEl('hub-game-info').textContent=text;
 hubEl('hub-game-footer').textContent=footerText;
 hubEl('hub-empty-state').hidden=true;
 const board=hubEl('hub-board');board.hidden=false;board.replaceChildren();
 const actions=hubEl('hub-actions');actions.replaceChildren();
 const versus=hubEl('hub-versus');versus.replaceChildren();
 return {board,actions,versus};
}
function hubExtraPlayers(state,vs){
 for(let i=0;i<state.players.length;i++){
  const entry=hubMake('span','hub-table-player'+(state.turn===i?' is-turn':'')+(state.players[i]===myId?' is-you':''));
  entry.textContent=hubDisplayName(state.players[i]);
  vs.appendChild(entry);
 }
}
function hubExtraButton(container,label,fn,enabled=true,cls=''){
 const button=hubMake('button','hub-action '+cls,label);
 button.type='button';button.disabled=!enabled||hubBusy;button.onclick=fn;
 container.appendChild(button);return button;
}
function hubExtraFinish(state,actions){
 if(state.status==='done'&&isHost)
  hubExtraButton(actions,'↻ 同じゲームで再戦',()=>hubSelectGame(state.kind),true,'is-primary');
}
function hubExtraBoardUI(state){
 const chess=state.kind==='chess',N=chess?8:5,seat=state.players.indexOf(myId),myTurn=state.status==='play'&&state.turn===seat;
 // Shogi mid-/late-game boards can arrive as numeric-key objects from Firebase.
 if(!chess&&state.board&&!Array.isArray(state.board))state={...state,board:hubMiniBoard(state)};
 const checked=state.status==='play'&&(chess?hubChessCheck(state.board,state.turn):hubMiniCheck(state.board,state.turn));
 let message=state.status==='done'?
   (state.winner>=0?hubDisplayName(state.players[state.winner])+'の勝ち！':'引き分けです。'):
   (myTurn?'あなたの番です。駒を選んで移動先をタップしよう。':hubDisplayName(state.players[state.turn])+'の番です。');
 if(checked)message+='　王手！';
 const ui=hubExtraInfo(state,message,chess?
  'チェス：王手放置は禁止。キャスリング・アンパッサン・昇格に対応。':
  '5五将棋：成り・持ち駒を打つ・王手・詰み・二歩を判定します。');
 hubExtraPlayers(state,ui.versus);
 const legal=myTurn?(chess?hubChessLegalMoves(state):hubMiniLegalMoves(state)):[];
 const own=chess?(seat===0?'w':'b'):(seat===0?'s':'g');
 const selectValid=hubExtraSelected!==null&&state.board[hubExtraSelected]?.[0]===own;
 const targets=legal.filter(m=>hubExtraDrop?m.drop===hubExtraDrop:
   selectValid&&!m.drop&&m.from===hubExtraSelected);
 const targetIndices=new Set(targets.map(m=>m.to));
 const board=ui.board;
 board.className='hub-board hub-strategy-board '+(chess?'hub-chess-board':'hub-mini-board');
 board.style.gridTemplateColumns='repeat('+N+',minmax(0,1fr))';
 for(let visible=0;visible<N*N;visible++){
  const pos=seat===1?N*N-1-visible:visible,rank=Math.floor(pos/N),file=pos%N,piece=state.board[pos];
  const cell=hubMake('button','hub-strategy-cell'+((rank+file)%2?' is-dark':' is-light')+
    (hubExtraSelected===pos?' is-selected':'')+(targetIndices.has(pos)?' is-target':''));
  cell.type='button';cell.disabled=!myTurn||hubBusy;
  if(piece){
   const symbol=chess?HUB_CHESS_GLYPH[piece]||'?':HUB_MINI_GLYPH[hubMiniType(piece)]||'?';
   const text=hubMake('span','hub-strategy-piece '+(piece[0]===(chess?'w':'s')?'is-first':'is-second'),symbol);
   cell.appendChild(text);
  }else if(targetIndices.has(pos))cell.appendChild(hubMake('span','hub-strategy-target-dot'));
  cell.setAttribute('aria-label', '行'+(rank+1)+' 列'+(file+1)+ (piece?' '+(chess?HUB_CHESS_GLYPH[piece]:HUB_MINI_GLYPH[hubMiniType(piece)]):' 空'));
  cell.onclick=()=>{
   if(!myTurn)return;
   const hit=targets.filter(m=>m.to===pos);
   if(hit.length){
    let move;
    if(chess)move={from:hubExtraSelected,to:pos,promotion:hubChessPromotionPref};
    else if(hubExtraDrop)move={drop:hubExtraDrop,to:pos};
    else move=hit.find(m=>!!m.promote===hubExtraPromote)||hit[0];
    hubExtraSelected=null;hubExtraDrop='';
    hubSubmitMove(move);
   }else if(piece&&piece[0]===own){
    hubExtraSelected=pos;hubExtraDrop='';hubExtraBoardUI(state);
   }else{
    hubExtraSelected=null;hubExtraDrop='';hubExtraBoardUI(state);
   }
  };
  board.appendChild(cell);
 }
 if(chess){
  if(myTurn){
   const label=hubMake('label','hub-option-label','昇格時の駒：');
   const sel=hubMake('select','hub-strategy-select');sel.id='hub-chess-promotion';
   const options=[['Q','クイーン'],['R','ルーク'],['B','ビショップ'],['N','ナイト']];
   const prev=hubChessPromotionPref;
   options.forEach(([v,text])=>{const op=document.createElement('option');op.value=v;op.textContent=text;sel.appendChild(op);});
   sel.value=prev;sel.onchange=()=>{hubChessPromotionPref=sel.value;};label.appendChild(sel);ui.actions.appendChild(label);
  }
 }else{
  const pieces=['R','B','G','S','P'],hand=(state.hand?.[seat]||{});
  if(seat>=0){
   const holder=hubMake('div','hub-mini-hand');
   holder.appendChild(hubMake('span','hub-option-label','持ち駒：'));
   for(const kind of pieces){
    const count=Number(hand[kind]||0);
    if(!count)continue;
    const btn=hubExtraButton(holder,HUB_MINI_GLYPH[kind]+' ×'+count,()=>{
     hubExtraSelected=null;hubExtraDrop=kind;hubExtraBoardUI(state);
    },myTurn);
    if(hubExtraDrop===kind)btn.classList.add('is-selected');
   }
   ui.actions.appendChild(holder);
  }
  if(myTurn){
   const button=hubExtraButton(ui.actions,'成り：'+(hubExtraPromote?'ON':'OFF'),()=>{
    hubExtraPromote=!hubExtraPromote;hubExtraBoardUI(state);
   },true,'hub-promote-toggle');
   button.setAttribute('aria-pressed',String(hubExtraPromote));
  }
 }
 hubExtraFinish(state,ui.actions);
}
function hubExtraOldmaidUI(state){
 const mySeat=state.players.indexOf(myId),me=state.hands?.[mySeat]||[],target=state.status==='play'?hubOldmaidTarget(state,state.turn):-1;
 const canDraw=state.status==='play'&&state.turn===mySeat&&target>=0;
 const message=state.status==='done'?
   '終了！ '+(state.loser>=0?hubDisplayName(state.players[state.loser])+' がジョーカーを持って終了。':'')+
   (state.winner>=0?'　1位：'+hubDisplayName(state.players[state.winner]):''):
   canDraw?'あなたの番です。相手の裏向きカードを1枚選ぼう。':hubDisplayName(state.players[state.turn])+' がカードを引きます。';
 const ui=hubExtraInfo(state,message,'ババ抜き：同じ数字の2枚が自動で消えます。最後にジョーカーを持っていた人が負け。');
 ui.board.className='hub-board hub-card-table hub-oldmaid-table';ui.board.style.gridTemplateColumns='none';
 for(let i=0;i<state.players.length;i++){
  const chip=hubMake('span','hub-table-player'+(state.turn===i?' is-turn':''),hubDisplayName(state.players[i])+
   ' · '+(state.hands[i]?.length||0)+'枚'+(state.finish.includes(i)?' / 上がり':''));
  ui.versus.appendChild(chip);
 }
 const handTitle=hubMake('strong','hub-oldmaid-heading','あなたのカード');
 ui.board.appendChild(handTitle);
 const myCards=hubMake('div','hub-casino-hand hub-oldmaid-hand');
 if(mySeat>=0){
  me.forEach(c=>{
   if(c===52){
    const joker=hubMake('span','hub-playing-card is-joker','JOKER');
    joker.setAttribute('aria-label','ジョーカー');
    myCards.appendChild(joker);
   }else myCards.appendChild(hubMakeCard(c));
  });
  if(!me.length)myCards.appendChild(hubMake('span','hub-card-empty','手札なし（上がり）'));
 }else myCards.appendChild(hubMake('span','hub-card-empty','観戦中'));
 ui.board.appendChild(myCards);
 if(state.status==='play'&&target>=0){
  ui.board.appendChild(hubMake('strong','hub-oldmaid-heading','引く相手：'+hubDisplayName(state.players[target])));
  const targetRow=hubMake('div','hub-oldmaid-face-down');
  for(let i=0;i<(state.hands[target]?.length||0);i++){
   const btn=hubMake('button','hub-oldmaid-card','✦');
   btn.type='button';btn.disabled=!canDraw||hubBusy;
   btn.setAttribute('aria-label',hubDisplayName(state.players[target])+'の裏向きカード '+(i+1)+'番目');
   btn.onclick=()=>hubSubmitMove(i);
   targetRow.appendChild(btn);
  }
  ui.board.appendChild(targetRow);
 }
 if(state.status==='done'){
  const order=hubMake('div','hub-game-results');
  state.finish.forEach((i,n)=>order.appendChild(hubMake('span','hub-result-pill is-win',(n+1)+'位 '+hubDisplayName(state.players[i]))));
  if(state.loser>=0)order.appendChild(hubMake('span','hub-result-pill','最後 '+hubDisplayName(state.players[state.loser])));
  ui.board.appendChild(order);
 }
 hubExtraFinish(state,ui.actions);
}
function hubExtraPokerUI(state){
 const mySeat=state.players.indexOf(myId),canAct=state.status==='play'&&state.turn===mySeat;
 const phaseLabel={bet1:'1回目のベット',draw:'カードの交換',bet2:'2回目のベット',done:'ショーダウン'};
 const message=state.status==='done'?('決着！ '+(state.winners?.length?state.winners.map(i=>hubDisplayName(state.players[i])).join('・')+' の勝ち':'引き分け')):(canAct?'あなたの番：'+phaseLabel[state.phase]:hubDisplayName(state.players[state.turn])+' の番：'+phaseLabel[state.phase]);
 const ui=hubExtraInfo(state,message,'5カード・ドロー：5枚の役で比較。各ベットは仮想チップのみで、現金を扱いません。');
 ui.board.className='hub-board hub-card-table hub-poker-table';ui.board.style.gridTemplateColumns='none';
 const statusBar=hubMake('div','hub-poker-top');
 statusBar.append(hubMake('span','hub-poker-pot','POT / '+state.pot+' チップ'),
   hubMake('span','hub-poker-phase',phaseLabel[state.phase]||state.phase));
 ui.board.appendChild(statusBar);
 for(let i=0;i<state.players.length;i++){
  const mine=i===mySeat,reveal=mine||state.status==='done',folded=state.folded[i],hand=state.hands[i];
  const chip=hubMake('span','hub-table-player'+(state.turn===i?' is-turn':'')+(mine?' is-you':''),hubDisplayName(state.players[i])+' · '+state.stack[i]+'枚'+(folded?'（降り）':''));
  ui.versus.appendChild(chip);
  const line=hubMake('div','hub-casino-row hub-poker-player'+(folded?' is-folded':''));
  const title=hubMake('div','hub-casino-row-head');
  title.appendChild(hubMake('strong','',hubDisplayName(state.players[i])+(mine?'（あなた）':'')));
  if(reveal)title.appendChild(hubMake('small','',HUB_POKER_HANDS[hubPokerValue(hand)?.[0]||0]));
  line.appendChild(title);
  const cards=hubMake('div','hub-casino-hand');
  for(let j=0;j<hand.length;j++){
   if(canAct&&state.phase==='draw'&&mine){
    const b=hubMake('button','hub-poker-pick'+(hubPokerPicked.has(j)?' is-selected':''));b.type='button';
    b.appendChild(hubMakeCard(hand[j]));
    b.setAttribute('aria-pressed',String(hubPokerPicked.has(j)));
    b.onclick=()=>{
     if(hubPokerPicked.has(j))hubPokerPicked.delete(j);
     else if(hubPokerPicked.size<3)hubPokerPicked.add(j);
     hubExtraPokerUI(state);
    };
    cards.appendChild(b);
   }else cards.appendChild(hubMakeCard(hand[j],!reveal));
  }
  line.appendChild(cards);ui.board.appendChild(line);
 }
 if(state.status==='done'){
  const outcomes=hubMake('div','hub-game-results');
  state.players.forEach((_,i)=>{
   const rank=HUB_POKER_HANDS[hubPokerValue(state.hands[i])?.[0]||0];
   const win=state.winners?.includes(i);
   outcomes.appendChild(hubMake('span','hub-result-pill'+(win?' is-win':''),hubDisplayName(state.players[i])+' · '+(state.folded[i]?'FOLD':rank)+(win?' WIN!':'')));
  });
  ui.board.appendChild(outcomes);
 }
 if(canAct){
  if(state.phase==='draw'){
   hubExtraButton(ui.actions,'手札を交換（'+hubPokerPicked.size+'/3枚）',()=>{
    const picked=[...hubPokerPicked];hubPokerPicked.clear();hubSubmitMove({discard:picked});
   },true,'is-primary');
  }else{
   const owe=state.currentBet-state.bets[mySeat];
   hubAddAction(ui.actions,owe>0?'CALL / '+owe+'枚':'CHECK',owe>0?'call':'check',owe<=state.stack[mySeat],'is-primary');
   const allowedRaise=state.raises<2&&state.stack[mySeat]>=owe+10;
   hubAddAction(ui.actions,state.currentBet>0?'RAISE / ＋10':'BET / 10',state.currentBet>0?'raise':'bet',allowedRaise);
   hubAddAction(ui.actions,'FOLD / 降りる','fold',true);
  }
 }else if(state.phase==='draw'&&state.status==='play'){
  ui.actions.appendChild(hubMake('span','hub-finished-note','カード交換の順番を待っています。'));
 }
 hubExtraFinish(state,ui.actions);
}
const hubMoreOriginalRender=hubRender;
hubRender=function(){
  hubMoreOriginalRender();
  if(!online||gmCache?.mode!=='hub'||scene!=='sc-hub-room'&&scene!=='sc-hub-play')return;
  const state=hubGameSnapshot;
  if(!state||!['chess','mini-shogi','oldmaid','poker'].includes(state.kind))return;
  hubExtraSync(state);
  if(state.kind==='chess'||state.kind==='mini-shogi')hubExtraBoardUI(state);
  else if(state.kind==='oldmaid')hubExtraOldmaidUI(state);
  else hubExtraPokerUI(state);
};
