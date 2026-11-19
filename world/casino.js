'use strict';
/* ROYAL CASINO — roulette table UI: animated wheel, felt betting layout, chips, history, round timer.
   Presentation only. Bet validation, draws and payouts stay in core.js (practice) and spark.js (online). */
const WorldCasino=(()=>{
const ORDER=[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const STEP=360/37,NS='http://www.w3.org/2000/svg',HKEY='stick-world-roulette-history',MAX_BET=5000,SPIN_MS=5200;
const CHIPS=[10,50,100,500,1000];
const NAMES={red:'赤',black:'黒',even:'偶数',odd:'奇数'};
let st=null,history=[];
try{const h=JSON.parse(localStorage.getItem(HKEY));if(Array.isArray(h))history=h.filter(n=>Number.isInteger(n)&&n>=0&&n<=36).slice(0,14);}catch{}
const colorOf=n=>n===0?'green':WorldCore.red.has(n)?'red':'black';
const choiceName=c=>NAMES[c]||('数字 '+c.slice(1));
const multOf=c=>c&&c.startsWith('n')?36:2;
const yen=n=>Number(n||0).toLocaleString('ja-JP');
function s(tag,attrs={},parent){const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,String(v));if(parent)parent.append(e);return e;}
function h(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
const polar=(r,deg)=>{const a=deg*Math.PI/180;return [r*Math.sin(a),-r*Math.cos(a)];};

function buildWheel(){
 const svg=s('svg',{viewBox:'-100 -100 200 200',class:'rw-svg',role:'img','aria-label':'ルーレットホイール'});
 const defs=s('defs',{},svg);
 const grad=(id,stops,type='radialGradient',attrs={})=>{const g=s(type,{id,...attrs},defs);for(const[o,c]of stops)s('stop',{offset:o,'stop-color':c},g);};
 grad('rwWood',[['0.80','#2a140b'],['0.90','#6b3a1f'],['0.96','#9a5a2e'],['1','#3b1d0e']]);
 grad('rwCone',[['0','#f6e2a8'],['0.18','#c79a4a'],['0.45','#6d4220'],['1','#3a1f0f']]);
 grad('rwGold',[['0','#fff3c4'],['0.5','#d9b45f'],['1','#8a6526']],'linearGradient',{x1:0,y1:0,x2:1,y2:1});
 grad('rwBall',[['0','#ffffff'],['0.6','#e8e8e8'],['1','#9a9a9a']],'radialGradient',{cx:'35%',cy:'35%'});
 s('circle',{r:99,fill:'url(#rwWood)'},svg);
 s('circle',{r:91,fill:'#1d0f08',stroke:'url(#rwGold)','stroke-width':1.6},svg);
 for(let i=0;i<8;i++){const[x,y]=polar(95,i*45+22.5);s('circle',{cx:x,cy:y,r:1.6,fill:'url(#rwGold)'},svg);}
 const rotor=s('g',{class:'rw-rotor'},svg);
 ORDER.forEach((n,i)=>{
  const a0=i*STEP-STEP/2,a1=i*STEP+STEP/2,[x0,y0]=polar(87,a0),[x1,y1]=polar(87,a1),[x2,y2]=polar(60,a1),[x3,y3]=polar(60,a0);
  const fill=n===0?'#13784f':WorldCore.red.has(n)?'#b3202f':'#141414';
  s('path',{d:`M${x0} ${y0}A87 87 0 0 1 ${x1} ${y1}L${x2} ${y2}A60 60 0 0 0 ${x3} ${y3}Z`,fill,stroke:'#d9b45f','stroke-width':.45},rotor);
  const g=s('g',{transform:`rotate(${i*STEP})`},rotor);
  const t=s('text',{x:0,y:-77.5,'text-anchor':'middle','dominant-baseline':'middle','font-size':7.2,'font-weight':700,fill:'#fff','font-family':'Georgia,serif'},g);t.textContent=n;
  const[px0,py0]=polar(68,a0),[px1,py1]=polar(60,a0);s('line',{x1:px0,y1:py0,x2:px1,y2:py1,stroke:'#e8c97a','stroke-width':.9},rotor);
 });
 s('circle',{r:87,fill:'none',stroke:'url(#rwGold)','stroke-width':1.2},rotor);
 s('circle',{r:68,fill:'none',stroke:'#e8c97a','stroke-width':.5,opacity:.7},rotor);
 s('circle',{r:60,fill:'url(#rwCone)',stroke:'url(#rwGold)','stroke-width':1.4},rotor);
 s('circle',{r:44,fill:'none',stroke:'#00000055','stroke-width':6},rotor);
 for(let i=0;i<4;i++){const g=s('g',{transform:`rotate(${i*90+45})`},rotor);s('rect',{x:-2.2,y:-34,width:4.4,height:30,rx:2,fill:'url(#rwGold)'},g);s('circle',{cx:0,cy:-35,r:4.2,fill:'url(#rwGold)'},g);}
 s('circle',{r:11,fill:'url(#rwGold)',stroke:'#7a5620','stroke-width':1},rotor);
 s('circle',{r:4.5,fill:'#fff6d8'},rotor);
 const ball=s('circle',{r:4.1,fill:'url(#rwBall)',stroke:'#00000066','stroke-width':.4,class:'rw-ball'},svg);
 s('path',{d:'M-5 -101 L5 -101 L0 -92 Z',fill:'url(#rwGold)',stroke:'#5b3f15','stroke-width':.6},svg);
 return {svg,rotor,ball};
}

function buildBoard(onPick){
 const board=h('div','rt-board');board.setAttribute('role','group');board.setAttribute('aria-label','ベット盤面');
 const cell=(choice,text,cls,area,vArea)=>{const b=h('button','rt-cell '+cls);b.type='button';b.dataset.choice=choice;b.style.setProperty('--h',area);b.style.setProperty('--v',vArea);const t=h('span','rt-cell-label',text);b.append(t);b.title=choiceName(choice)+'（配当 ×'+multOf(choice)+'）';b.onclick=()=>onPick(choice);board.append(b);return b;};
 cell('n0','0','is-green','1 / 1 / 5 / 2','1 / 1 / 2 / 5');
 for(let n=1;n<=36;n++){const col=Math.ceil(n/3)+1,row=4-((n-1)%3+1);const vr=Math.ceil(n/3)+1,vc=(n-1)%3+1;cell('n'+n,String(n),'is-'+colorOf(n),`${row} / ${col} / ${row+1} / ${col+1}`,`${vr} / ${vc} / ${vr+1} / ${vc+1}`);}
 cell('even','偶数 EVEN','is-outside','4 / 2 / 5 / 5','2 / 4 / 5 / 5');
 cell('red','','is-outside is-red-diamond','4 / 5 / 5 / 8','5 / 4 / 8 / 5');
 cell('black','','is-outside is-black-diamond','4 / 8 / 5 / 11','8 / 4 / 11 / 5');
 cell('odd','奇数 ODD','is-outside','4 / 11 / 5 / 14','11 / 4 / 14 / 5');
 board.querySelector('.is-red-diamond .rt-cell-label').append(h('i','rt-diamond red'),document.createTextNode('赤 RED'));
 board.querySelector('.is-black-diamond .rt-cell-label').append(h('i','rt-diamond black'),document.createTextNode('黒 BLACK'));
 return board;
}

function chipEl(value,cls=''){const c=h('span','chip chip-'+chipTier(value)+(cls?' '+cls:''));c.append(h('b',undefined,value>=1000?(value/1000)+'K':String(value)));return c;}
function chipTier(v){return v>=1000?1000:v>=500?500:v>=100?100:v>=50?50:10;}

function renderHistory(){if(!st)return;const box=st.historyBox;box.replaceChildren();if(!history.length){box.append(h('small','rt-muted','まだ結果がありません'));return;}history.forEach((n,i)=>{const d=h('span','rt-hist rt-'+colorOf(n)+(i===0?' latest':''),String(n));box.append(d);});}
function markHit(n){if(!st)return;st.board.querySelectorAll('.hit').forEach(c=>c.classList.remove('hit'));const c=st.board.querySelector(`[data-choice="n${n}"]`);if(c){void c.offsetWidth;c.classList.add('hit');}}
function pushHistory(n){markHit(n);history=[n,...history].slice(0,14);try{localStorage.setItem(HKEY,JSON.stringify(history));}catch{}renderHistory();}

function setResult(n,detail,kind){if(!st)return;st.resultNum.className='rt-num rt-'+(n===null?'none':colorOf(n));st.resultNum.textContent=n===null?'—':String(n);st.resultMain.textContent=detail.main;st.resultSub.textContent=detail.sub||'';st.result.dataset.kind=kind||'';if(kind==='win'){st.root.classList.remove('rt-win');void st.root.offsetWidth;st.root.classList.add('rt-win');}}

function placeChip(){
 if(!st)return;st.board.querySelectorAll('.chip').forEach(c=>c.remove());st.board.querySelectorAll('.rt-cell.on').forEach(c=>c.classList.remove('on'));
 const pending=mode==='online'&&p.betRound>=0,choice=pending?p.betChoice:st.choice,amount=pending?p.betAmount:st.amount;
 if(choice&&amount>0){const cell=st.board.querySelector(`[data-choice="${choice}"]`);if(cell){cell.classList.add('on');cell.append(chipEl(amount,'placed'));}}
 st.board.classList.toggle('locked',pending||st.spinning);
 const mult=multOf(choice);
 st.betLine.replaceChildren();
 if(pending){st.betLine.append(h('b',undefined,'ROUND '+p.betRound+' ベット中'),h('span',undefined,choiceName(choice)+' / '+yen(amount)+' SC → 当たれば '+yen(amount*mult)+' SC'));}
 else if(choice&&amount>0){st.betLine.append(h('b',undefined,'BET '+yen(amount)+' SC'),h('span',undefined,choiceName(choice)+'・配当 ×'+mult+' → '+yen(amount*mult)+' SC'));}
 else st.betLine.append(h('b',undefined,'チップを選んで盤面をタップ'),h('span',undefined,'同じ場所をもう一度タップで積み増し'));
 updateButtons();
}

function updateButtons(){
 if(!st)return;const pending=mode==='online'&&p.betRound>=0,rd=WorldCore.round(Date.now()),open=Date.now()<rd.close;
 st.chips.forEach(c=>c.classList.toggle('active',Number(c.dataset.value)===st.chip));
 st.clear.disabled=st.spinning||pending||!st.amount;
 if(mode==='online'){st.go.textContent=pending?'結果待ち…':open?'ベット確定':'締切中';st.go.disabled=busy||st.spinning||pending||!open||!st.amount||!st.choice;}
 else{st.go.textContent=st.spinning?'SPINNING…':'SPIN';st.go.disabled=busy||st.spinning||!st.amount||!st.choice;}
}

function pick(choice){
 if(!st||st.spinning||(mode==='online'&&p.betRound>=0))return;
 const limit=Math.min(MAX_BET,p.cash);
 if(limit<1){msg('手持ちが足りません。バンクから引き出すか、ボーナスデスクへ');return;}
 if(st.choice===choice)st.amount=Math.min(limit,st.amount+st.chip);else{st.choice=choice;st.amount=Math.min(limit,st.amount||st.chip);}
 if(st.amount>=limit)msg('1回のベット上限は '+yen(MAX_BET)+' SC です');else msg('');
 placeChip();
}

const ease=t=>1-Math.pow(1-t,3),easeBall=t=>1-Math.pow(1-t,4);
function spin(n,done){
 if(!st)return;const idx=ORDER.indexOf(n);if(idx<0){done&&done();return;}
 const w=st.wheel,R0=w.R,target=((-idx*STEP-R0)%360+360)%360,R1=R0+360*4+target;
 const B0=w.B,ballTarget=R1+idx*STEP,B1=B0-(360*7+(((B0-ballTarget)%360)+360)%360);
 w.anim={t0:performance.now(),R0,R1,B0,B1,idx,done};w.landed=null;st.spinning=true;st.root.classList.add('spinning');setResult(null,{main:'ノー・モア・ベット',sub:'ボールが回っています…'},'spin');placeChip();
}

function frame(now){
 const w=st.wheel,dt=Math.min(64,now-(w.last||now));w.last=now;
 let r=90,visible=true;
 if(w.anim){const a=w.anim,t=Math.min(1,(now-a.t0)/SPIN_MS);w.R=a.R0+(a.R1-a.R0)*ease(t);w.B=a.B0+(a.B1-a.B0)*easeBall(t);
  r=t<.58?90:t<.82?90-19*((t-.58)/.24)+Math.sin((t-.58)/.24*Math.PI*3)*3*(1-(t-.58)/.24):71;
  if(t>=1){w.anim=null;w.landed=a.idx;st.spinning=false;st.root.classList.remove('spinning');const cb=a.done;placeChip();cb&&cb();}}
 else{w.R+=dt*.006;if(w.landed!==null){w.B=w.R+w.landed*STEP;r=71;}else visible=false;}
 st.wheel.parts.rotor.setAttribute('transform','rotate('+(w.R%360).toFixed(2)+')');
 const[x,y]=polar(r,w.B);const ball=st.wheel.parts.ball;ball.setAttribute('cx',x.toFixed(2));ball.setAttribute('cy',y.toFixed(2));ball.style.opacity=visible?1:0;
 if(now-(st.lastTick||0)>250){st.lastTick=now;tickOnline();}
}

function tickOnline(){
 if(!st)return;const rd=WorldCore.round(Date.now()),nowMs=Date.now();
 if(mode!=='online'){st.timerText.textContent='PRACTICE TABLE・即時抽選';st.timerBar.style.width='100%';st.timer.dataset.state='practice';updateButtons();return;}
 const open=nowMs<rd.close,left=open?(rd.close-nowMs)/1000:(rd.end-nowMs)/1000;
 st.timer.dataset.state=open?(left<6?'hurry':'open'):'closed';
 st.timerText.textContent='ROUND '+rd.id+'・'+(open?'ベット受付中 残り '+Math.ceil(left)+' 秒':'締切・抽選中（次のラウンドまで '+Math.ceil(left)+' 秒）');
 st.timerBar.style.width=(open?left/23*100:left/7*100).toFixed(1)+'%';
 updateButtons();
 // Auto-settle a finished bet, then show the shared result on the wheel.
 if(p.betRound>=0&&nowMs>=(p.betRound+1)*30000+1500&&!st.spinning&&!busy&&!st.settling&&nowMs-(st.lastSettle||0)>4000){settle();return;}
 // Everyone at the table watches the same draw, even without a bet.
 if(p.betRound<0&&lastRound&&lastRound.previous!==null&&lastRound.id!==st.shownRound&&!st.spinning&&!st.settling){
  const first=st.shownRound===undefined;st.shownRound=lastRound.id;const n=lastRound.previous;
  if(first){st.wheel.landed=ORDER.indexOf(n);st.wheel.B=st.wheel.R+st.wheel.landed*STEP;setResult(n,{main:'前回の結果',sub:'ROUND '+(lastRound.id-1)},'');}
  else spin(n,()=>{pushHistory(n);setResult(n,{main:'ROUND '+(lastRound.id-1)+' の結果',sub:'次のラウンドを受付中'},'');});
 }
}

function parseOutcome(message){const n=Number((/結果 (\d+)/.exec(message||'')||[])[1]),won=Number((/払出 (\d+)/.exec(message||'')||[])[1])||0;return {n:Number.isInteger(n)?n:null,won};}
function finish(n,won,bet,choice){
 pushHistory(n);const net=won-bet;
 if(won>0)setResult(n,{main:'WIN  +'+yen(won)+' SC',sub:choiceName(choice)+' に '+yen(bet)+' SC（配当 ×'+multOf(choice)+'）'},'win');
 else setResult(n,{main:'LOSE  −'+yen(bet)+' SC',sub:choiceName(choice)+' に '+yen(bet)+' SC'},'lose');
 msg(won>0?'おめでとうございます！ '+yen(net>0?net:won)+' SC の勝ち':'残念… 同じベットのままもう一度 SPIN できます');
}

async function go(){
 if(!st||st.spinning||busy||!st.choice||!st.amount)return;const bet=st.amount,choice=st.choice;
 if(mode==='online'){const r=await act('roulette',{amount:bet,choice});if(r){st.amount=0;st.choice=null;placeChip();poll();}return;}
 busy=true;walletHold=true;let r;
 try{r=await request('roulette',{amount:bet,choice});}catch(e){walletHold=false;busy=false;renderProfile();msg(e.message);updateButtons();return;}
 busy=false;const{n,won}=parseOutcome(r.message);
 $('cashDisplay').textContent=yen(p.cash-won)+' SC';
 if(n===null){walletHold=false;renderProfile();msg(r.message);return;}
 if(st.amount>p.cash)st.amount=Math.min(p.cash,MAX_BET);
 spin(n,()=>{walletHold=false;renderProfile();finish(n,won,bet,choice);status(r.message);});
}

async function settle(){
 if(!st)return;st.settling=true;st.lastSettle=Date.now();const bet=p.betAmount,choice=p.betChoice;busy=true;walletHold=true;let r;
 try{r=await request('settle');}catch(e){walletHold=false;busy=false;st.settling=false;renderProfile();if(!/お待ち/.test(e.message))msg(e.message);return;}
 busy=false;const{n,won}=parseOutcome(r.message);
 if(n===null){walletHold=false;st.settling=false;renderProfile();msg(r.message);return;}
 $('cashDisplay').textContent=yen(p.cash-won)+' SC';
 if(lastRound)st.shownRound=lastRound.id;
 spin(n,()=>{walletHold=false;st.settling=false;renderProfile();finish(n,won,bet,choice);status(r.message);});
}

function open(body){
 const root=h('div','rt');
 const top=h('div','rt-top'),wheelBox=h('div','rt-wheel'),parts=buildWheel();wheelBox.append(parts.svg);
 const info=h('div','rt-info');
 const timer=h('div','rt-timer'),timerText=h('span','rt-timer-text'),track=h('div','rt-timer-track'),timerBar=h('i');track.append(timerBar);timer.append(timerText,track);
 const result=h('div','rt-result'),resultNum=h('span','rt-num rt-none','—'),rtext=h('div','rt-result-text'),resultMain=h('b',undefined,'PLACE YOUR BETS'),resultSub=h('small',undefined,mode==='online'?'全員が同じ抽選結果を共有します':'練習版：オンラインの残高とは別です');rtext.append(resultMain,resultSub);result.append(resultNum,rtext);
 const hist=h('div','rt-history-wrap'),historyBox=h('div','rt-history');hist.append(h('small','rt-label','HISTORY / 直近の結果'),historyBox);
 const odds=h('div','rt-odds');odds.append(h('span',undefined,'数字ひとつ ×36'),h('span',undefined,'赤・黒・偶数・奇数 ×2'),h('span',undefined,'0 は外側ベットの負け'));
 info.append(timer,result,hist,odds);top.append(wheelBox,info);
 const boardWrap=h('div','rt-board-wrap'),board=buildBoard(pick);boardWrap.append(board);
 const bar=h('div','rt-bar'),tray=h('div','rt-tray');tray.setAttribute('aria-label','チップ');
 const chips=CHIPS.map(v=>{const b=h('button','rt-chip-btn');b.type='button';b.dataset.value=v;b.setAttribute('aria-label',v+' SC チップ');b.append(chipEl(v));b.onclick=()=>{if(!st)return;st.chip=v;updateButtons();};tray.append(b);return b;});
 const betLine=h('div','rt-betline'),clear=h('button','rt-clear','クリア');clear.type='button';clear.onclick=()=>{if(!st||st.spinning)return;st.amount=0;st.choice=null;msg('');placeChip();};
 const goBtn=h('button','rt-go','SPIN');goBtn.type='button';goBtn.onclick=go;
 bar.append(tray,betLine,clear,goBtn);
 root.append(top,boardWrap,bar);body.append(root);
 const old=st;st={root,board,chips,clear,go:goBtn,betLine,historyBox,timer,timerText,timerBar,result,resultNum,resultMain,resultSub,chip:old?.chip||100,choice:null,amount:0,spinning:false,settling:false,shownRound:undefined,wheel:{parts,R:Math.random()*360,B:0,landed:history.length?ORDER.indexOf(history[0]):null,anim:null}};
 if(history.length)setResult(history[0],{main:mode==='online'?'PLACE YOUR BETS':'前回の結果',sub:mode==='online'?'全員が同じ抽選結果を共有します':'練習版：オンラインの残高とは別です'},'');
 renderHistory();placeChip();tickOnline();
 const token={};st.token=token;const loop=now=>{if(!st||st.token!==token)return;if(!document.body.contains(st.root)){st=null;return;}frame(now);requestAnimationFrame(loop);};requestAnimationFrame(loop);
}
function close(){if(st&&st.spinning&&st.wheel.anim){const a=st.wheel.anim;st.wheel.anim=null;st.spinning=false;a.done&&a.done();}st=null;}
return {open,close,ORDER};
})();
