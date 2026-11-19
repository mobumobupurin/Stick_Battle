'use strict';
/* STICK CASINO — slot machine UI. Draws, payouts and saving stay in core.js / spark.js. */
const WorldSlot=(()=>{
const NS='http://www.w3.org/2000/svg',H=96,STRIP=24;
const NAMES={seven:'7',bar:'BAR',star:'スター',gem:'ジェム',clover:'クローバー',spark:'スパーク'};
function icon(id){
 const s=document.createElementNS(NS,'svg');s.setAttribute('viewBox','0 0 100 100');s.setAttribute('aria-hidden','true');
 const art={
  seven:'<text x="50" y="76" text-anchor="middle" font-family="Arial Black,Impact,sans-serif" font-size="78" font-style="italic" font-weight="900" fill="#d6283e" stroke="#4a0a12" stroke-width="3">7</text>',
  bar:'<rect x="10" y="30" width="80" height="40" rx="6" fill="#1b1b22"/><rect x="14" y="34" width="72" height="32" rx="4" fill="none" stroke="#d9b56a" stroke-width="2"/><text x="50" y="59" text-anchor="middle" font-family="Arial Black,sans-serif" font-size="24" font-weight="900" fill="#f4efe6">BAR</text>',
  star:'<path d="M50 10l11.8 24.6 27 3.4-19.8 18.6 5 26.8L50 70.4 26 83.4l5-26.8L11.2 38l27-3.4z" fill="#e9b949" stroke="#7a5212" stroke-width="3" stroke-linejoin="round"/>',
  gem:'<path d="M50 88L12 40l14-22h48l14 22z" fill="#3fa9c9" stroke="#0f3d4c" stroke-width="3" stroke-linejoin="round"/><path d="M12 40h76M26 18l12 22 12-22 12 22 12-22M38 40l12 48 12-48" fill="none" stroke="#0f3d4c" stroke-width="2"/>',
  clover:'<g fill="#3d9a5c" stroke="#123d22" stroke-width="3"><circle cx="50" cy="30" r="17"/><circle cx="30" cy="50" r="17"/><circle cx="70" cy="50" r="17"/><circle cx="50" cy="66" r="15"/></g><path d="M50 60q4 18-6 30" fill="none" stroke="#123d22" stroke-width="5" stroke-linecap="round"/>',
  spark:'<path d="M58 8L22 56h24l-6 36 38-50H54z" fill="#f08a3c" stroke="#6a2c08" stroke-width="3" stroke-linejoin="round"/>'
 }[id];
 s.innerHTML=art;return s;
}
function h(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
const yen=n=>Number(n||0).toLocaleString('ja-JP');
let st=null;
function pickVisual(){const C=WorldCore;return C.slotSymbol(Math.floor(Math.random()*100));}
function cell(id){const c=h('div','sl-cell');c.dataset.sym=id;c.append(icon(id));return c;}
function setStrip(reel,final,spinning){
 const strip=reel.querySelector('.sl-strip');strip.replaceChildren();
 const ids=[];const n=spinning?STRIP:3;
 for(let i=0;i<n;i++)ids.push(pickVisual());
 if(final){ids[n-2]=final;}
 ids.forEach(id=>strip.append(cell(id)));
 return n;
}
function paytable(){
 const C=WorldCore,t=h('div','sl-pay');t.append(h('small','sl-pay-title','PAYOUT / 配当（ベットの何倍か）'));
 for(const id of C.SLOT_SYMBOLS){const r=h('div','sl-pay-row');const icons=h('span','sl-pay-icons');for(let i=0;i<3;i++)icons.append(icon(id));r.append(icons,h('b',undefined,'×'+C.SLOT_TRIPLE[id]));t.append(r);}
 const r=h('div','sl-pay-row sl-pay-pair');r.append(h('span','sl-pay-text','左から2つそろい'),h('b',undefined,'×'+C.SLOT_PAIR));t.append(r);
 return t;
}
function open(body){
 const C=WorldCore,root=h('div','sl');
 const cab=h('div','sl-cabinet'),marquee=h('div','sl-marquee');marquee.append(h('small',undefined,'STICK CASINO'),h('b',undefined,'STICK SLOT'));
 const win=h('div','sl-window'),reels=[];for(let i=0;i<3;i++){const r=h('div','sl-reel');r.append(h('div','sl-strip'));win.append(r);reels.push(r);}
 win.append(h('i','sl-line'));
 const display=h('div','sl-display'),dMain=h('b',undefined,'PLACE YOUR BET'),dSub=h('small',undefined,'ベットを選んでSPIN');display.append(dMain,dSub);
 const ctrl=h('div','sl-controls'),bets=h('div','sl-bets');bets.setAttribute('role','group');bets.setAttribute('aria-label','ベット');
 const betBtns=C.SLOT_BETS.map(v=>{const b=h('button','sl-bet',String(v));b.type='button';b.onclick=()=>{if(st&&!st.spinning){st.bet=v;sync();}};bets.append(b);return b;});
 const spin=h('button','sl-spin','SPIN');spin.type='button';spin.onclick=go;
 ctrl.append(h('small','sl-label','BET'),bets,spin);
 cab.append(marquee,win,display,ctrl);
 root.append(cab,paytable());body.append(root);
 reels.forEach((r,i)=>setStrip(r,['seven','star','bar'][i],false));
 st={root,reels,betBtns,spin,dMain,dSub,display,bet:st?.bet||10,spinning:false};sync();
}
function sync(){if(!st)return;st.betBtns.forEach(b=>b.classList.toggle('on',Number(b.textContent)===st.bet));st.spin.disabled=st.spinning||busy;st.spin.textContent=st.spinning?'…':'SPIN';}
function show(main,sub,kind){if(!st)return;st.dMain.textContent=main;st.dSub.textContent=sub||'';st.display.dataset.kind=kind||'';}
async function go(){
 if(!st||st.spinning||busy)return;const bet=st.bet;
 if(p.cash<bet){show('チップが足りません','キャッシャーで引き出すか、ボーナスデスクへ','lose');return;}
 st.spinning=true;busy=true;walletHold=true;sync();show('GOOD LUCK','リールが回っています…','spin');
 let r;try{r=await request('slot',{amount:bet});}catch(e){busy=false;walletHold=false;st.spinning=false;renderProfile();show('エラー',e.message,'lose');sync();return;}
 busy=false;const res=r.result||{};const final=res.reels;const won=Number(res.won)||0;
 if(!Array.isArray(final)||final.length!==3){walletHold=false;st.spinning=false;renderProfile();show('結果を取得できませんでした',r.message||'','lose');sync();return;}
 $('cashDisplay').textContent=yen(p.cash-won)+' SC';
 st.root.classList.remove('sl-won');
 const durations=[900,1250,1600];
 st.reels.forEach((reel,i)=>{const n=setStrip(reel,final[i],true);const strip=reel.querySelector('.sl-strip');strip.style.transition='none';strip.style.transform='translateY(0)';void strip.offsetHeight;
  strip.style.transition=`transform ${durations[i]}ms cubic-bezier(.12,.62,.24,1.04)`;strip.style.transform=`translateY(${-(n-3)*H}px)`;});
 await new Promise(res=>setTimeout(res,durations[2]+120));
 if(!st)return;
 walletHold=false;renderProfile();st.spinning=false;sync();
 const names=final.map(x=>NAMES[x]).join(' ・ ');
 if(won>0){st.root.classList.add('sl-won');show('WIN  +'+yen(won)+' SC',names,'win');msg('おめでとうございます！ '+yen(won-bet>0?won-bet:won)+' SC の勝ち');}
 else{show('NO WIN',names,'');msg('');}
}
function close(){st=null;}
return {open,close,icon};
})();
