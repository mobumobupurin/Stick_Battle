'use strict';
/* STICK ROYALE — "STICK FORTUNE" 5-reel / 10-line video slot.
   Outcomes, payouts and saving come from core.js ('slot' action). This file is presentation only. */
const WorldSlot=(()=>{
const NS='http://www.w3.org/2000/svg';
const NAMES={seven:'7',bar:'BAR',star:'STAR',gem:'GEM',clover:'CLOVER',spark:'SPARK',wild:'WILD',scatter:'BONUS'};
const ART={
 seven:'<defs><linearGradient id="g7" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ff6b6b"/><stop offset=".5" stop-color="#e01b2e"/><stop offset="1" stop-color="#8a0612"/></linearGradient></defs><text x="50" y="80" text-anchor="middle" font-family="Arial Black,Impact,sans-serif" font-size="86" font-style="italic" font-weight="900" fill="url(#g7)" stroke="#ffd36b" stroke-width="4" paint-order="stroke">7</text>',
 bar:'<defs><linearGradient id="gb" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff3c4"/><stop offset="1" stop-color="#c8902e"/></linearGradient></defs><g fill="#141018" stroke="url(#gb)" stroke-width="3"><rect x="12" y="16" width="76" height="20" rx="4"/><rect x="12" y="40" width="76" height="20" rx="4"/><rect x="12" y="64" width="76" height="20" rx="4"/></g><g font-family="Arial Black,sans-serif" font-size="15" font-weight="900" fill="url(#gb)" text-anchor="middle"><text x="50" y="31">BAR</text><text x="50" y="55">BAR</text><text x="50" y="79">BAR</text></g>',
 star:'<defs><radialGradient id="gs" cx=".4" cy=".35"><stop stop-color="#fff7c2"/><stop offset=".6" stop-color="#ffc21f"/><stop offset="1" stop-color="#d27b00"/></radialGradient></defs><path d="M50 6l13 27 30 4-22 21 6 30-27-15-27 15 6-30L7 37l30-4z" fill="url(#gs)" stroke="#7a4300" stroke-width="3" stroke-linejoin="round"/>',
 gem:'<defs><linearGradient id="gg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#b8f6ff"/><stop offset=".5" stop-color="#2bb8e6"/><stop offset="1" stop-color="#0c5d8c"/></linearGradient></defs><path d="M50 92L8 38l16-24h52l16 24z" fill="url(#gg)" stroke="#063550" stroke-width="3" stroke-linejoin="round"/><path d="M8 38h84M24 14l12 24 14-24 14 24 12-24M36 38l14 54 14-54" fill="none" stroke="#e8fdff" stroke-width="2" opacity=".7"/>',
 clover:'<defs><radialGradient id="gc" cx=".4" cy=".35"><stop stop-color="#b6ffc8"/><stop offset=".6" stop-color="#22b459"/><stop offset="1" stop-color="#0b5a2a"/></radialGradient></defs><g fill="url(#gc)" stroke="#073d1c" stroke-width="3"><circle cx="50" cy="28" r="18"/><circle cx="28" cy="50" r="18"/><circle cx="72" cy="50" r="18"/><circle cx="50" cy="68" r="16"/></g><path d="M50 62q5 20-8 32" fill="none" stroke="#073d1c" stroke-width="6" stroke-linecap="round"/>',
 spark:'<defs><linearGradient id="gk" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ffe08a"/><stop offset=".5" stop-color="#ff8a1f"/><stop offset="1" stop-color="#c0400a"/></linearGradient></defs><path d="M60 4L18 58h28l-8 38 46-58H56z" fill="url(#gk)" stroke="#5e1d02" stroke-width="3" stroke-linejoin="round"/>',
 wild:'<defs><linearGradient id="gw" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff1b0"/><stop offset=".5" stop-color="#f2b324"/><stop offset="1" stop-color="#a86a06"/></linearGradient></defs><rect x="6" y="14" width="88" height="72" rx="12" fill="#2a0a3a" stroke="url(#gw)" stroke-width="5"/><circle cx="50" cy="34" r="8" fill="url(#gw)"/><path d="M50 42v16M50 58l-9 12M50 58l9 12M50 47l-12-6M50 47l12-6" stroke="url(#gw)" stroke-width="5" stroke-linecap="round"/><text x="50" y="84" text-anchor="middle" font-family="Arial Black,sans-serif" font-size="17" font-weight="900" fill="#fff">WILD</text>',
 scatter:'<defs><radialGradient id="gx" cx=".4" cy=".35"><stop stop-color="#f5d0ff"/><stop offset=".55" stop-color="#9b3bf0"/><stop offset="1" stop-color="#4a0f86"/></radialGradient></defs><circle cx="50" cy="50" r="42" fill="url(#gx)" stroke="#ffd36b" stroke-width="5"/><circle cx="50" cy="50" r="33" fill="none" stroke="#ffd36b" stroke-width="2" stroke-dasharray="4 4"/><text x="50" y="58" text-anchor="middle" font-family="Arial Black,sans-serif" font-size="19" font-weight="900" fill="#fff" stroke="#4a0f86" stroke-width="2" paint-order="stroke">BONUS</text>'
};
let uid=0;
function icon(id){const s=document.createElementNS(NS,'svg');s.setAttribute('viewBox','0 0 100 100');s.setAttribute('aria-hidden','true');const n=++uid;s.innerHTML=ART[id].replace(/id="(g\w)"/g,`id="$1${n}"`).replace(/url\(#(g\w)\)/g,`url(#$1${n})`);return s;}
function h(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
const yen=n=>Number(n||0).toLocaleString('ja-JP');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let st=null;

function randomSym(reel){return WorldCore.vsPick(reel,Math.floor(Math.random()*1000));}
function cell(id){const c=h('div','vs-cell');c.dataset.sym=id;c.append(icon(id));return c;}
function fillReel(i,col,extra){const strip=st.reels[i].strip;strip.replaceChildren();const ids=[];for(let k=0;k<extra;k++)ids.push(randomSym(i));ids.push(...col);ids.forEach(id=>strip.append(cell(id)));return ids.length;}
function cellAt(c,r){const strip=st.reels[c].strip,n=strip.children.length;return strip.children[n-3+r];}

function meter(label,cls){const m=h('div','egm-meter '+cls);const v=h('b',undefined,'0');m.append(h('small',undefined,label),v);return [m,v];}
function open(body){
 const C=WorldCore,root=h('div','egm egm-slot');
 const top=h('div','egm-topper');top.append(h('small',undefined,'STICK ROYALE VIDEO SLOTS'),h('b','egm-title','STICK FORTUNE'),h('span','egm-sub','MAX WIN ×'+C.VS_CAP+' ・ FREE GAMES ALL WINS ×'+C.VS_FREE_MULT));
 const screen=h('div','egm-screen vs-screen');
 const linesL=h('div','vs-linetabs'),linesR=h('div','vs-linetabs r');
 const order=[3,1,6,9,0,7,8,2,5,4];
 order.slice(0,5).forEach(i=>linesL.append(h('span',undefined,String(i+1))));order.slice(5).forEach(i=>linesR.append(h('span',undefined,String(i+1))));
 [...linesL.children,...linesR.children].forEach(t=>t.dataset.line=String(Number(t.textContent)-1));
 const reelsBox=h('div','vs-reels'),reels=[];
 for(let i=0;i<5;i++){const r=h('div','vs-reel'),strip=h('div','vs-strip');r.append(strip);reelsBox.append(r);reels.push({el:r,strip});}
 const overlay=document.createElementNS(NS,'svg');overlay.setAttribute('class','vs-overlay');overlay.setAttribute('viewBox','0 0 500 300');overlay.setAttribute('preserveAspectRatio','none');reelsBox.append(overlay);
 const banner=h('div','vs-banner');banner.hidden=true;
 const big=h('div','vs-big');big.hidden=true;const bigLabel=h('b','vs-big-label'),bigNum=h('strong','vs-big-num');const coins=document.createElement('canvas');coins.className='vs-coins';big.append(coins,bigLabel,bigNum,h('small',undefined,'タップでスキップ'));
 screen.append(linesL,reelsBox,linesR,banner,big);
 const msgBar=h('div','egm-msg','GOOD LUCK! ベットを選んで SPIN');
 const meters=h('div','egm-meters');const [mC,vCredit]=meter('CREDIT','credit'),[mB,vBet]=meter('BET','bet'),[mW,vWin]=meter('WIN','win');meters.append(mC,mB,mW);
 const deck=h('div','egm-deck');
 const info=h('button','egm-btn egm-btn-small','PAYS');info.type='button';
 const sound=h('button','egm-btn egm-btn-small',WorldSound.muted?'♪ OFF':'♪ ON');sound.type='button';sound.onclick=()=>{sound.textContent=WorldSound.toggle()?'♪ OFF':'♪ ON';};
 const betDown=h('button','egm-btn','BET −');betDown.type='button';const betUp=h('button','egm-btn','BET +');betUp.type='button';
 const maxBet=h('button','egm-btn egm-btn-amber','MAX BET');maxBet.type='button';
 const auto=h('button','egm-btn','AUTO');auto.type='button';
 const spin=h('button','egm-spin','SPIN');spin.type='button';
 deck.append(info,sound,betDown,betUp,maxBet,auto,spin);
 const pays=h('div','vs-pays');pays.hidden=true;buildPays(pays);
 root.append(top,screen,msgBar,meters,deck,pays);body.append(root);
 st={root,reels,overlay,banner,big,bigLabel,bigNum,coins,msgBar,vCredit,vBet,vWin,spin,auto,betUp,betDown,maxBet,linesL,linesR,pays,bet:st?.bet||10,spinning:false,autoLeft:0,skip:null,winShown:0};
 betUp.onclick=()=>stepBet(1);betDown.onclick=()=>stepBet(-1);maxBet.onclick=()=>{if(st.spinning)return;st.bet=C.VS_BETS[C.VS_BETS.length-1];WorldSound.coin();sync();};
 info.onclick=()=>{pays.hidden=!pays.hidden;WorldSound.button();};
 spin.onclick=()=>{if(st.autoLeft){st.autoLeft=0;sync();return;}go();};
 auto.onclick=()=>{if(st.autoLeft){st.autoLeft=0;sync();return;}st.autoLeft=25;sync();if(!st.spinning)go();};
 big.onclick=()=>{st.skip&&st.skip();};
 const start=[['bar','seven','gem'],['star','seven','clover'],['spark','seven','bar'],['gem','wild','star'],['clover','scatter','spark']];
 start.forEach((col,i)=>fillReel(i,col,0));
 root.addEventListener('keydown',e=>{if(e.code==='Space'&&e.target.tagName!=='INPUT'){e.preventDefault();spin.click();}});
 root.tabIndex=-1;root.focus({preventScroll:true});
 sync();
}
function buildPays(box){
 const C=WorldCore;box.append(h('b','vs-pays-title','PAYTABLE — 1ラインのベットに対する倍率（ベットの1/10が1ライン）'));
 const grid=h('div','vs-pays-grid');
 for(const id of ['wild','seven','bar','star','gem','clover','spark']){const r=h('div','vs-pay');r.append(icon(id));const p=C.VS_PAY[id];r.append(h('span',undefined,'5× '+p[2]),h('span',undefined,'4× '+p[1]),h('span',undefined,'3× '+p[0]));grid.append(r);}
 const sc=h('div','vs-pay vs-pay-scatter');sc.append(icon('scatter'));sc.append(h('span',undefined,'3個以上でFREE GAMES'),h('span',undefined,'3=8回 4=10回 5=15回'),h('span',undefined,'+ ベット×'+C.VS_SCATTER_PAY[3]+'〜×'+C.VS_SCATTER_PAY[5]));grid.append(sc);
 box.append(grid,h('p',undefined,'WILDはBONUS以外の絵柄の代わりになります。ラインは左のリールから続けてそろった数で判定。フリーゲーム中の当たりはすべて2倍。1回の払い出しはベットの'+C.VS_CAP+'倍まで。'));
}
function stepBet(d){if(!st||st.spinning)return;const B=WorldCore.VS_BETS;let i=B.indexOf(st.bet)+d;i=Math.max(0,Math.min(B.length-1,i));st.bet=B[i];WorldSound.button();sync();}
function sync(){
 if(!st)return;st.vBet.textContent=yen(st.bet);if(!st.spinning&&!walletHold)st.vCredit.textContent=yen(p.cash);
 st.spin.disabled=(st.spinning&&!st.autoLeft)||busy&&!st.autoLeft;st.spin.textContent=st.autoLeft?'STOP':'SPIN';st.spin.classList.toggle('stop',!!st.autoLeft);
 st.auto.classList.toggle('on',!!st.autoLeft);st.auto.textContent=st.autoLeft?'AUTO '+st.autoLeft:'AUTO';
 [st.betUp,st.betDown,st.maxBet].forEach(b=>b.disabled=st.spinning);
}
function say(t,kind){if(!st)return;st.msgBar.textContent=t;st.msgBar.dataset.kind=kind||'';}
function clearWins(){if(!st)return;st.overlay.replaceChildren();st.root.querySelectorAll('.vs-cell.hit,.vs-cell.dim').forEach(c=>c.classList.remove('hit','dim'));st.root.querySelectorAll('.vs-linetabs span.on').forEach(t=>t.classList.remove('on'));}
function countUp(el,from,to,ms,tick=true){return new Promise(res=>{const t0=performance.now();let last=0;const f=now=>{if(!st){res();return;}const k=Math.min(1,(now-t0)/ms),v=Math.floor(from+(to-from)*(1-Math.pow(1-k,2)));el.textContent=yen(v);if(tick&&now-last>70&&k<1){WorldSound.tick();last=now;}if(k<1)requestAnimationFrame(f);else res();};requestAnimationFrame(f);});}

async function spinReels(grid,fast){
 const R=st.reels,base=fast?520:760,gap=fast?170:240;
 // anticipation: two or more BONUS symbols on the first three reels
 const sc=grid.slice(0,3).reduce((n,col)=>n+col.filter(s=>s==='scatter').length,0);
 const tease=sc>=2&&!fast;
 const stops=R.map((_,i)=>base+i*gap+(tease&&i>=3?(i-2)*900:0));
 const cellH=R[0].el.clientHeight/3;
 R.forEach((reel,i)=>{const extra=Math.round(stops[i]/42)+8;const n=fillReel(i,grid[i],extra);const s=reel.strip;s.style.transition='none';s.style.transform='translateY(0)';reel.el.classList.add('spinning');void s.offsetHeight;
  s.style.transition=`transform ${stops[i]}ms cubic-bezier(.17,.67,.21,1.06)`;s.style.transform=`translateY(${-(n-3)*cellH}px)`;});
 WorldSound.spin();
 if(tease){setTimeout(()=>{if(!st)return;R[3].el.classList.add('tease');R[4].el.classList.add('tease');WorldSound.tease();},stops[2]);}
 await Promise.all(stops.map((ms,i)=>wait(ms).then(()=>{if(!st)return;R[i].el.classList.remove('spinning','tease');WorldSound.reelStop(i);
  grid[i].forEach((s,r)=>{if(s==='scatter'||s==='wild'){const c=cellAt(i,r);c&&c.classList.add('land');}});})));
}
function lineCells(w){if(w.line<0)return (w.cells||[]);const line=WorldCore.VS_PAYLINES[w.line];return line.slice(0,w.count).map((row,c)=>[c,row]);}
function drawLine(w){
 const line=w.line<0?null:WorldCore.VS_PAYLINES[w.line];if(!line)return;
 const pts=line.map((row,c)=>`${c*100+50},${row*100+50}`).join(' ');
 const g=document.createElementNS(NS,'polyline');g.setAttribute('points',pts);g.setAttribute('class','vs-line l'+(w.line%5));st.overlay.append(g);
 st.root.querySelectorAll(`.vs-linetabs span[data-line="${w.line}"]`).forEach(t=>t.classList.add('on'));
}
async function showWins(res,mult){
 clearWins();if(!res.wins.length)return;
 const all=new Set();res.wins.forEach(w=>lineCells(w).forEach(([c,r])=>all.add(c+'-'+r)));
 for(let c=0;c<5;c++)for(let r=0;r<3;r++){const el=cellAt(c,r);if(!el)continue;el.classList.toggle('hit',all.has(c+'-'+r));el.classList.toggle('dim',!all.has(c+'-'+r));}
 res.wins.forEach(drawLine);
 const tier=res.total>=st.bet*5?3:res.total>=st.bet?2:1;WorldSound.win(tier);
}
async function bigWin(amount){
 if(!st)return;const ratio=amount/st.bet;st.bigLabel.textContent=ratio>=50?'MEGA WIN':ratio>=25?'SUPER WIN':'BIG WIN';st.big.hidden=false;st.big.className='vs-big '+(ratio>=50?'mega':ratio>=25?'super':'');
 WorldSound.bigWin();const stopCoins=coinRain(st.coins);
 let skipped=false;const done=countUp(st.bigNum,0,amount,Math.min(6000,1800+ratio*45));
 await Promise.race([done,new Promise(r=>{st.skip=()=>{skipped=true;r();};})]);
 if(!st){stopCoins();return;}st.bigNum.textContent=yen(amount);st.skip=null;
 await Promise.race([wait(skipped?400:1400),new Promise(r=>{st.skip=r;})]);
 stopCoins();if(st){st.big.hidden=true;st.skip=null;}
}
function coinRain(canvas){
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return ()=>{};
 const W=canvas.width=canvas.clientWidth||600,H=canvas.height=canvas.clientHeight||400,x=canvas.getContext('2d');let alive=true;
 const coins=Array.from({length:70},()=>({x:Math.random()*W,y:-Math.random()*H,v:2+Math.random()*4,r:6+Math.random()*8,a:Math.random()*6,s:.05+Math.random()*.15}));
 const f=()=>{if(!alive)return;x.clearRect(0,0,W,H);for(const c of coins){c.y+=c.v;c.a+=c.s;if(c.y>H+20){c.y=-20;c.x=Math.random()*W;}const w=Math.abs(Math.cos(c.a))*c.r;x.fillStyle='#b37a10';x.beginPath();x.ellipse(c.x,c.y,w+1.5,c.r+1.5,0,0,Math.PI*2);x.fill();x.fillStyle='#ffd24a';x.beginPath();x.ellipse(c.x,c.y,w,c.r,0,0,Math.PI*2);x.fill();}requestAnimationFrame(f);};f();
 return ()=>{alive=false;x.clearRect(0,0,W,H);};
}
async function go(){
 if(!st||st.spinning||busy)return;const bet=st.bet;
 if(p.cash<bet){say('CREDIT が足りません。キャッシャーかボーナスデスクへ','lose');st.autoLeft=0;sync();return;}
 st.spinning=true;busy=true;walletHold=true;clearWins();st.vWin.textContent='0';say('GOOD LUCK!','');WorldSound.button();
 st.vCredit.textContent=yen(p.cash-bet);sync();
 let r;try{r=await request('slot',{amount:bet});}catch(e){busy=false;walletHold=false;st.spinning=false;st.autoLeft=0;renderProfile();say(e.message,'lose');sync();return;}
 busy=false;const res=r.result;
 if(!res||!Array.isArray(res.grid)){walletHold=false;st.spinning=false;st.autoLeft=0;renderProfile();say('結果を取得できませんでした','lose');sync();return;}
 const before=p.cash-res.total;st.vCredit.textContent=yen(before);
 await spinReels(res.grid,!!st.autoLeft);if(!st)return;
 let shown=0;
 if(res.baseWin>0){await showWins({wins:res.wins,total:res.baseWin},1);if(!st)return;
  if(res.baseWin>=bet*15)await bigWin(res.baseWin);if(!st)return;
  await countUp(st.vWin,0,res.baseWin,Math.min(1600,300+res.baseWin/bet*60));shown=res.baseWin;
  say(res.wins.filter(w=>w.line>=0).map(w=>'LINE '+(w.line+1)+' '+NAMES[w.sym]+'×'+w.count).concat(res.wins.filter(w=>w.line<0).map(w=>'BONUS×'+w.count)).join('  ・  ')+'   WIN '+yen(res.baseWin),'win');}
 else say(res.free.length?'':'NO WIN — もう一回！','');
 if(res.free.length){
  await wait(700);if(!st)return;
  st.banner.hidden=false;st.banner.innerHTML='';st.banner.append(h('small',undefined,'BONUS!'),h('b',undefined,'FREE GAMES ×'+res.free.length),h('span',undefined,'ALL WINS ×'+WorldCore.VS_FREE_MULT));
  WorldSound.bonus();await wait(2000);if(!st)return;st.banner.hidden=true;st.root.classList.add('free-mode');
  for(let i=0;i<res.free.length;i++){if(!st)return;const fsr=res.free[i];say('FREE GAME '+(i+1)+' / '+res.free.length,'free');clearWins();
   await spinReels(fsr.grid,true);if(!st)return;
   if(fsr.total>0){await showWins(fsr,2);await countUp(st.vWin,shown,shown+fsr.total,600);shown+=fsr.total;await wait(650);}else await wait(260);}
  if(!st)return;st.root.classList.remove('free-mode');
  const freeTotal=res.free.reduce((t,x)=>t+x.total,0);
  if(res.capped){st.vWin.textContent=yen(res.total);shown=res.total;}
  if(freeTotal>=bet*15)await bigWin(res.total);
  say('FREE GAMES 合計 '+yen(freeTotal)+'  ／  TOTAL WIN '+yen(res.total),'win');
 }
 if(!st)return;
 if(res.capped&&shown!==res.total)st.vWin.textContent=yen(res.total);
 walletHold=false;const credit=p.cash;
 if(res.total>0)await countUp(st.vCredit,before,credit,Math.min(1200,300+res.total/bet*30),false);
 renderProfile();if(!st)return;st.vCredit.textContent=yen(p.cash);
 st.spinning=false;if(st.autoLeft)st.autoLeft--;sync();
 if(st.autoLeft>0){await wait(res.total>0?900:350);if(st&&st.autoLeft>0&&!st.spinning)go();}
}
function close(){if(st){st.autoLeft=0;if(st.skip)st.skip();}st=null;walletHold=false;}
return {open,close,icon};
})();
