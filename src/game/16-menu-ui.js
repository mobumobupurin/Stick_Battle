// Menu-only helpers. Combat, input transport and fighter simulation are untouched.
let menuRosterFilter='all';
const menuNormalize=value=>String(value||'').normalize('NFKC').toLocaleLowerCase().trim();
function menuFighterMatches(id,query,filter){
 const c=CHARS[id];if(!c)return false;
 const special=SPECIAL_IDS.includes(id);
 return (filter==='all'||filter==='special'&&special||filter==='normal'&&!special)&&menuNormalize(c.name+' '+c.en+' '+id).includes(menuNormalize(query));
}
function menuApplyFilter(){
 const query=document.getElementById('fighter-search')?.value||'';
 let visible=0,total=0;
 document.querySelectorAll('#char-grid .ci').forEach(card=>{card.hidden=!menuFighterMatches(card.dataset.cid,query,menuRosterFilter);total++;if(!card.hidden)visible++;});
 document.querySelectorAll('#char-grid .roster-group').forEach(group=>{group.hidden=![...group.querySelectorAll('.ci')].some(card=>!card.hidden);});
 document.querySelectorAll('[data-roster-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.rosterFilter===menuRosterFilter)));
 setTxt(document.getElementById('fighter-search-status'),visible?visible+' / '+total+' FIGHTERS':'見つかりませんでした。名前や絞り込みを変えてみてください。');
}
function menuUpdateArena(){
 const target=document.getElementById('menu-arena-preview'),map=MAPS[settings.map]||MAPS.std;
 const selected=document.querySelector('#stage-grid .stc.sel');
 const choice=settings.arenaChoice||settings.map;
 if(target&&ARENA_RANDOM[choice]){const ids=arenaCandidates(choice);target.innerHTML='<div class="arena-random-hero"><span aria-hidden="true">?</span><b>'+arenaChoiceName(choice)+'</b><p>開始時に '+ids.length+' ステージから抽選</p><small>'+(choice==='random-small'?'幅800のコンパクトな地形':choice==='random-wide'?'幅960〜1600の大きな地形':'すべての広さ・地形が対象')+'</small></div><div class="arena-pool-list"></div>';target.querySelector('.arena-pool-list').textContent=ids.map(id=>MAPS[id].name).join(' ／ ');}
 else if(target&&selected){target.innerHTML=(selected.querySelector('svg')?.outerHTML||'')+'<div><b></b><small>SELECTED ARENA</small></div>';target.querySelector('b').textContent=map.name;target.querySelector('svg')?.setAttribute('aria-hidden','true');}
 const names=offlineMode==='training'?[settings.trainingCpuCid]:Array.from({length:settings.cpuN},(_,i)=>settings.cpuCids?.[i]);
 const opponents=offlineMode==='kumite'?'勝ち抜き戦':offlineMode==='tournament'?'8人トーナメント':names.map(id=>CHARS[id]?.name||'ランダム').join('・');
 setTxt(document.getElementById('menu-match-summary'),CC(settings.cid).name+' vs '+opponents+' ／ '+settings.stocks+'ストック ／ '+(settings.wpn?'武器あり':'武器なし')+(settings.teamMode?' ／ チーム戦':''));
}
const menuStageBase=renderStageGrid;
renderStageGrid=function(id,current,pick){menuStageBase(id,current,pick);
 const grid=document.getElementById(id),randomRow=document.createElement('div');randomRow.className='arena-random-options';
 for(const choice of Object.keys(ARENA_RANDOM)){
  const button=document.createElement('button');button.type='button';button.className='stc random-arena'+(choice===current?' sel':'');button.dataset.arenaChoice=choice;
  const count=arenaCandidates(choice).length;button.innerHTML='<span class="random-arena-symbol" aria-hidden="true">?</span><div class="stage-meta"><b>'+ARENA_RANDOM[choice]+'</b><small>'+count+' STAGES / '+(choice==='random-small'?'幅800':choice==='random-wide'?'幅960以上':'すべての広さ')+'</small></div>';
  button.onclick=()=>pick(choice);randomRow.appendChild(button);
 }
 grid.prepend(randomRow);
 document.querySelectorAll('#'+id+' .stc').forEach(b=>b.setAttribute('aria-pressed',String(b.classList.contains('sel'))));if(id==='stage-grid')menuUpdateArena();};
const menuShowBase=show;
show=function(id){const result=menuShowBase(id);if(id==='sc-stage')menuUpdateArena();if(id!=='battle'){const screen=document.getElementById(id);if(screen){screen.scrollTop=0;const heading=screen.querySelector('.hd,h2');heading?.setAttribute('tabindex','-1');heading?.focus?.({preventScroll:true});}}return result;};
const menuBuildBase=buildMenus;
buildMenus=function(){
 menuBuildBase();
 const previousRender=renderChars;
 renderChars=function(){const focused=document.activeElement?.dataset?.cid;previousRender();menuApplyFilter();if(focused)document.querySelector('#char-grid [data-cid="'+focused+'"]')?.focus?.({preventScroll:true});};
 document.getElementById('fighter-search').addEventListener('input',menuApplyFilter);
 document.querySelectorAll('[data-roster-filter]').forEach(b=>b.addEventListener('click',()=>{menuRosterFilter=b.dataset.rosterFilter;menuApplyFilter();}));
 document.getElementById('menu-title-back').onclick=()=>show('sc-title');
 document.getElementById('sc-stage').addEventListener('click',()=>queueMicrotask(menuUpdateArena));
 document.getElementById('char-grid').addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)||!event.target.matches('.ci'))return;
  const cards=[...document.querySelectorAll('#char-grid .ci')].filter(c=>!c.hidden),index=cards.indexOf(event.target);
  const next=event.key==='Home'?0:event.key==='End'?cards.length-1:Math.max(0,Math.min(cards.length-1,index+(event.key==='ArrowRight'?1:-1)));
  event.preventDefault();cards[next]?.focus();
 });
 setTxt(document.getElementById('menu-facts'),Object.keys(CHARS).length+' FIGHTERS  /  '+Object.keys(MAPS).length+' ARENAS  /  UP TO 8 PLAYERS');
 menuApplyFilter();menuUpdateArena();
};
// The title key art is an accessible CSS background (assets/title/title-clash.svg).
// Do not construct the former oversized single-fighter SVG on the title screen.
const titleArtwork=document.querySelector('.title-art');
if(titleArtwork){titleArtwork.setAttribute('aria-hidden','true');titleArtwork.replaceChildren();}
