// ========================================================
// ⑭ メニュー
// ========================================================
function popNote(msg) {
  const w = document.getElementById('res-wait');
  if (!w) return;
  w.style.display = 'block'; w.innerText = msg;
  setTimeout(() => { if (w.innerText === msg) { w.innerText = 'ホストの操作を待っています…'; w.style.display = (online && !isHost) ? 'block' : 'none'; } }, 2500);
}
function show(id) {
  resetTouch();
  document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
  document.getElementById('game').style.display = id === 'battle' ? 'flex' : 'none';
  if (id !== 'battle') document.getElementById(id).style.display = 'flex';
  scene = id === 'battle' ? 'battle' : id;
  if(scene!=='battle'){stopGokuAudio();stopJotaroTimeStopBgm();}
}

function seg(elId, labels, getter, setter) {
  const box = document.getElementById(elId);
  const render = () => {
    box.innerHTML = '';
    labels.forEach((l, i) => {
      const b = document.createElement('button');
      b.innerText = l;
      if (getter() === i) b.className = 'sel';
      b.onclick = () => { setter(i); render(); };
      box.appendChild(b);
    });
  };
  render();
  return render;
}

function renderStageGrid(elId, current, onPick) {
  const sg = document.getElementById(elId);
  sg.innerHTML = '';
  for (const id in MAPS) {
    const m = MAPS[id], s = 100 / m.w;
    let rects = '';
    for (const p of m.plats) rects += `<rect x="${p.x * s}" y="${p.y * s}" width="${p.w * s}" height="${Math.max(p.h * s, 2)}" fill="${themes[id].accent}"/>`;
    const b = document.createElement('button');
    b.className = 'stc' + (current === id ? ' sel' : '');
    b.innerHTML = `<svg viewBox="0 0 100 56.25" style="background:${themes[id].bottom}">${stageBackdropSVG(id)}${rects}</svg><div class="stage-meta"><b>${m.name}</b><small>${themes[id].name.split(' / ')[0]} / 0${Object.keys(MAPS).indexOf(id)+1}</small></div>`;
    b.onclick = () => onPick(id);
    sg.appendChild(b);
  }
}

let renderChars = null, renderWpnSeg = null, renderStockSeg = null;

function openChars(mode) {
  charMode = mode;
  document.getElementById('cpu-opts').style.display = mode === 'cpu'&&offlineMode==='normal' ? 'flex' : 'none';
  document.getElementById('chars-next').innerText = mode === 'cpu' ? 'ステージへ' : '変更する';
  renderChars();
  if (mode === 'battle' || mode === 'result') {
    document.getElementById('sc-chars').style.display = 'flex';
    if (mode === 'result') { document.getElementById('chars-next').innerText = '決定'; return; }
    if (!online) scene = 'pause';
  } else show('sc-chars');
}
function closeBattleChars() {
  document.getElementById('sc-chars').style.display = 'none';
  scene = 'battle';
}


// HOW TO PLAY: show one input method at a time, selected automatically for the device.
function suggestedHowtoDevice(){
 const pref=typeof prefs==='object'?prefs.controls:'auto';
 if(pref==='touch')return 'touch';
 if(pref==='keyboard')return 'pc';
 const hasFinePointer=window.matchMedia&&window.matchMedia('(hover: hover) and (pointer: fine)').matches;
 return hasFinePointer?'pc':'touch';
}
function selectHowtoDevice(mode){
 const current=['touch','pc','pad'].includes(mode)?mode:'touch';
 document.querySelectorAll('[data-howto-device]').forEach(btn=>{
  const active=btn.dataset.howtoDevice===current;
  btn.classList.toggle('is-active',active);
  btn.setAttribute('aria-selected',String(active));
  btn.tabIndex=active?0:-1;
 });
 ['touch','pc','pad'].forEach(key=>{
  const panel=document.getElementById('howto-panel-'+key);
  if(panel)panel.hidden=key!==current;
 });
}
function openHowto(fromBattle){
 const sc=document.getElementById('sc-howto');
 howtoFrom=fromBattle?'battle':'sc-mode';
 selectHowtoDevice(suggestedHowtoDevice());
 const details=sc.querySelector('.howto-extra');
 if(details)details.open=false;
 document.getElementById('howto-back').textContent=fromBattle?'バトルにもどる':'わかった！ メニューにもどる';
 if(fromBattle){
  if(!online)scene='pause';
  sc.style.display='flex';
 }else show('sc-howto');
 sc.scrollTop=0;
}

function renderCpuChoices(){
 const box=document.getElementById('cpu-fighters'),slots=document.getElementById('cpu-fighter-slots');
 box.hidden=online||charMode!=='cpu'||!['normal','training'].includes(offlineMode);
 if(box.hidden)return;
 slots.replaceChildren();
 const training=offlineMode==='training',count=training?1:clampInt(settings.cpuN,1,7,1);
 for(let i=0;i<count;i++){
  const row=document.createElement('div');row.className='cpu-fighter-row';
  const label=document.createElement('label');label.htmlFor='cpu-fighter-'+i;label.textContent=training?'練習相手':'CPU '+(i+1);
  const select=document.createElement('select');select.id=label.htmlFor;
  const option=(parent,id,name)=>{const el=document.createElement('option');el.value=id;el.textContent=name;parent.appendChild(el);};
  option(select,'','ランダム（'+CPU_POOL_LABEL[settings.cpuPool||'all']+'）');
  for(const special of [false,true]){
   const group=document.createElement('optgroup');group.label=special?'スペシャル':'通常キャラ';
   for(const id of Object.keys(CHARS))if(SPECIAL_IDS.includes(id)===special)option(group,id,CHARS[id].name);
   select.appendChild(group);
  }
  const selected=(training?settings.trainingCpuCid:settings.cpuCids?.[i])||'';
  select.value=Object.hasOwn(CHARS,selected)?selected:'';
  select.onchange=()=>{if(training)settings.trainingCpuCid=select.value;else{settings.cpuCids??=[];settings.cpuCids[i]=select.value;}};
  row.appendChild(label);row.appendChild(select);slots.appendChild(row);
 }
}

function buildMenus() {
  const grid = document.getElementById('char-grid');
  renderChars = () => {
    rosterSections(grid,id=>{settings.cid=id;if(charMode==='result'&&online&&roomRef)roomRef.child('mem/'+myId).update({cid:id});renderChars();});
    const C = CC(settings.cid);
    document.getElementById('char-info').innerHTML = fighterInfo(C);
    updateFighterShowcase();
    renderCpuChoices();
  };
  renderChars();
  seg('seg-cpun', ['1体', '2体', '3体', '4体', '5体', '6体', '7体'], () => settings.cpuN - 1, i => {settings.cpuN = i + 1;renderCpuChoices();});
  seg('seg-cpupool', ['通常キャラ', 'スペシャル', '全キャラ'], () => cpuPoolIndex(settings.cpuPool), i => {settings.cpuPool = cpuPoolFromIndex(i);renderCpuChoices();});
  seg('seg-cpulv', LV_NAME, () => settings.cpuLv, i => settings.cpuLv = i);

  const renderStages = () => renderStageGrid('stage-grid', settings.arenaChoice||settings.map, id => {
    settings.arenaChoice=id;if(MAPS[id])settings.map = id; renderStages();
  });
  renderStages();
  const teamSideRow = document.getElementById('team-side-row');
  const renderTeamSide = seg('seg-team-side', ['RED', 'BLUE'], () => normTeam(settings.team) - 1, i => { settings.team = i + 1; });
  seg('seg-team-mode', ['個人戦', 'チーム戦'], () => settings.teamMode ? 1 : 0, i => {
    settings.teamMode = offlineMode==='normal' && i === 1;
    teamSideRow.style.display = settings.teamMode ? 'flex' : 'none';
    renderTeamSide();
  });
  teamSideRow.style.display = settings.teamMode ? 'flex' : 'none';
  renderWpnSeg = seg('seg-wpn', ['なし', 'あり'], () => settings.wpn ? 1 : 0, i => settings.wpn = i === 1);
  renderStockSeg = seg('seg-stock', ['1', '2', '3', '4', '5'], () => settings.stocks - 1, i => settings.stocks = i + 1);

  const nameInput = document.getElementById('player-name');
  const lobbyName = document.getElementById('lb-name');
  nameInput.value = settings.name; lobbyName.value = settings.name;
  const applyName = v => {
    settings.name = cleanName(v); nameInput.value = settings.name; lobbyName.value = settings.name;
    if (online && roomRef) roomRef.child('mem/' + myId).update({ label: settings.name });
  };
  nameInput.addEventListener('change', e => applyName(e.target.value));
  nameInput.addEventListener('blur', e => applyName(e.target.value));
  lobbyName.addEventListener('change', e => applyName(e.target.value));
  lobbyName.addEventListener('blur', e => applyName(e.target.value));

  document.getElementById('sc-title').onclick = () => {
    if (urlRoom && !online) joinRoom(urlRoom, true);   // QR/URLから来た人はそのまま部屋へ
    else show('sc-mode');
  };
  document.getElementById('go-cpu').onclick = () => {offlineMode='normal';openChars('cpu');configureExtraCpuOptions();};
  document.getElementById('go-more').onclick=()=>show('sc-extra');
  document.getElementById('extra-back').onclick=()=>show('sc-mode');
  document.getElementById('extra-training').onclick=()=>extraModeStart('training');
  document.getElementById('extra-kumite').onclick=()=>extraModeStart('kumite');
  document.getElementById('extra-ranking').onclick=()=>openKumiteRanking('sc-extra');
  document.getElementById('rank-back').onclick=()=>{rankFetchToken++;show(rankingReturnScene);};
  document.getElementById('rank-refresh').onclick=()=>loadKumiteRanking();
  document.getElementById('kumite-submit-retry').onclick=()=>{void submitKumiteResult();};
  document.getElementById('res-rank').onclick=()=>openKumiteRanking('sc-result');
  document.getElementById('extra-tournament').onclick=()=>show('sc-tour-choice');
  document.getElementById('tour-choice-back').onclick=()=>show('sc-extra');
  document.getElementById('tour-offline').onclick=()=>extraModeStart('tournament');
  document.getElementById('tour-preview-back').onclick=()=>{offlineTour=null;show('sc-stage');configureOfflineStageOptions();};
  document.getElementById('tour-preview-start').onclick=()=>{if(!offlineTour)return;startBattleOffline();};
  document.getElementById('b-bracket').onclick=()=>showCurrentTournamentDialog();
  document.getElementById('bracket-close').onclick=()=>document.getElementById('bracket-dialog').close();
  document.getElementById('tour-network').onclick=()=>{requestedOnlineMode='tournament';show('sc-online');};
  document.getElementById('train-reset').onclick=()=>trainingReset(false);
  document.getElementById('train-gauge').onclick=()=>{const p=byId(myId);if(p){p.energy=100;p.ko=100;p.rage=100;p.senku=100;p.gearM=100;if(p.cid==='kaneki')p.kanekiGauge=100;if(p.cid==='eren'){p.erenGauge=100;p.erenGas=100;}}};
  document.getElementById('train-ai').onclick=()=>setTrainingAi(trainingAiMode+1);
  document.getElementById('champion-next').onclick=()=>{if(online){if(isHost&&roomRef)roomRef.child('gm').update({ph:'lobby',tour:null});else if(confirm('トーナメント部屋から退出しますか？'))leaveRoom();}else{offlineTour=null;show('sc-extra');}};
  document.getElementById('go-online').onclick = () => {requestedOnlineMode='normal';show('sc-online');};
  document.getElementById('online-create').onclick = () => createRoom();
  document.getElementById('online-back').onclick = () => show(requestedOnlineMode==='tournament'?'sc-tour-choice':'sc-mode');
  const roomCodeInput = document.getElementById('room-code-input');
  roomCodeInput.addEventListener('input', e => {
    if(e.isComposing)return;
    const v = normalizeRoomCode(e.target.value);
    if (e.target.value !== v) e.target.value = v;
  });
  const joinByTypedCode = async () => {
    const code = normalizeRoomCode(roomCodeInput.value);
    roomCodeInput.value = code;
    const btn = document.getElementById('online-join');
    if (btn.disabled) return;
    btn.disabled = true; btn.innerText = '確認中…';
    try { await joinRoom(code, false); }
    finally { btn.disabled = false; btn.innerText = '参加'; }
  };
  document.getElementById('online-join').onclick = joinByTypedCode;
  roomCodeInput.addEventListener('compositionend',()=>{roomCodeInput.value=normalizeRoomCode(roomCodeInput.value);});
  roomCodeInput.addEventListener('keydown', e => {
    if (e.key === 'Enter'&&!e.isComposing&&e.keyCode!==229) { e.preventDefault(); joinByTypedCode(); }
  });
  document.getElementById('go-howto').onclick = () => openHowto(false);
  document.getElementById('chars-back').onclick = () => {
    if (charMode === 'battle') closeBattleChars();
    else if (charMode === 'result') document.getElementById('sc-chars').style.display = 'none';
    else show(offlineMode==='normal'?'sc-mode':'sc-extra');
  };
  document.getElementById('chars-next').onclick = () => {
    if (charMode === 'battle') { applyCharChange(settings.cid); closeBattleChars(); }
    else if (charMode === 'result') {
      if (online && roomRef) roomRef.child('mem/' + myId).update({ cid: settings.cid });
      document.getElementById('sc-chars').style.display = 'none';
      popNote('次のバトルは ' + CC(settings.cid).name + ' で出撃！');
    }
    else { configureOfflineStageOptions();show('sc-stage'); }
  };
  document.getElementById('stage-back').onclick = () => {openChars('cpu');configureExtraCpuOptions();};
  document.getElementById('stage-next').onclick = () => {
    if(offlineMode==='kumite'&&(!settings.name||settings.name.toUpperCase()==='PLAYER')){alert('組み手ランキング用のプレイヤー名をキャラ選択画面で入力してください。');openChars('cpu');configureExtraCpuOptions();document.getElementById('player-name').focus();return;}
    if(offlineMode==='tournament'){
      offlineTour=newSoloTournament();kumiteCount=0;
      document.getElementById('tour-preview').innerHTML=tourBoardHTML(offlineTour);
      show('sc-tour-bracket');return;
    }
    if(offlineMode==='kumite'){kumiteCount=0;resetKumiteRankingSubmission();}
    startBattleOffline();
  };

  document.getElementById('lb-start').onclick = () => { if (isHost) hostStart(); };
  document.getElementById('lb-leave').onclick = () => { if (confirm('部屋から退出しますか？')) leaveRoom(); };

  document.getElementById('res-pick').onclick = () => openChars('result');
  document.getElementById('res-again').onclick = () => {
    if(!online){
      if(offlineMode==='tournament'&&offlineTour?.champion)showSoloChampion();
      else{if(offlineMode==='kumite'){kumiteCount=0;resetKumiteRankingSubmission();}startBattleOffline();}
    }else if (isHost) hostStart();
  };
  document.getElementById('res-chars').onclick = () => {
    if (!online) {if(offlineMode==='tournament')offlineTour=null;openChars('cpu');configureExtraCpuOptions();}
    else if (isHost) roomRef.child('gm').update({ ph: 'lobby',tour:null });
  };
  document.getElementById('res-title').onclick = () => {
    if (online) { if (confirm('部屋から退出しますか？')) leaveRoom(); }
    else {offlineTour=null;show('sc-title');}
  };

  document.querySelectorAll('[data-howto-device]').forEach(btn=>{
    btn.onclick=()=>selectHowtoDevice(btn.dataset.howtoDevice);
  });
  document.getElementById('howto-back').onclick = () => {
    if (howtoFrom === 'battle') { document.getElementById('sc-howto').style.display = 'none'; scene = 'battle'; }
    else show(howtoFrom);
  };
  document.getElementById('b-help').onclick = () => openHowto(true);
  document.getElementById('b-char').onclick = () => openChars('battle');
  document.getElementById('b-quit').onclick = () => {
    if (online) { if (confirm('部屋から退出しますか？')) leaveRoom(); }
    else if (confirm('バトルをやめてタイトルに戻りますか？')) show('sc-title');
  };
}
// Presentation and accessibility settings: no physics or combat parameters are modified.
const prefs = {volume:.55,music:false,shake:true,left:false,controls:'auto',specialInput:'swipe',lowFlash:false};
try { const saved=JSON.parse(localStorage.getItem('sbo.preferences')||'{}'); for(const k of Object.keys(prefs))if(typeof saved[k]===typeof prefs[k])prefs[k]=saved[k];prefs.volume=Math.max(0,Math.min(1,prefs.volume)); } catch(_) {}

// ========================================================
// 悟空専用 MP3
// 音声アセットは assets/audio/ から読み込みます。
// goku_battle_bgm.mp3 は任意。assets/audio/ に追加すると設定から利用できます。
// ========================================================
const GOKU_AUDIO_PATHS = {
  charge: './assets/audio/goku_ki_charge.mp3',
  transform: './assets/audio/goku_transform.mp3',
  teleport: './assets/audio/goku_teleport.mp3',
  revert: './assets/audio/goku_revert.mp3',
  bgm: './assets/audio/goku_battle_bgm.mp3'
};
const gokuAudio = {};
for (const [key, path] of Object.entries(GOKU_AUDIO_PATHS)) {
  const a = new Audio(path);
  a.preload = key === 'bgm' ? 'metadata' : 'auto';
  a.playsInline = true;
  if (key === 'charge' || key === 'bgm') a.loop = true;
  gokuAudio[key] = a;
}
let gokuBgmAvailable = true;
let gokuBgmActive = false;
let gokuAudioStamp = Object.create(null);
gokuAudio.bgm.addEventListener('error', () => {
  gokuBgmAvailable = false;
  gokuBgmActive = false;
});


let gokuAudioUnlocked = false;
async function unlockGokuAudio(){
  if(gokuAudioUnlocked) return;
  gokuAudioUnlocked = true;
  for(const key of ['charge','transform','teleport','revert']){
    const a=gokuAudio[key];
    if(!a) continue;
    try{
      const oldVol=a.volume;
      a.volume=0;
      const pr=a.play();
      if(pr&&pr.then) await pr.catch(()=>{});
      a.pause();
      a.currentTime=0;
      a.volume=oldVol;
    }catch(_){}
  }
}
document.addEventListener('pointerdown',()=>{unlockGokuAudio();},{once:true,capture:true});
document.addEventListener('touchstart',()=>{unlockGokuAudio();},{once:true,capture:true,passive:true});
document.addEventListener('keydown',()=>{unlockGokuAudio();},{once:true,capture:true});

function setHtmlAudioVolume(a, mul=1) {
  if (!a) return;
  a.volume = Math.max(0, Math.min(1, (prefs.volume || 0) * mul));
}

function playGokuMp3(key, {restart=true, dedupe=80, volume=1}={}) {
  const a = gokuAudio[key];
  if (!a || prefs.volume <= 0) return;
  const now = performance.now();
  if (dedupe > 0 && now - (gokuAudioStamp[key] || 0) < dedupe) return;
  gokuAudioStamp[key] = now;
  setHtmlAudioVolume(a, volume);
  if (restart) {
    try { a.currentTime = 0; } catch (_) {}
  }
  const pr = a.play();
  if (pr && pr.catch) pr.catch(() => {});
}

function stopGokuMp3(key, reset=true) {
  const a = gokuAudio[key];
  if (!a) return;
  a.pause();
  if (reset) {
    try { a.currentTime = 0; } catch (_) {}
  }
  if (key === 'bgm') gokuBgmActive = false;
}

function stopGokuAudio() {
  stopGokuMp3('charge');
  stopGokuMp3('bgm');
}

function syncGokuMp3() {
  const me = byId(myId);
  const inBattle = scene === 'battle' && me && !me.out && me.cid === 'goku';

  // 下特殊の「気を溜める」間だけループ。MAXになった瞬間にも停止。
  const charging = !!(inBattle && me.castStyle === 'charge' && me.sph > 0 && (me.energy || 0) < 100);
  if (charging) {
    setHtmlAudioVolume(gokuAudio.charge, .82);
    if (gokuAudio.charge.paused) playGokuMp3('charge', {restart:false, dedupe:0, volume:.82});
  } else if (!gokuAudio.charge.paused) {
    stopGokuMp3('charge');
  }

  // 悟空専用BGMは任意ファイル。存在すれば既存BGMの代わりに流れる。
  const wantBgm = !!(inBattle && prefs.music && gokuBgmAvailable);
  if (wantBgm) {
    setHtmlAudioVolume(gokuAudio.bgm, .48);
    if (gokuAudio.bgm.paused) {
      const pr = gokuAudio.bgm.play();
      if (pr && pr.then) pr.then(() => { gokuBgmActive = true; }).catch(() => { gokuBgmActive = false; });
    } else {
      gokuBgmActive = true;
    }
  } else if (!gokuAudio.bgm.paused || gokuBgmActive) {
    stopGokuMp3('bgm');
  }
}


// Jotaro audio asset: jotaro_timestop.mp3
const JOTARO_TIMESTOP_BGM_SRC='./assets/audio/jotaro_time_stop.mp3';
const jotaroTimeStopBgm=new Audio(JOTARO_TIMESTOP_BGM_SRC);
jotaroTimeStopBgm.preload='auto';
jotaroTimeStopBgm.playsInline=true;
let jotaroAudioUnlocked=false;

async function unlockJotaroAudio(){
 if(jotaroAudioUnlocked)return;
 jotaroAudioUnlocked=true;
 try{
  const v=jotaroTimeStopBgm.volume;
  jotaroTimeStopBgm.volume=0;
  const pr=jotaroTimeStopBgm.play();
  if(pr&&pr.then)await pr.catch(()=>{});
  jotaroTimeStopBgm.pause();jotaroTimeStopBgm.currentTime=0;jotaroTimeStopBgm.volume=v;
 }catch(_){}
}
document.addEventListener('pointerdown',()=>unlockJotaroAudio(),{once:true,capture:true});
document.addEventListener('touchstart',()=>unlockJotaroAudio(),{once:true,capture:true,passive:true});
document.addEventListener('keydown',()=>unlockJotaroAudio(),{once:true,capture:true});

function playJotaroTimeStopBgm(){
 if(prefs.volume<=0)return;
 try{
  jotaroTimeStopBgm.pause();jotaroTimeStopBgm.currentTime=0;
  jotaroTimeStopBgm.volume=Math.max(0,Math.min(1,prefs.volume*.98));
  const pr=jotaroTimeStopBgm.play();if(pr&&pr.catch)pr.catch(()=>{});
 }catch(_){}
}
function stopJotaroTimeStopBgm(){
 try{jotaroTimeStopBgm.pause();jotaroTimeStopBgm.currentTime=0;}catch(_){}
}

let audioMaster=null,audioFX=null,audioMusic=null,musicStep=0,musicNext=0;
function audioBus(){
  if(!actx)return;
  if(!audioMaster){
    audioMaster=actx.createGain();audioFX=actx.createGain();audioMusic=actx.createGain();
    const limiter=actx.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=18;limiter.ratio.value=8;limiter.attack.value=.004;limiter.release.value=.16;
    audioFX.connect(audioMaster);audioMusic.connect(audioMaster);audioMaster.connect(limiter);limiter.connect(actx.destination);
  }
  audioMaster.gain.setTargetAtTime(prefs.volume,actx.currentTime,.025);
  audioMusic.gain.setTargetAtTime(prefs.music? (freezeT>0?.035:.22):0,actx.currentTime,.08);
  return audioFX;
}
function musicNote(freq,start,dur,vol,type){
  const o=actx.createOscillator(),g=actx.createGain();o.type=type;o.frequency.value=freq;
  g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(vol,start+.015);g.gain.exponentialRampToValueAtTime(.0001,start+dur);
  o.connect(g);g.connect(audioMusic);o.start(start);o.stop(start+dur+.03);
}
setInterval(()=>{
  if(!actx||actx.state!=='running'||!prefs.music||document.hidden||scene!=='battle'||gokuBgmActive){musicNext=0;return;}
  audioBus();if(musicNext<actx.currentTime)musicNext=actx.currentTime+.03;
  const bass=[55,55,65.406,49], arp=[0,7,12,15,12,7,19,7];
  while(musicNext<actx.currentTime+.15){const root=bass[Math.floor(musicStep/16)%4];
    if(musicStep%4===0)musicNote(root,musicNext,.26,.34,'triangle');
    musicNote(root*4*Math.pow(2,arp[musicStep%8]/12),musicNext,.17,.09,'sine');
    if(musicStep%4===0)musicNote(48,musicNext,.09,.4,'sine');
    musicStep++;musicNext+=.125;
  }
},70);
const themes={small:{top:'#160f28',bottom:'#39243e',accent:'#ffa678',name:'EMBER / 闘技場'},std:{top:'#071528',bottom:'#1c3c53',accent:'#79e6ff',name:'SKYLINE / スタンダード'},wide:{top:'#0b242b',bottom:'#345c54',accent:'#b4e8a0',name:'VERDANT / 平原'}};
Object.assign(themes,{"shrine": {"top": "#100e23", "bottom": "#483048", "accent": "#edb1b9", "name": "MOON SHRINE / 月夜の社", "kind": "shrine"}, "harbor": {"top": "#0a1928", "bottom": "#32566b", "accent": "#9bd2df", "name": "RAIN HARBOR / 雨の港湾", "kind": "harbor"}, "reactor": {"top": "#081b1b", "bottom": "#314538", "accent": "#c9e895", "name": "REACTOR / 動力炉", "kind": "reactor"}, "aurora": {"top": "#0b1830", "bottom": "#385f70", "accent": "#b3ede1", "name": "AURORA / 極光の氷原", "kind": "aurora"}});
Object.assign(themes,{
 sunset:{top:'#291c35',bottom:'#dc806b',accent:'#ffe0a0',name:'SUNSET CANYON / 夕焼け大峡谷',kind:'sunset'},
 metro:{top:'#091023',bottom:'#304c7b',accent:'#6bd9ff',name:'MEGA CITY / 超巨大都市',kind:'metro'},
 orbit:{top:'#101e3d',bottom:'#566d97',accent:'#b6d4ff',name:'SKY RUINS / 天空の浮遊遺跡',kind:'orbit'}
});
function theme(){return themes[Object.keys(MAPS).find(k=>MAPS[k]===stage)]||themes.std;}
let stageCache=null,stageCacheKey='';
function paintArena(){
 const th=theme();
 if(stageCacheKey!==th.name){
  stageCacheKey=th.name;stageCache=document.createElement('canvas');stageCache.width=W;stageCache.height=WH;
  const c=stageCache.getContext('2d'),g=c.createLinearGradient(0,0,0,WH);g.addColorStop(0,th.top);g.addColorStop(1,th.bottom);c.fillStyle=g;c.fillRect(0,0,W,WH);
  const halo=c.createRadialGradient(590,100,5,590,100,270);halo.addColorStop(0,th.accent+'25');halo.addColorStop(1,th.accent+'00');c.fillStyle=halo;c.fillRect(0,0,W,WH);
  c.strokeStyle=th.accent+'16';c.lineWidth=1;for(let x=-W;x<W*2;x+=80){c.beginPath();c.moveTo(W/2,170);c.lineTo(x,WH);c.stroke();}
  for(let y=240;y<WH;y+=35){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();}
  if(stage===MAPS.wide){
   for(let layer=0;layer<3;layer++){c.fillStyle=['#173c43','#1b4247','#20484c'][layer];c.beginPath();c.moveTo(0,450);for(let x=0;x<=840;x+=60)c.lineTo(x,220+layer*50+Math.sin(x*.011+layer*2)*38+Math.cos(x*.027)*12);c.lineTo(800,450);c.fill();}
   c.fillStyle='#d7f1b41c';c.beginPath();c.arc(600,86,45,0,Math.PI*2);c.fill();
  }else{
   for(let layer=0;layer<2;layer++){for(let i=0;i<22;i++){const h=35+(Math.sin(i*19+layer)+1)*65,x=i*42-10,y=320+layer*65-h;c.fillStyle=layer?'#0a1426':'#122239';c.fillRect(x,y,32,h+130);c.fillStyle=th.accent+'1b';for(let j=0;j<4;j++)c.fillRect(x+7,y+12+j*17,3,6);}}
   c.strokeStyle=th.accent+'23';c.lineWidth=2;c.beginPath();c.arc(590,108,58,0,Math.PI*2);c.stroke();c.beginPath();c.arc(590,108,48,0,Math.PI*2);c.stroke();
  }
  drawNewScenery(c,th,W,WH);
  const vignette=c.createRadialGradient(400,220,100,400,220,480);vignette.addColorStop(0,'#00000000');vignette.addColorStop(1,'#030814aa');c.fillStyle=vignette;c.fillRect(0,0,W,WH);
 }
 drawingContext.drawImage(stageCache,0,0);push();noStroke();fill(theme().accent+'50');
 for(let i=0;i<18;i++){const x=(i*137+visualFrame*.12)%W,y=45+(i*73)%340+Math.sin(visualFrame*.012+i)*8;circle(x,y,i%3===0?2:1);}
 textAlign(LEFT,TOP);textSize(10);textStyle(NORMAL);fill('#a4bfd1');text(th.name,18,16);pop();
}
function paintPlatforms(){
 const a=theme().accent;
 for(const p of stage.plats){push();noStroke();fill('#00000045');rect(p.x+5,p.y+8,p.w,p.h+4,5);fill('#132136');rect(p.x,p.y,p.w,p.h,4);fill('#2c4861');rect(p.x,p.y,p.w,5,3);fill(a);rect(p.x+2,p.y,p.w-4,2,2);fill(a+'45');rect(p.x+8,p.y+p.h-4,p.w-16,2);fill('#56718c');for(let x=p.x+12;x<p.x+p.w-6;x+=40)rect(x,p.y+9,3,3);pop();}
}
function paintCostume(p,col){
 if(!['swordsman','boxer'].includes(p.cid)){costumeV5(p,col);return;}
 push();noStroke();fill('#101c2d');
 if(p.cid==='karate'){fill('#d9e8f2');quad(-7,-15,7,-15,9,7,-9,7);fill(col);triangle(-7,-15,1,-5,0,6);fill('#182b3d');rect(-9,5,18,4,2);}
 if(p.cid==='ninja'){fill('#152238');quad(-8,-16,7,-16,10,7,-8,7);stroke(col);strokeWeight(3);line(-7,-14,7,5);noStroke();fill(col);triangle(-p.f*7,-13,-p.f*30,-7+Math.sin(visualFrame*.17)*4,-p.f*12,-19);}
 if(p.cid==='bomber'){fill('#2b3540');rect(-10,-16,20,24,5);fill('#ffb468');rect(-7,-12,4,13,1);rect(3,-12,4,13,1);fill('#71e5ff');rect(-3,-8,6,3,1);}
 if(p.cid==='boxer'){fill(col);rect(-9,5,18,10,3);fill('#e9f5ff');rect(-9,5,18,3);}
 if(p.cid==='yankee'){fill('#172235');quad(-9,-16,9,-16,13,14,-13,14);fill('#f3c979');triangle(-8,-16,-2,-3,-3,-16);triangle(8,-16,2,-3,3,-16);fill(col);rect(-2,-12,4,17,1);}
 if(p.cid==='swordsman'){
  const flap=Math.sin(visualFrame*.10)*1.5+Math.min(Math.abs(p.vx||0),4);
  fill('#151e2e');quad(-9,-17,8,-17,12,9,-12,9);
  fill('#9f2d3f');quad(-9,-17,-2,-15,-1,7,-12,9);
  fill('#313f51');quad(0,-15,8,-17,12,7,2,7);
  fill('#111a28');triangle(-11,7,-17-flap,22,-3,14);triangle(1,7,13,9,10+flap,23);
  fill('#b23447');triangle(-11,8,-17-flap,22,-10,17);
  fill('#c9c5b5');quad(-9,-17,8,-18,10,-12,-9,-11);
  fill('#e0d5b7');rect(-11,5,23,3,1);fill('#a18c60');rect(-1,4,4,5,1);
  fill('#566174');rect(-13,-16,7,5,2);fill(col);rect(-13,-15,6,2,1);
  stroke('#0a101a');strokeWeight(4);line(-p.f*7,8,-p.f*29,20);stroke('#79858c');strokeWeight(1);line(-p.f*8,7,-p.f*28,19);
 }
 if(p.cid==='lancer'){fill('#71859a');quad(-8,-15,8,-15,10,5,-10,5);fill('#cce7ee');triangle(-5,-13,5,-13,0,3);fill(col);rect(-10,5,20,5,2);}
 if(p.cid==='gunman'){fill('#8c654e');quad(-9,-15,9,-15,13,14,-13,14);fill('#e9c38a');triangle(-7,-15,7,-15,0,-4);fill('#192538');rect(-2,-3,4,17);}
 pop();
}
function portrait(id,gear=1,form=0,mode=false){
 if(ANIME_IDS.includes(id))return animePortrait(id,form,mode);
 if(id==='rubber')return luffyPortrait(gear);
 if(id==='swordsman')return `<svg viewBox="0 0 100 82" aria-hidden="true"><ellipse cx="49" cy="76" rx="32" ry="4" fill="#050c1880"/><circle cx="48" cy="40" r="34" fill="#bb485315"/>
 <path d="M46 58L30 74M51 58l20 15" stroke="#1e2b3c" stroke-width="8" stroke-linecap="round"/><path d="M28 72l-1 3m42-4l4 3" stroke="#99acbf" stroke-width="3" stroke-linecap="round"/>
 <path d="M35 34L56 32 65 61 51 58 42 68 27 64z" fill="#192536"/><path d="M35 34L44 36 45 58 29 65z" fill="#a33445"/><path d="M46 36L56 32 65 61 51 58z" fill="#344252"/>
 <path d="M33 52l28 1" stroke="#dcd3b9" stroke-width="4"/><path d="M32 56L16 70" stroke="#0b1421" stroke-width="5"/><path d="M31 56L16 69" stroke="#697a8a" stroke-width="1"/>
 <path d="M35 38L29 49 48 48M55 38L63 50 48 48" stroke="#4b5b6d" stroke-width="6" fill="none" stroke-linecap="round"/>
 <path d="M47 48L87 21 96 10 89 24 49 51z" fill="#eeecdb"/><path d="M46 44l5 9" stroke="#c7ac75" stroke-width="2"/><circle cx="46" cy="49" r="3" fill="#bfcbd3"/>
 <circle cx="45" cy="22" r="11" fill="#c0cbd2"/><path d="M35 32L55 31 58 37 35 39z" fill="#d4d1c4"/><path d="M35 34l-9 9 8-1" fill="#a33645"/>
 <path d="M32 35l8 1-1 6-8-2z" fill="#627283"/></svg>`;

 const idx=Object.keys(CHARS).indexOf(id),colors=['#73deff','#ffb16c','#a7a1ff','#e7c295','#ff7c85','#ffb377','#98d9e2','#b5c7e9','#dab18a','#a2c79c','#7fe3cf','#d5a183'],c=colors[idx]||'#cccccc';
 const costume={karate:'<path d="M38 38h24l-3 26H41z" fill="#e1edf5"/><path d="M39 59h22" stroke="#26384b" stroke-width="5"/><path d="M39 23h22" stroke="#ff9976" stroke-width="4"/>',bomber:'<rect x="36" y="37" width="28" height="28" rx="6" fill="#343d4b"/><path d="M42 43v16m16-16v16" stroke="#ffb16c" stroke-width="4"/><path d="M37 19q13-18 26 0" fill="#394656"/><path d="M36 19h28" stroke="#ffd081" stroke-width="3"/>',ninja:'<path d="M39 16h22v4H39zM36 38h28v24H36z" fill="#29334d"/><path d="M39 36L15 29l7 11z" fill="#a7a1ff"/>',sumo:'<ellipse cx="50" cy="49" rx="21" ry="17" fill="'+c+'"/><path d="M30 57h40" stroke="#283649" stroke-width="7"/><ellipse cx="50" cy="14" rx="7" ry="4" fill="#26384b"/>',boxer:'<path d="M39 56h22v12H39z" fill="#e25a6f"/><circle cx="29" cy="40" r="9" fill="#ff6d80"/><circle cx="71" cy="40" r="9" fill="#ff6d80"/>',yankee:'<path d="M37 37h26l6 30H31z" fill="#243449"/><path d="M42 39l8 9 8-9" fill="none" stroke="#e7bf70" stroke-width="3"/><path d="M39 20q2-16 34-10q4 12-17 10" fill="#364458"/>',swordsman:'<path d="M37 38h26l6 29H31z" fill="#173d49"/><path d="M42 40l5 21m11-21l-5 21" stroke="#93ffe2" stroke-width="2"/><path d="M72 16L63 65" stroke="#d6efff" stroke-width="4"/><path d="M39 22h22" stroke="#fff" stroke-width="2"/>',lancer:'<path d="M37 38h26l-4 25H41z" fill="#8eabbf"/><path d="M74 70V19" stroke="#cbb59a" stroke-width="3"/><path d="M74 7l-5 15h10z" fill="#e2f4ff"/>',gunman:'<path d="M36 37h28l5 29H31z" fill="#98705a"/><path d="M34 20h32M41 18v-9h18v9" fill="#344357" stroke="#344357" stroke-width="5"/><path d="M69 40h13v5H71" fill="#b9d5e6"/>'};
 return `<svg viewBox="0 0 100 82" aria-hidden="true"><ellipse cx="50" cy="75" rx="29" ry="4" fill="#050c1880"/><circle cx="50" cy="40" r="33" fill="${c}0c"/><g stroke="${c}" stroke-width="6" stroke-linecap="round" fill="none"><path d="M50 36v23m0-17L30 50m20-8l20 8M50 59L38 73m12-14l12 14"/></g><circle cx="50" cy="26" r="12" fill="${c}"/>${upgradedCostumeSVG(id,c)||costume[id]}</svg>`;
}
function updateControlUI(){
 const p=fighters.find(f=>f.id===myId);if(!p)return;
 const attack=document.getElementById('btn-a'),special=document.getElementById('btn-s');
 {const cv=Math.round(Math.min(100,p.ch/CH_FULL*100))+'%';if(attack._cv!==cv){attack._cv=cv;attack.style.setProperty('--charge',cv);}}
 let text=p.ch>=CH_WARN?'溜めすぎ注意！ 離して攻撃':p.ch>=CH_FULL?'CHARGE READY — 指を離して攻撃':'スティック↑でジャンプ ／ 攻撃：長押しで溜め';
 let ready=(p.cid==='rubber'&&p.gearM>=100&&p.gear<5&&!p.tired)||(p.cid==='boxer'&&p.ko>=100)||(p.cid==='yankee'&&p.rage>=100)||(p.cid==='swordsman'&&p.senku>=100);
 if(p.cid==='naruto'){
   ready=(p.energy||0)>=NARUTO_CLONE_COST&&shadowClonesAlive(p.id).length<NARUTO_CLONE_MAX&&p.spc<=0;
   const progress=p.castStyle==='shadow-charge'&&p.sph>0?Math.min(100,Math.round(p.sph/NARUTO_CLONE_HOLD*100)):0;
   special.style.setProperty('--charge',progress+'%');
 }else special.style.setProperty('--charge','0%');
 special.classList.toggle('ready',ready);
 const label=p.cid==='gunman'?(p.reloadT>0?'装填中':p.bullets+' / '+GUN_MAX):ready?'READY':p.cid==='archer'?(p.sph>=BOW_FULL?'5本 READY':p.spc>0?'準備中':'長押し：5本'):p.cid==='berserker'?'断頭斬':p.cid==='lancer'?'長押し→離す':p.cid==='bomber'?'長押し：地雷':p.cid==='rubber'?GEAR_JP[p.gear||1]:'キャラ固有';
 {const gb=document.getElementById('btn-g'),gl=p.cid==='rubber'?(ready?'GEAR!':'ギア'):'＝特殊';gb.classList.toggle('ready',p.cid==='rubber'&&ready);if(gb.querySelector('small').textContent!==gl)gb.querySelector('small').textContent=gl;}
 if(special.querySelector('small').textContent!==label)special.querySelector('small').textContent=label;
 if(p.out)text='観戦中 — バトルの決着を待とう';else if(ready)text='特殊技 READY ／ '+CC(p.cid).name;
 {const h=document.getElementById('combat-hint'),v=netIssue||text;if(h.textContent!==v)h.textContent=v;}
 animeControl(p);
}
function applyPrefs(){document.body.classList.toggle('left-handed',prefs.left);document.body.classList.toggle('swipe-special-input',prefs.specialInput==='swipe');audioBus();try{localStorage.setItem('sbo.preferences',JSON.stringify(prefs));}catch(_){}}
const settingsDialog=document.getElementById('settings-dialog');let settingsPaused=false;
document.getElementById('b-settings').onclick=()=>{resetTouch();settingsPaused=scene==='battle'&&!online;if(settingsPaused)scene='pause';settingsDialog.showModal();};
settingsDialog.addEventListener('close',()=>{resetTouch();if(settingsPaused){scene='battle';simAcc=0;}settingsPaused=false;});
document.getElementById('settings-close').onclick=()=>settingsDialog.close();
for(const key of ['volume','music','shake','left','lowFlash']){const el=document.getElementById('pref-'+key);if(key==='volume')el.value=prefs.volume;else el.checked=prefs[key];el.oninput=()=>{prefs[key]=key==='volume'?Number(el.value):el.checked;applyPrefs();};}
const specialInputSelect=document.getElementById('pref-special-input');
if(specialInputSelect){specialInputSelect.value=prefs.specialInput==='classic'?'classic':'swipe';specialInputSelect.addEventListener('change',e=>{resetTouch();prefs.specialInput=e.target.value==='classic'?'classic':'swipe';applyPrefs();});}
applyPrefs();
document.addEventListener('click',e=>{if(e.target.closest('button')&&actx)tone(600,880,.035,.035,'sine');});

// SENKU / instant activation. Every owner resolves only its own fighters once.
const SENKU_STOP=44;
let senkuQueue=[],senkuSeen=new Set(),senkuActive=null,senkuAfter=null,visualFrame=0;
function fireSenkuSlash(p){
 if(!p||p.out)return;
 const x=Math.round(p.x+p.f*26*CC(p.cid).size),y=Math.round(p.y-36*CC(p.cid).size);
 const targets=fighters.filter(t=>{const dx=(t.x-x)*p.f;return t.id!==p.id&&!t.out&&!sameTeam(p,t)&&dx>=12&&dx<=520&&Math.abs(t.y-32*CC(t.cid).size-y)<=54+12*CC(t.cid).size;}).map(t=>t.id);
 const e={k:'senku',eid:myId+'_senku_'+objSeq++,id:p.id,x,y,dir:p.f,targets};
 if(online)requestCinematic('senku',e);else receiveSenku(e);
}
function receiveSenku(e){
 if(!e||typeof e.eid!=='string'||senkuSeen.has(e.eid)||!byId(e.id))return;
 senkuSeen.add(e.eid);if(senkuSeen.size>128)senkuSeen.delete(senkuSeen.values().next().value);
 senkuQueue.push({...e,targets:normalizeTargets(e.targets)});beginNextSenku();
}
function beginNextSenku(){
 if(freezeT>0||!senkuQueue.length)return;
 const e=senkuQueue.shift(),p=byId(e.id);if(!p||p.out){beginNextSenku();return;}
 senkuActive={...e,hits:[],visualHits:(e.targets||[]).filter(id=>{const t=byId(id);return t&&!t.out&&!isInvuln(t);}),struck:false,impact:[]};
 for(const id of e.targets||[]){const t=byId(id);if(t&&isLocal(t)&&!t.out&&!isInvuln(t))senkuActive.hits.push(id);}
 if(isLocal(p)){p.sh=16;p.senkuWind=0;p.senku=0;p.spc=34;p.vx*=.25;}
 freezeT=SENKU_STOP;freezeMax=SENKU_STOP;fzType='senku';fz={x:e.x,y:e.y,att:e.id,cnt:e.id};
 sfxSenkuLock();
}
function releaseSenku(){releaseSenkuV6();}
function sfxSenkuLock(){
 tone(2500,1800,.035,.07,'triangle');tone(80,50,.16,.1,'sine');
 noiseHit(.045,.30,4800,true,28/60);tone(2200,300,.055,.13,'triangle',28/60);
}
function sfxSenkuRelease(){
 noiseHit(.04,.38,5200,true);tone(150,38,.18,.3,'triangle');tone(75,32,.28,.22,'sine');
 tone(2300,1200,.10,.045,'triangle',.03);
}
// Draw the extended blade as a single connected sword sweep, not a projectile.
// Three-frame sword sweep; longer held cut-in with an instant swing and sharp release.
function senkuSweep(x,y,dir,progress,alpha=1,after=false){
 const q=Math.max(0,Math.min(1,progress)),start=-1.13,angle=start+q*1.19,R=520;
 push();translate(x,y);scale(dir,1);noStroke();
 if(q>0){
  fill(255,236,178,42*alpha);beginShape();vertex(0,0);for(let a=start;a<=angle+.001;a+=.025)vertex(Math.cos(a)*R,Math.sin(a)*R*.12);vertex(Math.cos(angle)*R,Math.sin(angle)*R*.12);endShape(CLOSE);
  // Broad crescent at the tip: the far end carries the strongest visual weight.
  fill(255,250,222,110*alpha);beginShape();
  for(let a=Math.max(start,angle-.46);a<=angle+.001;a+=.018)vertex(Math.cos(a)*R,Math.sin(a)*R*.12);
  for(let a=angle;a>=Math.max(start,angle-.46);a-=.018)vertex(Math.cos(a)*(R-42),Math.sin(a)*(R-42)*.12);endShape(CLOSE);
  noFill();stroke(255,250,220,210*alpha);strokeWeight(2);beginShape();for(let a=start;a<=angle;a+=.018)vertex(Math.cos(a)*R,Math.sin(a)*R*.12);endShape();
 }
 if(!after){
  const ex=Math.cos(angle)*R,ey=Math.sin(angle)*R*.12;
  stroke(255,206,111,40*alpha);strokeWeight(17);line(0,0,ex,ey);
  noStroke();fill(255,249,218,235*alpha);quad(0,-2,ex,ey-2,ex+5,ey,0,3);
  stroke(255,255,248,255*alpha);strokeWeight(1.5);line(0,-1,ex,ey-2);
  stroke('#e0c18b');strokeWeight(4);line(-12,0,0,0);stroke('#222b38');strokeWeight(3);line(-10,0,-2,0);
 }
 pop();
}
function drawSenkuActor(p,progress){
 if(!p||p.out)return;
 const q=Math.max(0,Math.min(1,progress)),wind=q<28/44,cut=q>=28/44&&q<31/44;
 push();translate(p.x,p.y);scale(CC(p.cid).size);scale(p.f,1);
 // Low stance, both hands at the hilt, then a clean extended follow-through.
 stroke('#111a28');strokeWeight(8);strokeCap(ROUND);line(-3,-19,-18,0);line(1,-19,22,0);
 stroke(p.c);strokeWeight(3);line(-17,-4,-18,0);line(20,-4,22,0);
 noStroke();fill('#141d2b');quad(-15,-49,6,-49,17,-13,-17,-12);
 fill('#a42e3b');quad(-15,-49,-5,-47,-3,-16,-18,-13);fill('#303e50');quad(-6,-47,6,-49,17,-13,2,-16);
 fill('#dfd6bd');rect(-13,-24,25,4);fill('#b93744');triangle(-13,-21,-30,-11,-20,-29);
 stroke('#47556a');strokeWeight(5);line(-27,-18,8,-34);stroke('#c2bda9');strokeWeight(1);line(-27,-19,7,-35);
 // Completely blank head. The short tie sits behind the head, never across a face.
 noStroke();fill(p.c);circle(wind?-7:-2,wind?-57:-59,20);
 fill('#d7d4c8');quad(-14,-48,6,-49,9,-43,-13,-41);
 stroke('#b8c2ca');strokeWeight(1);line(-12,-46,6,-46);
 const hx=wind?3:26,hy=wind?-33:-36;
 stroke('#313f51');strokeWeight(7);line(-9,-43,wind?-10:9,wind?-29:-34);line(wind?-10:9,wind?-29:-34,hx,hy);
 stroke('#232e40');strokeWeight(6);line(5,-44,wind?13:18,-28);line(wind?13:18,-28,hx-3,hy+1);
 noStroke();fill(p.c);circle(hx,hy,5);circle(hx-4,hy+2,5);
 if(!cut){push();translate(hx,hy);rotate(wind?-2.83:.08);drawKatana(0,0,1,'swing');pop();}
 pop();
}
function paintSenkuWorld(){
 if(!senkuActive)return;const e=senkuActive,el=SENKU_STOP-freezeT,t=el/SENKU_STOP;
 push();noStroke();fill(6,8,14,175);rect(-300,-300,stage.w+600,stage.h+600);
 for(const f of fighters)if(!f.out&&f.id!==e.id)drawFighter(f);
 const actor=byId(e.id);drawSenkuActor(actor,t);
 if(el>=28&&el<31)senkuSweep(e.x,e.y,e.dir,Math.min(1,(el-27)/3),1);
 else if(el>=31)senkuSweep(e.x,e.y,e.dir,1,Math.max(.05,1-(el-31)/13),true);
 paintSenkuContact(e,el);
 if(el>=31){for(const id of e.visualHits){const f=byId(id);if(!f||f.out)continue;const y=f.y-32*CC(f.cid).size;stroke(255,240,195,160);strokeWeight(1);line(f.x-18,y+13,f.x+21,y-15);}}
 pop();
}
function paintSenkuCutin(){
 if(!senkuActive)return;const e=senkuActive,el=SENKU_STOP-freezeT,t=el/SENKU_STOP;
 const enter=Math.min(1,t/.12),fade=t>.70?(1-t)/.30:1;
 push();noStroke();fill('#050811');rect(0,0,W,24*enter);rect(0,WH-24*enter,W,24*enter);
 // A lower framing cut-in leaves the actual extended blade and its targets readable.
 if(el<29){
  const slide=(1-enter)*200;push();translate(-slide,43);
  fill('#100f17');quad(0,0,304,0,274,127,0,127);fill('#a22f40');quad(0,0,12,0,12,127,0,127);
  push();translate(90,120);scale(1.65);drawSenkuPortrait();pop();
  textAlign(LEFT,CENTER);textStyle(BOLDITALIC);textSize(42);fill('#f7ecd5');text('旋空',160,49);
  textStyle(NORMAL);textSize(10);fill('#c29991');text('S E N K U',163,85);pop();
 }
 if(t>=28/44){
  if(el===29){fill(255,247,216,65);rect(0,0,W,WH);}
  textAlign(RIGHT,CENTER);textStyle(BOLDITALIC);textSize(44);fill(255,244,220,255*fade);text('一 刀 両 断',W-28,WH-72);
  textSize(10);textStyle(NORMAL);fill(220,200,174,255*fade);text('S W O R D   E X T E N S I O N',W-30,WH-40);
 }
 pop();
}
function drawSenkuPortrait(){
 // Face-free silhouette in the same burgundy / graphite uniform as the fighter.
 stroke('#141c2a');strokeWeight(7);strokeCap(ROUND);line(-7,-11,-20,0);line(0,-12,23,0);
 noStroke();fill('#182232');quad(-16,-45,8,-45,15,-10,-21,-10);fill('#9c293b');quad(-16,-45,-6,-43,-3,-12,-21,-10);
 fill('#e0d6bc');rect(-16,-20,28,4);fill('#d5d9de');circle(-5,-56,21);
 fill('#c5c4b9');quad(-14,-45,7,-46,10,-40,-13,-38);
 stroke('#3e4b5e');strokeWeight(6);line(-11,-39,-14,-26);line(-14,-26,7,-29);line(5,-38,16,-24);line(16,-24,7,-29);
 stroke('#4b5769');strokeWeight(4);line(-27,-15,8,-30);stroke('#e3dbc3');strokeWeight(1);line(-27,-16,7,-31);
 noStroke();fill('#c8ccd5');circle(7,-29,5);circle(4,-27,4);
}
function paintSenkuAfter(){
 if(!senkuAfter)return;const e=senkuAfter,q=e.life/e.max;
 senkuSweep(e.x,e.y,e.dir,1,q*.6,true);
 push();for(let i=0;i<10;i++){const x=e.x+e.dir*(45+i*45),y=e.y+(1-q)*(i%2?1:-1)*(18+i*2);stroke(250,227,183,130*q);strokeWeight(1);line(x,y,x+e.dir*14*q,y-5*q);}pop();
 if(freezeT===0&&--e.life<=0)senkuAfter=null;
}
function drawKatana(x,y,dir,mode){
 push();translate(x,y);scale(dir,1);rotate(mode==='back'?-2.55:mode==='swing'?.04:-.70);
 stroke('#0a101a');strokeWeight(4);line(-8,0,0,0);stroke('#b3aa91');strokeWeight(1);line(-7,-1,-1,-1);
 stroke('#c4ac79');strokeWeight(2);line(1,-5,1,5);
 noStroke();fill('#e7e8dd');beginShape();vertex(3,-1.5);vertex(43,-3);vertex(53,-7);vertex(47,-1);vertex(3,2.5);endShape(CLOSE);
 stroke('#ffffff');strokeWeight(.8);line(4,-1.5,43,-3);line(43,-3,53,-7);
 pop();
}

const fighterPalette=['#f45349','#e99c48','#8171d4','#ba9376','#dc6178','#d58b4a','#ab4554','#7d9ed0','#b58b63','#74a784','#2fae9a','#b87558'];
const fighterRoles={karate:'BALANCED / 接近戦',bomber:'EXPLOSIVE / 爆破',ninja:'SPEED / 機動力',sumo:'POWER / 重量級',boxer:'KNOCKOUT / 一撃',yankee:'RAGE / 怒り',swordsman:'SENKU / 一閃',lancer:'REACH / 突撃',gunman:'SHOOTER / 射撃',archer:'VOLLEY / 弓射ち',rubber:'STRAW HAT / ギア',berserker:'EXECUTION / 破壊の一撃'};
function updateFighterShowcase(){
 const id=settings.cid,C=CC(id),i=Object.keys(CHARS).indexOf(id),col=ANIME_COLORS[id]||fighterPalette[i]||'#baa6da';
 const hero=document.getElementById('fighter-showcase');hero.style.setProperty('--fighter-color',col);hero.dataset.en=C.en;
 hero.innerHTML=portrait(id)+`<span class="fighter-code">FIGHTER / ${String(i+1).padStart(2,'0')}</span><div class="fighter-name"><small>${fighterRoles[id]||({goku:'SAIYAN / 段階変身',gojo:'LIMITLESS / 空間操作',tanjiro:'BREATHING / 剣技',naruto:'NINJA / 忍術',jotaro:'STAND / 時止め'}[id])}</small><b>${C.name}</b></div>`;
 document.getElementById('char-info').style.setProperty('--fighter-color',col);
 document.querySelectorAll('#char-grid .ci').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.cid===id)));
}
function fighterInfo(C){return `<div class="ability-line"><b>特殊技</b>　${C.sp}</div>`+['スピード','パワー','おもさ'].map((l,i)=>`<div class="stat"><b>${l}</b><div class="gauge"><i style="width:${C.st[i]*20}%"></i></div></div>`).join('')+`<details class="ability-detail"><summary>上必殺技・キャラ特性を見る</summary><p><b>上技</b>　${C.up}</p><p><b>特性</b>　${C.ab}</p></details>`;}
let hudKey='';
function setTxt(el,v){if(el&&el.textContent!==v)el.textContent=v;}
function setVar(el,k,v){if(el&&el['_'+k]!==v){el['_'+k]=v;el.style.setProperty(k,v);}}
function drawHUD(){const rosterFighters=fighters.filter(f=>!f.shadowClone);
 const roster=document.getElementById('battle-roster');const key=(battleTeamMode?'T':'F')+'|'+rosterFighters.map(p=>p.id+':'+p.cid+':'+p.c+':'+p.team+':'+(p.cid==='eren'?p.erenForm:p.cid==='rubber'?p.gear:isAnime(p)?(p.form||0)+':'+(p.modeT>0):0)).join('|');
 if(key!==hudKey){hudKey=key;roster.style.setProperty('--columns',Math.min(4,rosterFighters.length));
  roster.innerHTML=rosterFighters.map(p=>`<div class="hud-card ${p.id===myId?'me ':''}${rosterFighters.length>4?'crowded':''}" style="--team:${battleTeamMode?teamColor(p.team):p.c}"><div class="hud-portrait">${portrait(p.cid,p.gear,p.cid==='eren'?p.erenForm:p.form,p.modeT>0)}</div><div class="hud-info"><div class="hud-name"></div><div class="hud-damage"></div></div><div class="hud-stocks"></div><div class="hud-skill"></div><div class="hud-meter"></div></div>`).join('');
 }
 rosterFighters.forEach((p,i)=>{const el=roster.children[i];if(!el)return;el.classList.toggle('out',p.out);setTxt(el.querySelector('.hud-name'),(battleTeamMode?teamName(p.team)+' / ':'')+(p.id===myId?'P1 / ':p.cpu?'CPU / ':'')+p.label);
 const d=el.querySelector('.hud-damage');setTxt(d,Math.round(p.d)+'%');d._c=d._c||'';const dc=p.d<60?'#fff9e9':p.d<110?'#ffc363':'#ff6453';if(d._c!==dc){d._c=dc;d.style.color=dc;}
 const stock=el.querySelector('.hud-stocks');if(stock.childElementCount!==Math.max(0,p.s))stock.innerHTML='<i></i>'.repeat(Math.max(0,p.s));
 let m=0,label='';if(p.cid==='boxer'){m=p.ko;label=m>=100?'KO READY':'KO';}if(p.cid==='swordsman'){m=p.senku;label=m>=100?'旋空 READY':'旋空';}if(p.cid==='yankee'){m=p.rageT>0?p.rageT/RAGE_T*100:p.rage;label=p.rageT>0?'RAGE!':m>=100?'RAGE READY':'RAGE';}if(p.cid==='gunman'){m=p.bullets/GUN_MAX*100;label=p.reloadT>0?'RELOAD':p.bullets+' / '+GUN_MAX;}
 if(p.cid==='archer'){m=p.sph>0?Math.min(100,p.sph/BOW_FULL*100):Math.max(0,100-p.spc/30*100);label=p.sph>=BOW_FULL?'5 ARROWS':p.sph>0?'DRAW':p.spc>0?'WAIT':'BOW';}
 if(p.cid==='berserker'){m=100;label=p.a>0&&p.mv&&['axeheavy','axeup'].includes(p.mv.kind)?'SWING':'AXE READY';}
 if(p.cid==='sumo'&&p.arm>0)label='ARMOR';
 if(p.cid==='rubber'){const g=p.gear||1;m=g>=5?(p.gearT/GEAR5_T*100):p.gearM;label=p.tired>0?'ギア5終了':g>=5?'GEAR 5':p.gearM>=100?'GEAR READY':GEAR_NAME[g];}
 const animeMeter=animeHud(p);if(animeMeter){m=animeMeter.m;label=animeMeter.label;}
 el.classList.toggle('ko-armed',p.cid==='boxer'&&p.ko>=100&&!p.out);el.classList.toggle('rage-active',rageOn(p)&&!p.out);
 setVar(el,'--meter',Math.round(Math.max(0,Math.min(100,m)))+'%');setTxt(el.querySelector('.hud-skill'),label);
 });
 setVar(roster,'--pc-columns',String(Math.max(1,rosterFighters.length)));
 setTxt(document.getElementById('match-label'),battleTeamMode?(online?'ONLINE TEAM BATTLE':'TEAM BATTLE'):(online?'ONLINE MATCH':'LOCAL BATTLE'));
 if(!online){setTxt(document.getElementById('match-stage'),stage.name);}
 else if(performance.now()-netDiagAt>650){
  netDiagAt=performance.now();
  const latency=netRtt?'　応答 '+Math.round(netRtt/10)*10+'ms':'';
  const fps='　'+Math.round(netPerfFps)+'FPS';
  setTxt(document.getElementById('match-stage'),stage.name+latency+fps);
 }
}
function titleIllustration(){return `<svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="heroRed" x2="1" y2="1"><stop stop-color="#ff6550"/><stop offset="1" stop-color="#b42a31"/></linearGradient><linearGradient id="heroIce" x2="1" y2="1"><stop stop-color="#a7fff1"/><stop offset="1" stop-color="#3eacb1"/></linearGradient></defs><path d="M840-80h420L810 980H390z" fill="#ff493f09"/><path d="M1060-80h5L600 980h-5z" fill="#ff493f50"/><circle cx="1090" cy="400" r="290" fill="none" stroke="#98b3c014" stroke-width="1"/><circle cx="1090" cy="400" r="265" fill="none" stroke="#98b3c012" stroke-width="35"/><g transform="translate(1020 540) rotate(-12)"><ellipse cx="10" cy="230" rx="210" ry="20" fill="#0005"/><g stroke="#080d19" stroke-width="38" stroke-linecap="round" stroke-linejoin="round"><path d="M0-110L20 48-100 190M20 48l140 130M-4-76l-110 20-62-80M0-80l118-48 56-56" fill="none"/></g><g stroke="url(#heroRed)" stroke-width="23" stroke-linecap="round" stroke-linejoin="round"><path d="M0-110L20 48-100 190M20 48l140 130M-4-76l-110 20-62-80M0-80l118-48 56-56" fill="none"/></g><path d="M-25-110h45L48 16H-17z" fill="#172537"/><path d="M-18-104L0-28l14-76" fill="#f0dfb2"/><circle cx="-10" cy="-156" r="42" fill="url(#heroRed)" stroke="#0c1420" stroke-width="6"/><path d="M-48-166h76M-48-166l-45 30" stroke="#f4dcc1" stroke-width="9"/><circle cx="172" cy="-190" r="25" fill="#ff8b68"/></g><g transform="translate(1200 240) scale(.8) rotate(18)"><g stroke="#78dfce" stroke-width="19" stroke-linecap="round"><path d="M0-34v100l-70 83M0 66l75 67M0-22l-60 38M0-22l58 25 39-32" fill="none"/></g><path d="M-25-40h50l17 115H-39z" fill="#232d40"/><path d="M-17-33l14 77M18-33L3 44" stroke="#b34d5b" stroke-width="3"/><circle cx="0" cy="-70" r="30" fill="url(#heroIce)"/><path d="M-30-78q20-43 58 0" fill="#102635"/><path d="M100-33L-160-185" stroke="#baffec" stroke-width="5"/></g><path d="M540 520L1430 50" stroke="#88ffe02a" stroke-width="60"/><path d="M540 520L1430 50" stroke="#baffe5a0" stroke-width="2"/><path d="M760 790L1430 470" stroke="#ff82642a" stroke-width="30"/></svg>`;}
document.querySelector('.title-art').innerHTML=titleIllustration();
function paintMatchIntro(){
 push();noStroke();
 if(bt.phase==='count'){
  const t=bt.t,txt=t>140?'3':t>80?'2':t>20?'1':'GO!';const beat=t>20?(t-20)%60:t;const pulse=1+Math.max(0,(beat-40)/60);
  fill(6,12,22,95);rect(0,0,W,WH);fill('#0a101c');quad(0,WH/2-55,W,WH/2-90,W,WH/2+65,0,WH/2+95);
  fill(txt==='GO!'?'#ff493f':'#ffd55e');quad(0,WH/2+82,W,WH/2+52,W,WH/2+58,0,WH/2+88);
  push();translate(W/2,WH/2);scale(pulse);textAlign(CENTER,CENTER);textStyle(BOLDITALIC);textSize(txt==='GO!'?118:130);fill('#f6f4ed');text(txt,0,-5);pop();
  textAlign(CENTER,CENTER);textStyle(BOLD);textSize(12);fill('#a7b5ca');text(txt==='GO!'?'BREAK YOUR LIMIT':'GET READY TO FIGHT',W/2,WH/2+119);
 }else if(bt.phase==='game'){
  fill(7,12,22,140);rect(0,0,W,WH);fill('#ffd55e');quad(0,WH/2-75,W,WH/2-40,W,WH/2+82,0,WH/2+47);
  textStyle(BOLDITALIC);textAlign(CENTER,CENTER);textSize(98);fill('#111724');text('GAME SET',W/2,WH/2);textSize(13);textStyle(BOLD);fill('#eef2f8');text('STICK BATTLE ONLINE',W/2,WH/2+109);
 }pop();
}
// Size the arena from actual remaining space, including two-row HUDs at eight players.
function fitArena(){
 const shell=document.getElementById('arena-shell'),wrap=document.getElementById('wrap');
 if(!shell.clientWidth||!shell.clientHeight)return;
 const cs=getComputedStyle(shell),roster=document.getElementById('battle-roster'),info=document.getElementById('match-info');
 // On a landscape touch device the HUD and buttons are overlaid instead of
 // reserving their height/width. Keep the actual world 16:9 (no stretched fighters).
 const landscapeTouch=!document.body.classList.contains('desktop-controls')&&
  window.innerWidth>window.innerHeight&&window.innerHeight<=560;
 const available=landscapeTouch?Math.max(80,shell.clientHeight-8):
  shell.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom)-roster.offsetHeight-info.offsetHeight-2*(parseFloat(cs.rowGap)||0);
 const cap=landscapeTouch?Infinity:document.body.classList.contains('desktop-controls')?Infinity:900;
 const w=Math.max(96,Math.min(cap,shell.clientWidth,Math.max(54,available)*16/9));
 if(Math.abs(parseFloat(wrap.style.width||'0')-w)>.5)wrap.style.width=w+'px';
 if(document.body.classList.contains('desktop-controls')){roster.style.width=w+'px';info.style.width=w+'px';}else{roster.style.width='';info.style.width='';}
}
const arenaObserver=new ResizeObserver(fitArena);arenaObserver.observe(document.getElementById('arena-shell'));arenaObserver.observe(document.getElementById('battle-roster'));
window.addEventListener('resize',fitArena);
// Safari's address/tab bars can change the visual viewport without a traditional resize.
// Update the layout at most once per animation frame; no forced orientation or fullscreen.
let safariLayoutScheduled=false;
function refreshSafariLayout(){
 if(safariLayoutScheduled)return;
 safariLayoutScheduled=true;
 requestAnimationFrame(()=>{
  safariLayoutScheduled=false;
  const vv=window.visualViewport;
  const visibleHeight=vv&&Number.isFinite(vv.height)?vv.height:window.innerHeight;
  if(Number.isFinite(visibleHeight)&&visibleHeight>0){
   document.documentElement.style.setProperty('--sbo-visible-height',visibleHeight+'px');
  }
  fitArena();
 });
}
window.addEventListener('orientationchange',refreshSafariLayout);
if(window.visualViewport){
 window.visualViewport.addEventListener('resize',refreshSafariLayout);
 window.visualViewport.addEventListener('scroll',refreshSafariLayout);
}
refreshSafariLayout();
function paintImpactWorld(){if(fzType==='timestopcin'){chronoWorld();return;}if(fzType==='dragon'){premiumDragonImpact();return;}
 if(!fz)return;const a=byId(fz.att),c=byId(fz.cnt),el=freezeMax-freezeT;
 const pal=fzType==='animeform'?animeFormPalette(fz.cid,fz.form):null;
 const tint=pal?pal.main:fzType==='gear'?GEAR_COL[fz?.lv||2]:fzType==='rage'?'#ff5549':fzType==='dragon'?'#ffe783':fzType==='blackflash'?'#e92b43':fzType==='domain'?'#969dff':fzType==='ko'?'#ffd55e':'#81e5ff';
 push();noStroke();fill(3,8,17,215);rect(-300,-300,stage.w+600,stage.h+600);
 for(let i=0;i<28;i++){const ang=i*TWO_PI/28+.12,r=65+(i%4)*12;stroke(tint+'99');strokeWeight(i%4===0?3:1);line(fz.x+cos(ang)*r,fz.y+sin(ang)*r,fz.x+cos(ang)*(r+180+el*5),fz.y+sin(ang)*(r+180+el*5));}
 if(fzType!=='blackflash'){
  noFill();stroke(tint+'70');strokeWeight(2);circle(fz.x,fz.y,100+el*3);
  stroke(tint+'20');strokeWeight(18);circle(fz.x,fz.y,125+el*3);
 }
 if(pal){
   // 本家ギアチェンジの暗い背景を使い、キャラクターだけを色鮮やかに残す。
   // 変身の間だけ光の柱が立ち上る。描画は既存のp5プリミティブだけ。
   const ss3=fz.cid==='goku'&&fz.form===3;
   const rr=ss3?72:55;
   noFill();stroke(pal.main);strokeWeight(ss3?4:2.5);
   for(let i=0;i<(ss3?11:7);i++){
    const xx=fz.x+(i-(ss3?5:3))*12;
    const h=80+((i*29+el*6)%115);
    line(xx,fz.y+29,xx+sin(el*.27+i*1.3)*8,fz.y+29-h);
   }
   noStroke();fill(255,255,255,20+16*sin(el*.22));circle(fz.x,fz.y,rr*2.4);
   noFill();stroke(pal.hot);strokeWeight(2.3);
   ellipse(fz.x,fz.y+27,60+el*3,14+el*.55);
   if(fz.cid==='goku'&&fz.form>=2){
    stroke('#bfeaff');strokeWeight(ss3?3:2);
    for(let j=0;j<(ss3?6:3);j++){
     const xx=fz.x-39+j*17,yy=fz.y-112;
     line(xx,yy,xx+10,yy+21);line(xx+10,yy+21,xx-1,yy+37);
    }
   }
   if(fz.cid==='tanjiro'){
    // ヒノカミ神楽。渦巻く炎と放射状の斬光で「いつもの変身カットイン」を強調。
    const px=fz.x,py=fz.y-27,progress=Math.min(1,el/30);
    noFill();strokeCap(ROUND);
    for(let i=0;i<4;i++){
      stroke(i%2===0?color(255,87,35,174-i*16):color(255,211,114,165-i*18));
      strokeWeight(11-i*1.7);
      const a=-PI*.88+i*.51+el*.052;
      arc(px,py,156+i*37,136+i*30,a,a+PI*.93);
    }
    for(let i=0;i<26;i++){
      const ang=i*TWO_PI/26+.08,rr=70+i%5*18,h=35+progress*(100+i%6*20);
      const x=px+cos(ang)*rr,y=py+sin(ang)*rr*.65;
      stroke(i%4===0?color(255,253,218,220):color(255,101,36,160));strokeWeight(i%4===0?3:1.8);
      line(x,y,x+cos(ang)*h,y+sin(ang)*h*.7);
    }
    if(el>12&&el<19){noStroke();fill(255,196,109,90*(1-abs(el-15.5)/3.5));rect(-300,-300,stage.w+600,stage.h+600);}
   }
   if(fz.cid==='naruto'&&fz.form===2){
    noFill();stroke('#ffd45f');strokeWeight(7);
    for(let j=0;j<4;j++)arc(fz.x-9+j*8,fz.y+7,68+j*17,93+j*15,-2.5,-.35);
   }
 }
 if(fzType==='timestopcin'){
   // スタンドと人物は drawFighter で前面に表示される。
   // ルフィと同じ暗転背景の中、紫の時空亀裂と青緑の発光を重ねる。
   const pulse=1+.06*sin(el*.28);
   noStroke();fill(33,15,69,125);rect(-300,-300,stage.w+600,stage.h+600);
   noFill();
   for(let i=0;i<9;i++){
    const rr=(52+i*44+Math.max(0,el-9)*5)*pulse;
    stroke(i%2?color(100,239,224,132-i*8):color(206,159,255,155-i*8));
    strokeWeight(i%3===0?3:1.4);
    push();translate(fz.x,fz.y);rotate((i-4)*.047+sin(el*.13)*.018);
    ellipse(0,0,rr*1.95,rr*.62);pop();
   }
   for(let i=0;i<25;i++){
    const a=i*TWO_PI/25+.03,r=65+(i%3)*16,r2=270+(i%5)*35+Math.min(el,24)*3;
    stroke(i%3===0?color(248,224,255,125):color(130,242,227,85));strokeWeight(i%4===0?2.3:1.0);
    line(fz.x+cos(a)*r,fz.y+sin(a)*r*.72,fz.x+cos(a)*r2,fz.y+sin(a)*r2*.72);
   }
   // 演出後半に一度だけ時空が切り替わる閃光。
   if(el>=22&&el<28){noStroke();fill(206,250,241,110*(1-abs(el-25)/3));rect(-300,-300,stage.w+600,stage.h+600);}
 }
 if(fzType==='domain'){
   // 無量空処：ルフィのギアチェンジと同じ停止世界カットイン。
   // 五条を中心に「情報の無限」を、画面全体のレイヤーと粒子で描写する。
   const q=Math.min(1,el/15),pulse=1+.07*sin(el*.22);
   noStroke();fill(5,8,29,191);rect(-300,-300,stage.w+600,stage.h+600);
   // 破れた空間の格子を奥行き方向へ伸ばす。円形の黒い塊は使わない。
   for(let k=0;k<10;k++){
     const r=(58+k*40+el*1.7)*pulse;
     noFill();stroke(k%2?color(120,183,255,88-k*5):color(190,157,255,106-k*5));
     strokeWeight(k%3===0?2:1);
     push();translate(fz.x,fz.y);rotate(k*.105+sin(el*.025)*.028);
     rect(-r,-r*.27,r*2,r*.54,7);pop();
   }
   // 情報が空間全体に放出される。初期位置は決定的なので毎フレームちらつかない。
   for(let i=0;i<160;i++){
     const an=i*2.399963,rad=24+sqrt(i)*41;
     const xx=fz.x+cos(an)*rad,yy=fz.y+sin(an)*rad*.68;
     noStroke();fill(i%7===0?color(255,255,255,180):i%2?color(164,192,255,130):color(157,245,244,95));
     circle(xx,yy,i%9===0?3.6:1.5);
     if(i%11===0){stroke(164,208,255,64);strokeWeight(1);line(xx-12,yy,xx+12,yy);line(xx,yy-12,xx,yy+12);}
   }
   // 発動の瞬間に光のシートが広がる。後半は落ち着き、文字に視線が集まる。
   if(el<15){noStroke();fill(182,225,255,48*(1-el/15));rect(-300,-300,stage.w+600,stage.h+600);}
 }
 if(fzType==='dragon'){
   // 龍拳カットイン：獣の形はゼロ。天空を裂く金の光柱＋拳の残光。
   const flicker=.84+.16*Math.sin(el*.65),y0=fz.y+145,y1=fz.y-205;
   noFill();strokeCap(ROUND);
   stroke(210,87,8,58*flicker);strokeWeight(69);line(fz.x-27,y0,fz.x+46,y1);
   stroke(255,156,20,145*flicker);strokeWeight(38);line(fz.x-25,y0,fz.x+44,y1);
   stroke(255,220,87,230*flicker);strokeWeight(18);line(fz.x-22,y0,fz.x+42,y1);
   stroke(255,255,229,240*flicker);strokeWeight(5);line(fz.x-21,y0,fz.x+42,y1);
   // 上へ走る高速の斬光と金色の稲妻
   for(let i=0;i<18;i++){
     const off=(i-8.5)*25,y=fz.y+130-(i%5)*70-(el%5)*16;
     stroke(i%3===0?color(255,255,219,220):color(255,171,39,146));
     strokeWeight(i%4===0?3.5:1.6);
     line(fz.x+off-18,y+24,fz.x+off+32,y-43);
   }
   // 動物の輪郭に見える同心弧は使わず、天に伸びる斬光で統一。
 }
 if(fzType==='blackflash'){
   // 黒閃カットイン：黒い丸・球体を描かず、空間の裂け目と赤い雷のみ。
   // 斜めの黒い亀裂は「線」であり塗り潰しの楕円は使わない。
   strokeCap(ROUND);strokeJoin(MITER);noFill();
   for(let i=0;i<11;i++){
     const ang=i*TWO_PI/11+.11,spread=(i%4)*17;
     const x=fz.x+Math.cos(ang)*12,y=fz.y+Math.sin(ang)*10;
     const mx=fz.x+Math.cos(ang)*(61+spread)-Math.sin(ang)*(i%2?13:-13);
     const my=fz.y+Math.sin(ang)*(44+spread)+Math.cos(ang)*(i%2?13:-13);
     const ex=fz.x+Math.cos(ang)*(205+spread),ey=fz.y+Math.sin(ang)*(154+spread);
     // 奥の黒い亀裂、周囲の赤い発光、中心の白赤い電光。
     stroke(13,2,8,235);strokeWeight(13);
     line(x,y,mx,my);line(mx,my,ex,ey);
     stroke(241,21,45,225);strokeWeight(5);
     line(x+3,y+2,mx+3,my+2);line(mx+3,my+2,ex+3,ey+2);
     if(i%3===0){stroke(255,186,179,200);strokeWeight(2);line(x+6,y,mx+5,my);}
   }
   // 大きな球体ではなく一直線の赤い閃光。
   stroke(255,58,61,120);strokeWeight(21);line(fz.x-240,fz.y+106,fz.x+220,fz.y-102);
   stroke(255,240,231,215);strokeWeight(3);line(fz.x-240,fz.y+106,fz.x+220,fz.y-102);
 }
 if(a)drawFighter(a);if(c&&c!==a)drawFighter(c);pop();
}
function paintDomainCutin(){
 if(!fz)return;
 const t=1-freezeT/Math.max(1,freezeMax);
 const slide=1-pow(1-Math.min(1,t*5.2),3);
 const vanish=Math.min(1,freezeT/12);
 const alpha=Math.min(slide,vanish);
 push();
 // 上下のシネマスコープ帯と、ルフィ方式の斜めテロップ。
 noStroke();fill('#040918');rect(0,0,W,25);rect(0,WH-25,W,25);
 if(t>.16&&t<.24){fill(201,235,255,175*(1-abs(t-.20)/.04));rect(0,0,W,WH);}
 const y=WH*.735;
 fill(6,8,32,232*alpha);quad(0,y-62,W,y-94,W,y+52,0,y+77);
 fill(92,121,220,185*alpha);quad(0,y-61,W*.77,y-86,W*.76,y-69,0,y-45);
 fill(169,219,255,165*alpha);quad(0,y-39,W*.65,y-61,W*.65,y-54,0,y-32);
 // 「無量」を象徴する情報の列。背景の輝きと競合しない透明度。
 stroke(143,199,255,68*alpha);strokeWeight(1);
 for(let i=0;i<29;i++){
   const xx=(i+.5)*W/29;
   const yy=WH*.29+(i%5)*11;
   line(xx,yy,xx+(xx-W*.5)*.095,yy-80-(i%4)*19);
 }
 // 星のような情報片
 noStroke();for(let i=0;i<41;i++){
   const xx=(i*101.7+31)%W,yy=(i*i*29.4+40)%WH*.59;
   fill(i%3?color(157,185,255,110*alpha):color(230,251,255,170*alpha));circle(xx,yy,i%7===0?3.2:1.3);
 }
 // 技名はラテン文字ではなく、日本語を最前面に大きく表示。
 textAlign(LEFT,CENTER);textFont('sans-serif');textStyle(BOLD);
 stroke('#0b1030');strokeWeight(8);fill('#f5f8ff');textSize(70);
 text('無量空処',28-(1-slide)*W*.75,y+1);
 noStroke();fill('#b3f0ff');textSize(21);
 text('領域展開',32,y-63);
 fill('#ccd9ff');textSize(13);
 text('無限の情報が、世界を満たす',33,y+73);
 fill('#b8b6fa');textSize(11);
 text('五条 悟',33,y+94);
 pop();
}
function legacy_paintJotaroTimeStopCutin(){
 if(!fz)return;
 const t=1-freezeT/Math.max(1,freezeMax);
 const slide=1-Math.pow(1-Math.min(1,t*5.5),3);
 push();
 noStroke();fill('#080a16');rect(0,0,W,23);rect(0,WH-23,W,23);
 if(t>.39&&t<.49){fill(231,255,247,170*(1-abs(t-.44)/.05));rect(0,0,W,WH);}
 const y=WH*.745;
 fill(8,9,25,235);quad(0,y-48,W,y-73,W,y+52,0,y+67);
 fill('#9164c4');quad(0,y-48,W*.74,y-66,W*.74,y-60,0,y-40);
 fill('#a5f2dc');quad(0,y-38,W*.64,y-49,W*.64,y-44,0,y-34);
 textAlign(LEFT,CENTER);textFont('sans-serif');textStyle(BOLD);
 stroke('#100c24');strokeWeight(7);fill('#faf3ff');textSize(61);
 text('スタープラチナ！',28-(1-slide)*W*.65,y-5);
 noStroke();fill('#b9fff0');textSize(16);text('スタープラチナ・ザ・ワールド',31,y+45);
 textSize(11);fill('#d1bfec');text('空条承太郎',32,y+69);
 // 時間の停止を象徴する、割れた時計針。目立ちすぎない控えめな装飾。
 noFill();stroke(194,173,237,95);strokeWeight(1.8);
 const cx=W*.83,cy=WH*.34,r=78;
 ellipse(cx,cy,r*2,r*2);
 for(let i=0;i<12;i++){
  const a=i*TWO_PI/12;
  line(cx+cos(a)*(r-10),cy+sin(a)*(r-10),cx+cos(a)*r,cy+sin(a)*r);
 }
 stroke('#d7fff6');strokeWeight(3);
 line(cx,cy,cx-26,cy-34);line(cx,cy,cx+43,cy-16);
 pop();
}
function paintImpactText(){
 if(fzType==='timestopcin'){paintJotaroTimeStopCutin();return;}
 if(fzType==='gear'){paintGearCutin();return;}
 if(fzType==='animeform'){paintAnimeFormCutin();return;}
 if(fzType==='domain'){paintDomainCutin();return;}
 const el=freezeMax-freezeT,t=el/freezeMax,q=Math.min(1,t/.16);
 const theme=fzType==='rage'?['RAGE IGNITION','怒りを解き放て','#ff5549']:fzType==='dragon'?['龍拳','限界を超える一撃','#ffe783']:fzType==='blackflash'?['黒閃','黒と紅の衝撃','#ff354b']:fzType==='ko'?['K.O. UPPERCUT','一撃で、決めろ','#ffd55e']:['COUNTER','読み勝った、その一瞬','#81e5ff'];
 push();noStroke();fill('#050b15');rect(0,0,W,24);rect(0,WH-24,W,24);
 if(el<3){fill(245,248,240,95*(1-el/3));rect(0,0,W,WH);}
 const y=WH*.75;fill(theme[2]);quad(-60+(1-q)*-250,y-32,W*.78+(1-q)*-250,y-52,W*.72+(1-q)*-250,y+38,-60,y+58);
 textAlign(LEFT,CENTER);
 // 漢字を斜体ラテン字体へ任せず、日本語対応フォントを明示。
 if(fzType==='dragon'||fzType==='blackflash'){
  textFont('sans-serif');textStyle(BOLD);textSize(80);
  stroke('#090a12');strokeWeight(9);fill('#fff9e9');
  text(theme[0],26-(1-q)*250,y-8);
  noStroke();fill(theme[2]);textSize(16);textStyle(BOLD);
  text(theme[1],30,y+75);
 }else{
  textStyle(BOLDITALIC);textSize(['ko','dragon','blackflash'].includes(fzType)?49:57);
  fill('#0d1725');text(theme[0],24-(1-q)*250,y);
  textStyle(BOLD);textSize(11);fill('#e7eef9');text(theme[1],26,y+81);
 }
 pop();
}

function applyInputMode(){
 const mode=['auto','touch','keyboard'].includes(prefs.controls)?prefs.controls:'auto';
 const desktop=mode==='keyboard'||(mode==='auto'&&window.matchMedia('(hover: hover) and (pointer: fine)').matches);
 document.body.classList.toggle('desktop-controls',desktop);
 const controlSelect=document.getElementById('pref-controls');if(controlSelect)controlSelect.value=mode;
 if(typeof fitArena==='function')requestAnimationFrame(fitArena);
}
const fineInputQuery=window.matchMedia('(hover: hover) and (pointer: fine)');fineInputQuery.addEventListener('change',applyInputMode);
document.getElementById('pref-controls').addEventListener('change',e=>{prefs.controls=e.target.value;applyPrefs();resetTouch();applyInputMode();});
applyInputMode();

// Clothing layers preserve blank faces and the existing collision shapes.
function costumeV5(p,col){
 const flap=Math.sin(visualFrame*.14)*2+Math.min(Math.abs(p.vx||0),4);
 push();noStroke();
 switch(p.cid){
 case 'archer':
  fill('#214339');quad(-9,-18,-20-flap,-8,-22-flap,25,8,13);fill('#456c55');quad(-9,-17,8,-17,12,13,-10,13);
  fill('#b89c64');quad(-9,-18,-5,-18,11,8,7,10);fill('#242f2e');rect(-11,8,23,4,1);fill('#ceb780');rect(3,7,5,6,1);
  fill('#71533b');rect(-18,-22,7,25,2);stroke('#d9d5b2');strokeWeight(1.5);for(let i=0;i<3;i++)line(-17+i*2,-20,-20+i*3,-33);break;
 case 'berserker':
  fill('#593c39');quad(-11,-17,11,-17,15,16,-15,16);fill('#374351');quad(-10,-17,8,-17,9,5,-7,7);
  fill('#87929a');quad(-18,-18,-8,-22,-3,-10,-18,-8);fill('#c9bd98');triangle(-17,-17,-15,-26,-12,-17);triangle(-11,-20,-7,-28,-6,-17);
  fill('#b39161');quad(-8,-18,-4,-18,12,9,8,11);fill('#242d38');rect(-14,7,28,6,1);fill('#d8b877');rect(-3,6,6,8,1);
  fill('#7d4b42');quad(-12,13,0,13,-4,28,-15,23);quad(1,13,12,13,16,23,5,28);break;
 case 'karate':
  fill('#e4e7df');quad(-10,-17,8,-17,12,8,-11,8);fill('#aebfc4');triangle(-10,-17,1,-5,-5,5);
  fill('#faf4df');quad(0,-16,8,-17,2,2,-3,-2);fill('#273647');rect(-12,5,24,4,1);
  fill('#b3403d');quad(-3,8,1,8,-2,21,-6,18);fill('#dfbb70');rect(5,5,3,4);
  fill('#d7e0dc');quad(-13,-15,-8,-17,-7,-7,-15,-6);fill(col);rect(-14,-7,7,3,1);break;
 case 'bomber':
  fill('#171f2c');rect(-16,-13,10,23,3);fill('#c47932');rect(-17,-10,3,15,1);
  fill('#344454');quad(-10,-17,10,-17,12,10,-12,10);fill('#172333');rect(-7,-12,14,14,2);
  fill('#d69b50');quad(-10,-16,-7,-16,10,6,7,8);fill('#c9d7d7');rect(-4,-9,8,2,1);
  fill('#151e2a');rect(-12,5,24,5,1);fill('#e8b566');rect(-9,4,5,7,1);rect(4,4,5,7,1);
  fill('#748899');rect(-13,-17,7,5,2);rect(6,-17,7,5,2);break;
 case 'ninja':
  fill('#6d598e');quad(-8,-15,-p.f*(26+flap),-5,-p.f*(36+flap),-13,0,-20);
  fill('#1e263d');quad(-9,-17,7,-17,11,10,-11,10);fill('#3b4160');quad(-8,-16,3,-12,8,6,-3,5);
  fill('#c2b6e5');quad(-7,-17,-4,-18,9,3,6,5);fill('#776395');rect(-11,5,22,4,1);
  fill('#171e30');triangle(-10,9,-15,21,-1,12);triangle(1,9,12,9,12,18);
  fill('#a3adc4');rect(-12,-15,6,5,1);fill('#dadcec');triangle(7,1,11,5,7,9);break;
 case 'sumo':
  fill('#1c293e');quad(-16,4,16,4,15,14,-15,14);fill('#bd9154');rect(-15,5,30,3,1);
  fill('#2b405b');quad(-8,11,8,11,10,24,-10,24);fill('#e3c17d');quad(0,13,5,18,0,23,-5,18);
  stroke('#d7b778');strokeWeight(1);for(let i=-12;i<=12;i+=6)line(i,12,i,18);noStroke();
  fill('#efeee3');rect(-19,0,6,5,2);rect(13,0,6,5,2);break;
 case 'yankee':
  fill('#131e2a');quad(-10,-18,10,-18,15,16,-16,16);triangle(-15,14,-20-flap,26,-3,17);triangle(4,14,17,14,18+flap,25);
  fill('#344251');quad(-9,-17,-3,-13,-3,12,-13,15);fill('#f2d28a');triangle(-9,-17,-3,-3,-1,-16);triangle(9,-17,3,-3,1,-16);
  fill('#e3ded0');rect(-2,-12,4,21);fill('#b49b62');for(let i=-8;i<=9;i+=6)circle(6,i,2);
  noFill();stroke('#d2b46d');strokeWeight(1.2);arc(8,-5,9,12,0,PI);break;
 case 'lancer':
  fill('#233754');quad(-7,-17,-17-flap,-11,-23-flap,22,5,12);
  fill('#536c82');quad(-9,-16,8,-16,11,7,-10,7);fill('#d8e2e1');quad(-7,-15,7,-15,4,0,0,5);fill('#8fa9b9');triangle(-7,-15,0,5,-9,0);
  fill('#c4b078');rect(-11,5,23,4,1);fill('#293c55');quad(-10,10,-1,10,-3,22,-14,20);quad(2,10,11,10,15,20,4,22);
  fill('#a8bdc8');quad(-15,-18,-7,-20,-5,-12,-16,-10);quad(6,-19,13,-17,16,-10,7,-11);
  fill(col);rect(-14,-16,6,2,1);break;
 case 'rubber': {
  const g=p.gear||1;
  // ルフィ：赤い前開きベスト＋青い短パン＋黄色い腰布。ギア5では白基調へ。
  if(g===5){
    fill('#f6f3e8');quad(-11,-17,-3,-14,-2,8,-13,11);quad(11,-17,3,-14,2,8,13,11);
    fill('#e7bd8b');quad(-4,-15,4,-15,5,8,-5,8);
    fill('#f2eee5');quad(-11,10,-1,10,-2,21,-12,20);quad(1,10,11,10,12,20,2,21);
    fill('#c48bd7');rect(-13,6,26,4,1);
  }else{
    fill('#e7bd8b');quad(-8,-17,8,-17,9,8,-9,8);                    // 胸
    fill('#d83d3f');quad(-11,-18,-2,-15,-3,9,-13,10);             // 左ベスト
    fill('#d83d3f');quad(11,-18,2,-15,3,9,13,10);                 // 右ベスト
    fill('#f0c791');triangle(-2,-15,0,-2,2,-15);
    fill('#e8bb42');rect(-13,6,26,4,1);                           // 腰布
    fill('#2877b9');quad(-11,10,-1,10,-2,21,-12,20);quad(1,10,11,10,12,20,2,21);
    fill('#f0e6c9');rect(-12,18,10,3,1);rect(2,18,10,3,1);        // 裾
    if(g===4){fill('#4a253c');ellipse(0,-1,31,27);fill('#d83d3f');ellipse(0,-1,21,17);}
  }
  break;
 }
 case 'gunman':
  fill('#362d30');quad(-10,-17,9,-17,15,20,2,16,-3,20,-15,20);
  fill('#775447');quad(-10,-17,-3,-12,-4,15,-15,20);fill('#9b7154');quad(2,-14,9,-17,15,20,5,16);
  fill('#e9d6aa');triangle(-7,-17,7,-17,0,-5);fill('#aa4238');triangle(-7,-17,9,-17,2,-9);
  fill('#1d2833');rect(-3,-7,6,17);fill('#bba16e');rect(-12,6,24,3,1);rect(-2,5,5,5,1);
  fill('#3d2d2b');rect(8,9,6,12,2);fill('#cfb484');for(let i=0;i<4;i++)rect(-9+i*3,-11+i*3,2,4,1);break;
 }
 pop();
}
function drawRevolver(x,y,dir,mode,p){
 push();translate(x,y);scale(dir,1);rotate(p.reloadT>0?-.85:(p.sh>0?-.16:-.08));
 noStroke();fill('#292c34');quad(-5,0,1,0,0,12,-7,10);fill('#805341');quad(-4,2,-1,2,-2,10,-6,9);
 fill('#bdc9ca');rect(-3,-7,13,9,2);fill('#69798a');circle(3,-3,9);fill('#263241');rect(0,-6,2,6,1);rect(4,-6,2,6,1);
 fill('#d5dedc');rect(8,-7,20,5,1);fill('#59677a');rect(9,-2,16,2,1);fill('#dac28b');rect(24,-9,3,3);rect(-5,-9,4,3);
 noFill();stroke('#b9a77a');strokeWeight(1.3);ellipse(2,5,7,6);
 if(p.sh>7&&p.reloadT===0){noStroke();fill('#ffe9ac');quad(28,-5,46,-9,39,-4,47,2);fill('#fffdf0');triangle(27,-6,39,-4,27,-2);}
 pop();
}
function sfxRevolver(){noiseHit(.035,.42,4200,true);noiseHit(.12,.27,650);tone(150,48,.16,.26,'triangle');tone(3100,1500,.027,.07,'triangle',.16);}
function sfxReload(){tone(1650,720,.035,.08,'triangle');noiseHit(.03,.08,3800,true);}
function upgradedCostumeSVG(id,c){
 const pieces={
 rubber:`<path d="M35 36h30l3 30H32z" fill="#1d6b62"/><path d="M36 37l12 27M32 62h36" stroke="#e9b44c" stroke-width="4"/><path d="M46 38l-1 12m10-12 1 12" stroke="#f1f3e6" stroke-width="2"/><path d="M38 21q12-12 24 0" fill="none" stroke="#2b3542" stroke-width="4"/><rect x="43" y="14" width="14" height="7" rx="3" fill="#2b3542"/><circle cx="47" cy="17.5" r="2.5" fill="#9ff3ff"/><circle cx="53" cy="17.5" r="2.5" fill="#9ff3ff"/><path d="M62 44q12 2 22-6" fill="none" stroke="#7fe3cf" stroke-width="5" stroke-dasharray="3 2"/><circle cx="87" cy="36" r="7" fill="#ff8a3d"/>`,
 archer:`<path d="M38 35L25 75 58 68 63 35" fill="#234c3e"/><path d="M36 36h27l3 31H35z" fill="#52765b"/><path d="M38 36l24 27M34 64h32" stroke="#c2ab72" stroke-width="4"/><path d="M37 31q-3-20 13-20t13 20" fill="none" stroke="#345b48" stroke-width="6"/><path d="M71 19q27 25 0 49M71 19v49" fill="none" stroke="#c9aa74" stroke-width="3"/><path d="M59 44h29m-7-4 7 4-7 4" fill="none" stroke="#e6ead8" stroke-width="2"/><path d="M30 48l-6-25m1 5-5-5m6 5 2-7" stroke="#ae926a" stroke-width="3"/>`,
 berserker:`<path d="M35 35h30l8 40-21-6-22 6z" fill="#72473e"/><path d="M36 36h28v29H36z" fill="#53616d"/><path d="M27 34l15-6 5 18-20 2z" fill="#a0a8a9"/><path d="M30 34l2-12 5 10m2-1 5-10 1 12" fill="#d5c89e"/><path d="M38 37l23 28M32 64h35" stroke="#c3a775" stroke-width="4"/><path d="M37 26q-1-14 13-14t13 14" fill="none" stroke="#74818a" stroke-width="6"/><path d="M38 19L26 10 33 25ZM62 19L74 10 67 25Z" fill="#d8c69c"/><path d="M65 72L82 17" stroke="#9e7d51" stroke-width="5"/><path d="M80 17Q97 10 97 34L77 31 65 24 69 12z" fill="#ced9d9"/><path d="M78 24l14 5" stroke="#b9664e" stroke-width="2"/>`,
 karate:`<path d="M35 36l14 5 14-5 4 30H33z" fill="#e6e8dc"/><path d="M37 36l13 20 10-20M36 62h28" fill="none" stroke="#9bacb4" stroke-width="3"/><path d="M35 61h30m-15 3-6 12" stroke="#253548" stroke-width="5"/><path d="M38 19h24m-22 0-16 7" stroke="#bd4943" stroke-width="4"/><path d="M55 61v5" stroke="#d8b876" stroke-width="3"/>`,
 bomber:`<rect x="29" y="37" width="12" height="28" rx="3" fill="#ad743e"/><path d="M36 35h28l3 31H33z" fill="#344556"/><rect x="42" y="40" width="17" height="18" rx="2" fill="#1c293a"/><path d="M38 36l24 26" stroke="#cda367" stroke-width="4"/><path d="M34 62h32" stroke="#172436" stroke-width="5"/><path d="M39 61v8m20-8v8" stroke="#d6a360" stroke-width="5"/><path d="M37 19q13-18 26 0z" fill="#354354"/><path d="M36 19h28m-17-9h7" stroke="#e6bb7a" stroke-width="3"/>`,
 ninja:`<path d="M42 37L16 28 22 39 9 47 42 42" fill="#756096"/><path d="M36 36h27l4 30-14-4-20 6z" fill="#232c45"/><path d="M39 36l21 25" stroke="#c0b9dc" stroke-width="4"/><path d="M33 61h32" stroke="#776397" stroke-width="5"/><path d="M38 16h24" stroke="#39435c" stroke-width="4"/><path d="M34 38l8 1-2 8-8-1" fill="#9aabc2"/><path d="M60 48l4 4-4 4-4-4z" fill="#d5ddeb"/>`,
 sumo:`<ellipse cx="50" cy="48" rx="22" ry="18" fill="${c}"/><path d="M28 57h44v10H28z" fill="#253a53"/><path d="M29 60h42" stroke="#d3b374" stroke-width="3"/><path d="M41 64h18l3 13H38z" fill="#314b69"/><path d="M50 65l5 5-5 5-5-5z" fill="#ebca83"/><path d="M27 49v8m46-8v8" stroke="#e8e9df" stroke-width="6"/><ellipse cx="50" cy="14" rx="7" ry="4" fill="#243244"/>`,
 yankee:`<path d="M35 35h29l11 40-18-6-7 7-7-7-18 6z" fill="#202e40"/><path d="M41 36l9 10 9-10M42 38v27m16-27v27" fill="none" stroke="#d6b974" stroke-width="3"/><path d="M49 44h3v22" stroke="#ddd7c5" stroke-width="4"/><path d="M59 47q15 10 1 14" fill="none" stroke="#c7a866" stroke-width="2"/><path d="M39 19q2-16 34-10q4 12-17 10" fill="#354354"/>`,
 lancer:`<path d="M39 36L27 72 57 64 65 35" fill="#2d4263"/><path d="M36 36h27l-3 26H40z" fill="#8ea9ba"/><path d="M39 37l11 21 11-21" fill="#d7e3e4"/><path d="M31 34l12-2-2 12-13-2m32-8 10 3 3 8-13-2" fill="#a7bccb"/><path d="M36 62h27" stroke="#cdb87d" stroke-width="4"/><path d="M74 74V15" stroke="#c5af82" stroke-width="3"/><path d="M74 5l-7 18 7-3 7 3z" fill="#e3eef0"/><path d="M71 25l-6 12 9-4" fill="#ad4350"/>`,
 gunman:`<path d="M35 35h29l10 41-18-8-7 6-5-6-18 8z" fill="#694b40"/><path d="M36 36l9 5-6 27m24-32-9 5 7 27" stroke="#a37b56" stroke-width="5"/><path d="M42 36h18l-9 9z" fill="#a7493e"/><path d="M39 42l20 18M33 63h34" stroke="#d0b27e" stroke-width="3"/><path d="M32 20h37M40 17l2-13h17l4 13" stroke="#3d3338" stroke-width="5" fill="#3d3338"/><path d="M41 13h20" stroke="#b49a67" stroke-width="3"/><path d="M68 42h21m-17 0-2 10" stroke="#c5cfd0" stroke-width="5"/><circle cx="74" cy="42" r="4" fill="#697b8b"/>`
 };
 return pieces[id]||null;
}

let specialNotices=[];
function announceKO(p){const e={k:'vfx',v:'koReady',id:p.id,x:p.x,y:p.y-34};vfx(e);send(e);}
function tickNotices(){if(freezeT===0)specialNotices=specialNotices.filter(e=>--e.life>0);}
function sfxKOArmed(){
 noiseHit(.045,.25,750);tone(180,54,.24,.28,'triangle');tone(72,42,.38,.24,'sine');
 tone(440,440,.18,.09,'triangle',.07);tone(660,660,.27,.07,'triangle',.15);noiseHit(.06,.1,2700,true,.16);
}
function sfxSenkuContact(){noiseHit(.035,.42,1900);tone(210,68,.085,.30,'triangle');tone(95,52,.12,.22,'sine');}
function sfxSenkuDetonate(){
 noiseHit(.025,.50,2900,true);noiseHit(.28,.38,650);tone(180,45,.23,.38,'triangle');tone(82,30,.48,.36,'sine');
 tone(440,130,.15,.07,'triangle',.04);
}
function strikeSenku(){
 const e=senkuActive;if(!e||e.struck)return;e.struck=true;e.impact=[];
 for(const id of e.hits){const t=byId(id);if(!t||t.out||!isLocal(t))continue;
  const kb=applyHit(t,{dm:36,k0:20.5,ks:.12,up:.32,f:e.dir},false,e.id);
  e.impact.push({id,kb});flash[t.id]=16;
 }
 if(e.visualHits.length){sfxSenkuContact();shake=Math.max(shake,4);}
}
function releaseSenkuV6(){
 const e=senkuActive;if(!e)return;strikeSenku();senkuActive=null;
 for(const hit of e.impact){const t=byId(hit.id);if(!t||t.out)continue;
  emitFx({res:'hit',t:t.id,a:e.id,x:t.x,y:t.y-34*CC(t.cid).size,kb:Math.round(hit.kb*10)/10,bk:0,up:0,c:t.c,gain:5,senku:1});
 }
 senkuAfter={x:e.x,y:e.y,dir:e.dir,life:18,max:18};
 for(const id of e.visualHits){const t=byId(id);if(!t||t.out)continue;const y=t.y-34*CC(t.cid).size;
  burst(t.x,y,24,13,'#ffe0a3',8);burst(t.x,y,10,8,'#fff9e7',5);ring(t.x,y,22,15);
 }
 if(e.visualHits.length){shake=Math.max(shake,19);sfxSenkuDetonate();}else sfxSlash();
}
function paintSenkuContact(e,el){
 if(!e.struck)return;
 push();for(const id of e.visualHits){const p=byId(id);if(!p||p.out)continue;const y=p.y-34*CC(p.cid).size;
  stroke('#fff5d5');strokeWeight(3);line(p.x-25,y+17,p.x+28,y-18);
  stroke(255,190,100,100);strokeWeight(10);line(p.x-23,y+16,p.x+26,y-17);
  noFill();stroke(255,219,150,200);strokeWeight(1);circle(p.x,y,55);
  for(let j=0;j<8;j++){const a=j*TWO_PI/8+.2;strokeWeight(j%2?1:2);line(p.x+cos(a)*24,y+sin(a)*24,p.x+cos(a)*(j%2?34:43),y+sin(a)*(j%2?34:43));}
 }pop();
}
function paintSpecialDetails(p){
 if(!p||p.out)return;const mv=p.mv,active=mv&&p.a>=mv.act0&&p.a<=mv.act1;
 push();translate(p.x,p.y);scale(CC(p.cid).size);noFill();
 if(p.cid==='boxer'&&p.ko>=100){
  stroke(255,195,90,150);strokeWeight(2);ellipse(0,2,55,10);
  for(let i=0;i<6;i++){const a=i*TWO_PI/6+visualFrame*.018,r=32;stroke(255,211,120,120);line(cos(a)*r,-30+sin(a)*r,cos(a)*(r+6),-30+sin(a)*(r+6));}
 }
 if(p.cid==='yankee'&&rageOn(p)){
  stroke(255,111,69,155);strokeWeight(1.5);for(let i=0;i<5;i++){const x=-27+i*13,y=-8-((visualFrame*1.8+i*13)%58);line(x,y,x+2,y-11);}
  stroke(255,178,100,110);ellipse(0,2,69,13);
 }
 if(p.cid==='lancer'&&p.sph>0){const q=Math.min(p.sph/60,1);scale(p.f,1);stroke(206,232,250,160);strokeWeight(1.5);for(let i=0;i<3;i++)line(-50-i*12*q,-24+i*8,-14,-24+i*8);stroke(243,202,129,180);arc(12,-32,45+q*18,45+q*18,-.7,.7);}
 if(active&&mv.kind==='lancerush'){scale(p.f,1);stroke(226,241,255,180);strokeWeight(2);line(-55,-31,74,-31);stroke(156,197,231,100);line(-70,-18,30,-18);line(-65,-43,30,-43);}
 if(active&&mv.kind==='harite'){scale(p.f,1);stroke(244,215,155,170);strokeWeight(2);arc(25,-35,64,62,-.9,.9);stroke(255,255,240,120);arc(29,-35,77,74,-.7,.7);}
 if(active&&mv.kind==='upper'){stroke(255,202,96,200);strokeWeight(2);arc(6*p.f,-47,77,96,-PI*.9,-PI*.08);stroke(255,245,204,100);strokeWeight(5);line(12*p.f,-40,12*p.f,-87);}
 if(p.cid==='gunman'&&p.reloadT>0){stroke(225,201,151,165);strokeWeight(1.5);arc(17*p.f,-29,23,23,-HALF_PI,-HALF_PI+TWO_PI*(1-p.reloadT/GUN_RELOAD));}
 if(p.cid==='karate'&&p.sh>0){scale(p.f,1);stroke(144,235,252,120);strokeWeight(1.5);ellipse(27,-35,10+p.sh,25+p.sh);}
 pop();
 for(const e of specialNotices){if(e.id!==p.id)continue;const q=1-e.life/70;
  push();translate(p.x,p.y-115*CC(p.cid).size);const a=Math.min(1,q*8, e.life/16);noStroke();fill(14,18,27,230*a);quad(-70,-16,76,-16,67,14,-78,14);fill(255,204,109,255*a);rect(-72,-16,4,30);textStyle(BOLDITALIC);textAlign(CENTER,CENTER);textSize(17);text('K.O. ARMED',0,-1);pop();
 }
}
function drawBombV6(b){
 push();translate(b.x,b.y);rotate(b.t*.12);noFill();stroke(255,161,77,65);strokeWeight(2);line(0,0,-b.vx*1.8,-b.vy*1.8);
 noStroke();fill('#101a28');circle(0,0,19);fill('#425162');arc(0,0,18,18,PI,TWO_PI);fill('#db9a4b');rect(-8,-2,16,4,1);
 fill('#172334');rect(-3,-12,6,5,1);stroke('#c9af7a');strokeWeight(2);line(2,-11,6,-15);stroke('#ffe6a2');strokeWeight(1.5);line(5,-16,10,-20);line(7,-15,12,-13);noStroke();fill('#fff7d2');circle(7,-16,3);pop();
}

function paintTransientSpecials(){
 for(const e of specialNotices){if(e.kind==='axeDust'){const q=1-e.life/20;push();noFill();stroke(222,153,105,130*(1-q));strokeWeight(2);ellipse(e.x,e.y+2,35+q*115,8+q*16);pop();continue;}if(e.kind==='sumoLift'){const q=1-e.life/24;push();noFill();stroke(221,233,229,150*(1-q));strokeWeight(2);ellipse(e.x,e.y+4+q*12,35+q*80,8+q*10);ellipse(e.x,e.y+9+q*16,24+q*55,6+q*7);pop();continue;}if(e.kind!=='smoke')continue;const q=1-e.life/24;
  push();translate(e.x,e.y);noFill();stroke(186,175,230,160*(1-q));strokeWeight(2);ellipse(0,22,45+q*45,9+q*10);
  for(let i=0;i<4;i++){const x=-20+i*13;stroke(224,218,246,170*(1-q));line(x,10-q*30,x+6,-20-q*40);}
  noStroke();fill(155,147,194,40*(1-q));quad(-13,-22,12,-22,18,28,-18,28);circle(0,-34,19);pop();
 }
}

function drawNewScenery(c,th,w,h){
 if(!th.kind)return;
 const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,th.top);g.addColorStop(1,th.bottom);c.fillStyle=g;c.fillRect(0,0,w,h);
 const poly=(pts,col)=>{c.fillStyle=col;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fill();};
 const line=(x,y,X,Y,col,width=1)=>{c.strokeStyle=col;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(X,Y);c.stroke();};
 if(th.kind==='shrine'){
  c.fillStyle='#f2e0bc';c.beginPath();c.arc(585,94,37,0,Math.PI*2);c.fill();c.fillStyle='#d8b9dc10';c.beginPath();c.arc(585,94,65,0,Math.PI*2);c.fill();
  for(let j=0;j<3;j++){const pts=[[0,h]];for(let x=0;x<=w;x+=45)pts.push([x,180+j*48+Math.sin(x*.013+j)*35]);pts.push([w,h]);poly(pts,['#282338','#312940','#3d3048'][j]);}
  for(const x of [165,610]){poly([[x-8,175],[x+7,175],[x+13,355],[x-13,355]],'#7a3945');}
  poly([[123,157],[185,164],[590,164],[653,157],[641,180],[135,180]],'#a55a60');poly([[156,196],[622,196],[622,205],[156,205]],'#985159');
  for(let i=0;i<5;i++){const x=244+i*70;line(x,206,x,223,'#b5a17e',2);poly([[x-3,220],[x+5,228],[x,237],[x-5,230]],'#dbceb2');}
  for(let i=0;i<8;i++){const x=i*116;poly([[x,350],[x+14,272],[x+24,350]],'#161b2b');}
 }else if(th.kind==='harbor'){
  c.fillStyle='#294d62';c.fillRect(0,310,w,140);
  for(let i=0;i<45;i++)line((i*79)%w,318+(i*17)%125,(i*79)%w+24+(i%3)*14,318+(i*17)%125,th.accent+'1c');
  for(let k=0;k<3;k++){const x=70+k*275;line(x,290,x,95,'#172c3b',10);line(x-25,115,x+150,75,'#233d4d',8);line(x+140,80,x+140,203,'#476071',2);line(x+132,203,x+150,203,'#758b93',3);line(x,97,x+75,95,'#233d4d',4);}
  for(let i=0;i<11;i++){const x=i*80,y=265-(i%3)*23;c.fillStyle=['#283c4b','#354651','#3e454c'][i%3];c.fillRect(x,y,76,51);for(let j=1;j<7;j++)line(x+j*10,y+4,x+j*10,y+46,'#72808a22');}
  for(let i=0;i<75;i++){const x=(i*113)%w,y=(i*47)%330;line(x,y,x-4,y+12,'#bbdbe21c');}
 }else if(th.kind==='reactor'){
  c.fillStyle='#101b23';c.fillRect(0,270,w,180);
  for(const x of [55,690]){c.fillStyle='#28363d';c.fillRect(x,50,38,340);c.fillStyle='#657867';c.fillRect(x+7,55,5,325);}
  for(let i=0;i<3;i++){c.strokeStyle=th.accent+(i===0?'55':'20');c.lineWidth=i===0?4:14;c.beginPath();c.arc(400,210,70+i*33,0,Math.PI*2);c.stroke();}
  const rg=c.createRadialGradient(400,210,5,400,210,130);rg.addColorStop(0,'#d6ffbc70');rg.addColorStop(1,'#9efc8b00');c.fillStyle=rg;c.fillRect(240,50,320,320);
  poly([[400,124],[444,210],[400,296],[356,210]],'#94d9a44a');poly([[400,158],[422,210],[400,262],[378,210]],'#ddffc080');
  for(let i=0;i<5;i++){line(0,70+i*60,260,110+i*40,'#4a675733',3);line(800,70+i*60,540,110+i*40,'#4a675733',3);}
  for(let x=0;x<w;x+=36)poly([[x,343],[x+13,343],[x+30,357],[x+17,357]],'#b2ac6d35');
 }else if(th.kind==='aurora'){
  for(let i=0;i<60;i++){c.fillStyle='#d8e9ed55';c.fillRect((i*137)%w,(i*47)%230,i%5===0?2:1,1);}
  for(let j=0;j<5;j++){c.strokeStyle=['#74edc018','#8cf2e321','#a4b6fa18','#a5e5dc18','#61cba91a'][j];c.lineWidth=18;c.beginPath();c.moveTo(-30,70+j*14);c.bezierCurveTo(230,180-j*8,390,-30+j*14,830,110+j*6);c.stroke();}
  poly([[0,340],[130,172],[230,287],[365,120],[535,297],[681,170],[800,300],[800,450],[0,450]],'#24445c');
  poly([[130,172],[167,219],[130,203],[97,220]],'#9ebac4');poly([[365,120],[428,194],[363,165],[320,185]],'#d0e0df');poly([[681,170],[722,218],[678,199],[649,210]],'#a1c5cf');
  poly([[0,382],[170,338],[325,370],[490,332],[650,371],[800,349],[800,450],[0,450]],'#38586b');
 }
 if(th.kind==='sunset'){
  const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#261a40');sky.addColorStop(.7,'#bf6e72');sky.addColorStop(1,'#d19c70');c.fillStyle=sky;c.fillRect(0,0,w,h);
  c.fillStyle='#f8c38b';c.beginPath();c.arc(w*.76,h*.28,64,0,Math.PI*2);c.fill();
  for(let i=0;i<4;i++){const pts=[[0,h]];for(let x=0;x<=w;x+=45)pts.push([x,305+i*25+Math.sin(x*.009+i)*28]);pts.push([w,h]);poly(pts,['#83526a','#6b4762','#533b57','#3a344b'][i]);}
  for(let i=0;i<5;i++){const x=22+i*160;poly([[x,330],[x+28,225-(i%2)*58],[x+65,330]],'#44364d');}
 }
 if(th.kind==='metro'){
  for(let row=0;row<2;row++)for(let i=0;i<20;i++){
   const x=i*46+row*15,y=185+row*52-((i*47+row*73)%100);
   c.fillStyle=row?'#172742':'#14213a';c.fillRect(x,y,37,350);
   for(let j=0;j<8;j++)for(let k=0;k<3;k++){
    c.fillStyle=(i+j+k)%5===0?'#81e2ff33':'#e9c0ff22';c.fillRect(x+5+k*11,y+10+j*16,4,7);
   }
  }
  line(0,357,w,320,'#6bbbe64a',3);line(0,379,w,345,'#86f6ff22',4);
 }
 if(th.kind==='orbit'){
  c.fillStyle='#e0f1ff';c.beginPath();c.arc(w*.79,h*.19,33,0,Math.PI*2);c.fill();
  for(let i=0;i<4;i++){
   const y=260+i*22;line(0,y,w,y-20,'#c1e5ff1a',4);
  }
  for(let i=0;i<9;i++){
   const x=35+i*100,y=300+(i%3)*33;
   poly([[x,y],[x+75,y-15],[x+93,y+38],[x+10,y+51]],'#3b5679');
   line(x+10,y+11,x+68,y,'#9baeca75',2);
  }
 }

}
function stageBackdropSVG(id){
 const k=themes[id].kind;
 if(k==='shrine')return '<circle cx="77" cy="13" r="6" fill="#e5d4b5"/><path d="M20 23h59M23 28h53M27 24v24M72 24v24" stroke="#b16770" stroke-width="2"/>';
 if(k==='harbor')return '<path d="M0 42h100v15H0z" fill="#31566b"/><path d="M19 42V14L43 9M40 10v19M70 43V18l23-8" fill="none" stroke="#66848c" stroke-width="1.5"/>';
 if(k==='reactor')return '<circle cx="50" cy="25" r="15" fill="none" stroke="#acda9860" stroke-width="2"/><path d="M50 13l6 12-6 12-6-12z" fill="#bde7a1"/><path d="M10 7v40M90 7v40" stroke="#4d6c5c" stroke-width="5"/>';
 if(k==='aurora')return '<path d="M0 13Q26 30 53 12T100 14" fill="none" stroke="#83dbc56a" stroke-width="5"/><path d="M0 48l26-26 16 19L62 18l38 30" fill="#527285"/><path d="M62 18l10 13-12-5-6 2z" fill="#c0dddd"/>';
 if(k==='sunset')return '<circle cx="80" cy="17" r="12" fill="#f9b46b"/><path d="M0 47L22 25 44 45 67 25 100 45V57H0" fill="#7d4152"/>';
 if(k==='metro')return '<path d="M0 54V28H13V10H22V31H38V16H50V54M61 54V25H75V5H85V54" fill="#152949" stroke="#63c6fc" stroke-width="1"/>';
 if(k==='orbit')return '<path d="M0 45L26 19 47 45 73 17 100 46" fill="none" stroke="#89aede" stroke-width="2"/><path d="M5 49h35m22 0h33" stroke="#c8dcff" stroke-width="4"/>';
 return '<circle cx="76" cy="13" r="9" fill="'+themes[id].accent+'20"/><path d="M0 50L25 22 40 40 67 19 100 48V57H0Z" fill="#080f1e40"/>';
}

// Ordered cinematic commands: the host assigns a sequence; all owners finish one before the next.
const NET_PROTOCOL='SBO_NET_CAIRO_WORLD_V47';
let netSeq=0,sendPending=false,netIssue='',eventSeen=new Set(),cinRequests=new Set();
let cinSerial=0,cinExpected=1,cinInbox=new Map(),cinQueue=[],activeCinematic=null,cinDispatching=false;
let deferredHits=[],replayPending=false,lastReplayAt=0;
function battleSessionActive(){return bt&&['count','play','game'].includes(bt.phase)&&(scene==='battle'||(online&&gmCache&&['play','end'].includes(gmCache.ph)));}
function resetNetRound(){resetStateTransport();cinSerial=0;cinExpected=1;cinInbox.clear();cinQueue=[];activeCinematic=null;cinDispatching=false;deferredHits=[];eventSeen.clear();cinRequests.clear();cinSeenIds.clear();koSeen={};sendPending=false;sendInflight=0;lastSentKey='';lastStatsAt=0;}
function safeWire(value){return JSON.parse(JSON.stringify(value,(k,v)=>v===undefined?null:typeof v==='number'&&!Number.isFinite(v)?null:v));}
function remember(set,id,max=4096){if(!id||set.has(id))return false;set.add(id);if(set.size>max)set.delete(set.values().next().value);return true;}
function networkError(e){netIssue='通信が不安定です。接続を確認してください';console.warn('SBO network:',e?.message||e);}
function writeEvent(e){
 if(!online||!roomRef)return;
 const room=roomRef,data=safeWire({...e,by:myId,rd:curRound,uid:e.uid||myId+'_'+curRound+'_'+(++netSeq)});
 try{const ref=room.child('ev').push();const task=ref.set(data);Promise.resolve(task).then(()=>{netIssue='';}).catch(networkError);
  setTimeout(()=>{try{Promise.resolve(ref.remove()).catch(networkError);}catch(err){networkError(err);}},20000);
 }catch(err){networkError(err);}
}
// 以前は「本人→ホスト→全員」の2段経由で、KOアッパーは「攻撃者→被弾者→ホスト→全員」の3段経由だった。
// いまは起こした端末がその場で演出を始め、同時に全員へ配る（1段）。重複はIDで弾く。
let cinSeenIds=new Set(),koSeen={};
function requestCinematic(kind,data){
 if(!online)return;
 const cid=myId+'_c'+curRound+'_'+(++netSeq);
 const d=safeWire(data);
 if(!enqueueCinematic(kind,d,cid))return;
 writeEvent({k:'cinx',kind,data:d,cid});
}
function enqueueCinematic(kind,data,cid){
 if(!validCinematic(kind,data)||!remember(cinSeenIds,cid))return false;
 if(kind==='ko'){const key=data.a+'>'+data.t,now=Date.now();if(koSeen[key]&&now-koSeen[key]<1500)return false;koSeen[key]=now;}
 cinQueue.push({kind,data});pumpCinematics();return true;
}
function validCinematic(kind,d){
 if(!d||!['senku','counter','ko','rage','gear','animeform','domain','timestop','titan','kakuja'].includes(kind))return false;
 if(!Number.isFinite(d.x)||!Number.isFinite(d.y))return false;
 if(kind==='kakuja')return byId(d.id)?.cid==='kaneki';
 if(kind==='titan')return byId(d.id)?.cid==='eren';
 if(kind==='senku')return typeof d.eid==='string'&&!!byId(d.id)&&(d.dir===1||d.dir===-1);
 if(kind==='rage')return !!byId(d.id);
 if(kind==='domain')return !!byId(d.id)&&byId(d.id).cid==='gojo';
 if(kind==='timestop')return !!byId(d.id)&&byId(d.id).cid==='jotaro';
 if(kind==='gear')return !!byId(d.id)&&Number.isInteger(d.lv)&&d.lv>=2&&d.lv<=5;
 if(kind==='animeform')return !!byId(d.id)&&['goku','tanjiro','naruto'].includes(d.cid)&&d.cid===byId(d.id).cid&&Number.isInteger(d.form)&&((d.cid==='tanjiro'&&d.form===0)||(d.cid==='naruto'&&d.form>=1&&d.form<=2)||(d.cid==='goku'&&d.form>=1&&d.form<=3))&&typeof d.title==='string'&&d.title.length<=64;
 if(kind==='ko')return !!byId(d.a)&&!!byId(d.t);
 return !!byId(d.att)&&!!byId(d.cnt)&&Number.isFinite(d.dm)&&Number.isFinite(d.kb0);
}
function approveCinematic(req){
 if(!isHost||!battleSessionActive()||req.rd!==curRound||!validCinematic(req.kind,req.data))return;
 const d=req.data,owner=byId(req.kind==='counter'?d.cnt:req.kind==='ko'?d.t:d.id);
 if(!owner||owner.owner!==req.by||!remember(cinRequests,req.requestId))return;
 const cmd={k:'cin',kind:req.kind,data:d,seq:++cinSerial,by:myId,rd:curRound};
 receiveCinematic(cmd);writeEvent(cmd);
}
function receiveCinematic(cmd){
 if(cmd.rd!==curRound||cmd.by!==gmCache?.hostId||!Number.isInteger(cmd.seq)||cmd.seq<cinExpected||!validCinematic(cmd.kind,cmd.data))return;
 if(cmd.seq-cinExpected>256)return;
 cinInbox.set(cmd.seq,cmd);
 while(cinInbox.has(cinExpected)){cinQueue.push(cinInbox.get(cinExpected));cinInbox.delete(cinExpected++);}
 if(cinInbox.size)requestEventReplay();
 pumpCinematics();
}
function pumpCinematics(){
 if(cinDispatching||activeCinematic||freezeT>0||senkuActive||bt.phase!=='play')return;
 const cmd=cinQueue.shift();if(!cmd)return;
 activeCinematic={...cmd,started:performance.now()};cinDispatching=true;
 try{
  if(cmd.kind==='kakuja')kanekiCutin(cmd.data);
  else if(cmd.kind==='titan')erenCutin(cmd.data);
  else if(cmd.kind==='senku')receiveSenku(cmd.data);
  else if(cmd.kind==='counter')doCounter(cmd.data);
  else if(cmd.kind==='rage')doRageTransform(cmd.data,true);
  else if(cmd.kind==='gear')doGearShift(cmd.data);
  else if(cmd.kind==='animeform')animeFormShift(cmd.data);
  else if(cmd.kind==='domain')beginDomainCutin(cmd.data);
  else if(cmd.kind==='timestop')beginJotaroTimeStopCutin(cmd.data);
  else startKOFreeze(cmd.data);
 }finally{cinDispatching=false;}
 if(freezeT<=0){activeCinematic=null;pumpCinematics();}
}
function finishCinematic(){
 activeCinematic=null;
 // Resolve queued hit requests only once, after the frozen positions have been released.
 while(freezeT===0&&deferredHits.length){handleGameplayEvent(deferredHits.shift());}
 beginNextSenku();pumpCinematics();
}
function recoverCinematic(){
 if(activeCinematic&&performance.now()-activeCinematic.started>5000){
  if(senkuActive)fzType='senku';
  freezeT=0;try{endFreeze();}finally{activeCinematic=null;finishCinematic();}
 }
 if(freezeT===0&&!activeCinematic)pumpCinematics();
}
function requestEventReplay(){
 if(!online||!roomRef||replayPending||Date.now()-lastReplayAt<1000)return;
 replayPending=true;lastReplayAt=Date.now();const room=roomRef,round=curRound;
 Promise.resolve(room.child('ev').once('value')).then(s=>{
  if(roomRef!==room||curRound!==round)return;
  for(const e of Object.values(s.val()||{}))onEvent(e);
 }).catch(networkError).finally(()=>{replayPending=false;});
}
function receiveNetEvent(e){
 if(!e||e.by===myId||!battleSessionActive()||e.rd!==curRound)return;
 if(e.uid&&!remember(eventSeen,e.uid))return;
 if(e.k==='cinx'){enqueueCinematic(e.kind,e.data,e.cid);return;}
 if(e.k==='cinreq'){approveCinematic(e);return;}
 if(e.k==='cin'){receiveCinematic(e);return;}
 // Old clients cannot join protocol-7 rooms; legacy cinematic messages are ignored.
 if(['senku','rage','ctr'].includes(e.k))return;
 if(freezeT>0&&['mh','ph','bx','mb','animearea'].includes(e.k)){deferredHits.push(e);return;}
 handleGameplayEvent(e);
}
function normalizeTargets(v){return [...new Set((Array.isArray(v)?v:v&&typeof v==='object'?Object.values(v):[]).filter(id=>typeof id==='string'&&!!byId(id)))];}

// New fighters share the existing authoritative hit/event transport.
const BOW_FULL=27;                                // 5本撃ちに必要な引き時間（フレーム）
function fireArrows(p,held,up){
 if(p.spc>0){p.sph=0;return;}
 const volley=!up&&held>=BOW_FULL;
 const angles=up?[-Math.PI/2-.2,-Math.PI/2,-Math.PI/2+.2]:volley?[-.26,-.13,0,.13,.26]:[0];
 const sp=volley?20:23,list=[];
 angles.forEach((angle,i)=>{
  const vx=up?Math.cos(angle)*sp:p.f*Math.cos(angle)*sp,vy=Math.sin(angle)*sp;
  list.push({pid:p.id+'_'+(objSeq++),o:p.id,kind:'arrow',x:Math.round(p.x+(up?0:p.f*29)),y:Math.round(p.y-(up?68:36)),
   vx:Math.round(vx*10)/10,vy:Math.round(vy*10)/10,dir:p.f,life:up?44:46,r:6,pierce:1,
   dm:volley?14:up?16:20,k0:volley?8:up?9:10,ks:volley?.085:.09,up:up?1.2:.45,rot:0,sound:i===0?1:0});
 });
 send({k:'projs',list});for(const q of list)projs.push({...q,local:true,hitIds:{}});
 p.sph=0;p.spc=volley?30:up?28:24;p.sh=14;p.bowUp=!!up;
 sfxBowRelease();if(volley){tone(1500,700,.12,.07,'triangle');shake=Math.max(shake,3);}
 burst(p.x+(up?0:p.f*29),p.y-(up?68:36),volley?14:5,volley?4:2,'#d8edb9',4);
}
function startAxe(p,up){
 if(p.spc>0)return;
 p.mv={...mkMv(up?'axeup':'axeheavy'),dm:up?42:48,k0:up?26:30,ks:up?.16:.18,up:up?1.25:.68,lunge:up?0:2};
 p.a=1;p.hit={};p.spc=0;p.vx*=.2;sfxAxeRaise();
}
function sfxBowDraw(){tone(210,450,.18,.045,'triangle');noiseHit(.12,.045,1700,true);}
function sfxBowRelease(){noiseHit(.045,.22,5200,true);tone(900,210,.085,.10,'triangle');tone(180,90,.09,.07,'sine');}
function sfxAxeRaise(){noiseHit(.14,.14,850);tone(100,160,.22,.09,'triangle');}
function sfxAxeSwing(){noiseHit(.075,.38,2400,true);tone(190,46,.18,.25,'triangle');noiseHit(.16,.17,580);}
function sfxAxeImpact(){noiseHit(.04,.4,1800);tone(110,30,.33,.3,'triangle');tone(65,27,.38,.25,'sine');noiseHit(.23,.26,500);}
function drawArrow(q){
 push();translate(q.x,q.y);rotate(Math.atan2(q.vy||0,q.vx));
 stroke(166,211,153,65);strokeWeight(5);line(-47,0,-8,0);
 stroke('#e9e5c9');strokeWeight(2);line(-25,0,5,0);
 noStroke();fill('#edf7ef');triangle(10,0,1,-4,1,4);
 fill('#7db3a3');quad(-23,0,-31,-5,-24,-5,-18,0);quad(-23,0,-31,5,-24,5,-18,0);
 pop();
}
function drawBow(p,hand){
 push();translate(hand.x,hand.y);scale(p.f,1);
 const up=p.sh>0&&p.bowUp;if(up)rotate(-HALF_PI*p.f);
 const q=Math.min((p.sph||0)/BOW_FULL,1),pull=7+q*15;
 noFill();stroke('#4a3229');strokeWeight(5);bezier(0,-30,25,-20,25,20,0,30);
 stroke('#cdb178');strokeWeight(2);bezier(0,-30,23,-20,23,20,0,30);
 stroke(q>=1?'#e6f9b8':'#c9d6c5');strokeWeight(1.3);line(0,-30,-pull,0);line(-pull,0,0,30);
 stroke('#463c32');strokeWeight(5);line(17,-5,17,5);
 if(p.sph>0){
  const count=q>=1?5:1;
  for(let i=0;i<count;i++){push();rotate(count===5?(i-2)*.1:0);stroke('#e5e9ce');strokeWeight(1.5);line(-pull,0,30,0);noStroke();fill('#e1f1c8');triangle(36,0,28,-3,28,3);pop();}
  if(q>=1){noFill();stroke(187,238,154,100+Math.sin(visualFrame*.2)*30);strokeWeight(1.5);arc(12,0,40,65,-1.25,1.25);}
 }
 pop();
}
function axePose(p){
 const m=p.mv,up=m?.kind==='axeup';let angle=-.62,x=12,y=0;
 if(p.a>0&&m&&['axeheavy','axeup'].includes(m.kind)){
  const t=p.a;
  if(t<m.act0){const q=t/m.act0;angle=up?.5:-.65-q*1.45;x=up?8:8-q*12;y=up?6:-4-q*13;}
  else if(t<=m.act1){const q=(t-m.act0)/(m.act1-m.act0);angle=up?.5-q*2.5:-2.1+q*2.65;x=up?7:10;y=up?-9:-5;}
  else{const q=Math.max(0,(t-(m.end-12))/12);angle=up?-2+q*1.38:.55-q*1.17;x=12;y=up?-9+q*9:7-q*7;}
 }
 return {angle,x,y};
}
function drawAxe(p,hand,mode){
 const pose=axePose(p),special=p.a>0&&['axeheavy','axeup'].includes(p.mv?.kind);
 push();translate(hand.x,hand.y);scale(p.f,1);
 let angle=pose.angle;
 if(!special){if(mode==='swing')angle=.05;else if(mode==='back')angle=-2;}
 if(special&&isActive(p)){
  noFill();stroke(255,163,97,75);strokeWeight(16);arc(0,0,143,143,pose.angle-.65,pose.angle+.12);
  stroke(255,235,198,210);strokeWeight(3);arc(0,0,146,146,pose.angle-.7,pose.angle+.05);
 }
 rotate(angle);
 stroke('#4a352d');strokeWeight(6);line(-14,0,66,0);stroke('#b59a6c');strokeWeight(2);line(-13,-2,64,-2);
 stroke('#353942');strokeWeight(7);line(0,0,16,0);stroke('#c2a577');strokeWeight(1);for(let i=0;i<5;i++)line(i*3,-3,i*3,3);
 noStroke();fill('#626e78');quad(53,-7,72,-18,82,-14,76,22);fill('#cbd7d6');quad(62,-5,83,-17,84,19,65,25);
 fill('#f1eee0');quad(80,-16,84,-17,85,20,80,21);fill('#8c4d3c');triangle(61,0,72,3,63,12);fill('#d0af72');circle(62,0,7);
 pop();
}
function drawSumoArmor(p){
 const sz=CC(p.cid).size;
 push();translate(p.x,p.y-30*sz);scale(sz);noFill();
 stroke(255,204,112,48);strokeWeight(11);ellipse(0,0,59,74);
 stroke(255,222,157,215);strokeWeight(2.5);ellipse(0,0,59,74);
 stroke(255,236,191,155);strokeWeight(3);line(-34,-15,-34,12);line(34,-15,34,12);
 noStroke();fill('#31271e');rect(-21,39,42,13,3);fill('#ffe0a1');textAlign(CENTER,CENTER);textStyle(BOLD);textSize(8);text('ARMOR',0,46);pop();
}

function sendLocal(){sendLocalPolished();}
function onP(s){onPPolished(s);}
function updateRemote(){updateRemotePolished();}
function drawStarPlatinum(p,t,mv,active){polishedStand(p,t,mv,active);}
function paintTimeStopPostFx(){chronoPost();}
function paintJotaroTimeStopCutin(){chronoText();}
function paintAnimeBackdrop(){chronoBackdrop();}

// Snapshot transport: bounded pipeline, round-local acknowledgements and monotonic sequence numbers.
let stateGeneration=0,stateSequence=0;
const stateWrites=new Map(),lastFighterTx=new Map();
let netSentSnapshots=0,netSkippedBusy=0,netLastStatsAt=0,netPerfFps=60,netDiagAt=0;
function resetStateTransport(){
 stateGeneration++;stateWrites.clear();lastFighterTx.clear();
 sendInflight=0;lastSentKey='';lastSentAt=0;lastStatsAt=0;
 netSentSnapshots=0;netSkippedBusy=0;netPerfFps=60;netDiagAt=0;
}
function projectSnapshot(s,ms){
 if(s.ats>0||s.adom>0||s.o)return{x:s.x,y:s.y};
 const k=Math.max(0,Math.min(ms,85))/FIXED_MS*(s.asl>0?.38:1);
 let x=s.x+(s.vx||0)*k,y=s.y;
 if(!s.g&&Number.isFinite(s.vy)){
  y=s.y+s.vy*k+GRAV*.5*k*(k+1);
  if(y>=s.y)for(let i=0;i<stage.plats.length;i++){
   const pl=stage.plats[i];if(s.dt>0&&s.dp===i)continue;
   if(x>=pl.x-6&&x<=pl.x+pl.w+6&&s.y<=pl.y&&y>=pl.y)y=Math.min(y,pl.y);
  }
 }
 return{x,y};
}
function importantStateChange(a,b){
 return !a||a.ef!==b.ef||a.eh!==b.eh||a.s!==b.s||a.o!==b.o||a.mk!==b.mk||a.af!==b.af||
  a.ats!==b.ats||a.atsf!==b.atsf||a.adom!==b.adom||a.acs!==b.acs||a.gr!==b.gr||
  a.iv!==b.iv||a.w!==b.w||a.g!==b.g||a.f!==b.f||a.stn!==b.stn;
}
function sendLocalPolished(){
 if(!online||!battleSessionActive()||!roomRef)return;
 const now=Date.now();
 // 不安定な回線ほど未確定の古い状態が積み重なるため、送信キューを小さく保つ。
 if(stateWrites.size>=3){
  netSkippedBusy++;
  const oldest=Math.min(...stateWrites.values());
  if(performance.now()-oldest>850)netIssue='通信遅延が大きくなっています';
  return;
 }
 const upd={},samples=[];
 const localCount=fighters.reduce((n,f)=>n+(isLocal(f)?1:0),0);
 for(const f of fighters){
  if(!isLocal(f))continue;
  const snapshot=stateOf(f);
  const previous=lastFighterTx.get(f.id);
  const vital=importantStateChange(previous?.state,snapshot);
  // 操作中の人間は20Hz、CPUは10〜14Hz。重要な変化だけは優先的に即時同期。
  const pace=f.cpu?(localCount>=5?100:75):50;
  const elapsed=previous?now-previous.at:Infinity;
  if(previous&&!vital&&elapsed<pace)continue;
  const signature=JSON.stringify(snapshot);
  if(previous&&!vital&&signature===previous.signature&&elapsed<450)continue;
  upd[f.id]=snapshot;samples.push({id:f.id,state:snapshot,signature});
 }
 if(!samples.length)return;
 const includeStats=now-lastStatsAt>=1500||bt.phase!=='play';
 const seq=++stateSequence;
 for(const sm of samples){
  const snap=upd[sm.id];snap.ts=now;snap.sq=seq;
  if(includeStats)snap.stats=byId(sm.id)?.stats||null;
 }
 if(includeStats)lastStatsAt=now;
 const room=roomRef,generation=stateGeneration,started=performance.now(),token=generation+':'+seq;
 const payload=safeWire(upd);
 // 送信前の最新スナップショットでキャッシュ更新。次フレームは古い状態を再送しない。
 for(const sm of samples)lastFighterTx.set(sm.id,{at:now,state:sm.state,signature:sm.signature});
 lastSentAt=now;stateWrites.set(token,started);sendInflight=stateWrites.size;
 try{
  Promise.resolve(room.child('p').update(payload)).then(()=>{
   if(generation!==stateGeneration)return;
   netIssue='';const r=performance.now()-started;
   netRtt=netRtt?netRtt*.85+r*.15:r;
   netSentSnapshots++;
  }).catch(e=>{
   if(generation!==stateGeneration)return;
   // 失敗した場合のみ次回すぐ送り直す。
   for(const sm of samples){const cached=lastFighterTx.get(sm.id);if(cached&&cached.at===now)lastFighterTx.delete(sm.id);}
   networkError(e);
  }).finally(()=>{stateWrites.delete(token);sendInflight=stateWrites.size;});
 }catch(e){
  stateWrites.delete(token);sendInflight=stateWrites.size;
  for(const sm of samples)lastFighterTx.delete(sm.id);
  networkError(e);
 }
}
function onPPolished(s){
 const v=s.val();
 // Validate before creating a remote companion: rejected data must not mutate the roster.
 if(!v||v.rd!==curRound||!['x','y','vx','r','d','s','ts'].every(k=>Number.isFinite(v[k])))return;
 let f=byId(s.key);
 if(!f&&v.sc===1)f=shadowCloneReceiveSnapshot(s.key,v);
 if(!f||!f.remote)return;
 if(Number.isFinite(v.sq)){if(v.sq<=(f.netLastSeq??-1))return;f.netLastSeq=v.sq;}
 else if(f.buf.length&&v.ts<=f.buf[f.buf.length-1].ts)return;
 const now=Date.now(),prev=f.buf[f.buf.length-1],lat=now-v.ts;
 if(f.off===null||lat<f.off)f.off=lat;else f.off+=(lat-f.off)*.005;
 if(f.lastRecv){const gap=Math.min(now-f.lastRecv,400);f.gapAvg=f.gapAvg?f.gapAvg*.9+gap*.1:gap;f.jit=(f.jit||0)*.9+Math.abs(gap-f.gapAvg)*.1;}
 f.lastRecv=now;
 const snap=prev&&(v.s!==prev.s||v.cid!==prev.cid||Math.hypot(v.x-prev.x,v.y-prev.y)>110||!!v.ats!==!!prev.ats||!!v.adom!==!!prev.adom);
 if(snap){f.buf=[];f.dispX=undefined;f.netSnap=true;}
 f.buf.push(v);if(f.buf.length>30)f.buf.shift();
}
function updateRemotePolished(){
 const now=Date.now();
 for(const f of fighters){if(!f.remote||!f.buf.length)continue;
  const latest=f.buf[f.buf.length-1];
  // 通信間隔＋ばらつきに応じて表示遅延を自動調節。
  // 少しバッファを厚くする代わりに、受信のたびのワープ・瞬間停止を減らす。
  const want=constrain((f.gapAvg||SEND_MS)*1.30+(f.jit||0)*2.0+15,75,175);
  f.interp=f.interp?f.interp+(want-f.interp)*.055:want;
  const rt=now-f.off-f.interp;let a=null,b=null;
  for(let i=f.buf.length-1;i>=0;i--)if(f.buf[i].ts<=rt){a=f.buf[i];b=f.buf[i+1]||null;break;}
  let pos={x:latest.x,y:latest.y},r=latest.r;
  if(!f.netSnap&&a&&b){
   const q=constrain((rt-a.ts)/Math.max(1,b.ts-a.ts),0,1);
   pos={x:lerp(a.x,b.x,q),y:lerp(a.y,b.y,q)};r=lerp(a.r,b.r,q);
  }
  else if(!f.netSnap&&a)pos=projectSnapshot(a,rt-a.ts);
  else if(!f.netSnap)pos={x:f.buf[0].x,y:f.buf[0].y};
  f.netSnap=false;
  // Gameplay/animation uses the newest state; only world position is delayed for interpolation.
  const s=latest,erenState=(f.cid==='eren'||s.eb)?erenReadState(s):null;
  const grip=erenState?.erenGrab,holder=grip?byId(grip.by):null;
  if(grip&&erenTitan(holder)&&!holder.out)pos={x:holder.x+grip.dir*64,y:holder.y-55};
  if(s.ats>0||s.adom>0)pos={x:s.x,y:s.y};
  Object.assign(f,{...pos,...(f.cid==='eren'?erenState:{}),erenGrab:grip||null,r,vx:s.vx,vy:s.vy,f:s.f,a:s.a,ch:s.ch,ct:s.ct,cs:s.cs,stn:s.stn,dg:s.dg,ivf:s.iv,kb:s.kb,w:s.w||null,sh:s.sh,sph:s.sph,castStyle:s.acs==='charge'?'charge':'',rise:s.ri,arm:s.am||0,cid:s.cid||f.cid,d:s.d,s:s.s,ko:s.ko,g:s.g,rage:s.rg||0,rageT:s.rt||0,senku:s.sk||0,senkuWind:s.sw||0,energy:s.ae||0,form:s.af||0,modeT:s.at||0,fatigue:s.az||0,cloneT:s.an||0,infinityCd:s.ai||0,slowT:s.asl||0,domainT:s.adom||0,timeStopT:s.ats||0,timeStopSelfT:s.atsf||0,orbColor:s.aoc||'blue',gear:s.gr||1,gearM:s.gm||0,gearT:s.gt||0,tired:s.td?1:0,bowUp:!!s.bu,bullets:s.bl??f.bullets,reloadT:s.rl||0,stats:s.stats||f.stats});
  kanekiRestore(f,s);
  f.mv=mkMv(s.mk,s.w);if(erenTitan(f)&&f.erenHard>0&&f.mv?.kind==='titanPunch')f.mv.end=42;animeRemoteMove(f);if(f.cid==='rubber'&&f.mv)decorateRubber(f.mv,f);
  if(f.mv&&s.a>0&&!s.ats&&!s.adom&&!freezeT){const advance=Math.min(4,Math.max(0,(now-f.off-s.ts)/FIXED_MS));f.a=Math.min(f.mv.end,s.a+advance*(s.asl>0?.38:1));}
  if(f.cid==='eren')erenPrepareSpin(f);if(f.cid==='kaneki')kanekiPrepare(f);
  if(s.o&&!f.out){
   if(f.shadowClone)shadowClonePop(f,false);
   else{f.out=true;if(!elim.includes(f.id))elim.push(f.id);}
  }
  while(f.buf.length>2&&f.buf[1].ts<rt-150)f.buf.shift();
 }
}

// High-contrast cel shading and phased cinematics. All geometry is local; no remote images are required.
function polishedStand(p,t,mv,active){
 const visible=p.a>0&&mv&&['ora','starfinger'].includes(mv.kind)||p.timeStopSelfT>0||p.rise>0||freezeT>0&&fzType==='timestopcin'&&fz?.att===p.id;
 if(!visible)return;
 push();translate(-18,-15);drawingContext.globalAlpha*=.94;
 const outline='#191830',violet='#7961a6',light='#b7a1da',gold='#d9b76b';
 noFill();stroke(151,107,224,45);strokeWeight(15);ellipse(-3,-43,59,78);
 stroke(outline);strokeWeight(2);fill(violet);quad(-25,-51,19,-51,13,-17,-18,-17);
 fill('#514b84');quad(-24,-49,-10,-46,-8,-18,-18,-17);fill(light);ellipse(-12,-43,20,16);ellipse(8,-43,21,16);
 stroke('#50436e');strokeWeight(1);line(-2,-42,-2,-24);line(-13,-32,11,-32);line(-11,-26,10,-26);
 fill(gold);stroke(outline);strokeWeight(1.5);ellipse(-25,-49,17,12);ellipse(23,-49,17,12);
 fill('#d9c8bd');quad(-17,-17,13,-17,18,-5,-20,-5);fill('#3b3860');rect(-19,-17,36,5,1);
 fill('#805eab');ellipse(-4,-66,24,27);fill('#b8a2d8');quad(-14,-65,5,-65,7,-55,-7,-53);
 fill('#182237');beginShape();vertex(-16,-65);vertex(-22,-76);vertex(-12,-75);vertex(-17,-86);vertex(-5,-79);vertex(0,-91);vertex(6,-78);vertex(16,-84);vertex(13,-70);vertex(7,-62);vertex(5,-72);vertex(-10,-72);endShape(CLOSE);
 fill(gold);noStroke();rect(-15,-72,25,4,1);fill('#4797a7');ellipse(-3,-71,5,5);
 stroke('#ece6d9');strokeWeight(1.2);line(-12,-63,-5,-63);line(0,-63,7,-63);stroke('#55406e');line(-8,-56,3,-56);
 noFill();stroke(gold);strokeWeight(3);bezier(-16,-54,-29,-66,-38,-52,-43,-61);
 // Arm endpoints stay in the attack's real hit volume (accounting for this local translation).
 const fist=(x,y,r,alpha=1)=>{push();drawingContext.globalAlpha*=alpha;stroke(outline);strokeWeight(1.5);fill(violet);rect(x-r,y-r*.7,r*1.8,r*1.4,r*.35);fill(light);rect(x-r*.7,y-r*.65,r*1.5,r*.6,r*.2);stroke('#584d76');strokeWeight(.8);for(let i=0;i<3;i++)line(x-r*.3+i*r*.4,y-r*.5,x-r*.3+i*r*.4,y);pop();};
 const arm=(x,y,w=9,alpha=1)=>{push();drawingContext.globalAlpha*=alpha;stroke(outline);strokeWeight(w+3);line(18,-46,x,y);stroke(violet);strokeWeight(w);line(18,-46,x,y);stroke(light);strokeWeight(2);line(19,-48,x-2,y-3);pop();};
 if(mv?.kind==='ora'&&p.a>0){
  if(active){const cx=mv.reach+18,cy=-mv.yo+15;
   for(let i=0;i<7;i++){const phase=(p.a*.53+i*.157)%1,x=cx-27+phase*31,y=cy+Math.sin(i*2.4+p.a*.8)*17;arm(x,y,7,.18+.35*phase);fist(x,y,7,.35+.5*phase);stroke(217,201,248,100);strokeWeight(1);line(x-30,y-6,x-5,y-6);}
   if(p.a>=mv.act1-2){arm(cx+2,cy,14);fist(cx+2,cy,13);}
  }else{arm(32,-35);fist(32,-35,8);}
 }else if(mv?.kind==='starfinger'&&p.a>0){
  const ext=p.a<mv.act0?28:mv.reach+18,yy=-mv.yo+15;arm(Math.min(ext,48),yy);fist(Math.min(ext,48),yy,8);stroke(outline);strokeWeight(5);line(45,yy-4,ext,yy-4);line(45,yy+1,ext,yy+1);stroke('#d4bde7');strokeWeight(2.2);line(45,yy-4,ext,yy-4);line(45,yy+1,ext,yy+1);
 }else{arm(33,p.rise>0?-85:-32);fist(33,p.rise>0?-85:-32,9);}
 stroke(outline);strokeWeight(11);line(-23,-44,-30,-22);stroke(violet);strokeWeight(8);line(-23,-44,-30,-22);fist(-30,-22,8);pop();
}
function polishCostume(p,t){
 push();noFill();strokeCap(ROUND);
 if(p.cid==='jotaro'){
  noStroke();fill('#111822');quad(-13,-48,-7,-43,-10,-12,-23,-5);quad(9,-48,14,-47,22,-9,10,-15);
  fill('#4a725b');quad(-6,-48,6,-48,9,-28,-8,-28);fill('#283f3c');triangle(-6,-47,1,-38,6,-47);
  stroke('#b5a063');strokeWeight(1.8);for(let i=0;i<4;i++){noFill();ellipse(13+Math.sin(i*.9)*3,-46+i*4,5,7);}
  stroke('#c5b582');strokeWeight(3);line(-10,-25,10,-25);stroke('#9f8daf');strokeWeight(1);line(-8,-25,0,-25);
  noStroke();fill('#131d29');quad(-13,-67,7,-69,14,-65,-11,-63);fill('#d6bd68');rect(5,-68,6,4,1);fill('#9b7e3d');rect(-2,-67,3,3);stroke('#27374a');strokeWeight(1);line(-10,-66,3,-67);
 }else if(p.cid==='goku'){
  stroke('#bd4c25');strokeWeight(1.2);line(-10,-34,-3,-29);line(7,-35,10,-30);line(-8,-23,-11,-11);line(7,-22,11,-14);
  stroke('#3e8bb1');line(-10,-8,-8,-3);line(11,-8,13,-3);
 }else if(p.cid==='naruto'&&p.form===1){
  noStroke();fill('#9c3b37');quad(-13,-48,-8,-47,-12,-17,-24,-12);quad(8,-47,13,-48,24,-12,12,-17);fill('#2a343b');rect(-14,-51,7,6,1);rect(7,-51,7,6,1);
  stroke('#765238');strokeWeight(7);line(-17,-43,-15,-20);stroke('#d3c9ac');strokeWeight(4);line(-17,-42,-15,-22);stroke('#bb725c');strokeWeight(1);line(-19,-33,-14,-33);
 }else if(p.cid==='naruto'&&p.form===2){
  stroke('#fff0b0');strokeWeight(1);line(-13,-48,-17,-22);line(13,-48,17,-22);stroke('#52372c');strokeWeight(2);arc(0,-33,14,14,0,PI*1.85);
 }else if(p.cid==='tanjiro'){
  stroke('#bce2c8');strokeWeight(.8);line(-14,-49,-20,-23);line(14,-49,20,-23);stroke('#182a29');line(-8,-47,-10,-24);line(8,-47,10,-24);
 }else if(p.cid==='gojo'){
  stroke('#6b7498');strokeWeight(.7);line(-8,-53,8,-54);line(9,-49,11,-26);line(-8,-22,-10,-7);
 }pop();
}
function ss3Mane(t){
 push();stroke('#ad772c');strokeWeight(1.2);fill('#e8b848');
 beginShape();vertex(-4,-76);bezierVertex(-28,-86,-43,-51,-30,-12);vertex(-20,-18);vertex(-21,-5);vertex(-12,-15);vertex(-8,-8);vertex(-3,-24);vertex(5,-15);bezierVertex(14,-39,12,-67,4,-76);endShape(CLOSE);
 for(let i=0;i<7;i++){const x=-13+i*3;noFill();stroke(i%2?'#ffeb91':'#bc8e38');strokeWeight(i%2?2:1);bezier(x,-73,x-20,-57,x-21,-31,-20+i*4,-15-(i%2)*8);}
 noStroke();fill('#ffdf78');triangle(-19,-65,-34,-45,-23,-51);triangle(-22,-49,-37,-24,-24,-33);pop();
}
function chronoWorld(){
 const t=1-freezeT/Math.max(1,freezeMax);
 push();noStroke();fill(t<.32?'#111425':t<.46?'#e1efe6':'#182337');rect(-300,-300,stage.w+600,stage.h+600);
 const cx=stage.w*.5,cy=stage.h*.55;
 if(t>.28){const r=Math.pow(Math.min(1,(t-.28)/.4),.5)*stage.w;noFill();stroke(t<.45?'#352448':'#8edbc9');strokeWeight(t<.45?35:3);ellipse(cx,cy,r*2,r*1.2);stroke('#a783c1');strokeWeight(8*(1-t)+1);ellipse(cx,cy,r*1.7,r);}
 for(let i=0;i<18;i++){const a=i*TWO_PI/18;stroke(i%2?'#968aa436':'#73a6ac30');strokeWeight(1);line(cx+cos(a)*70,cy+sin(a)*40,cx+cos(a)*stage.w,cy+sin(a)*stage.h);}
 // 真ん中に承太郎を出さず、時空の歪みだけで世界停止を表現する。
 noFill();
 for(let i=0;i<7;i++){
   stroke(i%2?color(175,150,224,80-i*7):color(138,233,214,64-i*6));
   strokeWeight(i%3===0?2.6:1.2);
   push();translate(cx,cy);rotate((i-3)*.12+Math.sin(t*9+i)*.03);ellipse(0,0,220+i*120,72+i*36);pop();
 }
 if(t>.33&&t<.42){fill(228,244,226,(1-(t-.33)/.09)*105);rect(0,0,stage.w,stage.h);}
 pop();
}
function chronoText(){
 const t=1-freezeT/Math.max(1,freezeMax),inQ=1-Math.pow(1-Math.min(1,t*5),3);
 push();noStroke();fill('#090e18');rect(0,0,W,20);rect(0,WH-24,W,24);
 const y=WH*.79;fill(7,10,20,235);quad(0,y-28,W,y-45,W,y+47,0,y+58);fill('#b6a4d6');rect(0,y-28,5,83);
 textAlign(LEFT,CENTER);textFont('sans-serif');textStyle(BOLD);textSize(Math.min(55,W*.07));stroke('#120f23');strokeWeight(8);fill('#f8f4ff');text('スタープラチナ！',24-(1-inQ)*190,y-7);
 noStroke();textSize(30);fill('#99d7cf');text('ザ・ワールド！',28,y+36);textAlign(RIGHT,TOP);textSize(10);fill('#b1bacb');text('空条承太郎',W-22,32);pop();
}
function chronoBackdrop(){
 const ts=activeTimeStopFx();if(!ts){classicAnimeBackdrop();return;}
 push();noStroke();fill(9,14,29,125);rect(0,0,stage.w,stage.h);
 const life=ts.life/max(1,ts.max);noFill();stroke(154,137,193,25);strokeWeight(1);
 for(let i=0;i<10;i++){const x=(i*173+40)%stage.w,y=(i*i*79+20)%stage.h;line(x,y,x+20,y-4);}
 pop();
}
function chronoPost(){
 const ts=activeTimeStopFx();if(!ts||freezeT>0&&fzType==='timestopcin')return;
 const elapsed=ts.max-ts.life,enter=Math.max(0,1-elapsed/14),exit=Math.max(0,1-ts.life/15),pulse=Math.max(enter,exit);
 push();noFill();const r=(enter?1-enter:exit)*stage.w*1.5;
 if(pulse){stroke(198,219,204,180*pulse);strokeWeight(3);ellipse(ts.x,ts.y,r*2,r*1.2);stroke(130,109,172,110*pulse);strokeWeight(9);ellipse(ts.x,ts.y,r*1.85,r*1.1);}
 pop();
}
function timeStopStatus(){
 const ts=activeTimeStopFx();if(!ts||freezeT>0)return;
 push();const w=Math.min(210,W*.3),x=W-w-18,y=18;noStroke();fill(9,13,24,220);rect(x,y,w,39,3);fill('#b7a4d3');rect(x,y+36,w*Math.max(0,ts.life/ts.max),3);textAlign(LEFT,CENTER);textStyle(BOLD);textSize(10);fill('#e9e6ee');text('TIME HAS STOPPED',x+10,y+13);textSize(9);fill('#b2b7c9');text((ts.life/60).toFixed(1)+' s',x+10,y+27);pop();
}
function premiumDragonImpact(){
 const el=freezeMax-freezeT,t=el/Math.max(1,freezeMax);
 push();noStroke();fill(18,12,8,228);rect(-300,-300,stage.w+600,stage.h+600);
 const pulse=.82+.18*Math.sin(el*.55);
 const coreX=fz?.x??stage.w*.5,coreY=fz?.y??stage.h*.52;
 strokeCap(ROUND);noFill();
 for(let i=0;i<5;i++){
   const off=(i-2)*18;
   stroke(205,92,12,70-i*8);strokeWeight(55-i*8);
   line(coreX-30+off,coreY+150,coreX+48+off,coreY-210);
   stroke(255,174,31,120-i*10);strokeWeight(24-i*3.4);
   line(coreX-26+off,coreY+145,coreX+44+off,coreY-215);
 }
 stroke(255,236,170,235*pulse);strokeWeight(7);line(coreX-12,coreY+148,coreX+33,coreY-220);
 for(let i=0;i<20;i++){
   const x=coreX+(i-10)*36,y=coreY+175-(el*19+i*37)%460;
   stroke(i%3?color(255,173,46,135):color(255,245,198,215));strokeWeight(i%4===0?2.8:1.3);
   line(x,y,x+20,y-74);
 }
 noStroke();
 for(let i=0;i<3;i++){fill(255,235,176,44-i*10);ellipse(coreX+4,coreY-10,240+i*90,120+i*44);}
 pop();
}

function animeBody(p,t,ghost=false){const r=baseAnimeBody(p,t,ghost);polishCostume(p,t);return r;}
function drawFighter(p){const old=visualFrame;if(p.shadowClone){push();drawingContext.globalAlpha*=.78;}if(p.timeStopT>0){if(p.stopPoseFrame===undefined)p.stopPoseFrame=old;visualFrame=p.stopPoseFrame;}else delete p.stopPoseFrame;try{baseDrawFighter(p);if(p.shadowClone&&!p.out){push();noFill();stroke(160,222,252,95);strokeWeight(2);ellipse(p.x,p.y-32,44,70);noStroke();fill(205,239,255,230);textAlign(CENTER);textSize(10);text('影分身',p.x,p.y-84);pop();}}finally{visualFrame=old;if(p.shadowClone)pop();}}
function pausedObject(owner){const ts=activeTimeStopFx();return !!ts&&ts.id!==owner;}
function cancelControl(key){press[key]=false;const p=byId(myId);if(p){if(key==='a')p.ch=0;if(['s','h','v','g'].includes(key))p.sph=0;}}
function releaseStoppedHits(p){const hits=p.stoppedHits||[];p.stoppedHits=[];if(!hits.length||p.out)return;p.releasingStop=true;let peak=0,vel=null;try{for(const e of hits){const k=applyHit(p,e.h,e.bk,e.attackerId);if(k>=peak){peak=k;vel={vx:p.vx,vy:p.vy,kb:p.kb};}}if(vel)Object.assign(p,vel);}finally{p.releasingStop=false;}burst(p.x,p.y-30,24,12,'#e4d4ff',8);ring(p.x,p.y-30,12,14);sfxBlock();shake=Math.max(shake,9);}
