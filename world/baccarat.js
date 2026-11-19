'use strict';
/* STICK ROYALE — electronic baccarat. Cards and payouts come from core.js ('baccarat' action). */
const WorldBaccarat=(()=>{
const SUITS=['♠','♥','♦','♣'],RANKS=['A','2','3','4','5','6','7','8','9','10','J','Q','K'],CHIPS=[10,50,100,500],HKEY='stick-royale-baccarat-road';
const SIDES={player:{label:'PLAYER',jp:'プレイヤー',pay:'1 : 1'},tie:{label:'TIE',jp:'タイ',pay:'8 : 1'},banker:{label:'BANKER',jp:'バンカー',pay:'0.95 : 1'}};
let st=null,road=[];
try{const r=JSON.parse(localStorage.getItem(HKEY));if(Array.isArray(r))road=r.filter(x=>['P','B','T'].includes(x)).slice(-60);}catch{}
function h(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
const yen=n=>Number(n||0).toLocaleString('ja-JP'),wait=ms=>new Promise(r=>setTimeout(r,ms));
function cardEl(rank){const suit=Math.floor(Math.random()*4),red=suit===1||suit===2;const c=h('div','bc-card back'+(red?' red':''));const face=h('div','bc-face');const tl=h('span','bc-corner');tl.append(h('b',undefined,RANKS[rank]),h('i',undefined,SUITS[suit]));face.append(tl,h('span','bc-pip',SUITS[suit]));c.append(face,h('div','bc-back'));return c;}
function meter(label){const m=h('div','egm-meter');const v=h('b',undefined,'0');m.append(h('small',undefined,label),v);return [m,v];}
function open(body){
 const root=h('div','egm egm-baccarat');
 const top=h('div','egm-topper');top.append(h('small',undefined,'STICK ROYALE ELECTRONIC TABLE'),h('b','egm-title','BACCARAT'),h('span','egm-sub','PLAYER 1:1 ・ BANKER 0.95:1 ・ TIE 8:1'));
 const screen=h('div','egm-screen bc-screen');
 const table=h('div','bc-table');
 const hands={};
 for(const side of ['player','banker']){const box=h('div','bc-hand bc-'+side);const head=h('div','bc-head');const total=h('b','bc-total','');head.append(h('small',undefined,SIDES[side].label),total);const cards=h('div','bc-cards');box.append(head,cards);table.append(box);hands[side]={box,cards,total};}
 const result=h('div','bc-result');result.hidden=true;
 const zones=h('div','bc-zones'),zoneEls={};
 for(const side of ['player','tie','banker']){const z=h('button','bc-zone bc-zone-'+side);z.type='button';const chip=h('span','bc-chipstack');z.append(h('b',undefined,SIDES[side].label),h('small',undefined,SIDES[side].jp+' ・ '+SIDES[side].pay),chip);z.onclick=()=>place(side);zones.append(z);zoneEls[side]={z,chip};}
 const roadBox=h('div','bc-road');roadBox.setAttribute('aria-label','結果の履歴');
 screen.append(table,result,zones,roadBox);
 const msgBar=h('div','egm-msg','チップを選んで、賭けたい場所をタップ');
 const meters=h('div','egm-meters');const [mC,vCredit]=meter('CREDIT'),[mB,vBet]=meter('BET'),[mW,vWin]=meter('WIN');meters.append(mC,mB,mW);
 const deck=h('div','egm-deck');const chips=h('div','bc-chips');
 const chipBtns=CHIPS.map(v=>{const b=h('button','bc-chip bc-chip-'+v,String(v));b.type='button';b.onclick=()=>{if(!st)return;st.chip=v;WorldSound.chip();sync();};chips.append(b);return b;});
 const sound=h('button','egm-btn egm-btn-small',WorldSound.muted?'♪ OFF':'♪ ON');sound.type='button';sound.onclick=()=>{sound.textContent=WorldSound.toggle()?'♪ OFF':'♪ ON';};
 const clear=h('button','egm-btn','CLEAR');clear.type='button';clear.onclick=()=>{if(!st||st.dealing)return;st.amount=0;st.side=null;WorldSound.button();sync();};
 const rebet=h('button','egm-btn','REBET');rebet.type='button';rebet.onclick=()=>{if(!st||st.dealing||!st.last)return;st.side=st.last.side;st.amount=Math.min(st.last.amount,p.cash,WorldCore.BAC_MAX);WorldSound.chip();sync();};
 const deal=h('button','egm-spin','DEAL');deal.type='button';deal.onclick=go;
 deck.append(chips,sound,WorldPace.button(),clear,rebet,deal);
 root.append(top,screen,msgBar,meters,deck);body.append(root);
 st={root,hands,result,zoneEls,roadBox,msgBar,vCredit,vBet,vWin,chipBtns,clear,rebet,deal,chip:st?.chip||50,side:null,amount:0,last:st?.last||null,dealing:false};
 renderRoad();sync();
}
function place(side){if(!st||st.dealing)return;const limit=Math.min(WorldCore.BAC_MAX,p.cash);if(st.side!==side){st.side=side;st.amount=0;}if(st.amount+st.chip>limit){say(limit<WorldCore.BAC_MIN?'CREDIT が足りません':'1回のベットは '+yen(WorldCore.BAC_MAX)+' まで','lose');st.amount=Math.max(st.amount,Math.min(limit,WorldCore.BAC_MAX));}else st.amount+=st.chip;WorldSound.chip();sync();}
function say(t,kind){if(!st)return;st.msgBar.textContent=t;st.msgBar.dataset.kind=kind||'';}
function sync(){
 if(!st)return;st.vBet.textContent=yen(st.amount);if(!st.dealing&&!walletHold)st.vCredit.textContent=yen(p.cash);
 for(const [side,{z,chip}] of Object.entries(st.zoneEls)){const on=st.side===side&&st.amount>0;z.classList.toggle('on',on);chip.textContent=on?yen(st.amount):'';chip.classList.toggle('show',on);z.disabled=st.dealing;}
 st.chipBtns.forEach(b=>{b.classList.toggle('on',Number(b.textContent)===st.chip);b.disabled=st.dealing;});
 st.deal.disabled=st.dealing||busy||!st.side||st.amount<WorldCore.BAC_MIN||st.amount>p.cash;st.clear.disabled=st.dealing;st.rebet.disabled=st.dealing||!st.last;
}
function renderRoad(){if(!st)return;const box=st.roadBox;box.replaceChildren();const cols=Math.max(12,Math.ceil(road.length/6));for(let i=0;i<cols*6;i++){const v=road[i];box.append(h('i',v?'bead '+v:'',v||''));}box.scrollLeft=box.scrollWidth;}
const pw=n=>WorldPace.wait(n);
// slow reveal: the card is lifted a little (peek) before it turns over
async function flip(card,peek){if(peek){card.classList.add('peek');await pw(peek);if(!st)return;card.classList.remove('peek');}card.classList.remove('back');WorldSound.card();await pw(380);}
async function go(){
 if(!st||st.dealing||busy||!st.side)return;const side=st.side,bet=st.amount;
 if(bet<WorldCore.BAC_MIN||bet>p.cash){say('ベットを置いてください','lose');return;}
 st.dealing=true;busy=true;walletHold=true;st.vWin.textContent='0';st.result.hidden=true;st.vCredit.textContent=yen(p.cash-bet);sync();
 Object.values(st.hands).forEach(x=>{x.cards.replaceChildren();x.total.textContent='';x.box.classList.remove('win');});
 say('NO MORE BETS','');WorldSound.button();
 let r;try{r=await request('baccarat',{amount:bet,side});}catch(e){busy=false;walletHold=false;st.dealing=false;renderProfile();say(e.message,'lose');sync();return;}
 busy=false;const res=r.result;if(!res){walletHold=false;st.dealing=false;renderProfile();say('結果を取得できませんでした','lose');sync();return;}
 const before=p.cash-res.won;st.vCredit.textContent=yen(before);
 const val=cards=>WorldCore.bacValue(cards);
 const order=[['player',0],['banker',0],['player',1],['banker',1]],els={player:[],banker:[]};
 for(const [s,i] of order){const c=cardEl(res[s][i]);st.hands[s].cards.append(c);els[s].push(c);WorldSound.card();await pw(520);if(!st)return;}
 const name={player:'PLAYER',banker:'BANKER'};
 for(const [s,i] of order){say(name[s]+' '+(i+1)+'枚目…','');await flip(els[s][i],i===1?900:250);if(!st)return;if(i===1){st.hands[s].total.textContent=String(val(res[s].slice(0,2)));say(name[s]+' '+val(res[s].slice(0,2)),'');await pw(650);if(!st)return;}}
 const p2=val(res.player.slice(0,2)),b2=val(res.banker.slice(0,2));
 if(p2>=8||b2>=8){say('NATURAL '+Math.max(p2,b2)+'！','win');await pw(900);if(!st)return;}
 for(const s of ['player','banker']){if(res[s].length===3){say(name[s]+' 3枚目を引きます','');await pw(1000);if(!st)return;const c=cardEl(res[s][2]);c.classList.add('third');st.hands[s].cards.append(c);WorldSound.card();await pw(600);if(!st)return;await flip(c,1100);if(!st)return;st.hands[s].total.textContent=String(val(res[s]));say(name[s]+' '+val(res[s]),'');await pw(700);if(!st)return;}}
 await pw(500);if(!st)return;
 const w=res.winner;if(w!=='tie')st.hands[w].box.classList.add('win');
 st.result.hidden=false;st.result.className='bc-result '+w;st.result.textContent=w==='tie'?'TIE '+res.pv+' — '+res.bv:SIDES[w].label+' WINS  '+res.pv+' — '+res.bv;
 road.push(w==='player'?'P':w==='banker'?'B':'T');road=road.slice(-60);try{localStorage.setItem(HKEY,JSON.stringify(road));}catch{}renderRoad();
 walletHold=false;
 if(res.won>bet){WorldSound.win(res.won>=bet*5?4:2);await Promise.all([countUpEl(st.vWin,0,res.won,700),countUpEl(st.vCredit,before,p.cash,900)]);say('WIN '+yen(res.won)+'！','win');}
 else if(res.won===bet){WorldSound.button();st.vWin.textContent=yen(res.won);say('TIE — ベットは戻ります','');}
 else{WorldSound.lose();say(SIDES[w].label+' の勝ち。次こそ！','');}
 renderProfile();if(!st)return;st.last={side,amount:bet};st.dealing=false;if(st.amount>p.cash)st.amount=Math.min(p.cash,WorldCore.BAC_MAX);sync();
}
function countUpEl(el,from,to,ms){return new Promise(res=>{const t0=performance.now();let last=0;const f=now=>{if(!st){res();return;}const k=Math.min(1,(now-t0)/ms);el.textContent=yen(Math.floor(from+(to-from)*k));if(now-last>80&&k<1){WorldSound.tick();last=now;}if(k<1)requestAnimationFrame(f);else res();};requestAnimationFrame(f);});}
function close(){st=null;walletHold=false;}
return {open,close};
})();
