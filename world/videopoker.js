'use strict';
/* STICK ROYALE — video poker (Jacks or Better 9/6). The hand is dealt here; the final hand is paid by core.js ('videopoker'). */
const WorldPoker=(()=>{
const SUITS=['♠','♥','♦','♣'],RANKS=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const ROWS=['royal','straightflush','four','fullhouse','flush','straight','three','twopair','jacks'];
let st=null;
function h(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
const yen=n=>Number(n||0).toLocaleString('ja-JP'),wait=ms=>new Promise(r=>setTimeout(r,ms));
function shuffled(){const d=[];for(let s=0;s<4;s++)for(let r=0;r<13;r++)d.push({r,s});for(let i=d.length-1;i>0;i--){const j=random(i+1);[d[i],d[j]]=[d[j],d[i]];}return d;}
function meter(label){const m=h('div','egm-meter');const v=h('b',undefined,'0');m.append(h('small',undefined,label),v);return [m,v];}
function open(body){
 const C=WorldCore,root=h('div','egm egm-poker');
 const top=h('div','egm-topper');top.append(h('small',undefined,'STICK ROYALE VIDEO POKER'),h('b','egm-title','JACKS OR BETTER'),h('span','egm-sub','ROYAL FLUSH ×800'));
 const screen=h('div','egm-screen vp-screen');
 const table=h('table','vp-pays');const rowsEl={};
 const thead=h('tr');thead.append(h('th',undefined,''));C.VP_BETS.forEach(b=>thead.append(h('th',undefined,yen(b))));table.append(thead);
 for(const k of ROWS){const tr=h('tr');tr.append(h('td',undefined,C.VP_NAMES[k]));C.VP_BETS.forEach(b=>tr.append(h('td',undefined,yen(b*C.VP_PAY[k]))));table.append(tr);rowsEl[k]=tr;}
 const status=h('div','vp-status','');
 const cardsBox=h('div','vp-cards'),slots=[];
 for(let i=0;i<5;i++){const wrap=h('div','vp-slot');const held=h('span','vp-held','HELD');const card=h('button','vp-card back');card.type='button';card.setAttribute('aria-label','カード'+(i+1));card.onclick=()=>toggle(i);wrap.append(held,card);cardsBox.append(wrap);slots.push({wrap,card,held});}
 screen.append(table,status,cardsBox);
 const msgBar=h('div','egm-msg','BET を選んで DEAL');
 const meters=h('div','egm-meters');const [mC,vCredit]=meter('CREDIT'),[mB,vBet]=meter('BET'),[mW,vWin]=meter('WIN');meters.append(mC,mB,mW);
 const deck=h('div','egm-deck');
 const sound=h('button','egm-btn egm-btn-small',WorldSound.muted?'♪ OFF':'♪ ON');sound.type='button';sound.onclick=()=>{sound.textContent=WorldSound.toggle()?'♪ OFF':'♪ ON';};
 const holds=h('div','vp-holdrow');const holdBtns=[0,1,2,3,4].map(i=>{const b=h('button','egm-btn vp-holdbtn','HOLD');b.type='button';b.onclick=()=>toggle(i);holds.append(b);return b;});
 const betOne=h('button','egm-btn','BET ONE');betOne.type='button';
 const betMax=h('button','egm-btn egm-btn-amber','BET MAX');betMax.type='button';
 const deal=h('button','egm-spin','DEAL');deal.type='button';
 deck.append(sound,WorldPace.button(),holds,betOne,betMax,deal);
 root.append(top,screen,msgBar,meters,deck);body.append(root);
 st={root,rowsEl,table,status,slots,holdBtns,msgBar,vCredit,vBet,vWin,betOne,betMax,deal,bet:st?.bet||10,phase:'bet',deckCards:[],hand:[],held:[false,false,false,false,false]};
 betOne.onclick=()=>{if(st.phase==='play'||st.phase==='busy')return;const B=C.VP_BETS;st.bet=B[(B.indexOf(st.bet)+1)%B.length];WorldSound.coin();sync();};
 betMax.onclick=()=>{if(st.phase==='play'||st.phase==='busy')return;st.bet=C.VP_BETS[C.VP_BETS.length-1];WorldSound.coin();sync();dealHand();};
 deal.onclick=()=>{if(st.phase==='play')draw();else dealHand();};
 root.tabIndex=-1;root.addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;const n=Number(e.key);if(n>=1&&n<=5){toggle(n-1);e.preventDefault();}else if(e.code==='Space'||e.key==='Enter'){deal.click();e.preventDefault();}});
 root.focus({preventScroll:true});
 sync();
}
function say(t,kind){if(!st)return;st.msgBar.textContent=t;st.msgBar.dataset.kind=kind||'';}
function renderCard(i,c,faceDown){const el=st.slots[i].card;el.replaceChildren();el.className='vp-card'+(faceDown?' back':'')+(c&&(c.s===1||c.s===2)?' red':'');if(faceDown||!c)return;const tl=h('span','vp-corner');tl.append(h('b',undefined,RANKS[c.r]),h('i',undefined,SUITS[c.s]));const br=tl.cloneNode(true);br.classList.add('br');el.append(tl,h('span','vp-pip',SUITS[c.s]),br);}
function sync(){
 if(!st)return;const C=WorldCore,ph=st.phase,col=C.VP_BETS.indexOf(st.bet);
 st.vBet.textContent=yen(st.bet);if(ph!=='play'&&ph!=='busy'&&!walletHold)st.vCredit.textContent=yen(p.cash);
 st.table.querySelectorAll('tr').forEach(tr=>[...tr.children].forEach((td,i)=>td.classList.toggle('col',i===col+1)));
 st.slots.forEach((s,i)=>{s.held.classList.toggle('on',st.held[i]&&ph==='play');s.card.disabled=ph!=='play';});
 st.holdBtns.forEach((b,i)=>{b.disabled=ph!=='play';b.classList.toggle('on',st.held[i]&&ph==='play');});
 st.deal.textContent=ph==='play'?'DRAW':'DEAL';st.deal.disabled=ph==='busy'||busy||(ph!=='play'&&p.cash<st.bet);
 st.betOne.disabled=st.betMax.disabled=ph==='play'||ph==='busy';
}
function toggle(i){if(!st||st.phase!=='play')return;st.held[i]=!st.held[i];WorldSound.button();sync();}
async function dealHand(){
 if(!st||st.phase==='play'||st.phase==='busy'||busy)return;
 if(p.cash<st.bet){say('CREDIT が足りません','lose');return;}
 st.phase='busy';walletHold=true;st.vCredit.textContent=yen(p.cash-st.bet);st.vWin.textContent='0';st.status.textContent='';st.status.className='vp-status';
 Object.values(st.rowsEl).forEach(r=>r.classList.remove('hit'));
 st.deckCards=shuffled();st.hand=st.deckCards.splice(0,5);st.held=[false,false,false,false,false];sync();
 for(let i=0;i<5;i++)renderCard(i,null,true);
 for(let i=0;i<5;i++){await WorldPace.wait(300);if(!st)return;renderCard(i,st.hand[i],false);WorldSound.card();}
 const pre=WorldCore.vpRank(st.hand);
 if(pre){st.rowsEl[pre].classList.add('hit');st.status.textContent=WorldCore.VP_NAMES[pre];st.status.className='vp-status pre';}
 st.phase='play';say('残したいカードを HOLD して DRAW（キー 1〜5 / スペース）','');sync();
}
async function draw(){
 if(!st||st.phase!=='play'||busy)return;st.phase='busy';sync();
 for(let i=0;i<5;i++)if(!st.held[i])renderCard(i,null,true);
 await WorldPace.wait(500);if(!st)return;
 const draws=[0,1,2,3,4].filter(i=>!st.held[i]);
 for(const [k,i] of draws.entries()){st.hand[i]=st.deckCards.shift();await WorldPace.wait(k===draws.length-1&&draws.length<5?800:420);if(!st)return;renderCard(i,st.hand[i],false);WorldSound.card();}
 await WorldPace.wait(450);if(!st)return;
 busy=true;let r;
 try{r=await request('videopoker',{amount:st.bet,hand:st.hand.map(c=>({r:c.r,s:c.s}))});}catch(e){busy=false;walletHold=false;renderProfile();if(st){st.phase='bet';say(e.message,'lose');sync();}return;}
 busy=false;if(!st){walletHold=false;return;}
 const res=r.result||{},before=p.cash-(res.won||0);
 Object.values(st.rowsEl).forEach(x=>x.classList.remove('hit'));
 walletHold=false;
 if(res.rank){st.rowsEl[res.rank].classList.add('hit');st.status.textContent=WorldCore.VP_NAMES[res.rank];st.status.className='vp-status win';
  st.slots.forEach(s=>s.card.classList.add('win'));
  WorldSound.win(res.won>=st.bet*9?5:res.won>=st.bet*3?3:1);if(res.won>=st.bet*25)WorldSound.bigWin();
  await Promise.all([count(st.vWin,0,res.won,Math.min(2400,400+res.won/st.bet*30)),count(st.vCredit,before,p.cash,Math.min(2400,400+res.won/st.bet*30))]);
  say('WINNER！ '+WorldCore.VP_NAMES[res.rank]+'  +'+yen(res.won),'win');}
 else{st.status.textContent='GAME OVER';st.status.className='vp-status';WorldSound.lose();say('もう一度 DEAL！','');}
 renderProfile();if(!st)return;st.phase='done';sync();
}
function count(el,from,to,ms){return new Promise(res=>{const t0=performance.now();let last=0;const f=now=>{if(!st){res();return;}const k=Math.min(1,(now-t0)/ms);el.textContent=yen(Math.floor(from+(to-from)*k));if(now-last>70&&k<1){WorldSound.tick();last=now;}if(k<1)requestAnimationFrame(f);else res();};requestAnimationFrame(f);});}
function close(){st=null;walletHold=false;}
return {open,close};
})();
