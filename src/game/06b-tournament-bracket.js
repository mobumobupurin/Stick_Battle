// ========================================================
// GAME HUB / TOURNAMENT BRACKET — readable round-by-round flow.
// All match data derives from existing tournament state and is safe when
// Firebase has omitted empty arrays or unplayed round fields.
// ========================================================
function tourBoardHTML(t){
 if(!t)return '<div class="bracket-empty">対戦表を準備しています…</div>';
 const entrants=Array.isArray(t.entrants)?t.entrants:[];
 const total=entrants.length,rounds=total>=8?3:total>=4?2:1;
 const history=Array.isArray(t.history)?t.history:[];
 const matches=Array.isArray(t.matches)?t.matches:[];
 const winners=Array.isArray(t.winners)?t.winners:[];
 const details=Array.isArray(t.details)?t.details:[];
 const metaRound=Number(t.round)||1,metaIndex=Number(t.index)||0;
 const safeMap=esc(MAPS[t.map]?.name||'ステージ未定');
 const stocks=Number(t.stocks)||Number(settings.stocks)||DEFAULT_STOCK;
 const stages=[],journal=[];
 let prior=null;
 for(let round=1;round<=rounds;round++){
  const count=Math.max(1,Math.floor(total/Math.pow(2,round)));
  const recorded=history.find(x=>x&&Number(x.round)===round);
  const current=!t.champion&&metaRound===round?{
    pairs:matches.map((ids,i)=>({ids,winner:i<metaIndex?winners[i]:null,detail:details[i]||null,active:i===metaIndex}))
  }:null;
  const source=recorded||current;
  const pairs=Array.from({length:count},(_,i)=>{
   const supplied=source?.pairs?.[i];
   const derived=round===1?[entrants[i*2]?.id||null,entrants[i*2+1]?.id||null]:
     [prior?.[i*2]?.winner||null,prior?.[i*2+1]?.winner||null];
   const ids=Array.isArray(supplied?.ids)?supplied.ids:derived;
   return {ids,winner:supplied?.winner||null,detail:supplied?.detail||null,active:!!supplied?.active};
  });
  for(let i=0;i<pairs.length;i++)if(pairs[i].winner)journal.push({round,i,m:pairs[i]});
  stages.push({round,pairs});prior=pairs;
 }
 const completed=journal.length,totalMatches=Math.max(1,total-1);
 const progress=Math.min(100,Math.round(completed/totalMatches*100));
 const champion=t.champion?
   '<div class="bracket-champion-fighter">'+tourFighterHTML(t,t.champion,t.champion)+'</div>':
   '<div class="bracket-champion-pending">まだ決まっていません</div>';
 const livePair=!t.champion?matches[metaIndex]:null;
 const liveNames=Array.isArray(livePair)&&livePair.length===2?
  '<span>'+esc(tourName(t,livePair[0]))+'</span><b>VS</b><span>'+esc(tourName(t,livePair[1]))+'</span>':
  '<span>勝ち上がり待ち</span>';
 const hero='<div class="bracket-spotlight"><div><small>'+(t.champion?'TOURNAMENT COMPLETE':'NEXT MATCH / 注目の対戦')+
  '</small><strong>'+(t.champion?'優勝者決定！':'第'+metaRound+'ラウンド · 第'+(metaIndex+1)+'試合')+
  '</strong><div class="bracket-spotlight-pair">'+(t.champion?esc(tourName(t,t.champion)):liveNames)+
  '</div></div><div class="bracket-progress"><span>進行状況 <b>'+completed+' / '+totalMatches+' 試合</b></span>'+
  '<div class="bracket-progress-rail"><span style="width:'+progress+'%"></span></div></div></div>';
 const roundsHTML=stages.map((stage,index)=>{
  const round=stage.round;
  const name=round===rounds?'決勝':round===rounds-1?'準決勝':'1回戦';
  const en=round===rounds?'GRAND FINAL':round===rounds-1?'SEMI FINAL':'ROUND 1';
  const rows=stage.pairs.map((m,i)=>{
   const active=m.active,done=!!m.winner;
   const status=done?'終了':active?'対戦中・次の試合':'待機中';
   const people=m.ids.map(id=>id?tourFighterHTML(t,id,m.winner):
     '<div class="tour-fighter bracket-tbd"><span>勝ち上がり待ち</span></div>').join('<div class="bracket-vs">VS</div>');
   return '<div class="bracket-match '+(done?'is-done ':'')+(active?'is-current':'')+
      '"><div class="bracket-match-top"><span>試合 '+(i+1)+'</span><span>'+status+
      '</span></div><div class="bracket-competitors">'+people+'</div>'+
      '<div class="bracket-match-foot">'+(done?esc(tourName(t,m.winner))+' 勝利':active?'● この組み合わせで対戦':'結果待ち')+
      '</div></div>';
  }).join('');
  return '<section class="bracket-round" aria-label="'+name+'"><div class="bracket-round-title"><span>'+
    en+'</span><b>'+name+'</b><small>'+stage.pairs.length+'試合</small></div>'+
    '<div class="bracket-round-matches">'+rows+'</div></section>';
 }).join('<div class="bracket-round-arrow" aria-hidden="true">→</div>');
 const crown='<section class="bracket-champion '+(t.champion?'is-complete':'')+
  '" aria-label="優勝者"><span class="bracket-crown-mark" aria-hidden="true">♛</span>'+
  '<span class="bracket-crown-label">CHAMPION / 優勝</span>'+champion+'</section>';
 const journalHTML=journal.length?'<details class="bracket-history"><summary>終了した試合の記録　'+
  journal.length+'試合</summary><div class="bracket-history-list">'+journal.map(({round,i,m})=>
  '<div class="bracket-history-row"><span>第'+round+'ラウンド・第'+(i+1)+'試合</span>'+
   '<b>'+esc(tourName(t,m.winner))+' 勝利</b><small>'+esc(tourName(t,m.ids.find(id=>id!==m.winner)))+
   ' に勝利'+(m.detail?.method==='cpu-sim'?' · CPU自動判定':'')+'</small></div>').join('')+
  '</div></details>':'';
 return '<div class="bracket-panel"><div class="bracket-panel-header"><div>'+
   '<span class="bracket-panel-kicker">ONLINE / TOURNAMENT</span><h3>トーナメント表</h3>'+
   '<p>左から右へ勝ち上がり。黄色の枠が今の対戦です。</p></div>'+
   '<div class="bracket-panel-meta"><span>'+total+'人参加</span><span>'+safeMap+'</span>'+
   '<span>残機 '+stocks+'</span></div></div>'+hero+
   '<div class="bracket-scroller" role="region" tabindex="0" aria-label="ラウンド別のトーナメント対戦表">'+
   '<div class="bracket-rounds">'+roundsHTML+
   '<div class="bracket-round-arrow" aria-hidden="true">→</div>'+crown+'</div></div>'+
   journalHTML+'</div>';
}
