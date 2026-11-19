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

// ---- STICK CASINO: slot machine ----
// Weighted reels; return-to-player is about 96% (see slotRtp()).
const SLOT_SYMBOLS=['seven','bar','star','gem','clover','spark'];
const SLOT_WEIGHTS=[5,8,12,17,24,34];
const SLOT_TRIPLE={seven:300,bar:100,star:40,gem:20,clover:10,spark:6};
const SLOT_PAIR=2,SLOT_BETS=[10,20,50,100];
function slotSymbol(r){let t=0;for(let i=0;i<SLOT_SYMBOLS.length;i++){t+=SLOT_WEIGHTS[i];if(r<t)return SLOT_SYMBOLS[i];}return SLOT_SYMBOLS[SLOT_SYMBOLS.length-1];}
function slotPayout(reels,bet){const [a,b,c]=reels;if(a===b&&b===c)return bet*SLOT_TRIPLE[a];if(a===b)return bet*SLOT_PAIR;return 0;}
function slotRtp(){const W=SLOT_WEIGHTS.reduce((a,b)=>a+b,0);let r=0;SLOT_SYMBOLS.forEach((s,i)=>{const p=SLOT_WEIGHTS[i]/W;r+=p**3*SLOT_TRIPLE[s]+p*p*(1-p)*SLOT_PAIR;});return r;}
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
case 'slot':{const bet=integer(d.amount,10,100);if(!SLOT_BETS.includes(bet))throw Error('ベットは 10 / 20 / 50 / 100 SC');if(p.cash<bet)throw Error('残高不足');const reels=[0,1,2].map(()=>slotSymbol(rng(100)));const won=slotPayout(reels,bet);p.cash+=won-bet;p.plays++;if(won>bet)p.wins++;msg='SLOT '+reels.join(' / ')+' / 払出 '+won+' SC';result={reels,won};break}
case 'blackjack':{const r=bjSettle(d.amount,!!d.doubled,d.outcome);if(p.cash<r.stake)throw Error('残高不足');p.cash+=r.won-r.stake;p.plays++;if(r.won>r.stake)p.wins++;msg='BLACKJACK / 払出 '+r.won+' SC';result=r;break}
case 'practiceRoulette':{let n=rng(37),bet=integer(d.amount);if(p.cash<bet)throw Error('残高不足');let won=roulette(n,d.choice,bet);p.cash+=won-bet;p.plays++;if(won>bet)p.wins++;msg='結果 '+n+' / 払出 '+won+' SC';break}
default:throw Error('未対応操作')}
if(!Number.isSafeInteger(p.cash)||!Number.isSafeInteger(p.bank)||p.cash<0||p.bank<0||p.cash+p.bank>LIMIT)throw Error('残高上限');return {profile:p,message:msg,result};}
const WorldCore={LIMIT,INITIAL,BONUS,floors,red,integer,start,day,round,roulette,apply,SLOT_SYMBOLS,SLOT_WEIGHTS,SLOT_TRIPLE,SLOT_PAIR,SLOT_BETS,slotSymbol,slotPayout,slotRtp,BJ_OUTCOMES,BJ_MIN,BJ_MAX,bjSettle};
if(typeof module!=='undefined')module.exports=WorldCore;else globalThis.WorldCore=WorldCore;