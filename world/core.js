'use strict';
const LIMIT=1000000000, INITIAL=5000, BONUS=500;
const floors=['lobby','arena','medal','casino'];
const red=new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
function integer(n,min=1,max=5000){if(!Number.isSafeInteger(n)||n<min||n>max)throw Error('金額が範囲外です');return n;}
function start(name='PLAYER'){return {name,cash:INITIAL,bank:0,floor:'lobby',x:50,y:83,day:'',plays:0,wins:0};}
function day(now){return new Date(now+9*3600000).toISOString().slice(0,10);}
function round(now){let id=Math.floor(now/30000);return {id,close:id*30000+23000,end:(id+1)*30000};}
function payout(p,win,mult){return win?p*mult:0;}
function roulette(n,choice,bet){integer(n,0,36);integer(bet);if(choice==='red'||choice==='black')return payout(bet,n!==0&&(red.has(n)===(choice==='red')),2);if(choice==='even'||choice==='odd')return payout(bet,n!==0&&((n%2===0)===(choice==='even')),2);if(/^n(?:[0-9]|[12][0-9]|3[0-6])$/.test(choice))return payout(bet,n===Number(choice.slice(1)),36);throw Error('ベット先が不正です');}

// ---- STICK CASINO: 5-reel video slot ----
const VS_SYMBOLS=['seven','bar','star','gem','clover','spark','wild','scatter'];
const VS_WEIGHTS=[[3,5,7,10,14,18,2,2],[3,5,7,10,14,18,3,2],[3,5,7,10,14,18,3,2],[3,5,7,10,14,18,3,2],[3,5,7,10,14,18,2,2]];
const VS_PAY={seven:[40,150,500],bar:[20,70,250],star:[12,40,150],gem:[8,25,80],clover:[5,15,50],spark:[3,10,30],wild:[60,250,1000]};
const VS_SCATTER_PAY={3:2,4:10,5:40},VS_FREE={3:8,4:10,5:15},VS_FREE_MULT=2,VS_CAP=300,VS_BETS=[10,20,50,100],VS_LINES=10;
const VS_PAYLINES=[[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1],[1,0,1,2,1]];
function vsPick(reel,r){const w=VS_WEIGHTS[reel],tot=w.reduce((a,b)=>a+b,0);let x=r%tot,t=0;for(let i=0;i<w.length;i++){t+=w[i];if(x<t)return VS_SYMBOLS[i];}return VS_SYMBOLS[0];}
function vsGrid(rng){const g=[];for(let c=0;c<5;c++){const col=[];for(let r=0;r<3;r++)col.push(vsPick(c,rng(1000)));g.push(col);}return g;}
function vsEvaluate(grid,bet,mult=1){
 const lineBet=bet/VS_LINES,wins=[];let total=0;
 VS_PAYLINES.forEach((line,li)=>{const syms=line.map((row,c)=>grid[c][row]);if(syms[0]==='scatter')return;
  let base=syms.find(s=>s!=='wild');if(base==='scatter')base=undefined;
  // count run for a base symbol (wilds substitute)
  const run=s=>{let n=0;for(const x of syms){if(x===s||x==='wild')n++;else break;}return n;};
  let best=null;
  const wildRun=(()=>{let n=0;for(const x of syms){if(x==='wild')n++;else break;}return n;})();
  if(wildRun>=3)best={sym:'wild',count:wildRun,pay:VS_PAY.wild[wildRun-3]};
  if(base&&VS_PAY[base]){const n=run(base);if(n>=3){const pay=VS_PAY[base][n-3];if(!best||pay>best.pay)best={sym:base,count:n,pay};}}
  if(best){const amount=Math.floor(best.pay*lineBet*mult);total+=amount;wins.push({line:li,sym:best.sym,count:best.count,amount});}
 });
 let scatters=0;const scatterCells=[];grid.forEach((col,c)=>col.forEach((s,r)=>{if(s==='scatter'){scatters++;scatterCells.push([c,r]);}}));
 const sc=Math.min(scatters,5);let free=0;
 if(sc>=3){const amount=Math.floor(VS_SCATTER_PAY[sc]*bet*mult);total+=amount;wins.push({line:-1,sym:'scatter',count:sc,amount,cells:scatterCells});free=VS_FREE[sc];}
 return {wins,total,free};
}
function vsSpin(bet,rng){
 const grid=vsGrid(rng),base=vsEvaluate(grid,bet,1),free=[];let total=base.total;
 for(let i=0;i<base.free;i++){const g=vsGrid(rng),e=vsEvaluate(g,bet,VS_FREE_MULT);free.push({grid:g,wins:e.wins,total:e.total});total+=e.total;}
 const capped=Math.min(total,bet*VS_CAP);
 return {grid,wins:base.wins,baseWin:base.total,free,total:capped,capped:capped<total};
}

// ---- STICK CASINO: baccarat (fully dealt here) ----
const BAC_MIN=10,BAC_MAX=1000,BAC_PAY={player:2,banker:1.95,tie:9};
const bacValue=cards=>cards.reduce((t,r)=>t+(r>=9?0:r+1),0)%10; // r: 0=A … 9=10,10=J,11=Q,12=K
function bacDeal(rng){
 const draw=()=>rng(13),P=[draw(),draw()],B=[draw(),draw()];
 let pv=bacValue(P),bv=bacValue(B);
 if(pv<8&&bv<8){
  let p3=null;
  if(pv<=5){p3=draw();P.push(p3);}
  const t=p3===null?null:(p3>=9?0:p3+1);
  const bankerDraws=t===null?bv<=5:(bv<=2||(bv===3&&t!==8)||(bv===4&&t>=2&&t<=7)||(bv===5&&t>=4&&t<=7)||(bv===6&&(t===6||t===7)));
  if(bankerDraws)B.push(draw());
 }
 pv=bacValue(P);bv=bacValue(B);
 return {player:P,banker:B,pv,bv,winner:pv>bv?'player':bv>pv?'banker':'tie'};
}
function bacPayout(side,bet,winner){if(winner==='tie')return side==='tie'?bet*BAC_PAY.tie:bet;return side===winner?Math.floor(bet*BAC_PAY[side]):0;}
// ---- STICK CASINO: video poker, Jacks or Better 9/6 ----
const VP_BETS=[10,20,30];
const VP_PAY={royal:800,straightflush:50,four:25,fullhouse:9,flush:6,straight:4,three:3,twopair:2,jacks:1};
const VP_NAMES={royal:'ROYAL FLUSH',straightflush:'STRAIGHT FLUSH',four:'FOUR OF A KIND',fullhouse:'FULL HOUSE',flush:'FLUSH',straight:'STRAIGHT',three:'THREE OF A KIND',twopair:'TWO PAIR',jacks:'JACKS OR BETTER'};
function vpRank(hand){ // hand: [{r:0..12 (0=A), s:0..3}]
 const ranks=hand.map(c=>c.r),suits=hand.map(c=>c.s),cnt={};ranks.forEach(r=>cnt[r]=(cnt[r]||0)+1);
 const counts=Object.values(cnt).sort((a,b)=>b-a),flush=suits.every(s=>s===suits[0]);
 const vals=ranks.map(r=>r===0?14:r+1).sort((a,b)=>a-b),uniq=new Set(vals).size===5;
 const wheel=uniq&&vals.join()==='2,3,4,5,14',straight=uniq&&(vals[4]-vals[0]===4||wheel);
 if(straight&&flush)return vals[0]===10?'royal':'straightflush';
 if(counts[0]===4)return 'four';if(counts[0]===3&&counts[1]===2)return 'fullhouse';if(flush)return 'flush';if(straight)return 'straight';
 if(counts[0]===3)return 'three';if(counts[0]===2&&counts[1]===2)return 'twopair';
 if(counts[0]===2){const pr=+Object.keys(cnt).find(k=>cnt[k]===2);if(pr===0||pr>=10)return 'jacks';}
 return null;
}
function vpValidHand(hand){if(!Array.isArray(hand)||hand.length!==5)return false;const seen=new Set();for(const c of hand){if(!c||!Number.isInteger(c.r)||!Number.isInteger(c.s)||c.r<0||c.r>12||c.s<0||c.s>3)return false;const k=c.r+'-'+c.s;if(seen.has(k))return false;seen.add(k);}return true;}

// ---- STICK CASINO: blackjack (the hand is played in the browser; the outcome is settled here) ----
const BJ_OUTCOMES={lose:0,push:1,win:2,blackjack:2.5},BJ_MIN=10,BJ_MAX=1000;
function bjSettle(bet,doubled,outcome){integer(bet,BJ_MIN,BJ_MAX);if(!Object.hasOwn(BJ_OUTCOMES,outcome))throw Error('結果が不正です');if(outcome==='blackjack'&&doubled)throw Error('結果が不正です');const stake=doubled?bet*2:bet;return {stake,won:Math.floor(stake*BJ_OUTCOMES[outcome])};}
function apply(p,action,d,now,rng){p={...p};let msg='',result=null;switch(action){
case 'profile':{if(typeof d.name!=='string'||!d.name.trim()||d.name.trim().length>20)throw Error('名前は1〜20文字');p.name=d.name.trim();break}
case 'move':{if(!floors.includes(d.floor)||!Number.isFinite(d.x)||!Number.isFinite(d.y))throw Error('位置が不正');p.floor=d.floor;p.x=Math.max(3,Math.min(97,d.x));p.y=Math.max(6,Math.min(94,d.y));break}
case 'bonus':{const t=day(now);if(p.day===t)throw Error('本日分は受取済み');p.day=t;p.cash+=BONUS;msg='ログインボーナス +500 SC';break}
case 'deposit':case 'withdraw':{const n=integer(d.amount,1,LIMIT);let from=action==='deposit'?'cash':'bank',to=from==='cash'?'bank':'cash';if(p[from]<n)throw Error('残高不足');p[from]-=n;p[to]+=n;msg='バンク取引完了';break}
case 'refill':if(p.pending||p.cash+p.bank!==0)throw Error('総資産0のときのみ補充できます');p.cash=INITIAL;msg='無料補充 +5000 SC';break;
case 'medal':{const n=integer(d.amount,1,100);if(p.cash<n)throw Error('残高不足');let r=rng(100);let won=r<12?n*4:r<55?n:0;p.cash+=won-n;p.plays++;if(won>n)p.wins++;msg='投入 '+n+'枚 / 払出 '+won+'枚';break}
case 'slot':{const bet=integer(d.amount,10,100);if(!VS_BETS.includes(bet))throw Error('ベットは 10 / 20 / 50 / 100 SC');if(p.cash<bet)throw Error('残高不足');const r=vsSpin(bet,rng);p.cash+=r.total-bet;p.plays++;if(r.total>bet)p.wins++;msg='SLOT / 払出 '+r.total+' SC';result=r;break}
case 'baccarat':{const bet=integer(d.amount,BAC_MIN,BAC_MAX);if(!['player','banker','tie'].includes(d.side))throw Error('賭け先が不正です');if(p.cash<bet)throw Error('残高不足');const r=bacDeal(rng);const won=bacPayout(d.side,bet,r.winner);p.cash+=won-bet;p.plays++;if(won>bet)p.wins++;msg='BACCARAT '+r.winner+' / 払出 '+won+' SC';result={...r,won,side:d.side};break}
case 'videopoker':{const bet=integer(d.amount,10,30);if(!VP_BETS.includes(bet))throw Error('ベットは 10 / 20 / 30 SC');if(!vpValidHand(d.hand))throw Error('手札が不正です');if(p.cash<bet)throw Error('残高不足');const rank=vpRank(d.hand);const won=rank?bet*VP_PAY[rank]:0;p.cash+=won-bet;p.plays++;if(won>bet)p.wins++;msg='POKER '+(rank?VP_NAMES[rank]:'—')+' / 払出 '+won+' SC';result={rank,won};break}
case 'blackjack':{const r=bjSettle(d.amount,!!d.doubled,d.outcome);if(p.cash<r.stake)throw Error('残高不足');p.cash+=r.won-r.stake;p.plays++;if(r.won>r.stake)p.wins++;msg='BLACKJACK / 払出 '+r.won+' SC';result=r;break}
case 'practiceRoulette':{let n=rng(37),bet=integer(d.amount);if(p.cash<bet)throw Error('残高不足');let won=roulette(n,d.choice,bet);p.cash+=won-bet;p.plays++;if(won>bet)p.wins++;msg='結果 '+n+' / 払出 '+won+' SC';break}
default:throw Error('未対応操作')}
if(!Number.isSafeInteger(p.cash)||!Number.isSafeInteger(p.bank)||p.cash<0||p.bank<0||p.cash+p.bank>LIMIT)throw Error('残高上限');return {profile:p,message:msg,result};}
const WorldCore={LIMIT,INITIAL,BONUS,floors,red,integer,start,day,round,roulette,apply,VS_SYMBOLS,VS_WEIGHTS,VS_PAY,VS_SCATTER_PAY,VS_FREE,VS_FREE_MULT,VS_CAP,VS_BETS,VS_LINES,VS_PAYLINES,vsPick,vsGrid,vsEvaluate,vsSpin,BAC_MIN,BAC_MAX,BAC_PAY,bacValue,bacDeal,bacPayout,VP_BETS,VP_PAY,VP_NAMES,vpRank,vpValidHand,BJ_OUTCOMES,BJ_MIN,BJ_MAX,bjSettle};
if(typeof module!=='undefined')module.exports=WorldCore;else globalThis.WorldCore=WorldCore;