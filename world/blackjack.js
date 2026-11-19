'use strict';
/* STICK CASINO — blackjack table. The hand is dealt here; the outcome is settled by core.js / spark.js.
   Rules: 6-deck shoe, dealer stands on all 17s, blackjack pays 3:2, double on the first two cards. */
const WorldBlackjack=(()=>{
const SUITS=[['♠','b'],['♥','r'],['♦','r'],['♣','b']],RANKS=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const CHIPS=[10,50,100,500];
let st=null,shoe=[];
function h(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
const yen=n=>Number(n||0).toLocaleString('ja-JP');
function newShoe(){shoe=[];for(let d=0;d<6;d++)for(let s=0;s<4;s++)for(let r=0;r<13;r++)shoe.push({r,s});for(let i=shoe.length-1;i>0;i--){const j=random(i+1);[shoe[i],shoe[j]]=[shoe[j],shoe[i]];}}
function draw(){if(shoe.length<52)newShoe();return shoe.pop();}
function value(cards){let t=0,aces=0;for(const c of cards){if(c.r===0){aces++;t+=11;}else t+=Math.min(10,c.r+1);}while(t>21&&aces){t-=10;aces--;}return t;}
const natural=cards=>cards.length===2&&value(cards)===21;
function cardEl(c,hidden,delay){
 const e=h('div','bj-card'+(hidden?' back':''));e.style.animationDelay=(delay||0)+'ms';
 if(hidden){e.setAttribute('aria-label','伏せたカード');return e;}
 const [suit,col]=SUITS[c.s],rank=RANKS[c.r];e.classList.add(col==='r'?'red':'black');e.setAttribute('aria-label',suit+rank);
 const tl=h('span','bj-corner');tl.append(h('b',undefined,rank),h('i',undefined,suit));const br=tl.cloneNode(true);br.classList.add('br');
 e.append(tl,h('span','bj-pip',suit),br);return e;
}
function open(body){
 const root=h('div','bj'),table=h('div','bj-table');
 const dealer=h('div','bj-side bj-dealer'),dHead=h('div','bj-head');const dLabel=h('small',undefined,'DEALER'),dTotal=h('b','bj-total','');dHead.append(dLabel,dTotal);const dCards=h('div','bj-cards');dealer.append(dHead,dCards);
 const felt=h('div','bj-felt');felt.append(h('span','bj-arc','BLACKJACK PAYS 3 TO 2'),h('span','bj-arc2','DEALER MUST STAND ON ALL 17s'));
 const center=h('div','bj-center'),msgBox=h('div','bj-msg');const mMain=h('b',undefined,'PLACE YOUR BET'),mSub=h('small',undefined,'チップを置いて DEAL');msgBox.append(mMain,mSub);
 const betSpot=h('div','bj-betspot');const betChip=h('span','bj-betchip');const betText=h('small','bj-bettext','BET');betSpot.append(betChip,betText);center.append(msgBox,betSpot);
 const player=h('div','bj-side bj-player'),pHead=h('div','bj-head');const pLabel=h('small',undefined,'YOU'),pTotal=h('b','bj-total','');pHead.append(pLabel,pTotal);const pCards=h('div','bj-cards');player.append(pCards,pHead);
 table.append(felt,dealer,center,player);
 const bar=h('div','bj-bar'),chips=h('div','bj-chips');
 const chipBtns=CHIPS.map(v=>{const b=h('button','bj-chip bj-chip-'+v,v>=1000?(v/1000)+'K':String(v));b.type='button';b.setAttribute('aria-label',v+' SC');b.onclick=()=>addBet(v);chips.append(b);return b;});
 const clear=h('button','bj-btn ghost','クリア');clear.type='button';clear.onclick=()=>{if(st&&st.phase==='bet'){st.bet=0;sync();}};
 const deal=h('button','bj-btn primary','DEAL');deal.type='button';deal.onclick=startHand;
 const hit=h('button','bj-btn','HIT');hit.type='button';hit.onclick=onHit;
 const stand=h('button','bj-btn','STAND');stand.type='button';stand.onclick=onStand;
 const dbl=h('button','bj-btn','DOUBLE');dbl.type='button';dbl.onclick=onDouble;
 const again=h('button','bj-btn primary','もう一度');again.type='button';again.onclick=()=>{if(!st)return;st.phase='bet';st.player=[];st.dealer=[];render();sync();show('PLACE YOUR BET','同じベットでDEALできます','');};
 bar.append(chips,clear,deal,hit,stand,dbl,again);
 root.append(table,bar,h('p','bj-note','6デッキ・ディーラーは17以上でスタンド・ブラックジャックは1.5倍。1回のベットは10〜1,000 SC。'));
 body.append(root);
 st={root,dCards,pCards,dTotal,pTotal,mMain,mSub,msgBox,betChip,betText,chipBtns,clear,deal,hit,stand,dbl,again,bet:st?.lastBet||0,lastBet:st?.lastBet||0,phase:'bet',player:[],dealer:[],doubled:false,reveal:false};
 render();sync();
}
function show(main,sub,kind){if(!st)return;st.mMain.textContent=main;st.mSub.textContent=sub||'';st.msgBox.dataset.kind=kind||'';}
function addBet(v){if(!st||st.phase!=='bet')return;const limit=Math.min(WorldCore.BJ_MAX,p.cash);if(st.bet+v>limit){show('ベット上限',limit<WorldCore.BJ_MIN?'チップが足りません':'1回のベットは '+yen(WorldCore.BJ_MAX)+' SC まで','lose');st.bet=Math.max(st.bet,Math.min(limit,WorldCore.BJ_MAX));sync();return;}st.bet+=v;sync();}
function sync(){
 if(!st)return;const ph=st.phase,stake=st.doubled?st.bet*2:st.bet;
 st.betChip.textContent=st.bet?yen(stake):'';st.betChip.classList.toggle('on',st.bet>0);st.betText.textContent=st.doubled?'BET ×2':'BET';
 const vis=(b,on)=>{b.hidden=!on;};
 st.chipBtns.forEach(b=>{vis(b,ph==='bet');b.disabled=busy;});vis(st.clear,ph==='bet');vis(st.deal,ph==='bet');
 vis(st.hit,ph==='play');vis(st.stand,ph==='play');vis(st.dbl,ph==='play');vis(st.again,ph==='done');
 st.deal.disabled=busy||st.bet<WorldCore.BJ_MIN||st.bet>p.cash;
 st.dbl.disabled=busy||st.player.length!==2||p.cash<st.bet*2;
 st.hit.disabled=st.stand.disabled=busy;
 if(ph!=='bet')$('cashDisplay').textContent=yen(p.cash-(ph==='done'?0:stake))+' SC';
}
function render(){
 if(!st)return;st.dCards.replaceChildren();st.pCards.replaceChildren();
 st.dealer.forEach((c,i)=>st.dCards.append(cardEl(c,i===1&&!st.reveal,i*90)));
 st.player.forEach((c,i)=>st.pCards.append(cardEl(c,false,i*90)));
 st.pTotal.textContent=st.player.length?String(value(st.player)):'';
 st.dTotal.textContent=st.dealer.length?(st.reveal?String(value(st.dealer)):String(value([st.dealer[0]]))+' + ?'):'';
}
function startHand(){
 if(!st||st.phase!=='bet'||busy)return;if(st.bet<WorldCore.BJ_MIN||st.bet>p.cash){show('ベットを置いてください','10 SC から','lose');return;}
 walletHold=true;st.lastBet=st.bet;st.doubled=false;st.reveal=false;st.player=[draw(),];st.dealer=[draw()];st.player.push(draw());st.dealer.push(draw());st.phase='play';
 render();sync();show('YOUR TURN','HIT でもう1枚 / STAND で勝負','');
 if(natural(st.player)||natural(st.dealer))finish();
}
function onHit(){if(!st||st.phase!=='play'||busy)return;st.player.push(draw());render();const v=value(st.player);if(v>21)finish();else if(v===21)onStand();else sync();}
function onStand(){if(!st||st.phase!=='play'||busy)return;finish();}
function onDouble(){if(!st||st.phase!=='play'||busy||st.player.length!==2||p.cash<st.bet*2)return;st.doubled=true;st.player.push(draw());render();finish();}
async function finish(){
 if(!st)return;st.phase='settle';sync();
 const pv=value(st.player),pBJ=natural(st.player);st.reveal=true;render();
 if(pv<=21&&!pBJ){while(value(st.dealer)<17){await new Promise(r=>setTimeout(r,420));if(!st)return;st.dealer.push(draw());render();}}
 const dv=value(st.dealer),dBJ=natural(st.dealer);
 let outcome;
 if(pBJ&&dBJ)outcome='push';else if(pBJ)outcome='blackjack';else if(dBJ)outcome='lose';else if(pv>21)outcome='lose';else if(dv>21||pv>dv)outcome='win';else if(pv===dv)outcome='push';else outcome='lose';
 busy=true;sync();let r;
 try{r=await request('blackjack',{amount:st.bet,doubled:st.doubled,outcome});}catch(e){busy=false;walletHold=false;renderProfile();if(st){st.phase='done';sync();show('保存できませんでした',e.message,'lose');}return;}
 busy=false;walletHold=false;renderProfile();if(!st)return;
 const won=r.result?.won??0,stake=st.doubled?st.bet*2:st.bet;st.phase='done';
 if(st.bet>p.cash)st.bet=Math.min(p.cash,WorldCore.BJ_MAX);
 const label={blackjack:['BLACKJACK!','+'+yen(won)+' SC（1.5倍）','win'],win:['YOU WIN','+'+yen(won)+' SC','win'],push:['PUSH','引き分け・ベットは戻ります',''],lose:[pv>21?'BUST':'DEALER WINS','−'+yen(stake)+' SC','lose']}[outcome];
 show(label[0],label[1],label[2]);sync();
}
function close(){
 // A hand that was dealt but not finished is settled as a loss only if it was already resolved; otherwise nothing is charged.
 if(st&&st.phase!=='settle')walletHold=false;st=null;renderProfile();
}
return {open,close,value};
})();
