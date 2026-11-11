// ========================================================
// ⑦ バトルの開始と終了
// ========================================================
// Ranked kumite always uses ULTIMATE CPUs and the original lv3 leaderboard.
let kumiteSubmitted=false,kumiteSubmissionBusy=false,kumiteRecordRef=null,kumitePendingRun=null,rankingReturnScene='sc-extra',rankFetchToken=0;
const KUMITE_RANK_PATH='kumite_rankings_v1';
const KUMITE_CPU_LEVEL=3; // 組み手専用: 最強固定。ほかのモードには影響しない。
function configureOfflineStageOptions(){
 const normal=offlineMode==='normal';
 settings.teamMode=normal&&!!settings.teamMode;
 const teamRow=document.getElementById('seg-team-mode').closest('.optrow');
 if(teamRow)teamRow.style.display=normal?'flex':'none';
 document.getElementById('team-side-row').style.display=normal&&settings.teamMode?'flex':'none';
 const note=document.querySelector('.stage-help-tip');
 if(note)note.textContent=offlineMode==='kumite'?'組み手は個人戦。全キャラのCPUが登場します。プレイヤー名・使用キャラ・マップ・勝ち抜き数はランキングに登録されます。':offlineMode==='tournament'?'1対1の勝ち抜き戦。開始前にキャラ付きのトーナメント表を表示します。':'残機＝残りの戦える回数。迷ったら設定はそのままでOK！';
}
function rankingLevelName(lv){return LV_NAME[Math.max(0,Math.min(3,lv))]||'ふつう';}
// ランキングは Firebase Realtime Database の /kumite_rankings_v1 を利用。
// .read/.write はFirebase Consoleのルール側で許可が必要（index.htmlだけでは権限は変更できない）。
function rankingFirebaseError(err,op){
 const msg=String(err?.code||err?.message||err||'').toLowerCase();
 if(msg.includes('permission_denied')||msg.includes('permission denied'))
  return 'Firebaseのアクセスが拒否されました。Realtime Databaseの「ルール」で kumite_rankings_v1 の '+(op==='read'?'.read':'.write')+' を許可して「公開」してください。';
 if(msg.includes('disconnected')||msg.includes('network')||msg.includes('timeout')||msg.includes('unavailable'))
  return '通信に失敗しました。インターネット接続を確認して「更新する」または「保存を再試行」を押してください。';
 return 'Firebaseとの通信に失敗しました。'+(err?.code?'（'+err.code+'）':String(err?.message||''));
}
function rankAvatar(cid){return CHARS[cid]?portrait(cid):'';}
function openKumiteRanking(fromScene=scene){
 rankingReturnScene=fromScene;
 show('sc-kumite-ranking');loadKumiteRanking();
}
async function loadKumiteRanking(){
 const token=++rankFetchToken,status=document.getElementById('rank-status'),table=document.getElementById('rank-table');
 status.textContent='組み手ランキングを取得中…';table.innerHTML='';
 if(!await initFirebase()){status.textContent='ランキングを読み込めませんでした。'+firebaseLastError;return;}
 try{
  const snap=await db.ref(KUMITE_RANK_PATH+'/lv'+KUMITE_CPU_LEVEL).orderByChild('wins').limitToLast(100).once('value');
  if(token!==rankFetchToken||scene!=='sc-kumite-ranking')return;
  const arr=Object.entries(snap.val()||{}).map(([key,v])=>({...v,key})).filter(r=>r&&Number.isFinite(r.wins)&&r.wins>=0&&Number(r.lv)===KUMITE_CPU_LEVEL&&CHARS[r.cid]&&MAPS[r.map]&&typeof r.name==='string');
  arr.sort((a,b)=>b.wins-a.wins||(a.at||0)-(b.at||0));
  status.textContent='Firebase接続OK ／ 組み手ランキング ／ 上位 '+arr.length+' 件'+(arr.length===100?'（100件まで表示）':'');
  if(!arr.length){table.innerHTML='<div class="card">まだ記録がありません。最初の記録を目指そう！</div>';return;}
  table.innerHTML='<div class="rank-row rank-head"><span>順位</span><span>プレイヤー</span><span>使用キャラ</span><span>使用マップ</span><span>記録</span></div>'+arr.map((r,i)=>'<div class="rank-row '+(i<3?'top3':'')+'"><b>'+(i+1)+'</b><div class="rank-player">'+esc(r.name)+'</div><div class="rank-character">'+rankAvatar(r.cid)+'<span>'+esc(CHARS[r.cid]?.name||'')+'</span></div><div class="rank-map">'+esc(MAPS[r.map]?.name||'')+'</div><div class="rank-wins">'+Math.floor(r.wins)+'<small style="font-size:10px"> 人</small></div></div>').join('');
 }catch(err){
  if(token!==rankFetchToken)return;
  status.textContent=rankingFirebaseError(err,'read');
  table.innerHTML='';
 }
}
function resetKumiteRankingSubmission(){
 kumiteSubmitted=false;kumiteSubmissionBusy=false;kumiteRecordRef=null;kumitePendingRun=null;
 const retry=document.getElementById('kumite-submit-retry');if(retry)retry.style.display='none';
}
async function submitKumiteResult(){
 if(kumiteSubmitted||kumiteSubmissionBusy||online||offlineMode!=='kumite')return;
 const el=document.getElementById('kumite-submit-state'),retry=document.getElementById('kumite-submit-retry');
 retry.style.display='none';
 if(kumiteCount<1){el.textContent='0人抜き：1人以上倒すとオンラインランキングへ登録できます。';return;}
 // 保存失敗後も同じ試合の記録とFirebaseキーを保持し、二重登録を防ぐ。
 if(!kumitePendingRun)kumitePendingRun={name:cleanName(settings.name).slice(0,12),cid:settings.cid,map:settings.map,wins:Math.min(10000,Math.floor(kumiteCount)),lv:KUMITE_CPU_LEVEL};
 const run=kumitePendingRun;
 if(!run.name||run.name.toUpperCase()==='PLAYER'){el.textContent='プレイヤー名が未入力のため、ランキング登録は行いませんでした。';return;}
 kumiteSubmissionBusy=true;
 try{
  el.textContent='ランキングへの接続・保存を確認中…';
  if(!await initFirebase())throw new Error(firebaseLastError||'Firebase SDKの読み込みに失敗しました');
  if(!kumiteRecordRef)kumiteRecordRef=db.ref(KUMITE_RANK_PATH+'/lv'+KUMITE_CPU_LEVEL).push();
  const ref=kumiteRecordRef;
  // 既に保存できていた場合（レスポンスだけ届かなかった場合）は二重登録しない。
  const old=await ref.once('value');
  if(!old.exists())await ref.set({...run,at:window.firebase.database.ServerValue.TIMESTAMP});
  kumiteSubmitted=true;
  el.textContent='🏆 '+run.wins+'人抜きの記録をランキングへ登録しました！';
 }catch(err){
  el.textContent=rankingFirebaseError(err,'write');
  retry.style.display='';
 }finally{kumiteSubmissionBusy=false;}
}
// Extra mode state. Tournament result is only finalized once, when a battle reaches its result screen.
function modeLabel(){
 if(online)return gmCache?.mode==='tournament'?'オンライン・トーナメント':'オンライン対戦';
 return offlineMode==='training'?'トレーニング':offlineMode==='kumite'?'組み手':offlineMode==='tournament'?'トーナメント':'CPU対戦';
}
function modeHeader(){
 const hd=document.getElementById('mode-hud'),tr=document.getElementById('training-actions');
 tr.style.display=!online&&offlineMode==='training'?'flex':'none';
 let label='';
 if(!online&&offlineMode==='training')label='PRACTICE / 技を自由に練習しよう';
 else if(!online&&offlineMode==='kumite')label='組み手　'+kumiteCount+'人抜き！　次の相手を倒そう';
 else if(!online&&offlineMode==='tournament'&&offlineTour)label='トーナメント　'+offlineTour.round+'回戦';
 else if(online&&gmCache?.mode==='tournament'){
  const t=gmCache.tour;
  label=t?'ONLINE TOURNAMENT / '+t.round+'回戦　'+(byId(myId)?'対戦中':'観戦中'):'ONLINE TOURNAMENT';
 }
 hd.style.display=label?'block':'none';hd.textContent=label;
 const bracket=document.getElementById('b-bracket');bracket.style.display=((online&&gmCache?.mode==='tournament')||(!online&&offlineMode==='tournament'))?'':'none';
 const change=document.getElementById('b-char');
 change.style.display=(online&&gmCache?.mode==='tournament')||(!online&&['tournament','kumite'].includes(offlineMode))?'none':'';
}
function tourEntry(t,id){return (t.entrants||[]).find(x=>x.id===id)||null;}
function tourName(t,id){return tourEntry(t,id)?.label||'未決定';}
function tourFighterHTML(t,id,winner){
 const e=tourEntry(t,id);
 if(!e)return '<div class="tour-fighter"><span style="color:#91a3c0">待機中 ──</span></div>';
 const avatar=CHARS[e.cid]?portrait(e.cid):'';
 return '<div class="tour-fighter '+(winner===id?'winner ':'')+(id===myId?'me':'')+'">'+avatar+'<div><b>'+esc(e.label)+'</b><small>'+esc(CHARS[e.cid]?.name||e.cid||'')+(e.cpu?' · CPU':'')+'</small></div>'+(winner===id?'<b style="margin-left:auto">✓</b>':'')+'</div>';
}
function tourDetailHTML(d){
 if(!d)return '';
 if(d.method==='cpu-sim')return '<div class="tour-result-line">CPU同士：自動判定（プレイなし）</div>';
 const winnerD=Number.isFinite(d.winnerDamage)?' ／ 勝者の被ダメ '+Math.round(d.winnerDamage)+'%':'';
 const duration=Number.isFinite(d.durationSec)?' ／ '+Math.floor(d.durationSec/60)+':'+String(d.durationSec%60).padStart(2,'0'):'';
 const loserD=Number.isFinite(d.loserDamage)?' ／ 敗者の被ダメ '+Math.round(d.loserDamage)+'%':'';
 const map=d.map&&MAPS[d.map]?' ／ '+esc(MAPS[d.map].name):'';
 return '<div class="tour-result-line">'+esc(d.method||'勝利')+duration+winnerD+loserD+map+'</div>';
}
function currentTournament(){
 if(!online)return offlineMode==='tournament'?offlineTour:null;
 const t=gmCache?.tour;
 // オンラインの試合結果は、ホストの「次の試合」操作より前でも暫定的に表へ反映する。
 if(t&&gmCache?.ph==='end'&&gmCache.w&&t.matches?.[t.index]?.includes(gmCache.w)){
   const preview=JSON.parse(JSON.stringify(t));
   progressTournament(preview,gmCache.w,gmCache.matchDetail||{method:'場外撃墜',map:gmCache.map});
   return preview;
 }
 return t;
}
function showCurrentTournamentDialog(){const t=currentTournament();if(!t)return;document.getElementById('battle-bracket').innerHTML=tourBoardHTML(t);document.getElementById('bracket-dialog').showModal();}
function matchDetailFor(winnerId,solo=true){
 const f=fighters.find(x=>x.id===winnerId),loser=fighters.find(x=>x.id!==winnerId);
 const durationSec=Math.max(0,Math.round((Date.now()-battleStartAt)/1000)-3);
 return {method:'場外撃墜',durationSec,winnerDamage:f?Math.round(f.d):null,loserDamage:loser?Math.round(loser.d):null,map:settings.map};
}
function newSoloTournament(){
 settings.map=resolveArena(settings.arenaChoice||settings.map);
 const ids=Object.keys(CHARS),rivals=[];
 for(let i=0;i<7;i++)rivals.push({id:'cpu'+i,cid:ids[Math.floor(Math.random()*ids.length)],label:'CPU '+(i+1),cpu:1,owner:myId});
 const entrants=[{id:myId,cid:settings.cid,label:cleanName(settings.name),cpu:0,owner:myId},...rivals];
 // シャッフルして組み合わせを固定する。
 for(let i=entrants.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[entrants[i],entrants[j]]=[entrants[j],entrants[i]];}
 return {entrants,matches:Array.from({length:4},(_,i)=>[entrants[2*i].id,entrants[2*i+1].id]),round:1,index:0,winners:[],details:[],history:[],champion:'',active:1,map:settings.map,stocks:settings.stocks};
}
function progressTournament(t,winner,detail=null){
 if(!t||!Array.isArray(t.matches))return false;
 // Firebase Realtime Database omits empty arrays on round creation. Restore
 // them before recording the FIRST online result or finishing a round.
 if(!Array.isArray(t.winners))t.winners=[];
 if(!Array.isArray(t.details))t.details=[];
 if(!Array.isArray(t.history))t.history=[];
 if(!Number.isInteger(t.index)||t.index<0)t.index=0;
 const current=t.matches[t.index];if(!Array.isArray(current)||!current.includes(winner))return false;
 // Guard against a stale duplicate advance after a partially persisted result.
 if(t.winners.length>t.index)t.winners=t.winners.slice(0,t.index);
 t.winners.push(winner);t.details.push(detail);t.index++;
 if(t.index>=t.matches.length){
  t.history.push({round:t.round,pairs:t.matches.map((ids,i)=>({ids,winner:t.winners[i],detail:t.details[i]||null}))});
  if(t.winners.length===1){t.champion=t.winners[0];t.matches=[];t.index=0;t.winners=[];return true;}
  const previous=t.winners.slice();t.round++;t.matches=Array.from({length:previous.length/2},(_,i)=>[previous[i*2],previous[i*2+1]]);t.index=0;t.winners=[];t.details=[];
 }
 return true;
}
function nextSoloTournamentOpponent(){
 if(!offlineTour)return null;
 const t=offlineTour;
 // CPU同士は演算で決着し、人間プレイヤーの試合まで進める。
 for(let safety=0;safety<12&&!t.champion;safety++){
  const ids=t.matches[t.index];if(!ids)break;
  if(ids.includes(myId))return t.entrants.find(e=>e.id===ids.find(id=>id!==myId));
  const winner=ids[Math.random()<.5?0:1];progressTournament(t,winner,{method:'cpu-sim',map:t.map});
 }
 return null;
}
function trainingReset(gauge=false){
 const p=byId(myId),cpu=fighters.find(f=>f.cpu);if(!p)return;
 for(const f of [p,cpu]){
  if(!f)continue;
  f.out=false;f.s=3;respawn(f);f.inv=f===p?30:0;f.d=0;
  f.x=f===p?stage.w*.33:stage.w*.67;f.y=stage.plats[0].y;
  f.g=true;f.vx=0;f.vy=0;f.kb=0;
 }
 if(gauge){p.energy=100;p.ko=100;p.rage=100;p.senku=100;p.gearM=100;if(p.cid==='eren'){p.erenGauge=100;p.erenGas=100;}}
}
function setTrainingAi(mode){trainingAiMode=mode%3;document.getElementById('train-ai').textContent=['CPU：停止','CPU：通常','CPU：最強'][trainingAiMode];}
function configureExtraCpuOptions(){
 renderCpuChoices();
 const row=document.getElementById('cpu-opts');row.style.display='flex';
 document.getElementById('seg-cpun').parentElement.style.display=offlineMode==='normal'?'flex':'none';
 document.getElementById('seg-cpupool').parentElement.style.display=offlineMode==='kumite'?'none':'flex';
 document.getElementById('seg-cpulv').parentElement.style.display=['training','kumite'].includes(offlineMode)?'none':'flex';
}
function extraModeStart(mode){
 offlineMode=mode;online=false;offlineTour=null;kumiteCount=0;kumiteOpponentSeed=0;
 settings.teamMode=false;
 configureOfflineStageOptions();
 openChars('cpu');
 configureExtraCpuOptions();
 document.getElementById('chars-next').textContent='ステージを選ぶ →';
}

function pickOfflineCpu(cid,pool){
 if(typeof cid==='string'&&Object.hasOwn(CHARS,cid))return cid;
 const ids=cpuCharacterPool(pool);return ids[Math.floor(Math.random()*ids.length)];
}

function startBattleOffline() {
  online = false;
  if(offlineMode!=='tournament')settings.map=resolveArena(settings.arenaChoice||settings.map);
  if(offlineMode==='tournament'){
   if(!offlineTour)offlineTour=newSoloTournament();
   const enemy=nextSoloTournamentOpponent();
   if(!enemy){showSoloChampion();return;}
   const me=offlineTour.entrants.find(x=>x.id===myId);
   me.cid=settings.cid;me.label=cleanName(settings.name);
   aiLv=settings.cpuLv;
   settings.map=offlineTour.map;
   startBattleCommon([me,enemy],settings.map,false,settings.stocks,false);
   modeHeader();return;
  }
  if(offlineMode==='training'||offlineMode==='kumite'){
   const keys=cpuCharacterPool(offlineMode==='kumite'?'all':settings.cpuPool),cid=offlineMode==='training'?pickOfflineCpu(settings.trainingCpuCid,settings.cpuPool):keys[Math.floor(Math.random()*keys.length)];
   if(offlineMode==='kumite')kumiteOpponentSeed++;
   const list=[{id:myId,cid:settings.cid,label:cleanName(settings.name),cpu:0,owner:myId},
               {id:'cpu'+kumiteOpponentSeed,cid:cid,label:offlineMode==='training'?'練習相手':'対戦相手 '+(kumiteCount+1),cpu:1,owner:myId}];
   aiLv=offlineMode==='kumite'?KUMITE_CPU_LEVEL:settings.cpuLv;startBattleCommon(list,settings.map,false,offlineMode==='kumite'?1:3,false);
   if(offlineMode==='training'){trainingReset(false);setTrainingAi(trainingAiMode);}else fighters[1].s=1;
   modeHeader();return;
  }
  const myTeam = settings.teamMode ? normTeam(settings.team) : 0;
  const list = [{ id: myId, cid: settings.cid, label: cleanName(settings.name), cpu: 0, owner: myId, team: myTeam }];
  for (let i = 0; i < settings.cpuN; i++) {
    let team = 0;
    if (settings.teamMode) team = i % 2 === 0 ? (myTeam === 1 ? 2 : 1) : myTeam;
    list.push({ id: 'cpu' + i, cid: pickOfflineCpu(settings.cpuCids?.[i],settings.cpuPool), label: 'CPU' + (i + 1), cpu: 1, owner: myId, team });
  }
  aiLv = settings.cpuLv;
  startBattleCommon(list, settings.map, settings.wpn, settings.stocks, settings.teamMode);
  modeHeader();
}

function startBattleOnline() {
  const g = gmCache;
  const roster=Array.isArray(g.players)?g.players:Object.values(g.players||{});
  const list = (roster.length?roster:lobbyMembers()).map(m => ({
    id: m.id, cid: m.cid, label: m.label, cpu: m.cpu,
    owner: m.cpu ? m.owner : m.id, team: g.teamMode ? normTeam(m.team) : 0
  }));
  aiLv = g.cpuLv || 0;
  items = {};
  startBattleCommon(list, g.map, !!g.wpn, g.stocks, !!g.teamMode);
  modeHeader();
  if(g.mode==='tournament'&&!byId(myId))document.getElementById('combat-hint').textContent='観戦中｜次の試合で出番が来るまで観戦できます';
}

function chooseSpawnPoints(arena,n,team=false,roster=[]){
  const options=[];
  const floor=Math.max(...arena.plats.map(p=>p.y));
  arena.plats.forEach((pl,pi)=>{
    if(pl.w<88) return;
    const m=Math.min(52,pl.w*.21);
    const count=Math.max(2,Math.min(20,Math.ceil((pl.w-2*m)/70)+1));
    for(let k=0;k<count;k++){
      const x=pl.x+m+(pl.w-2*m)*k/(count-1);
      if(x<38||x>arena.w-38)continue;
      options.push({x,y:pl.y,pl:pi});
    }
  });
  if(!options.length)return Array.from({length:n},(_,i)=>({x:arena.w*(i+1)/(n+1),y:floor,pl:0}));
  const chosen=[];const count=Math.max(1,n);
  // 2人戦は左右両端の安全な足場から。大人数は全幅へ分散する。
  const sorted=roster.map((f,i)=>({f,i})).sort((a,b)=>{
    if(team&&a.f.team!==b.f.team)return a.f.team===1?-1:1;
    return a.i-b.i;
  });
  sorted.forEach(({f,i},order)=>{
    let goal=arena.w*(order+.75)/(count+.50);
    if(count===2)goal=order===0?arena.w*.17:arena.w*.83;
    if(team&&count>=2)goal=f.team===1?arena.w*(.13+.20*(order/Math.max(1,count))):arena.w*(.67+.20*(order/Math.max(1,count)));
    let best=null,bestScore=Infinity;
    for(const v of options){
      const dist=chosen.reduce((m,c)=>Math.min(m,Math.hypot(v.x-c.x,(v.y-c.y)*.85)),Infinity);
      const crowdPenalty=Number.isFinite(dist)?Math.max(0,155-dist)*5:0;
      const score=Math.abs(v.x-goal)*.78+Math.abs(v.y-floor)*.18+crowdPenalty;
      if(score<bestScore){bestScore=score;best=v;}
    }
    const selected=best||options[order%options.length];
    chosen.push({...selected,i});
  });
  return chosen.sort((a,b)=>a.i-b.i);
}

function startBattleCommon(list, mapId, wpn, stocks, teamMode=false) {
  animeFx=[];animeClock=0;shadowCloneReset();
  senkuQueue=[];senkuSeen.clear();senkuActive=null;senkuAfter=null;specialNotices=[];hudKey="";resetNetRound();
  resetTouch();
  stage = MAPS[mapId] || MAPS.std;
  battleWpn = wpn;
  battleStocks = clampInt(stocks, 1, MAX_STOCK, DEFAULT_STOCK);
  battleTeamMode = !!teamMode;
  simAcc = 0;
  projs = []; bombs = []; mines = []; particles = []; popups = []; trails = {}; flash = {};
  if (!online) items = {};
  elim = []; freezeT = 0; pending = null; shake = 0; itemTimer = 240;
  hin = blankInput(); raw = { j: false, a: false, c: false, s: false, x: false, d: false };
  fighters = list.map((m, i) => makeFighter(m, i));
  // ステージ全体の足場を使用し、最初の数秒から密集する問題を防ぐ。
  const starts = chooseSpawnPoints(stage, fighters.length, battleTeamMode, fighters);
  fighters.forEach((f,i)=>{
    const spot=starts[i];
    f.x=spot.x;f.y=spot.y;f.g=true;f.groundPl=spot.pl;
    f.f=spot.x<stage.w*.5?1:-1;
    f.vx=0;f.vy=0;
  });
  bt = { phase: 'count', t: 200, winnerTeam: 0 };
  battleStartAt = Date.now();
  show('battle');
  // 800×450キャンバスはオンライン中は等倍で描く。高DPI端末では描画ピクセル数を最大1/4にできる。
  const preferredDensity=online?1:(window.matchMedia('(hover: hover) and (pointer: fine)').matches?2:1);
  if(pixelDensity()!==preferredDensity)pixelDensity(preferredDensity);
}

function makeFighter(m, i) {
  const result = { id: m.id, cid: m.cid, c: COLORS[i % COLORS.length], cpu: !!m.cpu, label: m.label, owner: m.owner,
    team: battleTeamMode ? normTeam(m.team) : 0,
    remote: online && m.owner !== myId, buf: [], off: null, ivf: 0,
    x: 0, y: 0, vx: 0, vy: 0, g: true, f: 1,
    d: 0, s: battleStocks, kb: 0, r: 0, a: 0, mv: null, ch: 0, cd: 0, ct: 0, cs: 0, ctc: 0, stn: 0,
    dg: 0, dgd: 1, dgc: 0, qa: 0, airDg: false, inv: 0, jn: 0, out: false, hit: {},
    w: null, am: 0, sh: 0, plk: 0, spc: 0, sph: 0, ko: 0, rec: false, rise: 0, arm: 0,
    rage: 0, rageT: 0, senku: 0, senkuWind: 0, bullets: GUN_MAX, reloadT: 0, gear: 1, gearM: 0, gearT: 0, tired: 0, sideUsed: false, dropReq: 0,
    groundPl: -1, dropPl: -1, dropT: 0, stats: { dealt: 0, deaths: 0, counters: 0, dodges: 0 },
    prev: blankInput(), ai: m.cpu ? { inp: blankInput(), t: 40, hold: 0, shold: 0 } : null };
  animeInit(result);return result;
}

function checkEnd() {
  if (fighters.length < 2) return;
  if(!online&&offlineMode==='training'){
   if(fighters.some(f=>f.out&&!f.shadowClone))trainingReset(false);
   return;
  }
  if(!online&&offlineMode==='kumite'){
   const me=byId(myId),enemy=fighters.find(f=>f.cpu&&!f.shadowClone);
   if(me?.out){bt={phase:'game',t:125,winner:enemy?.id||null,winnerTeam:0};sfxGame();return;}
   if(enemy?.out){
    kumiteCount++;const main=stage.plats[0],keys=cpuCharacterPool('all');
    const cid=keys[Math.floor(Math.random()*keys.length)];
    fighters=fighters.filter(f=>!f.cpu||f.shadowClone);
    const nxt=makeFighter({id:'cpu'+(++kumiteOpponentSeed),cid,label:'対戦相手 '+(kumiteCount+1),cpu:1,owner:myId},1);
    nxt.s=1;nxt.x=main.x+main.w*.75;nxt.y=main.y;nxt.inv=60;fighters.push(nxt);
    me.d=Math.max(0,me.d-22);me.inv=Math.max(me.inv,45);
    aiLv=KUMITE_CPU_LEVEL; // CPUは連戦中も最強で固定。
    popups.push({x:me.x,y:me.y-110,txt:kumiteCount+'人抜き！',life:80,max:80,size:40,c:'#ffdd77'});modeHeader();
   }
   return;
  }
  const alive = fighters.filter(f => !f.out&&!f.shadowClone);
  if (battleTeamMode) {
    const teams = aliveTeams();
    if (teams.length <= 1) {
      bt = { phase: 'game', t: 130, winner: null, winnerTeam: teams[0] || 0 };
      sfxGame();
    }
  } else if (alive.length <= 1) {
    bt = { phase: 'game', t: 130, winner: alive[0] ? alive[0].id : null, winnerTeam: 0 };
    sfxGame();
  }
}

function showResult(){
  const mainFighters=fighters.filter(f=>!f.shadowClone);
  const order = [];
  if (battleTeamMode && bt.winnerTeam) {
    const winners = mainFighters.filter(f => normTeam(f.team) === normTeam(bt.winnerTeam));
    const losers = mainFighters.filter(f => normTeam(f.team) !== normTeam(bt.winnerTeam));
    winners.sort((a,b)=>(b.s-a.s)||(a.stats.deaths-b.stats.deaths));
    losers.sort((a,b)=>(b.s-a.s)||(a.stats.deaths-b.stats.deaths));
    order.push(...winners,...losers);
  } else {
    if (bt.winner && byId(bt.winner)) order.push(byId(bt.winner));
    for (let i = elim.length - 1; i >= 0; i--) { const f = byId(elim[i]); if (f && !order.includes(f)) order.push(f); }
    for (const f of mainFighters) if (!order.includes(f)) order.push(f);
  }

  const win = bt.winner ? byId(bt.winner) : null;
  const rw = document.getElementById('res-win');
  if (battleTeamMode) {
    const wt = bt.winnerTeam || 0;
    rw.innerText = wt ? `${teamName(wt)} TEAM WIN!` : 'DRAW';
    rw.style.color = wt ? teamColor(wt) : '#ffffff';
    const hero = mainFighters.find(f => wt && normTeam(f.team) === normTeam(wt) && !f.out) || mainFighters.find(f => wt && normTeam(f.team) === normTeam(wt));
    document.getElementById('winner-art').innerHTML = hero ? '<div class="winner-art">'+portrait(hero.cid)+'</div>' : '';
  } else {
    rw.innerText = !win ? 'DRAW' : (win.id === myId ? 'YOU WIN!' : cleanName(win.label) + ' WIN');
    rw.style.color = win ? win.c : '#ffffff';
    document.getElementById('winner-art').innerHTML=win?'<div class="winner-art">'+portrait(win.cid)+'</div>':'';
  }

  document.getElementById('res-list').innerHTML = order.map((f, i) => {
    const badge = battleTeamMode ? `<span class="tag" style="background:${teamColor(f.team)};color:#fff">${teamName(f.team)}</span> ` : '';
    return `<div class="rk"><div class="no">${i + 1}</div><div class="mk" style="background:${battleTeamMode?teamColor(f.team):f.c}">${CC(f.cid).mark}</div><div>${badge}${esc(f.label)}　${CC(f.cid).name}` +
      `<div class="result-stats">与ダメ ${Math.round(f.stats?.dealt || 0)}% ／ ミス ${f.stats?.deaths || 0} ／ カウンター ${f.stats?.counters || 0} ／ 回避 ${f.stats?.dodges || 0}</div></div></div>`;
  }).join('');

  const tourBox=document.getElementById('tour-result');tourBox.style.display='none';
  document.getElementById('res-rank').style.display=(!online&&offlineMode==='kumite')?'block':'none';
  document.getElementById('kumite-submit-state').textContent='';
  document.getElementById('kumite-submit-retry').style.display='none';
  if(!online&&offlineMode==='tournament'&&offlineTour){
   // 勝敗が確定した試合のみトーナメント表に記録する。
   const winner=bt.winner||mainFighters.slice().sort((a,b)=>b.s-a.s||a.d-b.d)[0]?.id;
   if(winner)progressTournament(offlineTour,winner,matchDetailFor(winner));
   tourBox.style.display='block';tourBox.innerHTML=tourBoardHTML(offlineTour);
  }else if(online&&gmCache?.mode==='tournament'&&gmCache.tour){tourBox.style.display='block';tourBox.innerHTML=tourBoardHTML(currentTournament());}
  else if(!online&&offlineMode==='kumite'){
   tourBox.style.display='block';tourBox.innerHTML='<h3>組み手の記録</h3><p>'+kumiteCount+'人抜き達成！'+'</p>';
   void submitKumiteResult();
  }
  const rc = document.getElementById('res-chars'), rt = document.getElementById('res-title');
  if (online) {
    document.getElementById('res-wait').style.display = isHost ? 'none' : 'block';
    document.getElementById('res-nav1').style.display = isHost ? 'flex' : 'none';
    rc.innerText = 'ロビーへ'; rc.style.display = isHost ? '' : 'none';
    document.getElementById('res-pick').style.display = '';
    rt.innerText = '退出する';
    if(gmCache?.mode==='tournament'){
      document.getElementById('res-again').textContent='次の試合へ進む';
      rc.textContent='トーナメントを終了';
      document.getElementById('res-pick').style.display='none';
    }else document.getElementById('res-again').textContent='もう一度';
  } else {
    document.getElementById('res-wait').style.display = 'none';
    document.getElementById('res-nav1').style.display = 'flex';
    rc.innerText = 'キャラ選択へ'; rc.style.display = '';
    document.getElementById('res-pick').style.display = 'none';
    rt.innerText = 'タイトルへ';
    document.getElementById('res-again').textContent=offlineMode==='tournament'?(offlineTour?.champion?'優勝結果を見る':'次の試合へ'):'もう一度';
    if(offlineMode==='kumite')document.getElementById('res-again').textContent='もう一度挑戦';
  }
  show('sc-result');
  bt = { phase: 'over', t: 0, winner: bt.winner, winnerTeam: bt.winnerTeam || 0 };
}

function showSoloChampion(){
 const t=offlineTour;if(!t)return;
 document.getElementById('champion-name').textContent='🏆 '+tourName(t,t.champion)+' 優勝！';
 document.getElementById('champion-board').innerHTML=tourBoardHTML(t);
 document.getElementById('champion-next').textContent='ほかの遊びにもどる';
 show('sc-champion');
}
function showOnlineChampion(t){
 document.getElementById('champion-name').textContent='🏆 '+tourName(t,t.champion)+' 優勝！';
 document.getElementById('champion-board').innerHTML=tourBoardHTML(t);
 document.getElementById('champion-next').textContent=isHost?'ロビーにもどる':'ホストの操作を待つ（退出も可能）';
 show('sc-champion');
}

// 試合中のキャラ変更
function applyCharChange(id) {
  settings.cid = id;
  if (online && roomRef) roomRef.child('mem/' + myId).update({ cid: id });
  const p = byId(myId);
  if (!p || p.out || p.cid === id) return;
  p.cid = id; animeInit(p); p.ko = 0; p.spc = 0; p.sph = 0; p.arm = 0;
  p.rage = 0; p.rageT = 0; p.senku = 0; p.senkuWind = 0; p.bullets = GUN_MAX; p.reloadT = 0; p.gear = 1; p.gearM = 0; p.gearT = 0; p.tired = 0;
  clearActs(p);
  p.inv = Math.max(p.inv, 40);
  burst(p.x, p.y - 30, 24, 7, '#ffffff', 9); ring(p.x, p.y - 30, 10, 14);
  popups.push({ x: p.x, y: p.y - 110, txt: 'CHANGE! ' + CC(id).en, life: 45, max: 45, size: 22, c: '#ffd166' });
  sfxPickup();
}

