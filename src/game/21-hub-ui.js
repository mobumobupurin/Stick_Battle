// GAME HUB EXPANSION — host-owned CPU moves, invite-room controls, and card UI.
const hubRenderBoardBase=hubRender;
const hubDisplayNameBase=hubDisplayName;
hubDisplayName=function(id){
  if(hubIsCpu(id))return 'CPU '+String(Number(id.slice(HUB_CPU_PREFIX.length)));
  return hubDisplayNameBase(id);
};
let hubCpuScheduled=null;
function hubNumCpuForGame(kind,humanCount,selection='auto'){
  const min=HUB_PLAYERS_MIN[kind]??2,max=HUB_PLAYERS_MAX[kind]??8;
  const available=Math.max(0,max-Math.min(humanCount,max));
  return Math.min(available,selection==='auto'?Math.max(0,min-humanCount):Math.max(0,Math.min(7,Number(selection)||0)));
}
function hubChooseSeats(kind,humans,cpuSelection='auto'){
  const max=HUB_PLAYERS_MAX[kind]||8;
  const ids=humans.slice(0,max).map(x=>typeof x==='string'?x:x.id);
  const cpuN=hubNumCpuForGame(kind,ids.length,cpuSelection);
  for(let i=1;i<=cpuN;i++)ids.push(HUB_CPU_PREFIX+i);
  return ids.length>=(HUB_PLAYERS_MIN[kind]||2)?ids:null;
}
function hubCpuTimer(){
  const state=hubGameSnapshot,ref=roomRef;
  if(!isHost||!online||!ref||scene!=='sc-hub-room'||gmCache?.mode!=='hub'||
     !state||state.status!=='play'||!hubIsCpu(state.players?.[state.turn]))return;
  const key=state.kind+':'+state.created+':'+state.revision+':'+state.turn+':'+roomId;
  if(hubCpuScheduled?.key===key&&hubCpuScheduled.ref===ref)return;
  hubCpuScheduled={key,ref};
  setTimeout(async()=>{
    if(hubCpuScheduled?.key!==key||hubCpuScheduled.ref!==ref)return;
    try{
      if(ref!==roomRef||!isHost||gmCache?.mode!=='hub')return;
      const choice=hubCpuChoice(state);
      if(choice===null)return;
      await ref.child('hubGame').transaction(live=>{
        if(!live||live.kind!==state.kind||live.created!==state.created||live.revision!==state.revision||
           live.turn!==state.turn||live.status!=='play')return;
        return hubApplyMove(live,live.players[live.turn],choice);
      },undefined,false);
    }catch(e){console.warn('ゲームHUB CPU着手失敗',e);}
    finally{if(hubCpuScheduled?.key===key)hubCpuScheduled=null;}
  },420+Math.random()*360);
}
function hubMakeCard(card,covered=false){
  const rank=hubRank(card);
  const suits=['♠','♥','♦','♣'];
  const red=hubSuit(card)===1||hubSuit(card)===2;
  const el=hubMake('span','hub-playing-card'+(covered?' is-back':red?' is-red':' is-black'));
  if(covered){el.textContent='✦';el.setAttribute('aria-label','裏向きのカード');}
  else{
    const label=(rank===1?'A':rank===11?'J':rank===12?'Q':rank===13?'K':String(rank))+suits[hubSuit(card)];
    el.textContent=label;el.setAttribute('aria-label',label);
  }
  return el;
}
function hubPlayingRow(parent,label,cards,total,hideSecond=false){
  const line=hubMake('div','hub-casino-row');
  const heading=hubMake('div','hub-casino-row-head');
  heading.appendChild(hubMake('strong','',label));
  if(total!==null&&total!==undefined)heading.appendChild(hubMake('small','',String(total)+'点'));
  line.appendChild(heading);
  const hand=hubMake('div','hub-casino-hand');
  for(let i=0;i<cards.length;i++)hand.appendChild(hubMakeCard(cards[i],hideSecond&&i===1));
  line.appendChild(hand);parent.appendChild(line);
}
function hubAddAction(container,label,choice,enabled,cls=''){
  const b=hubMake('button','hub-action'+(cls?' '+cls:''),label);
  b.type='button';b.disabled=!enabled||hubBusy;
  b.onclick=()=>hubSubmitMove(choice);
  container.appendChild(b);
  return b;
}
function hubRenderTable(state){
  const kind=state.kind,game=HUB_CATALOG.find(x=>x.id===kind);
  if(!game)return;
  const board=hubEl('hub-board'),empty=hubEl('hub-empty-state'),info=hubEl('hub-game-info');
  const meta=hubEl('hub-game-meta'),title=hubEl('hub-game-title'),vs=hubEl('hub-versus');
  const footer=hubEl('hub-game-footer'),actions=hubEl('hub-actions');
  title.textContent=game.name;
  meta.textContent=kind.toUpperCase()+' / '+(state.status==='done'?'RESULT':'LIVE TABLE');
  empty.hidden=true;board.hidden=false;board.replaceChildren();
  board.className='hub-board hub-card-table';board.style.gridTemplateColumns='none';
  vs.replaceChildren();actions.replaceChildren();
  const me=state.players.indexOf(myId),turn=state.turn,isMyTurn=state.status==='play'&&me>=0&&me===turn;
  for(let i=0;i<state.players.length;i++){
    const entry=hubMake('span','hub-table-player'+(turn===i?' is-turn':'')+(me===i?' is-you':''));
    entry.textContent=hubDisplayName(state.players[i]);
    if(kind==='shichinarabe')entry.textContent+=' · '+(state.hands[i]?.length||0)+'枚';
    if(kind==='blackjack')entry.textContent+=' · '+hubBJTotal(state.hands[i])+'点';
    if(kind==='baccarat'&&state.bets?.[state.players[i]])entry.textContent+=' · 予想済';
    vs.appendChild(entry);
  }
  if(kind==='blackjack'){
    const dealerKnown=state.status==='done';
    hubPlayingRow(board,'DEALER',state.dealer,dealerKnown?hubBJTotal(state.dealer):null,!dealerKnown);
    for(let i=0;i<state.players.length;i++){
      const h=state.hands[i];
      hubPlayingRow(board,hubDisplayName(state.players[i])+(state.stood[i]?' / 確定':''),h,hubBJTotal(h));
    }
    const resultLabel={'blackjack':'BLACKJACK! 勝ち','win':'勝ち','lose':'負け','push':'引き分け'};
    info.textContent=state.status==='done'?'ラウンド終了。ディーラーとの勝敗が決まりました。':
      isMyTurn?'あなたの番。21を超えないようにカードを引こう！':hubDisplayName(state.players[turn])+' の手番です。';
    if(state.status==='done'){
      const scores=hubMake('div','hub-game-results');
      state.results.forEach((r,i)=>scores.appendChild(hubMake('span','hub-result-pill '+(r==='win'||r==='blackjack'?'is-win':''),hubDisplayName(state.players[i])+'：'+resultLabel[r])));
      board.appendChild(scores);
    }
    hubAddAction(actions,'＋ HIT / カードを引く','hit',isMyTurn,'is-primary');
    hubAddAction(actions,'STAND / ここで止める','stand',isMyTurn);
    footer.textContent='ディーラーは17以上でスタンド。Aは1点または11点。勝負はゲーム内だけです。';
  }else if(kind==='baccarat'){
    info.textContent=state.status==='done'?'ラウンド結果：'+(state.result.winner==='tie'?'引き分け':state.result.winner==='player'?'PLAYER':'BANKER')+' の勝ち！':
      isMyTurn?'PLAYER / BANKER / TIE のどれが勝つか予想しよう！':
      hubDisplayName(state.players[turn])+' が予想中です。';
    if(state.result){
      hubPlayingRow(board,'PLAYER',state.result.player,state.result.playerTotal);
      hubPlayingRow(board,'BANKER',state.result.banker,state.result.bankerTotal);
      const scores=hubMake('div','hub-game-results');
      for(let i=0;i<state.players.length;i++){
        scores.appendChild(hubMake('span','hub-result-pill '+(state.score[i]>0?'is-win':''),hubDisplayName(state.players[i])+'：'+(state.score[i]>0?'正解 +'+state.score[i]:'不正解')));
      }
      board.appendChild(scores);
    }else{
      const pending=hubMake('div','hub-baccarat-wait');
      pending.appendChild(hubMake('span','hub-baccarat-emblem','◆'));
      pending.appendChild(hubMake('strong','','P L A Y E R　 /　 B A N K E R'));
      pending.appendChild(hubMake('small','','全員の予想が揃うと自動でカードを配ります。'));
      board.appendChild(pending);
    }
    hubAddAction(actions,'PLAYER','player',isMyTurn,'is-primary');
    hubAddAction(actions,'BANKER','banker',isMyTurn);
    hubAddAction(actions,'TIE','tie',isMyTurn);
    footer.textContent='バカラの3枚目ルールに対応。的中ポイント：PLAYER / BANKER +1、TIE +8（仮想ポイント）。';
  }else if(kind==='shichinarabe'){
    info.textContent=state.status==='done'?'結果：'+state.finish.map((n,i)=>(i+1)+'位 '+hubDisplayName(state.players[n])).join(' ／ '):
      isMyTurn?'あなたの番。光っているカードを出そう！':hubDisplayName(state.players[turn])+' の番です。';
    const suits=['♠','♥','♦','♣'],rows=hubMake('div','hub-seven-layout');
    for(let suit=0;suit<4;suit++){
      const line=hubMake('div','hub-seven-row');
      line.appendChild(hubMake('strong','hub-seven-suit'+(suit===1||suit===2?' is-red':''),suits[suit]));
      const grid=hubMake('div','hub-seven-slots');
      for(let rank=1;rank<=13;rank++){
        const n=suit*13+rank-1,on=!!state.placed[n];
        grid.appendChild(hubMake('span','hub-seven-slot'+(on?' is-placed':''),on?(rank===1?'A':rank===11?'J':rank===12?'Q':rank===13?'K':rank):'·'));
      }
      line.appendChild(grid);rows.appendChild(line);
    }
    board.appendChild(rows);
    if(me>=0){
      board.appendChild(hubMake('div','hub-seven-hand-title','あなたの手札 · '+(state.hands[me]?.length||0)+'枚'));
      const hand=hubMake('div','hub-seven-hand'),choices=new Set(hubSevenChoices(state,me));
      for(const card of state.hands[me]||[]){
        const b=hubMake('button','hub-seven-card'+(choices.has(card)&&isMyTurn?' is-legal':''));
        b.type='button';b.disabled=!isMyTurn||!choices.has(card)||hubBusy;
        b.appendChild(hubMakeCard(card));b.onclick=()=>hubSubmitMove(card);hand.appendChild(b);
      }
      board.appendChild(hand);
      if(!choices.size)hubAddAction(actions,'出せるカードがないのでパス','pass',isMyTurn,'is-primary');
    }else board.appendChild(hubMake('div','hub-seven-hand-title','観戦中：他の人の手札は表示されません。'));
    footer.textContent='4つの「7」から、同じマークの数字を上下に隣接する順で並べます。手札を先に使い切れば勝ち。';
  }
  if(state.status==='done'){
    const text=isHost?'ゲーム一覧の同じタイトルを選べば再戦できます。':'ホストが再戦するまでお待ちください。';
    actions.appendChild(hubMake('span','hub-finished-note',text));
  }
}
const hubRenderBeforeExpansion=hubRender;
hubRender=function(){
  if(!online||gmCache?.mode!=='hub'||scene!=='sc-hub-room')return;
  hubRenderBeforeExpansion();
  const members=lobbyMembers().filter(x=>!x.cpu),state=hubGameSnapshot;
  const cpuSelect=hubEl('hub-cpu-count');
  if(cpuSelect){cpuSelect.disabled=!isHost||hubBusy;}
  const cpuInfo=hubEl('hub-cpu-info');
  const target=cpuSelect?.value||'auto';
  if(cpuInfo)cpuInfo.textContent=target==='auto'?'不足人数を自動補充':'指定したCPUを追加（上限人数まで）';
  // Legacy catalog is built with the two-human restriction; enable it in solo rooms.
  const catalog=hubEl('hub-catalog');
  if(catalog){
    for(const btn of catalog.querySelectorAll('.hub-card')){
      const game=HUB_CATALOG.find(x=>x.id===btn.dataset.game);
      if(!game)continue;
      btn.disabled=!game.ready||!isHost||members.length===0||hubBusy;
      const hint=btn.querySelector('.hub-card-status');
      if(hint&&game.ready)hint.textContent=state?.kind===game.id?'PLAYING':isHost?'START ↗':'HOST ONLY';
    }
  }
  const actions=hubEl('hub-actions');
  if(actions)actions.replaceChildren();
  const roster=hubEl('hub-roster');
  if(roster&&state?.players)for(const id of state.players.filter(hubIsCpu)){
    const chip=hubMake('span','hub-member hub-member-cpu');
    chip.append(hubMake('span','hub-member-avatar','CPU'),hubMake('span','hub-member-label',hubDisplayName(id)));
    roster.appendChild(chip);
  }
  const liveCount=hubEl('hub-members');
  if(liveCount&&state?.players?.some(hubIsCpu))
    liveCount.textContent=members.length+'人 + CPU '+state.players.filter(hubIsCpu).length+'体が対局中'+(isHost?' ・あなたがホスト':'');
  if(state&&HUB_NEW_GAMES.includes(state.kind))hubRenderTable(state);
  else if(actions&&state&&state.status==='done'&&isHost){
    const again=hubMake('button','hub-action is-primary','↻ 同じゲームで再戦');
    again.onclick=()=>hubSelectGame(state.kind);
    actions.appendChild(again);
  }
  hubCpuTimer();
};
const hubSelectGameBeforeExpansion=hubSelectGame;
hubSelectGame=async function(kind){
  const config=HUB_CATALOG.find(g=>g.id===kind);
  if(!config?.ready||!isHost||!roomRef||hubBusy)return;
  if(kind==='stickbattle'){
    hubBusy=true;
    try{
      await roomRef.child('hubGame').remove();
      await roomRef.child('gm').update({mode:'normal',ph:'lobby',cpuN:0,teamMode:0});
    }catch(e){alert('格闘対戦に切り替えられませんでした。'+(e?.message||e));}
    finally{hubBusy=false;}
    return;
  }
  const humans=lobbyMembers().filter(m=>!m.cpu);
  const seats=hubChooseSeats(kind,humans,hubEl('hub-cpu-count')?.value||'auto');
  if(!seats){alert('人数が足りません。CPUを自動補充するか、友達を招待してください。');return;}
  if(hubGameSnapshot?.status==='play'&&hubGameSnapshot.moves>0&&
     !confirm('今の対局を終了して、新しいゲームを開始しますか？'))return;
  hubBusy=true;
  try{
    const old=(await roomRef.child('hubGame').once('value')).val();
    if(old?.kind===kind&&old.players?.length===seats.length&&
       seats.every(x=>old.players.includes(x))&&seats.length===2)seats.reverse();
    const game=hubNewGame(kind,seats);
    if(!game)throw new Error('ゲームを初期化できません。');
    if(!game.created)game.created=Date.now();
    await roomRef.child('hubGame').set(game);
  }catch(e){alert('ゲームを開始できませんでした。'+(e?.message||e));}
  finally{hubBusy=false;hubRender();}
};
