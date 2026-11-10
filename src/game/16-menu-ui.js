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

// Full, per-fighter move explanations. Keep labels aligned with the actual input
// paths (A/charged A and neutral/side/up/down special) in 07-movement.js and
// the fighter-specific modules; standard characters share their B with side/down.
const FIGHTER_GUIDE_DATA={
 karate:{
  lead:'扱いやすい近距離と飛び道具のバランス型。波動拳で相手を動かし、昇龍拳で迎え撃とう。',
  a:'素早い近距離パンチ。相手との距離が近いときの主力。',
  charge:'長押しで力を溜めて放つ強打。撃墜を狙える。',
  b:'波動拳｜前方に遅めの気弾を放つ。連続で撃って牽制できる。',
  up:'昇龍拳｜炎をまとって高く跳び上がるアッパー。復帰と対空に使える。'
 },
 bomber:{
  lead:'爆弾と地雷で相手の動きを制限するトラップ型。爆発の巻き込みに注意。',
  b:'爆弾投げ｜短押しで爆弾を投げる。敵や地形に当たると爆発する。',
  hold:'特殊ボタン長押しで地雷設置。足場に仕掛けて接近を阻む。',
  up:'爆風ジャンプ｜足元で爆発を起こして上昇。近くの敵も吹っ飛ばす。'
 },
 ninja:{
  lead:'高速移動と3段ジャンプで翻弄する軽量ファイター。被弾すると飛ばされやすい。',
  b:'手裏剣｜速い手裏剣を連続で放つ。射程は短め。',
  up:'変わり身｜煙とともに上方向へワープ。一瞬の無敵で危険を回避。',
  a:'軽快な打撃。足の速さで間合いを作ってから攻める。'
 },
 sumo:{
  lead:'鈍重だが非常に頑丈。強烈な張り手とアーマーを生かして押し込む。',
  b:'張り手｜溜め攻撃級の強力な一撃。使うと約2.5秒の待ち時間が発生。',
  up:'どすこいジャンプ｜アーマー付きで跳び上がる復帰技。攻撃判定はない。'
 },
 boxer:{
  lead:'接近戦で手数を稼ぎ、KOゲージが溜まったら必殺のアッパーを狙おう。',
  a:'高威力のパンチ。攻め続けてKOゲージを溜めよう。',
  b:'KOアッパー｜KOゲージMAX時だけ発動できる、カウンターを貫く必殺の一撃。',
  up:'ジャンピングアッパー｜上昇しながら拳を突き上げる。'
 },
 yankee:{
  lead:'ダメージを受けながら怒りを溜め、変身後の圧倒的な火力で反撃する。',
  a:'重いパンチ。怒り状態では威力と吹っ飛ばし性能がさらに上がる。',
  b:'怒り解放｜怒りゲージがMAXになると、10秒間の強化状態に変身。',
  up:'根性ジャンプ｜大きく跳ぶ復帰技。攻撃判定はない。'
 },
 swordsman:{
  lead:'通常攻撃の長い剣で間合いを制し、ゲージMAXの「旋空」で決着をつける。',
  a:'刀による斬撃。拳より長いリーチがある。',
  charge:'刀を大きく振る溜め斬り。射程と吹っ飛ばしに優れる。',
  b:'旋空｜ゲージがMAXになると発動。時間を止めて前方を一閃し、ガード・アーマーを貫く。',
  up:'斬り上げ｜上昇しながら頭上を切り払う。'
 },
 lancer:{
  lead:'長い槍で距離を取り、溜めた突撃で一気に間合いを詰める。',
  a:'槍の長いリーチを生かした突き。',
  charge:'強力な溜め突き。普通のキャラより遠くまで届く。',
  b:'突撃｜特殊を長押しして離すと槍を構えて突進。長く溜めるほど遠く、強くなる。突進中はアーマー。',
  up:'昇槍｜上へ槍を突き上げながら跳ぶ。'
 },
 gunman:{
  lead:'距離を保って射撃し、弾切れのタイミングを狙われないようにする。',
  b:'リボルバー｜6発装填。特殊の短押しで1発ずつ射撃し、約0.6秒間隔で撃てる。',
  hold:'特殊を長押しするとリロード。弾切れ後は自動装填。',
  up:'ガンジャンプ｜足元に撃ち込んだ爆風で上昇。周囲にも攻撃判定があり弾は消費しない。'
 },
 archer:{
  lead:'貫通する矢で遠距離から戦う。上必殺技も射撃技なので、復帰用ジャンプではない。',
  b:'弓射ち｜短押しで高速の貫通矢を発射（20%）。',
  hold:'約0.45秒以上弓を引いてから離すと、貫通する矢を5本扇状に放つ。',
  up:'天射ち｜真上に3本の矢を放つ。上昇はしない。'
 },
 berserker:{
  lead:'遅い代わりに重い鎧でダメージを半減。巨大斧の破壊力が最大の強み。',
  a:'大きな斧による重い通常攻撃。振り始めは遅め。',
  charge:'巨大斧を溜めて強烈に振り下ろす。',
  b:'断頭斬｜48%の大ダメージと非常に強い吹っ飛ばし。カウンター無効だが後隙が大きい。',
  up:'天断ち｜頭上を斧で薙ぎ払う（42%）。上昇はしない。'
 },
 rubber:{
  lead:'伸びる腕とギアチェンジを使う変則型。覚醒すると技の性能が大幅に変化する。',
  a:'ゴムの腕を伸ばしてパンチ。ギア状態で威力と動きが変化。',
  b:'ゴムゴムの銃｜腕を遠くまで伸ばして殴る。',
  side:'ゴムゴムのバズーカ｜両腕を引き絞って前方に放つ。',
  up:'ゴムゴムのロケット｜ゴムの反動で大きく上昇。頭上に攻撃判定。',
  down:'ギアチェンジ｜ゲージMAX時に下特殊。ギア2→3→4→5と変身し、ギア5は15秒間。'
 },
 goku:{
  lead:'気弾・かめはめ波で牽制し、超サイヤ人へ変身して戦闘性能を引き上げる。',
  b:'気弾｜短押しで連射できる。長押しして離すとかめはめ波（移動しながらチャージ可能）。',
  side:'瞬間移動｜進行方向の離れた足場へワープ。位置取りや奇襲に使う。',
  up:'上昇技｜通常〜超サイヤ人2は攻撃判定なしの大ジャンプ。超3のみ「龍拳」。',
  down:'気を溜める／変身｜下特殊で気を溜め、ゲージMAXで超サイヤ人→2→3へ。'
 },
 gojo:{
  lead:'無下限で飛び道具を無効化。蒼・赫・茈を使い分け、ゲージMAXで領域展開。',
  b:'術式｜短押しで「蒼」、少し長押しで「赫」、長押しで虚式「茈」。',
  side:'踏み込み打撃｜前へ踏み込み攻撃。まれに黒閃が発生する。',
  up:'上昇技｜攻撃判定のない大ジャンプ。',
  down:'無量空処｜術式ゲージMAXで領域展開。範囲内の敵を行動不能にする。'
 },
 tanjiro:{
  lead:'日輪刀の剣技で攻める軽量アタッカー。呼吸ゲージを溜めてヒノカミ神楽に覚醒する。',
  a:'日輪刀の斬撃。通常攻撃・溜め攻撃ともに刀で攻める。',
  charge:'日輪刀を大きく振る溜め斬り。攻撃後の隙に注意。',
  b:'壱ノ型・水面斬り｜水の呼吸で前方を斬る。神楽中は「碧羅の天」に変化。',
  side:'参ノ型・流流舞い｜踏み込む連続斬り。神楽中は「烈日紅鏡」。',
  up:'弐ノ型・水車｜斬りながら上昇して復帰。神楽中は「飛輪陽炎」。',
  down:'ヒノカミ神楽｜呼吸ゲージMAX時に18秒間強化。神楽中の下特殊は残像回避「幻日虹」。'
 },
 naruto:{
  lead:'螺旋丸・螺旋手裏剣を使い分け、チャクラで影分身と段階変身を使う。',
  b:'風遁・螺旋手裏剣｜短押しで遠距離に放つ。',
  hold:'約0.5秒の特殊長押しで影分身を召喚（チャクラ60消費・最大2体）。',
  side:'螺旋丸｜前方へ踏み込んで打ち込む。',
  up:'高速瞬身｜一瞬で上へ移動する。攻撃判定はない。',
  down:'チャクラ解放｜MAXで仙人モード→九尾チャクラモードの2段階に変身。'
 },
 jotaro:{
  lead:'スタープラチナの近距離ラッシュが主力。時止め中は承太郎だけが動ける。',
  b:'オラオララッシュ｜スタープラチナで連続攻撃。最後に重い一撃。',
  side:'スターフィンガー｜指を伸ばして前方を攻撃。',
  up:'スタープラチナと大ジャンプ｜復帰用の上昇技。攻撃判定なし。',
  down:'ザ・ワールド｜ゲージMAXで時間を止める。停止中に与えたダメージは解除時に反映。'
 },
 eren:{
  lead:'人間時は立体機動装置で追撃し、ゲージMAXで18秒間の巨人へ変身。',
  a:'二刀による素早い斬撃。溜め攻撃で回転斬りを繰り出す。',
  charge:'強い回転斬り。巨人時は重いスマッシュに変化。',
  b:'ワイヤー追尾急襲／横回転斬り｜離れた敵には急接近、近くでは回転斬り。巨人時は掴み投げ。',
  side:'立体機動急襲｜ワイヤーで敵に接近して斬る。巨人時はタックル。',
  up:'縦回転斬り｜ガスで斬りながら上昇（空中1回）。巨人時は対空アッパー。',
  down:'巨人化｜TITANゲージMAXで18秒間巨人化。巨人時の下特殊は約2秒の硬質化。'
 },
 kaneki:{
  lead:'4本の鱗赫を使う中距離ラッシュ型。捕縛で相手の攻撃を中断してから連撃へ。',
  a:'赫子打撃｜素早い近距離攻撃。溜めAは「四尾穿突」。',
  charge:'四尾穿突｜長い赫子で相手を刺し貫く。半赫者時は「百足・貫穿」。',
  b:'赫子乱舞｜4本の赫子で連続攻撃してスマッシュで締める。半赫者時は「百足乱舞」。',
  side:'赫子捕縛｜射線上の途中の敵も捉える長距離の掴み技。命中で相手の技を中断。半赫者時は「百足急襲」。',
  up:'赫子跳躍｜赫子で上昇する復帰技（空中1回）。半赫者時は強化。',
  down:'半赫者「百足」｜ゲージMAXで15秒間覚醒。覚醒中の下特殊は範囲攻撃「狂乱衝撃」。'
 }
};
function fighterMoveGuide(id){
 const C=CC(id),g=FIGHTER_GUIDE_DATA[id]||{};
 const defaultAttack='通常攻撃｜短押しで素早く攻撃。';
 const defaultCharge='溜め攻撃｜攻撃ボタンを長押しし、離すと強い一撃。';
 const defaultSide='このキャラは横方向専用の特殊技がなく、通常の特殊技と同じ攻撃を使います。';
 const defaultDown='このキャラは下方向専用の特殊技がなく、通常の特殊技と同じ攻撃を使います。';
 return {
  name:C.name,role:typeof fighterRoles!=='undefined'?(fighterRoles[id]||C.en):C.en,
  lead:g.lead||C.sp,
  ability:C.ab,
  moves:[
   {key:'A',label:'通常攻撃',desc:g.a||defaultAttack},
   {key:'長押しA',label:'溜め攻撃',desc:g.charge||defaultCharge},
   {key:'B',label:'特殊技',desc:g.b||C.sp},
   {key:'横+B',label:'横必殺技',desc:g.side||defaultSide},
   {key:'上+B',label:'上必殺技',desc:g.up||C.up},
   {key:'下+B',label:'下必殺技',desc:g.down||defaultDown}
  ],
  hold:g.hold||''
 };
}
function fighterGuideText(parent,tag,textValue,className){
 const el=document.createElement(tag);
 if(className)el.className=className;
 el.textContent=textValue;
 parent.appendChild(el);
 return el;
}
function openFighterGuide(){
 const id=settings.cid,guide=fighterMoveGuide(id);
 const dialog=document.getElementById('fighter-guide-dialog');
 if(!dialog||dialog.open)return;
 setTxt(document.getElementById('fighter-guide-name'),guide.name+'｜技・キャラ解説');
 setTxt(document.getElementById('fighter-guide-role'),guide.role);
 setTxt(document.getElementById('fighter-guide-ability'),guide.ability);
 const container=document.getElementById('fighter-guide-moves');
 container.replaceChildren();
 fighterGuideText(container,'p',guide.lead,'fighter-guide-lead');
 for(const move of guide.moves){
  const card=document.createElement('article');card.className='fighter-guide-move';
  fighterGuideText(card,'span',move.key,'fighter-guide-key');
  fighterGuideText(card,'h3',move.label,'fighter-guide-move-name');
  fighterGuideText(card,'p',move.desc,'fighter-guide-move-desc');
  container.appendChild(card);
 }
 if(guide.hold){
  const extra=document.createElement('article');extra.className='fighter-guide-move fighter-guide-hold';
  fighterGuideText(extra,'span','長押しB','fighter-guide-key');
  fighterGuideText(extra,'h3','特殊ボタンの長押し','fighter-guide-move-name');
  fighterGuideText(extra,'p',guide.hold,'fighter-guide-move-desc');
  container.appendChild(extra);
 }
 dialog.showModal();
 document.getElementById('fighter-guide-close')?.focus();
}

const menuBuildBase=buildMenus;
buildMenus=function(){
 menuBuildBase();
 const guideButton=document.getElementById('fighter-guide-open');
 const guideDialog=document.getElementById('fighter-guide-dialog');
 guideButton?.addEventListener('click',openFighterGuide);
 for(const buttonId of ['fighter-guide-close','fighter-guide-done']){
  document.getElementById(buttonId)?.addEventListener('click',()=>guideDialog?.close());
 }
 guideDialog?.addEventListener('close',()=>guideButton?.focus());
 guideDialog?.addEventListener('click',event=>{
  if(event.target===guideDialog)guideDialog.close();
 });
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
// The title artwork is authored as inline SVG in index.template.html.
// Keep its real playable-fighter silhouettes in the DOM; never replace them with a bitmap.
document.querySelector('.title-art')?.setAttribute('aria-hidden','true');
