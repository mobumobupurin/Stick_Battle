'use strict';
/* STICK ROYALE — LUCKY WHEEL (medal corner). 48 equal segments; BONUS spins a second wheel with the JACKPOT.
   The result comes from core.js ('wheel'); this file only animates it. */
const WorldWheel=(()=>{
const NS='http://www.w3.org/2000/svg';
const COLORS={0:['#2a2332','#cbbfd8'],1:['#2d64c8','#e8f0ff'],2:['#1e9a66','#eafff4'],3:['#0f97ab','#e6fdff'],5:['#8443d0','#f6ecff'],10:['#e0782a','#fff2e6'],[-1]:['#e8b23a','#2a1600']};
const BONUS_COLORS={50:['#c8192e','#fff1c4'],2:['#3a2a12','#ffe4a3'],3:['#5a3a10','#fff0c8'],5:['#8a5a0c','#fff6d8']};
let st=null;
function h(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
const yen=n=>Number(n||0).toLocaleString('ja-JP'),wait=ms=>new Promise(r=>setTimeout(r,ms));
function meter(label){const m=h('div','egm-meter');const v=h('b',undefined,'0');m.append(h('small',undefined,label),v);return [m,v];}
const pt=(r,deg)=>{const a=deg*Math.PI/180;return [(r*Math.sin(a)).toFixed(2),(-r*Math.cos(a)).toFixed(2)];};
function wedge(r1,r2,a0,a1){const [x0,y0]=pt(r1,a0),[x1,y1]=pt(r1,a1),[x2,y2]=pt(r2,a1),[x3,y3]=pt(r2,a0);return `M${x0} ${y0}A${r1} ${r1} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${r2} ${r2} 0 0 0 ${x3} ${y3}Z`;}
function wheelSvg(values,colors,labelOf,opts){
 const n=values.length,A=360/n,R=opts.r||190,inner=opts.inner||56;let segs='',labels='',pegs='';
 values.forEach((v,i)=>{const [bg,fg]=colors[v]||colors[0];segs+=`<path d="${wedge(R,inner,i*A,(i+1)*A)}" fill="${bg}" stroke="#d9b56a" stroke-opacity=".55" stroke-width="1"/>`;
  const mid=(i+.5)*A,[lx,ly]=pt(R-opts.labelInset,mid);labels+=`<text x="${lx}" y="${ly}" transform="rotate(${mid.toFixed(2)} ${lx} ${ly})" text-anchor="middle" dominant-baseline="central" font-family="Arial Black,Impact,sans-serif" font-weight="900" font-size="${opts.font(v)}" fill="${fg}">${labelOf(v)}</text>`;
  const [px,py]=pt(R-3,i*A);pegs+=`<circle cx="${px}" cy="${py}" r="3.2" fill="#fff4d6" stroke="#7a5a20"/>`;});
 return `<g class="lw-rot">${segs}${labels}${pegs}</g>`;
}
function stage(){
 const s=document.createElementNS(NS,'svg');s.setAttribute('viewBox','-230 -236 460 472');s.setAttribute('class','lw-svg');s.setAttribute('role','img');s.setAttribute('aria-label','ラッキーホイール');
 let bulbs='';for(let i=0;i<32;i++){const [x,y]=pt(214,i*360/32+5.6);bulbs+=`<circle cx="${x}" cy="${y}" r="5" class="lw-bulb"/>`;}
 const C=WorldCore;
 s.innerHTML=`<defs><radialGradient id="lwRim" cx=".5" cy=".5"><stop offset=".86" stop-color="#3a2410"/><stop offset=".93" stop-color="#d9b56a"/><stop offset="1" stop-color="#5a3a14"/></radialGradient><radialGradient id="lwHub" cx=".4" cy=".35"><stop stop-color="#fff1c4"/><stop offset=".55" stop-color="#d9a83a"/><stop offset="1" stop-color="#7a5010"/></radialGradient><radialGradient id="lwDim"><stop stop-color="#000" stop-opacity=".0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></radialGradient></defs>
 <circle r="226" fill="url(#lwRim)"/><g class="lw-bulbs">${bulbs}</g><circle r="196" fill="#120a08"/>
 <g class="lw-main">${wheelSvg(C.WH_WHEEL,COLORS,v=>v===-1?'BONUS':v===0?'0':'×'+v,{r:194,inner:58,labelInset:26,font:v=>v===-1?10:v===0?14:17})}</g>
 <circle r="58" fill="url(#lwHub)" stroke="#5a3a10" stroke-width="3"/><text y="-8" text-anchor="middle" font-family="Georgia,serif" font-size="13" letter-spacing="2" fill="#3a2000">LUCKY</text><text y="12" text-anchor="middle" font-family="Georgia,serif" font-size="13" letter-spacing="2" fill="#3a2000">WHEEL</text>
 <g class="lw-bonus" opacity="0" pointer-events="none"><circle r="226" fill="url(#lwDim)"/><circle r="168" fill="#2a0a0a" stroke="#ffd36b" stroke-width="6"/><g transform="scale(.82)">${wheelSvg(C.WH_BONUS,BONUS_COLORS,v=>v===50?'JACKPOT':'×'+v,{r:196,inner:62,labelInset:34,font:v=>v===50?17:24})}</g><circle r="50" fill="url(#lwHub)" stroke="#5a3a10" stroke-width="3"/><text y="6" text-anchor="middle" font-family="Arial Black,sans-serif" font-size="15" fill="#5a0a10">BONUS</text></g>
 <path d="M0 -176L-17 -222H17Z" fill="#fff4d6" stroke="#7a1020" stroke-width="4" stroke-linejoin="round"/><circle cy="-222" r="8" fill="#c8192e" stroke="#fff4d6" stroke-width="3"/>`;
 return s;
}
function open(body){
 const C=WorldCore,root=h('div','egm egm-wheel');
 const top=h('div','egm-topper');top.append(h('small',undefined,'STICK ROYALE MEDAL CORNER'),h('b','egm-title','LUCKY WHEEL'),h('span','egm-sub','BONUS → JACKPOT ×50'));
 const screen=h('div','egm-screen lw-screen');const svg=stage();
 const side=h('div','lw-side');
 const odds=h('div','lw-odds');odds.append(h('b',undefined,'48マスの内訳'));
 const count=v=>C.WH_WHEEL.filter(x=>x===v).length;
 for(const [v,label] of [[-1,'BONUS'],[5,'×5'],[3,'×3'],[2,'×2'],[1,'×1'],[0,'0']]){const r=h('span','lw-odd');const sw=h('i');sw.style.background=COLORS[v][0];r.append(sw,h('em',undefined,label),h('small',undefined,count(v)+'マス'));odds.append(r);}
 const bonusInfo=h('p','lw-note','BONUSに止まるとボーナスホイールへ。12マス中1マスがJACKPOT（BET×50）。');
 side.append(odds,bonusInfo);
 screen.append(svg,side);
 const msgBar=h('div','egm-msg','BETを選んで SPIN');
 const meters=h('div','egm-meters');const [mC,vCredit]=meter('CREDIT'),[mB,vBet]=meter('BET'),[mW,vWin]=meter('WIN');meters.append(mC,mB,mW);
 const deck=h('div','egm-deck');
 const sound=h('button','egm-btn egm-btn-small',WorldSound.muted?'♪ OFF':'♪ ON');sound.type='button';sound.onclick=()=>{sound.textContent=WorldSound.toggle()?'♪ OFF':'♪ ON';};
 const bets=h('div','lw-bets');const betBtns=C.WH_BETS.map(b=>{const x=h('button','egm-btn lw-bet',String(b));x.type='button';x.onclick=()=>{if(!st||st.spinning)return;st.bet=b;WorldSound.chip();sync();};bets.append(x);return x;});
 const spin=h('button','egm-spin','SPIN');spin.type='button';spin.onclick=()=>go();
 deck.append(sound,bets,spin);
 root.append(top,screen,msgBar,meters,deck);body.append(root);
 st={root,svg,main:svg.querySelector('.lw-main .lw-rot'),bonusLayer:svg.querySelector('.lw-bonus'),bonus:svg.querySelector('.lw-bonus .lw-rot'),msgBar,vCredit,vBet,vWin,betBtns,spin,bet:st?.bet||10,rot:st?.rot||0,brot:0,spinning:false};
 st.main.style.transform=`rotate(${st.rot}deg)`;
 root.tabIndex=-1;root.addEventListener('keydown',e=>{if(e.code==='Space'||e.key==='Enter'){e.preventDefault();go();}});root.focus({preventScroll:true});
 sync();
}
function say(t,kind){if(!st)return;st.msgBar.textContent=t;st.msgBar.dataset.kind=kind||'';}
function sync(){if(!st)return;st.vBet.textContent=yen(st.bet);if(!st.spinning&&!walletHold)st.vCredit.textContent=yen(p.cash);st.betBtns.forEach((b,i)=>{b.classList.toggle('on',WorldCore.WH_BETS[i]===st.bet);b.disabled=st.spinning;});st.spin.disabled=st.spinning||busy||p.cash<st.bet;}
// spin a wheel group so that segment `index` (of n) stops under the top pointer
function spinTo(g,from,index,n,turns,ms){
 const A=360/n,jitter=(Math.random()-.5)*A*.7,want=-((index+.5)*A)+jitter;
 let target=from+turns*360+((((want-from)%360)+360)%360);
 return new Promise(res=>{const t0=performance.now();let lastSeg=Math.floor(from/A);
  const f=now=>{if(!st){res(target);return;}const k=Math.min(1,(now-t0)/ms),e=1-Math.pow(1-k,4),r=from+(target-from)*e;g.style.transform=`rotate(${r}deg)`;
   const seg=Math.floor(r/A);if(seg!==lastSeg){lastSeg=seg;WorldSound.tick();}
   if(k<1)requestAnimationFrame(f);else res(target);};requestAnimationFrame(f);});
}
async function go(){
 if(!st||st.spinning||busy)return;const bet=st.bet;if(p.cash<bet){say('CREDIT が足りません','lose');return;}
 st.spinning=true;busy=true;walletHold=true;st.vWin.textContent='0';st.vCredit.textContent=yen(p.cash-bet);say('GOOD LUCK!','');WorldSound.spin();sync();
 st.root.classList.remove('lw-hit','lw-jackpot');
 let r;try{r=await request('wheel',{amount:bet});}catch(e){busy=false;walletHold=false;if(st){st.spinning=false;say(e.message,'lose');sync();}renderProfile();return;}
 busy=false;const res=r.result;if(!st){walletHold=false;renderProfile();return;}
 if(!res||!Number.isInteger(res.index)){walletHold=false;st.spinning=false;renderProfile();say('結果を取得できませんでした','lose');sync();return;}
 const C=WorldCore;
 st.rot=await spinTo(st.main,st.rot,res.index,C.WH_WHEEL.length,6,4300);if(!st)return;
 if(res.bonusIndex!==null&&res.bonusIndex!==undefined){
  WorldSound.bonus();say('BONUS WHEEL!','win');st.root.classList.add('lw-hit');await wait(500);if(!st)return;
  st.bonusLayer.style.transition='opacity .45s';st.bonusLayer.setAttribute('opacity','1');await wait(600);if(!st)return;
  st.brot=await spinTo(st.bonus,st.brot,res.bonusIndex,C.WH_BONUS.length,5,3800);if(!st)return;
 }
 walletHold=false;const before=p.cash-res.won;
 if(res.won>0){
  st.root.classList.add('lw-hit');if(res.jackpot)st.root.classList.add('lw-jackpot');
  const lv=res.mult>=10?5:res.mult>=3?3:res.mult>=2?2:1;WorldSound.win(lv);if(res.mult>=10)WorldSound.bigWin();
  await Promise.all([countUp(st.vWin,0,res.won,Math.min(2600,400+res.mult*80)),countUp(st.vCredit,before,p.cash,Math.min(2600,400+res.mult*80))]);if(!st)return;
  say(res.jackpot?'JACKPOT!!  +'+yen(res.won):res.mult===1?'×1  BETが戻りました':'WIN ×'+res.mult+'  +'+yen(res.won),'win');
 }else{WorldSound.lose();say('ざんねん… もう一回！','');st.vCredit.textContent=yen(p.cash);}
 renderProfile();
 if(st.bonusLayer.getAttribute('opacity')==='1'){await wait(1400);if(!st)return;st.bonusLayer.setAttribute('opacity','0');}
 st.spinning=false;sync();
}
function countUp(el,from,to,ms){return new Promise(res=>{const t0=performance.now();let last=0;const f=now=>{if(!st){res();return;}const k=Math.min(1,(now-t0)/ms);el.textContent=yen(Math.floor(from+(to-from)*k));if(now-last>70&&k<1){WorldSound.tick();last=now;}if(k<1)requestAnimationFrame(f);else res();};requestAnimationFrame(f);});}
function close(){st=null;walletHold=false;}
return {open,close};
})();
