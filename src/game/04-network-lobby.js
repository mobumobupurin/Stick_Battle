// ========================================================
// ⑤ オンライン：部屋・ロビー
// ========================================================
function newRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const a = new Uint32Array(6);
  if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a);
  else for (let i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 0xffffffff);
  return Array.from(a, n => chars[n % chars.length]).join('');
}
async function createRoom() {
  if (!await initFirebase()) {alert('オンライン対戦に接続できません。\n'+firebaseLastError);return;}
  online = true; isHost = true;
  clearNetTimers();
  for (let tries = 0; tries < 8; tries++) {
    roomId = newRoomCode();
    roomRef = db.ref('rooms/' + roomId);
    const exists = await roomRef.child('gm').once('value');
    if (!exists.exists()) break;
    roomRef = null;
  }
  if (!roomRef) { alert('部屋コードを作れませんでした。もう一度お試しください。'); return; }
  roomRef.onDisconnect().remove();
  await roomRef.child('gm').set({ protocol:NET_PROTOCOL,mode:requestedOnlineMode,hostId:myId,ph: 'lobby', round: 0, map: 'std', wpn: 0, stocks: settings.stocks, cpuN: 0, cpuLv: 1, cpuPool: settings.cpuPool || 'all', teamMode: settings.teamMode ? 1 : 0, w: '', wt: 0 });
  await joinCommon();
  netTimers.push(setInterval(hostTick, 200));
  netTimers.push(setInterval(hostSpawn, 1000));
}

function normalizeRoomCode(v) {
  return String(v || '').normalize('NFKC').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

async function joinRoom(code = urlRoom, fromUrl = !!urlRoom) {
  if (!await initFirebase()) {alert('オンライン対戦に接続できません。\n'+firebaseLastError);return false;}
  const normalized = normalizeRoomCode(code);
  if (normalized.length !== 6) {
    alert('部屋コードは6文字で入力してください。');
    return false;
  }

  online = true; isHost = false; roomId = normalized;
  roomRef = db.ref('rooms/' + roomId);
  const snap = await roomRef.child('gm').once('value');
  if (!snap.val()) {
    online = false; isHost = false; roomId = null; roomRef = null;
    alert('その部屋は見つかりません。部屋コードを確認してください。');
    if (fromUrl) history.replaceState(null, '', location.href.split('?')[0]);
    return false;
  }

  const joined = await joinCommon();
  if (joined === false) {
    online = false; isHost = false; roomId = null; roomRef = null;
    return false;
  }
  return true;
}

async function joinCommon() {
  const [ms, gs] = await Promise.all([
    roomRef.child('mem').once('value'),
    roomRef.child('gm').once('value')
  ]);
  const existing = ms.val() || {};
  const gm = gs.val() || {};
  if(gm.protocol!==NET_PROTOCOL){alert('この部屋は旧バージョンです。全員が最新版に更新し、新しい部屋を作ってください。');return false;}
  const humans = Object.values(existing).filter(m => m && !m.cpu);
  const reservedCpu = Math.max(0, Number(gm.cpuN) || 0);
  const roomLimit=gm.mode==='raid'?4:MAX_PLAYERS;
  if (!isHost && humans.length + reservedCpu >= roomLimit) {
    alert('この部屋は満員です。');
    return false;
  }
  const used = new Set(humans.map(m => Number(m.slot)).filter(Number.isFinite));
  let slot = 0; while (used.has(slot) && slot < roomLimit) slot++;
  if (slot >= roomLimit) { alert('この部屋は満員です。'); return false; }
  let joinTeam = normTeam(settings.team);
  if (!isHost) {
    const tc = {1:0,2:0}; for (const m of humans) tc[normTeam(m.team)]++;
    joinTeam = tc[1] <= tc[2] ? 1 : 2; settings.team = joinTeam;
  }
  const memRef = roomRef.child('mem/' + myId);
  memRef.onDisconnect().remove();
  roomRef.child('p/' + myId).onDisconnect().remove();
  await memRef.set({ cid: settings.cid, slot, label: cleanName(settings.name), team: joinTeam, protocol:NET_PROTOCOL,cpu: 0, host: isHost ? 1 : 0 });

  roomRef.child('mem').on('value', s => { memCache = s.val() || {}; if (scene === 'sc-lobby') renderLobby(); });
  roomRef.child('gm').on('value', s => onGm(s.val()));
  const pRef = roomRef.child('p');
  pRef.on('child_added', onP);
  pRef.on('child_changed', onP);
  pRef.on('child_removed', s => {
    const f = byId(s.key);
    if (f && f.remote && battleSessionActive() && !f.out) {
      if(f.shadowClone)shadowClonePop(f,false);
      else{f.out=true;if(!elim.includes(f.id))elim.push(f.id);}
    }
  });
  const iRef = roomRef.child('items');
  iRef.on('child_added', s => {
    const v = s.val();
    if (!v || v.o) return;
    items[s.key] = { t: v.t, x: v.x, y: v.y, vy: 0, landed: false, am: v.am || 0, pend: false };
  });
  iRef.on('child_changed', s => { const v = s.val(); if (v && v.o) delete items[s.key]; });
  iRef.on('child_removed', s => { delete items[s.key]; });
  const evRef = roomRef.child('ev');
  evRef.on('child_added',s=>onEvent(s.val()));
  netTimers.push(setInterval(sendLocal, SEND_MS));

  if (isHost) {
    const url = location.href.split('?')[0] + '?room=' + roomId;
    document.getElementById('lb-hostinv').style.display = 'block';
    document.getElementById('lb-code').innerText = roomId;
    document.getElementById('lb-qr').textContent='';
    if(typeof QRCode!=='undefined')new QRCode(document.getElementById('lb-qr'), { text: url, width: 170, height: 170 });
    document.getElementById('lb-copy').onclick = () => {
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => alert('参加URLをコピーしました'));
      else prompt('このURLを送ってください', url);
    };
  } else {
    document.getElementById('lb-step1').innerText = '① 参加しました';
    document.getElementById('lb-guestinv').style.display = 'block';
    document.getElementById('lb-code2').innerText = roomId;
  }
  show('sc-lobby');
  renderLobby();
  return true;
}

function leaveRoom() {
  clearNetTimers();
  try {
    if (roomRef) {
      if (isHost) roomRef.remove();
      else { roomRef.child('mem/' + myId).remove(); roomRef.child('p/' + myId).remove(); }
    }
  } catch (e) {}
  setTimeout(() => { location.href = location.href.split('?')[0]; }, 300);
}

function onGm(g) {
  if (!g) {
    if (!isHost && online) { alert('ホストが部屋を閉じました'); leaveRoom(); }
    return;
  }
  if (gmFirst) { gmFirst = false; if (g.ph !== 'lobby') skipRound = g.round; }
  gmCache = g;
  if (g.ph === 'play' && g.round !== curRound && g.round !== skipRound) {
    curRound = g.round;
    startBattleOnline();
  } else if (g.ph === 'end' && battleSessionActive() && bt.phase === 'play') {
    bt = { phase: 'game', t: 130, winner: g.w || null, winnerTeam: g.wt || 0 };
    sfxGame();
  } else if(g.ph==='champion'&&g.tour?.champion){
    if(scene!=='sc-champion')showOnlineChampion(g.tour);
  } else if (g.ph === 'lobby' && (scene === 'battle' || scene === 'sc-result' || scene==='sc-champion')) {
    show('sc-lobby');
  }
  if (scene === 'sc-lobby') renderLobby();
}

function lobbyMembers() {
  return Object.entries(memCache).map(([id, m]) => ({ id, ...m })).sort((a, b) => a.slot - b.slot);
}

function renderLobby() {
  const g = gmCache || {};
  const ln = document.getElementById('lb-name'); if (ln && document.activeElement !== ln) ln.value = settings.name;
  const mem = lobbyMembers().filter(m => !m.cpu);
  const total = mem.length + (g.cpuN || 0);
  const isTournament=g.mode==='tournament';
  const teamMode = !!g.teamMode&&!isTournament;
  const lbBoard=document.getElementById('lb-tourney-board');
  lbBoard.style.display=isTournament&&g.tour?'block':'none';
  if(isTournament&&g.tour)lbBoard.innerHTML=tourBoardHTML(g.tour);

  // ② 自分のキャラ（その場で変更）
  const cg = document.getElementById('lb-chars');
  rosterSections(cg,id=>{settings.cid=id;roomRef.child('mem/'+myId).update({cid:id});renderLobby();});
  const MC = CC(settings.cid);
  document.getElementById('lb-chardesc').innerHTML = `<b>${MC.name}</b>　特殊：${MC.sp}<br>上＋特殊：${MC.up}`;

  // チーム戦時だけ、自分の所属をRED/BLUEから選べる
  const teamPick = document.getElementById('lb-team-pick');
  const redBtn = document.getElementById('lb-team-red'), blueBtn = document.getElementById('lb-team-blue');
  if (teamPick) {
    teamPick.style.display = teamMode ? 'flex' : 'none';
    if (teamMode) {
      const myTeam = normTeam(memCache[myId]?.team ?? settings.team);
      settings.team = myTeam;
      redBtn.className = myTeam === 1 ? 'sel' : '';
      blueBtn.className = myTeam === 2 ? 'sel' : '';
      redBtn.style.background = myTeam === 1 ? TEAM_COLORS[1] : '';
      blueBtn.style.background = myTeam === 2 ? TEAM_COLORS[2] : '';
      redBtn.style.color = blueBtn.style.color = '#fff';
      redBtn.onclick = () => { settings.team = 1; roomRef.child('mem/' + myId).update({ team: 1 }); };
      blueBtn.onclick = () => { settings.team = 2; roomRef.child('mem/' + myId).update({ team: 2 }); };
    }
  }

  // ③ 参加者
  let html = `<div class="sh">③ 参加者（${total} / ${MAX_PLAYERS}）</div>`;
  mem.forEach((m, i) => {
    const C = CC(m.cid), tm = normTeam(m.team);
    const badge = teamMode ? `<span class="tag" style="background:${teamColor(tm)};color:#fff">${teamName(tm)}</span>` : '';
    html += `<div class="mrow"><div class="mk" style="background:${teamMode ? teamColor(tm) : COLORS[i % COLORS.length]}">${C.mark}</div>` +
            `<div>${esc(m.label)}　${C.name} ${badge} ${m.host ? '<span class="tag">HOST</span>' : ''} ${m.id === myId ? '<small>（あなた）</small>' : ''}</div></div>`;
  });
  if (g.cpuN > 0) html += `<div class="mrow"><div class="mk" style="background:#5b7383">C</div><div>CPU ×${g.cpuN}（${LV_NAME[g.cpuLv || 0]}／${CPU_POOL_LABEL[g.cpuPool || 'all']}）${teamMode ? '　※開始時に人数が少ないチームへ自動配属' : ''}</div></div>`;
  if (skipRound === g.round && g.ph !== 'lobby') html += '<div class="wait">対戦中です。次のラウンドから参加できます</div>';
  document.getElementById('lb-mem').innerHTML = html;

  // ④ ルール
  const setBox = document.getElementById('lb-set');
  const startBtn = document.getElementById('lb-start');
  const waitEl = document.getElementById('lb-wait');
  if (isHost) {
    setBox.innerHTML = '<div class="sh">④ '+(isTournament?'勝ち抜きトーナメント（1対1）':'ルールを決める')+'</div>' +(isTournament?'<p style="font-size:12px;color:#ffd981;margin-bottom:10px">参加者で4〜8人のトーナメント！不足分はCPUが参加。観戦もできます。</p>':'') +
      '<div style="font-weight:900;margin-bottom:4px">ステージ</div><div class="stage-grid" id="lb-stage"></div>' +
      '<div class="optrow" style="margin-top:10px"><span>対戦形式</span><div class="seg" id="lb-team-mode"></div></div>' +
      '<div class="optrow" style="margin-top:8px"><span>武器</span><div class="seg" id="lb-wpn"></div></div>' +
      '<div class="optrow" style="margin-top:8px"><span>残機</span><div class="seg" id="lb-stock"></div></div>' +
      '<div class="optrow" style="margin-top:8px"><span>CPUを足す</span><div class="seg" id="lb-cpun"></div></div>' +
      '<div class="optrow" style="margin-top:8px"><span>CPUキャラ</span><div class="seg" id="lb-cpupool"></div></div>' +
      '<div class="optrow" style="margin-top:8px"><span>CPUの強さ</span><div class="seg" id="lb-cpulv"></div></div>';
    renderStageGrid('lb-stage', g.mapChoice||g.map, id => roomRef.child('gm').update({ map: id,mapChoice:id }));
    if(isTournament)document.getElementById('lb-team-mode').parentElement.style.display='none';
    else seg('lb-team-mode', ['個人戦', 'チーム戦'], () => teamMode ? 1 : 0, i => roomRef.child('gm').update({ teamMode: i === 1 ? 1 : 0 }));
    seg('lb-wpn', ['なし', 'あり'], () => g.wpn ? 1 : 0, i => roomRef.child('gm').update({ wpn: i === 1 ? 1 : 0 }));
    seg('lb-stock', ['1', '2', '3', '4', '5'], () => clampInt(g.stocks, 1, MAX_STOCK, DEFAULT_STOCK) - 1, i => roomRef.child('gm').update({ stocks: i + 1 }));
    const maxCpu = Math.max(0, Math.min(7, MAX_PLAYERS - mem.length));
    const labels = []; for (let i = 0; i <= maxCpu; i++) labels.push(i === 0 ? 'なし' : i + '体');
    seg('lb-cpun', labels, () => Math.min(g.cpuN || 0, maxCpu), i => roomRef.child('gm').update({ cpuN: i }));
    seg('lb-cpupool', ['通常キャラ', 'スペシャル', '全キャラ'], () => cpuPoolIndex(g.cpuPool || 'all'), i => roomRef.child('gm').update({ cpuPool: cpuPoolFromIndex(i) }));
    seg('lb-cpulv', LV_NAME, () => g.cpuLv || 0, i => roomRef.child('gm').update({ cpuLv: i }));
    startBtn.style.display = '';
    waitEl.style.display = 'none';
    if(isTournament){startBtn.className='startbig';startBtn.textContent='トーナメント開始！（CPUで人数補充）';}
    else if (total >= 2) { startBtn.className = 'startbig'; startBtn.innerText = teamMode ? 'チームバトル開始！' : 'バトル開始！'; }
    else { startBtn.className = 'startbig off'; startBtn.innerText = 'あと1人必要（CPUを足してもOK）'; }
  } else {
    setBox.innerHTML = '<div class="sh">④ ルール（ホストが決めます）</div>' +
      `形式：<b>${teamMode ? 'チーム戦' : '個人戦'}</b>　ステージ：<b>${arenaChoiceName(g.mapChoice||g.map)}</b>　武器：<b>${g.wpn ? 'あり' : 'なし'}</b>　残機：<b>${clampInt(g.stocks,1,MAX_STOCK,DEFAULT_STOCK)}</b>　CPU：<b>${g.cpuN ? g.cpuN + '体（' + CPU_POOL_LABEL[g.cpuPool || 'all'] + '）' : 'なし'}</b>`;
    startBtn.style.display = 'none';
    waitEl.style.display = 'block';
    waitEl.innerText = 'ホストがバトルを始めるのを待っています…';
  }
}

async function hostStart() {
  const g = gmCache;
  if(g?.mode==='tournament'){await hostStartTournament();return;}
  const humans = lobbyMembers().filter(m => !m.cpu);
  if(humans.some(m=>m.protocol!==NET_PROTOCOL)){alert('全員が最新版に更新してから入り直してください。');return;}
  if (humans.length + (g.cpuN || 0) < 2) { alert('2人以上必要です。CPUを足すか、友達を呼んでください。'); return; }

  const teamMode = !!g.teamMode;
  const upd = {};
  for (const id in memCache) if (memCache[id].cpu) upd['mem/' + id] = null;
  const keys = cpuCharacterPool(g.cpuPool || 'all');
  const counts = {1:0, 2:0};
  if (teamMode) for (const h of humans) counts[normTeam(h.team)]++;

  for (let i = 0; i < (g.cpuN || 0); i++) {
    let team = 0;
    if (teamMode) {
      team = counts[1] <= counts[2] ? 1 : 2;
      counts[team]++;
    }
    upd['mem/cpu_' + i] = { cid: keys[Math.floor(Math.random() * keys.length)], slot: 100 + i, label: 'CPU' + (i + 1), cpu: 1, owner: myId, team };
  }

  if (teamMode) {
    const projected = [...humans, ...Object.entries(upd).filter(([k,v])=>k.startsWith('mem/')&&v).map(([k,v])=>({id:k.slice(4),...v}))];
    const teams = new Set(projected.map(m => normTeam(m.team)));
    if (teams.size < 2) { alert('チーム戦ではREDとBLUEの両方に1人以上必要です。チームを変更するかCPUを追加してください。'); return; }
  }

  upd['items'] = null; upd['p'] = null; upd['ev'] = null;
  const roster=[...humans,...Object.entries(upd).filter(([k,v])=>k.startsWith('mem/')&&v).map(([k,v])=>({id:k.slice(4),...v}))];
  await roomRef.update(upd);
  nextSpawn = Date.now() + 6000;
  await roomRef.child('gm').set({ ...g, map:resolveArena(g.mapChoice||g.map),mapChoice:g.mapChoice||g.map,players:roster, teamMode: teamMode ? 1 : 0,
    stocks: clampInt(g.stocks, 1, MAX_STOCK, DEFAULT_STOCK), ph: 'play',
    round: (g.round || 0) + 1, w: '', wt: 0 });
}

let tournamentAdvancePending=false;
async function hostStartTournament(){
 const g=gmCache;
 if(!isHost||!g||!roomRef||tournamentAdvancePending)return;
 tournamentAdvancePending=true;
 const nextButton=document.getElementById('res-again');
 if(nextButton)nextButton.disabled=true;
 try{
 let t=g.tour;
 if(!t||!t.active){
  // 新規勝ち抜き戦。最低2人から開催でき、不足分はCPUで埋める。
  const humans=lobbyMembers().filter(m=>!m.cpu);
  const requestedTotal=Math.min(8,humans.length+Math.max(0,g.cpuN||0));
  const target=requestedTotal<=4?4:8;
  const needed=target-humans.length;
  const pool=cpuCharacterPool(g.cpuPool||'all');
  const cpu=[];
  for(let i=0;i<needed;i++)cpu.push({id:'cpu_t'+i,cid:pool[Math.floor(Math.random()*pool.length)],label:'CPU '+(i+1),cpu:1,owner:myId,team:0});
  const entrants=[...humans.map(h=>({id:h.id,cid:h.cid,label:h.label,cpu:0,owner:h.id,team:0})),...cpu];
  for(let i=entrants.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[entrants[i],entrants[j]]=[entrants[j],entrants[i]];}
  t={active:1,entrants,matches:Array.from({length:target/2},(_,i)=>[entrants[2*i].id,entrants[2*i+1].id]),round:1,index:0,winners:[],details:[],history:[],champion:'',map:resolveArena(g.mapChoice||g.map),stocks:clampInt(g.stocks,1,MAX_STOCK,DEFAULT_STOCK)};
  const patch={items:null,p:null,ev:null};
  for(const id in memCache)if(memCache[id]?.cpu)patch['mem/'+id]=null;
  for(const m of cpu)patch['mem/'+m.id]={...m,slot:100+cpu.indexOf(m)};
  await roomRef.update(patch);
 }else if(g.ph==='end'){
   if(!g.w||!t.matches[t.index]?.includes(g.w)){alert('引き分けです。同じ対戦カードを再試合します。');}
   else if(!progressTournament(t,g.w,g.matchDetail||{method:'場外撃墜',map:g.map}))throw new Error('前の試合結果を反映できませんでした。');
 }
 if(t.champion){
  await roomRef.child('gm').set({...g,mode:'tournament',tour:t,ph:'champion',w:t.champion,players:[]});
  return;
 }
 const match=t.matches[t.index],players=match.map(id=>t.entrants.find(m=>m.id===id)).filter(Boolean);
 if(players.length!==2)return;
 await roomRef.update({items:null,p:null,ev:null});
 await roomRef.child('gm').set({...g,map:t.map,mode:'tournament',teamMode:0,wpn:0,stocks:clampInt(t.stocks||g.stocks,1,MAX_STOCK,DEFAULT_STOCK),players,tour:t,ph:'play',round:(g.round||0)+1,w:'',wt:0,matchDetail:null});
 }catch(err){
  console.error('トーナメントを進められませんでした',err);
  alert('次の試合を開始できませんでした。通信状況を確認し、もう一度押してください。\n'+(err?.message||err));
 }finally{
  tournamentAdvancePending=false;
  if(nextButton)nextButton.disabled=false;
 }
}

function hostTick() {
  if (!isHost || !battleSessionActive() || bt.phase !== 'play' || !gmCache) return;
  if (Date.now() - battleStartAt < 4500 || fighters.length < 2) return;
  const alive = fighters.filter(f => !f.out&&!f.shadowClone);
  if (battleTeamMode) {
    const teams = aliveTeams();
    if (teams.length <= 1) roomRef.child('gm').update({ ph: 'end', w: '', wt: teams[0] || 0 });
  } else if (alive.length <= 1) {
    roomRef.child('gm').update({ ph: 'end', w: alive[0] ? alive[0].id : '', wt: 0,matchDetail:gmCache?.mode==='tournament'?{method:'場外撃墜',durationSec:Math.max(0,Math.round((Date.now()-battleStartAt)/1000)-3),winnerDamage:alive[0]?Math.round(alive[0].d):null,loserDamage:fighters.find(f=>!f.shadowClone&&f.id!==alive[0]?.id)?Math.round(fighters.find(f=>!f.shadowClone&&f.id!==alive[0]?.id).d):null,map:gmCache.map}:null });
  }
}

function hostSpawn() {
  if (!isHost || !battleSessionActive() || bt.phase !== 'play' || !battleWpn) return;
  if (Object.keys(items).length >= 2 || Date.now() < nextSpawn) return;
  nextSpawn = Date.now() + 5000 + Math.random() * 3500;
  const pl = stage.plats[Math.floor(Math.random() * stage.plats.length)];
  roomRef.child('items').push({ t: Math.random() < 0.5 ? 'sword' : 'gun', x: Math.round(pl.x + 30 + Math.random() * (pl.w - 60)), y: -40 });
}

