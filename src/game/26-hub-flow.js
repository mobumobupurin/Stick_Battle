// GAME HUB / UNIFIED FLOW: choose a game -> confirm CPU seats -> GAME START -> dedicated play scene.
let hubSelectionSnapshot=null,hubSelectionBound=null,hubRoomBrowsing=false,hubActiveGameToken='';
const hubBindRoomBeforeFlow=hubBindRoom;
hubBindRoom=function(){
  hubBindRoomBeforeFlow();
  const ref=roomRef;
  if(!ref||hubSelectionBound===ref)return;
  hubSelectionBound=ref;
  ref.child('hubSelection').on('value',snap=>{
    if(ref!==roomRef)return;
    hubSelectionSnapshot=snap.val();
    hubRender();
  });
};
function hubIsActiveScene(){return scene==='sc-hub-room'||scene==='sc-hub-play';}
function hubFlowSyncScreen(){
  if(!hubIsActiveScene())return;
  const state=hubGameSnapshot;
  const token=state?state.kind+':'+(state.created||0):'';
  if(token!==hubActiveGameToken){
    hubActiveGameToken=token;
    hubRoomBrowsing=false;
  }
  if(!state&&scene==='sc-hub-play')show('sc-hub-room');
  else if(state&&!hubRoomBrowsing&&scene==='sc-hub-room')show('sc-hub-play');
}
function hubFlowSetup(){
  if(scene!=='sc-hub-room')return;
  const chosen=HUB_CATALOG.find(x=>x.id===hubSelectionSnapshot?.kind&&x.ready);
  const title=hubEl('hub-selection-title'),desc=hubEl('hub-selection-description');
  const icon=hubEl('hub-setup-icon'),slots=hubEl('hub-selection-members');
  const start=hubEl('hub-game-start'),status=hubEl('hub-selection-status');
  const resume=hubEl('hub-resume-play');
  if(!title||!desc||!start||!slots||!status)return;
  title.textContent=chosen?chosen.name:'遊ぶゲームを選ぼう';
  desc.textContent=chosen?(chosen.description||'CPUの人数を調整してゲームスタート！'):
    '左のゲーム一覧から遊びたいタイトルを選択してください。';
  if(icon)icon.textContent=chosen?(HUB_ICONS[chosen.id]||'✦'):'✦';
  const humans=lobbyMembers().filter(m=>!m.cpu);
  const auto=hubEl('hub-cpu-count')?.value||'auto';
  const seats=chosen?hubChooseSeats(chosen.id,humans,auto):null;
  slots.replaceChildren();
  if(seats){
    for(const id of seats){
      const chip=hubMake('span','hub-selection-member'+(hubIsCpu(id)?' is-cpu':''));
      chip.appendChild(hubMake('span','hub-selection-member-icon',hubIsCpu(id)?'CPU':'●'));
      chip.appendChild(hubMake('span','',hubIsCpu(id)?hubDisplayName(id):hubDisplayName(id)));
      slots.appendChild(chip);
    }
  }else if(chosen){
    slots.appendChild(hubMake('span','hub-selection-empty','プレイヤー数が不足しています。CPU補充を設定してください。'));
  }
  const playing=!!hubGameSnapshot;
  start.disabled=!chosen||!isHost||hubBusy||!seats||playing;
  start.textContent=chosen?'ゲームスタート　→':'ゲームを選択してください';
  status.textContent=playing?'ゲームが進行中です。対局画面に戻れます。':
    !chosen?'ゲームを選ぶと、ホストがスタートできるようになります。':
    !isHost?'ホストが「ゲームスタート」を押すと、全員がゲーム画面へ移動します。':
    !seats?'CPUなしでは人数不足です。CPUを追加するか友達を招待してください。':
    chosen.id==='stickbattle'?'ゲームスタートでスティックバトルの対戦ロビーへ進みます。':
    '準備OK！「ゲームスタート」で全員が専用ゲーム画面に移動します。';
  if(resume)resume.hidden=!playing;
  const catalog=hubEl('hub-catalog');
  if(catalog)for(const b of catalog.querySelectorAll('.hub-card')){
    const selected=chosen&&b.dataset.game===chosen.id;
    b.classList.toggle('is-selected',!!selected);
    const tag=b.querySelector('.hub-card-status');
    if(tag&&selected)tag.textContent='SELECTED ✓';
    else if(tag&&b.dataset.game!=='stickbattle'&&!b.classList.contains('is-coming')&&isHost)tag.textContent='SELECT →';
  }
}
function hubFlowPlayHeader(){
  if(scene!=='sc-hub-play')return;
  const state=hubGameSnapshot;
  const name=hubEl('hub-play-name'),code=hubEl('hub-play-code');
  const entry=HUB_CATALOG.find(x=>x.id===state?.kind);
  if(name)name.textContent=entry?.name||'ゲームHUB';
  if(code)code.textContent=roomId||'------';
}
const hubRenderBeforeFlow=hubRender;
hubRender=function(){
  if(!online||gmCache?.mode!=='hub'||!hubIsActiveScene())return;
  hubFlowSyncScreen();
  hubRenderBeforeFlow();
  if(scene==='sc-hub-room')hubFlowSetup();
  else hubFlowPlayHeader();
};
const hubPlayGameBeforeFlow=hubSelectGame;
hubSelectGame=async function(kind){
  if(!isHost||!roomRef||hubBusy||!HUB_CATALOG.some(x=>x.id===kind&&x.ready))return;
  if(hubGameSnapshot){
    if(hubGameSnapshot.status==='play'&&hubGameSnapshot.moves>0&&
      !confirm('現在の対局を終了してゲーム選択に戻りますか？'))return;
    try{await roomRef.child('hubGame').remove();}
    catch(e){alert('対局を終了できませんでした。'+(e?.message||e));return;}
  }
  try{
    await roomRef.child('hubSelection').set({kind,chosenAt:Date.now(),host:myId});
    hubSelectionSnapshot={kind};
    hubRoomBrowsing=true;
    if(scene!=='sc-hub-room')show('sc-hub-room');
    hubRender();
  }catch(e){alert('ゲームを選択できませんでした。'+(e?.message||e));}
};
async function hubStartSelectedGame(){
  const kind=hubSelectionSnapshot?.kind;
  if(!kind||!isHost||!roomRef||hubBusy||hubGameSnapshot)return;
  const humans=lobbyMembers().filter(x=>!x.cpu);
  if(!hubChooseSeats(kind,humans,hubEl('hub-cpu-count')?.value||'auto')){
    alert('CPUの人数を増やすか、友達を招待してください。');return;
  }
  hubRoomBrowsing=false;
  await hubPlayGameBeforeFlow(kind);
}
async function hubReturnToLobby(){
  const state=hubGameSnapshot;
  if(isHost&&state){
    if(state.status==='play'&&state.moves>0&&!confirm('進行中のゲームを終了して、ゲームHUBに戻りますか？'))return;
    try{await roomRef.child('hubGame').remove();}
    catch(e){alert('ゲームを終了できませんでした。'+(e?.message||e));return;}
  }
  hubRoomBrowsing=true;
  show('sc-hub-room');
  hubRender();
}
const hubFlowBuildMenusBefore=buildMenus;
buildMenus=function(){
  hubFlowBuildMenusBefore();
  const start=hubEl('hub-game-start'),back=hubEl('hub-play-back'),resume=hubEl('hub-resume-play');
  if(start)start.onclick=hubStartSelectedGame;
  if(back)back.onclick=hubReturnToLobby;
  if(resume)resume.onclick=()=>{
    if(!hubGameSnapshot)return;
    hubRoomBrowsing=false;show('sc-hub-play');hubRender();
  };
  const cpu=hubEl('hub-cpu-count');
  if(cpu)cpu.onchange=()=>hubRender();
};
