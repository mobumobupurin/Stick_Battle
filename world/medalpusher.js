'use strict';
/* STICK ROYALE — "FORTUNE PUSHER" (medal corner). 1 medal = 1 SC.
   Flow: medals → CHECKER → 3-reel slot (stock 9) → cherry/bell/BAR medal rain, JP BALL onto the field, 777 = FEVER GAME + 確変.
   A JP ball pushed off the front goes to the 2-stage JP lottery (stage 2 holds the progressive JACKPOT).
   The field and the JP live in this browser; medals in/out are settled in batches by core.js ('pusher'). */
const WorldPusher=(()=>{
const S=PusherSim,W=480,H=724,FIELD_TOP=286,FIELD_BOTTOM=632,FRONT_HALF=206,BACK_SCALE=.64;
const STORE='stick-royale-pusher-v2',SETTLE_IDLE=2500,SETTLE_SPENT=200,SETTLE_WON=2000;
const REEL_STOP=[44,66,88],REACH_EXTRA=84,FEVER_STOP=[16,22,28];
let st=null,pending={spent:0,won:0},settling=null,storeKey=STORE;
function h(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
const yen=n=>Number(n||0).toLocaleString('ja-JP');
function meter(label){const m=h('div','egm-meter');const v=h('b',undefined,'0');m.append(h('small',undefined,label),v);return [m,v];}
const scaleAt=y=>BACK_SCALE+(1-BACK_SCALE)*Math.max(0,Math.min(110,y))/100;
const sy=y=>FIELD_TOP+(FIELD_BOTTOM-FIELD_TOP)*y/100;
const sx=(x,y)=>W/2+(x-50)*FRONT_HALF/50*scaleAt(y);
const credit=()=>p.cash-pending.spent+pending.won;
const MAX_SPENT=()=>WorldCore.PU_MAX_SPENT,MAX_WON=()=>WorldCore.PU_MAX_WON;
const rnd=n=>random(n);

/* ---------- persistence & settlement ---------- */
function keyFor(){return STORE+':'+(mode==='local'?'local':(user?.uid||'guest'));}
function load(){storeKey=keyFor();try{const v=JSON.parse(localStorage.getItem(storeKey)||'null');if(v&&Array.isArray(v.coins)){
 const coins=v.coins.filter(c=>Array.isArray(c)&&Number.isFinite(c[0])&&Number.isFinite(c[1])).slice(0,420).map(([x,y,b])=>b?{x,y,ball:true}:{x,y});const pd=v.pending||{};
 return {coins,jp:Number.isFinite(v.jp)?Math.max(S.JP_BASE,Math.min(5000,v.jp)):S.JP_BASE,kak:Math.max(0,Math.min(S.KAKUHEN_SPINS*3,v.kak|0)),pending:{spent:Math.max(0,Math.min(MAX_SPENT(),pd.spent|0)),won:Math.max(0,Math.min(MAX_WON(),pd.won|0))}};}}catch{}return null;}
function save(){if(!st)return;try{localStorage.setItem(storeKey,JSON.stringify({coins:st.sim.coins.map(c=>c.ball?[Math.round(c.x*10)/10,Math.round(c.y*10)/10,1]:[Math.round(c.x*10)/10,Math.round(c.y*10)/10]),jp:Math.round(st.jp*100)/100,kak:st.kak,pending}));}catch{}}
function savePending(){try{const v=JSON.parse(localStorage.getItem(storeKey)||'{}');v.pending=pending;localStorage.setItem(storeKey,JSON.stringify(v));}catch{}}
async function settle(){
 if(settling)return settling;if(pending.spent+pending.won<1)return;
 const batch={spent:pending.spent,won:pending.won};pending={spent:0,won:0};savePending();
 settling=(async()=>{try{await request('pusher',batch);}catch(e){pending.spent+=batch.spent;pending.won+=batch.won;savePending();if(st)say('精算できませんでした：'+e.message,'lose');}
  finally{settling=null;if(st){paintCredit();sync();}else{walletHold=false;renderProfile();}}})();
 return settling;
}
function paintCredit(){if(!st)return;st.vCredit.textContent=yen(credit());const cd=document.getElementById('cashDisplay');if(cd)cd.textContent=yen(credit())+' SC';}

/* ---------- sprites & symbols ---------- */
function coinSprite(){const c=document.createElement('canvas');c.width=72;c.height=44;const g=c.getContext('2d');
 g.fillStyle='#7a4a08';g.beginPath();g.ellipse(36,26,34,16,0,0,Math.PI*2);g.fill();
 const gr=g.createLinearGradient(0,4,0,40);gr.addColorStop(0,'#fff3b0');gr.addColorStop(.45,'#f5c43a');gr.addColorStop(1,'#b97a10');
 g.fillStyle=gr;g.beginPath();g.ellipse(36,20,34,16,0,0,Math.PI*2);g.fill();
 g.strokeStyle='#8a5a0c';g.lineWidth=2;g.beginPath();g.ellipse(36,20,24,10.5,0,0,Math.PI*2);g.stroke();
 g.fillStyle='#fff8d8';g.globalAlpha=.55;g.beginPath();g.ellipse(28,15,11,4,-.15,0,Math.PI*2);g.fill();return c;}
function ballSprite(){const c=document.createElement('canvas');c.width=80;c.height=80;const g=c.getContext('2d');
 g.fillStyle='#0006';g.beginPath();g.ellipse(40,66,30,9,0,0,Math.PI*2);g.fill();
 const gr=g.createRadialGradient(30,26,4,40,40,34);gr.addColorStop(0,'#ffffff');gr.addColorStop(.35,'#ffe08a');gr.addColorStop(.75,'#e0a020');gr.addColorStop(1,'#8a5a0c');
 g.fillStyle=gr;g.beginPath();g.arc(40,38,30,0,Math.PI*2);g.fill();
 g.fillStyle='#c8192e';g.beginPath();g.arc(40,40,15,0,Math.PI*2);g.fill();g.fillStyle='#fff4d6';g.font='900 15px Arial,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('JP',40,41);
 g.fillStyle='#ffffffcc';g.beginPath();g.ellipse(30,24,9,5,-.5,0,Math.PI*2);g.fill();return c;}
function drawSym(g,sym,x,y,s){g.save();g.translate(x,y);g.scale(s/40,s/40);g.textAlign='center';g.textBaseline='middle';
 if(sym==='SEVEN'){g.font='italic 900 40px "Arial Black",Impact,sans-serif';g.lineWidth=5;g.strokeStyle='#ffd36b';g.strokeText('7',0,2);const gr=g.createLinearGradient(0,-18,0,18);gr.addColorStop(0,'#ff7a7a');gr.addColorStop(1,'#b0101e');g.fillStyle=gr;g.fillText('7',0,2);}
 else if(sym==='BAR'){g.fillStyle='#14101a';g.strokeStyle='#ffd36b';g.lineWidth=2.5;g.beginPath();g.moveTo(-16,-11);g.arcTo(20,-11,20,11,4);g.arcTo(20,11,-20,11,4);g.arcTo(-20,11,-20,-11,4);g.arcTo(-20,-11,20,-11,4);g.closePath();g.fill();g.stroke();g.fillStyle='#ffd36b';g.font='900 14px "Arial Black",sans-serif';g.fillText('BAR',0,1);}
 else if(sym==='CHERRY'){g.strokeStyle='#2f8a3a';g.lineWidth=3;g.beginPath();g.moveTo(-8,6);g.quadraticCurveTo(-4,-12,6,-16);g.moveTo(9,8);g.quadraticCurveTo(8,-6,6,-16);g.stroke();for(const [cx,cy] of [[-9,9],[9,10]]){const gr=g.createRadialGradient(cx-3,cy-3,1,cx,cy,9);gr.addColorStop(0,'#ff9a9a');gr.addColorStop(1,'#c0102a');g.fillStyle=gr;g.beginPath();g.arc(cx,cy,8.5,0,Math.PI*2);g.fill();}}
 else if(sym==='BELL'){const gr=g.createLinearGradient(-14,-16,14,16);gr.addColorStop(0,'#fff1a0');gr.addColorStop(1,'#d08a10');g.fillStyle=gr;g.beginPath();g.moveTo(0,-17);g.bezierCurveTo(12,-17,12,-2,15,10);g.lineTo(-15,10);g.bezierCurveTo(-12,-2,-12,-17,0,-17);g.fill();g.fillStyle='#8a5a0c';g.fillRect(-16,9,32,4);g.beginPath();g.arc(0,15,4,0,Math.PI*2);g.fill();}
 else if(sym==='BALL'){const gr=g.createRadialGradient(-5,-6,2,0,0,16);gr.addColorStop(0,'#ffffff');gr.addColorStop(.45,'#ffe08a');gr.addColorStop(1,'#a8700c');g.fillStyle=gr;g.beginPath();g.arc(0,0,15,0,Math.PI*2);g.fill();g.fillStyle='#c8192e';g.beginPath();g.arc(0,1,8,0,Math.PI*2);g.fill();g.fillStyle='#fff';g.font='900 8px Arial,sans-serif';g.fillText('JP',0,1.5);}
 g.restore();}
const SYM_NAME={CHERRY:'チェリー',BELL:'ベル',BAR:'BAR',BALL:'JPボール',SEVEN:'7'};

/* ---------- UI ---------- */
function open(body){
 const root=h('div','egm egm-pusher');
 const top=h('div','egm-topper');top.append(h('small',undefined,'STICK ROYALE MEDAL CORNER'),h('b','egm-title','FORTUNE PUSHER'),h('span','egm-sub','777でFEVER！ JPボールを落としてJACKPOT'));
 const screen=h('div','egm-screen pu-screen');const cv=h('canvas','pu-canvas');cv.width=W;cv.height=H;cv.setAttribute('aria-label','コインプッシャー。タップした位置にメダルを落とします');cv.setAttribute('role','img');
 const side=h('div','pu-side');
 const how=h('div','pu-how');how.append(h('b',undefined,'あそびかた'),
  h('p',undefined,'タップした位置（または ◀▶ と DROP）にメダルを投入。プッシャーに押されて手前に落ちたメダルが払い出し。左右の端は OUT。'),
  h('p',undefined,'メダルが CHECKER に入るとスロット抽選（最大9ストック）。'),
  h('p',undefined,'金色の JPボール を手前に落とすと JP抽選。2段目の JP に入れば JACKPOT 獲得！'));
 const table=h('div','pu-table');
 const row=(syms,text,cls)=>{const r=h('span',cls);const icons=h('i','pu-syms');for(const s of syms){const c=document.createElement('canvas');c.width=c.height=44;drawSym(c.getContext('2d'),s,22,22,34);icons.append(c);}r.append(icons,h('b',undefined,text));table.append(r);};
 row(['SEVEN','SEVEN','SEVEN'],'FEVER GAME 5回＋確変','fever');row(['BALL','BALL','BALL'],'JPボール投入','jp');row(['BAR','BAR','BAR'],'+12枚');row(['BELL','BELL','BELL'],'+6枚');row(['CHERRY','CHERRY','CHERRY'],'+3枚');
 side.append(how,table);
 screen.append(cv,side);
 const msgBar=h('div','egm-msg','画面をタップ（または DROP）でメダル投入');
 const meters=h('div','egm-meters');const [mC,vCredit]=meter('CREDIT'),[mI,vIn]=meter('IN'),[mO,vOut]=meter('OUT');meters.append(mC,mI,mO);
 const deck=h('div','egm-deck pu-deck');
 const sound=h('button','egm-btn egm-btn-small',WorldSound.muted?'♪ OFF':'♪ ON');sound.type='button';sound.onclick=()=>{sound.textContent=WorldSound.toggle()?'♪ OFF':'♪ ON';};
 const left=h('button','egm-btn pu-aim','◀');left.type='button';left.setAttribute('aria-label','左へ');
 const right=h('button','egm-btn pu-aim','▶');right.type='button';right.setAttribute('aria-label','右へ');
 const cash=h('button','egm-btn egm-btn-small pu-cash','精算');cash.type='button';cash.title='たまったメダルの出入りを今すぐ保存';
 const drop=h('button','egm-spin pu-drop','DROP');drop.type='button';
 deck.append(sound,cash,left,drop,right);
 root.append(top,screen,msgBar,meters,deck);body.append(root);
 const saved=load();
 const sim=saved&&saved.coins.length>=20?Object.assign(S.create(0),{coins:saved.coins}):S.create();
 if(!saved)S.addBall(sim);
 if(saved)pending=saved.pending;
 st={root,cv,g:cv.getContext('2d'),coin:coinSprite(),ballImg:ballSprite(),sim,msgBar,vCredit,vIn,vOut,drop,cash,aim:50,falling:[],outs:[],pops:[],sparks:[],stock:0,reel:null,fever:null,feverLeft:0,feverTotal:0,jpl:null,balls:0,rain:0,jp:saved?.jp??S.JP_BASE,kak:saved?.kak||0,
  shown:['SEVEN','BAR','BELL'],sessionIn:0,sessionOut:0,hold:null,last:performance.now(),acc:0,lastAct:performance.now(),lastSave:0,lastTick:0,raf:0,timer:0,flash:0,frame:0,shake:0,outBurst:0};
 walletHold=true;paintCredit();
 const aimFromEvent=e=>{const r=cv.getBoundingClientRect();const x=(e.clientX-r.left)/r.width*W;st.aim=Math.max(8,Math.min(92,50+(x-W/2)/(FRONT_HALF/50*BACK_SCALE)));};
 const startHold=fn=>{stopHold();fn();st.hold=setInterval(fn,190);};
 const stopHold=()=>{if(st?.hold){clearInterval(st.hold);st.hold=null;}};
 const press=(el,fn)=>{el.addEventListener('pointerdown',e=>{e.preventDefault();try{el.setPointerCapture(e.pointerId);}catch{}fn(e);});for(const ev of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(ev,stopHold);};
 press(cv,e=>{aimFromEvent(e);startHold(dropOne);});
 cv.addEventListener('pointermove',e=>{if(st?.hold)aimFromEvent(e);});
 press(drop,()=>startHold(dropOne));drop.addEventListener('click',e=>{if(e.detail===0)dropOne();});
 const nudge=d=>()=>{st.aim=Math.max(8,Math.min(92,st.aim+d));};
 press(left,()=>startHold(nudge(-4)));press(right,()=>startHold(nudge(4)));
 cash.onclick=()=>{WorldSound.button();if(pending.spent+pending.won<1){say('精算するメダルはありません','');return;}settle().then(()=>st&&say('精算しました','win'));};
 root.tabIndex=-1;root.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){st.aim=Math.max(8,st.aim-3);e.preventDefault();}else if(e.key==='ArrowRight'){st.aim=Math.min(92,st.aim+3);e.preventDefault();}else if(e.code==='Space'||e.key==='Enter'){if(!e.repeat||performance.now()-st.lastAct>180)dropOne();e.preventDefault();}});
 root.focus({preventScroll:true});
 st.timer=setInterval(()=>{if(!st)return;const now=performance.now();if(pending.spent+pending.won>0&&(now-st.lastAct>SETTLE_IDLE||pending.spent>=SETTLE_SPENT||pending.won>=SETTLE_WON))settle();if(now-st.lastSave>4000){st.lastSave=now;save();}},1000);
 if(pending.spent+pending.won>0)settle();
 if(st.kak)say('確変 残り'+st.kak+'回 からスタート！','win');
 sync();st.raf=requestAnimationFrame(frame);
}
function say(t,kind){if(!st)return;st.msgBar.textContent=t;st.msgBar.dataset.kind=kind||'';}
function sync(){if(!st)return;st.vIn.textContent=yen(st.sessionIn);st.vOut.textContent=yen(st.sessionOut);paintCredit();st.drop.disabled=p.cash-pending.spent<1;}
function dropOne(){
 if(!st)return;
 if(p.cash-pending.spent<1){say(pending.won?'精算中… もう一度どうぞ':'CREDIT が足りません','lose');if(pending.won)settle();return;}
 if(pending.spent>=MAX_SPENT()){settle();return;}
 if(st.falling.length>6)return;
 pending.spent++;st.sessionIn++;st.lastAct=performance.now();st.jp+=S.JP_RATE;
 const chance=rnd(10000)<S.CHANCE_RATE*10000;
 st.falling.push({x:st.aim+(Math.random()-.5)*1.2,t:0,chance});WorldSound.coin();sync();
}
function burst(x,y,n,color){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=2+Math.random()*6;st.sparks.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-3,t:0,life:40+Math.random()*30,c:color||(Math.random()<.5?'#ffd36b':'#fff4d6')});}}
function pop(text,o={}){st.pops.push({text,t:0,...o});}
/* ---------- slot ---------- */
function startReel(){
 const T=st.kak>0?S.LOTTERY_KAKUHEN:S.LOTTERY;const kak=st.kak>0;if(kak)st.kak--;
 const idx=S.pick(T,rnd(S.total(T))),name=T[idx][0],add=T[idx][1];
 let target;const pickSym=()=>S.SYMBOLS[rnd(S.SYMBOLS.length)];
 if(name==='MISS'){if(rnd(100)<(kak?45:32)){const a=rnd(100)<30?'SEVEN':pickSym();let c;do{c=pickSym();}while(c===a);target=[a,a,c];}else{do{target=[pickSym(),pickSym(),pickSym()];}while(target[0]===target[1]);}}
 else target=[name,name,name];
 const reach=target[0]===target[1],hot=reach&&(target[0]==='SEVEN'||target[0]==='BALL');
 st.reel={name,add,target,t:0,stops:[REEL_STOP[0],REEL_STOP[1],REEL_STOP[2]+(reach?REACH_EXTRA+(hot?50:0):0)],reach,hot,kak,cur:st.shown.slice()};
 WorldSound.spin();say(kak?'確変中！ スロット抽選':'CHECKER！ スロット抽選',kak?'win':'');
}
function finishReel(){
 const r=st.reel;st.shown=r.target.slice();st.reel=null;
 if(r.name==='MISS'){say(r.reach?'リーチ… おしい！':'ハズレ'+(st.kak?'（確変 残り'+st.kak+'回）':''),'');return;}
 st.flash=50;burst(W/2,140,r.name==='SEVEN'?80:30);
 if(r.name==='SEVEN'){st.feverLeft=S.FEVER_ROUNDS;st.feverTotal=0;st.kak=S.KAKUHEN_SPINS;st.sim.wall=S.WALL_FRAMES;st.shake=24;WorldSound.fanfare();say('★ FEVER GAME 突入！！ 壁UP＆確変 ★','win');pop('FEVER!!',{big:true,fever:true});return;}
 if(r.name==='BALL'){S.addBall(st.sim);WorldSound.bonus();say('JPボール投入！ 手前に落とせ！','win');pop('JP BALL!',{chance:true});return;}
 st.rain+=r.add;WorldSound.win(r.name==='BAR'?4:r.name==='BELL'?3:2);say(SYM_NAME[r.name]+'そろい！ +'+r.add+'枚','win');pop('+'+r.add);
}
/* ---------- FEVER GAME ---------- */
function startFeverRound(){
 const round=S.FEVER_ROUNDS-st.feverLeft+1,pay=S.FEVER_PAYS[rnd(S.FEVER_PAYS.length)];st.feverLeft--;
 st.fever={round,pay,t:0,cur:st.shown.slice()};WorldSound.spin();say('FEVER GAME  ROUND '+round+' / '+S.FEVER_ROUNDS,'win');
}
function finishFeverRound(){
 const f=st.fever;st.fever=null;st.rain+=f.pay;st.feverTotal+=f.pay;st.shown=['SEVEN','SEVEN','SEVEN'];burst(W/2,140,40);WorldSound.coinRush(16);WorldSound.win(4);pop('+'+f.pay,{fever:true});
 if(st.feverLeft<=0){setTimeout(()=>{if(!st)return;WorldSound.bigWin();say('FEVER 合計 +'+st.feverTotal+'枚！ 確変 '+st.kak+'回 つづく！','win');pop('TOTAL +'+st.feverTotal,{big:true});},500);}
}
/* ---------- JP lottery (2 stages) ---------- */
function startJP(){
 st.balls--;const p1=rnd(S.STAGE1.length);st.jpl={stage:1,t:0,pocket:p1,spin:Math.random()*Math.PI*2};
 WorldSound.bonus();st.shake=10;say('JP CHALLENGE！ ボールの行方は…','win');
}
function stepJP(){
 const j=st.jpl;j.t++;const dur=j.stage===1?200:260;
 if(j.t<dur-20&&j.t%(j.t<dur*0.6?6:12)===0)WorldSound.tick();
 if(j.stage===2&&j.t>dur*0.6&&j.t<dur&&j.t%20===0)WorldSound.heartbeat();
 if(j.t===dur){const v=j.stage===1?S.STAGE1[j.pocket]:S.STAGE2[j.pocket];
  if(j.stage===1&&v==='UP'){WorldSound.reach();say('UP！！ 2段目 JP ステージへ！！','win');pop('UP!!',{chance:true});}
  else if(j.stage===1&&v==='BALL'){WorldSound.bonus();say('BALL RETURN！ もう一度フィールドへ','win');}
  else if(v==='JP'){st.shake=60;WorldSound.boom();WorldSound.fanfare();setTimeout(()=>{try{WorldSound.bigWin();}catch{}},1300);burst(W/2,sy(40),160,'#ff6a80');burst(W/2,sy(40),120);st.root.classList.add('pu-jackpot');setTimeout(()=>st&&st.root.classList.remove('pu-jackpot'),6000);}
  else{WorldSound.win(v>=40?5:v>=20?3:2);burst(W/2,sy(40),30);}}
 if(j.t>=dur+50){const v=j.stage===1?S.STAGE1[j.pocket]:S.STAGE2[j.pocket];
  if(j.stage===1&&v==='UP'){st.jpl={stage:2,t:0,pocket:rnd(S.STAGE2.length),spin:Math.random()*Math.PI*2};return;}
  st.jpl=null;st.flash=60;
  if(v==='BALL'){S.addBall(st.sim);return;}
  if(v==='JP'){const n=Math.floor(st.jp);st.jp=S.JP_BASE;st.rain+=n;say('★★ JACKPOT ★★  '+yen(n)+'枚 ドバドバ！！','win');pop('JACKPOT',{big:true,jp:true});pop(yen(n)+'枚',{big:true,jp:true});return;}
  st.rain+=v;say('JP抽選 +'+v+'枚','win');pop('+'+v);}
}
/* ---------- frame ---------- */
function frame(now){
 if(!st)return;st.raf=requestAnimationFrame(frame);
 const dt=Math.min(100,now-st.last);st.last=now;st.acc+=dt;let steps=0;
 while(st.acc>=1000/60&&steps<4){st.acc-=1000/60;steps++;tick();}
 if(steps===4)st.acc=0;
 draw();
}
function tick(){
 st.frame++;if(st.flash>0)st.flash--;if(st.shake>0)st.shake--;if(st.outBurst>0)st.outBurst--;
 for(let i=st.falling.length-1;i>=0;i--){const f=st.falling[i];f.t++;if(f.t>=18){if(f.chance){st.stock=Math.min(9,st.stock+1);pop('CHECK!',{chance:true});WorldSound.tease();}else S.drop(st.sim,f.x);st.falling.splice(i,1);}}
 // medal rain: faster when there is a lot to pour
 if(st.rain>0){const n=st.rain>60?3:st.rain>20?2:(st.sim.t%2===0?1:0);for(let k=0;k<n&&st.rain>0;k++){S.scatter(st.sim,1);st.sim.coins[st.sim.coins.length-1].fresh=26;st.rain--;}if(st.frame%6===0)WorldSound.tick();}
 const idle=!st.reel&&!st.fever&&!st.jpl;
 if(idle){if(st.balls>0)startJP();else if(st.feverLeft>0)startFeverRound();else if(st.stock>0){st.stock--;startReel();}}
 if(st.reel){const r=st.reel;r.t++;
  for(let i=0;i<3;i++){if(r.t<r.stops[i]){if(r.t%3===0)r.cur[i]=S.SYMBOLS[rnd(S.SYMBOLS.length)];}else if(r.t===r.stops[i]){r.cur[i]=r.target[i];WorldSound.reelStop(i);}}
  if(r.reach&&r.t===r.stops[1]){say(r.hot?'激アツ リーチ！！！':'リーチ！！','win');WorldSound.reach();if(r.hot)st.shake=8;}
  if(r.reach&&r.t>r.stops[1]&&r.t<r.stops[2]&&r.t%(r.hot?14:20)===0)WorldSound.heartbeat();
  if(r.t>=r.stops[2]+16)finishReel();}
 if(st.fever){const f=st.fever;f.t++;for(let i=0;i<3;i++){if(f.t<FEVER_STOP[i]){if(f.t%2===0)f.cur[i]=S.SYMBOLS[rnd(S.SYMBOLS.length)];}else if(f.t===FEVER_STOP[i]){f.cur[i]='SEVEN';WorldSound.reelStop(i);}}if(f.t>=FEVER_STOP[2]+22)finishFeverRound();}
 if(st.jpl)stepJP();
 const before=st.sim.coins.slice(),wall=st.sim.wall>0;const r=S.step(st.sim);
 if(r.balls){st.balls+=r.balls;pop('BALL IN!',{chance:true});WorldSound.bonus();}
 if(r.front||r.lost||r.balls){const alive=new Set(st.sim.coins);for(const c of before)if(!alive.has(c)){const out=!c.ball&&!wall&&(c.x<S.GUTTER||c.x>100-S.GUTTER);st.outs.push({x:c.x,y:100,vy:1.2,out,ball:c.ball});}
  if(r.front){pending.won+=r.front;st.sessionOut+=r.front;st.lastAct=performance.now();st.outBurst=Math.min(40,st.outBurst+r.front*6);sync();const now=performance.now();if(now-st.lastTick>55){WorldSound.tick();st.lastTick=now;}if(pending.won>=MAX_WON()-80)settle();}}
 for(let i=st.outs.length-1;i>=0;i--){const o=st.outs[i];o.y+=o.vy;o.vy+=.35;if(o.y>124)st.outs.splice(i,1);}
 for(let i=st.pops.length-1;i>=0;i--){if(++st.pops[i].t>(st.pops[i].big?120:70))st.pops.splice(i,1);}
 for(let i=st.sparks.length-1;i>=0;i--){const s=st.sparks[i];s.t++;s.x+=s.vx;s.y+=s.vy;s.vy+=.18;s.vx*=.98;if(s.t>s.life)st.sparks.splice(i,1);}
}
/* ---------- drawing ---------- */
function coinAt(g,x,y,lift){const s=scaleAt(y),w=S.R*2*FRONT_HALF/50*s*1.04,hh=w*.61;g.drawImage(st.coin,sx(x,y)-w/2,sy(y)-hh*.45-(lift||0),w,hh);}
function ballAt(g,x,y,lift){const s=scaleAt(y),w=S.BALL_R*2*FRONT_HALF/50*s*1.1;g.drawImage(st.ballImg,sx(x,y)-w/2,sy(y)-w*.78-(lift||0),w,w);}
function rr(g,x,y,w,hh,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+hh,r);g.arcTo(x+w,y+hh,x,y+hh,r);g.arcTo(x,y+hh,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function draw(){
 const g=st.g,sim=st.sim;g.save();g.clearRect(0,0,W,H);g.textAlign='center';g.textBaseline='alphabetic';
 if(st.shake){const k=st.shake/10;g.translate((Math.random()-.5)*6*k,(Math.random()-.5)*6*k);}
 const fever=!!(st.fever||st.feverLeft>0),kak=st.kak>0,live=!!(st.reel||st.fever||st.jpl||st.flash||st.rain);
 let gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,fever?'#2a1406':kak?'#1e0a2a':'#0b1a2a');gr.addColorStop(1,'#050b12');g.fillStyle=gr;g.fillRect(-10,-10,W+20,H+20);
 // --- JACKPOT counter
 gr=g.createLinearGradient(0,8,0,58);gr.addColorStop(0,'#3a0a10');gr.addColorStop(1,'#14040a');g.fillStyle=gr;rr(g,54,8,W-108,52,12);g.fill();g.strokeStyle='#ffd36b';g.lineWidth=2.5;g.stroke();
 g.fillStyle='#ff9aa8';g.font='900 11px Arial,sans-serif';g.fillText('★  J A C K P O T  ★',W/2,24);
 g.fillStyle='#ffd36b';g.font='900 26px "Courier New",monospace';g.shadowColor='#ffb21e';g.shadowBlur=st.jpl?16:6;g.fillText(yen(Math.floor(st.jp))+' 枚',W/2,52);g.shadowBlur=0;
 // --- LCD
 const lcdTop=68,lcdH=176;gr=g.createLinearGradient(0,lcdTop,0,lcdTop+lcdH);
 if(fever){gr.addColorStop(0,'#5a2a00');gr.addColorStop(1,'#2a1000');}else if(kak){gr.addColorStop(0,'#3a0a4a');gr.addColorStop(1,'#16051f');}else{gr.addColorStop(0,'#123050');gr.addColorStop(1,'#0a1a2c');}
 g.fillStyle=gr;rr(g,22,lcdTop,W-44,lcdH,14);g.fill();g.strokeStyle=fever?'#ffd36b':kak?'#ff7ae0':'#d9b56a';g.lineWidth=2.5;g.stroke();
 for(let i=0;i<24;i++){const x=34+i*((W-68)/23);for(const y of [lcdTop+6,lcdTop+lcdH-6]){g.beginPath();g.arc(x,y,3,0,Math.PI*2);g.fillStyle=live?((i+(st.frame>>2))%4===0?'#ffffff':fever?'#ffb21e':kak?'#ff7ae0':'#7ff0ff'):'#2a3a4a';g.fill();}}
 g.fillStyle=fever?'#ffd36b':kak?'#ffb0f0':'#9fd8ff';g.font='italic 900 15px "Arial Black",sans-serif';
 g.fillText(fever?'FEVER GAME  '+(st.fever?st.fever.round:S.FEVER_ROUNDS-st.feverLeft)+' / '+S.FEVER_ROUNDS:kak?'確変中  残り '+st.kak:'FORTUNE SLOT',W/2,lcdTop+28);
 const cur=st.fever?st.fever.cur:st.reel?st.reel.cur:st.shown;
 for(let i=0;i<3;i++){const x=W/2-123+i*84,y=lcdTop+38,w=78,hh=108;
  const r=st.reel,tease=r&&r.reach&&i===2&&r.t>r.stops[1]&&r.t<r.stops[2];
  g.fillStyle=tease?(r.hot?'#4a0a10':'#2a0a18'):'#f6f1e6';rr(g,x,y,w,hh,8);g.fill();
  g.strokeStyle=tease?(st.frame%10<5?'#ff4a6a':'#ffd36b'):'#3a4a5a';g.lineWidth=tease?4:1.5;g.stroke();
  const spinning=(st.reel&&st.reel.t<st.reel.stops[i])||(st.fever&&st.fever.t<FEVER_STOP[i]);
  g.save();rr(g,x,y,w,hh,8);g.clip();
  if(spinning){const off=(st.frame*(st.fever?14:10))%52;drawSym(g,cur[i],x+w/2,y+hh/2-off+26,44);drawSym(g,S.SYMBOLS[(S.SYMBOLS.indexOf(cur[i])+2)%5],x+w/2,y+hh/2-off-26,44);drawSym(g,S.SYMBOLS[(S.SYMBOLS.indexOf(cur[i])+4)%5],x+w/2,y+hh/2-off+78,44);}
  else drawSym(g,cur[i],x+w/2,y+hh/2,54);
  g.restore();}
 g.font='800 10px Arial,sans-serif';g.fillStyle='#9fb6c8';g.fillText('STOCK',46,lcdTop+60);
 for(let i=0;i<9;i++){g.beginPath();g.arc(32+(i%3)*14,lcdTop+76+Math.floor(i/3)*14,4.6,0,Math.PI*2);g.fillStyle=i<st.stock?'#7ff0ff':'#1d3346';g.fill();}
 g.fillStyle='#9fb6c8';g.fillText(sim.wall>0?'WALL UP':'BALL',W-46,lcdTop+60);
 g.fillStyle=sim.wall>0?'#ffd36b':'#fff4d6';g.font='900 15px Arial,sans-serif';g.fillText(sim.wall>0?Math.ceil(sim.wall/60)+'s':String(sim.coins.filter(c=>c.ball).length+st.balls),W-46,lcdTop+82);
 if(st.reel&&st.reel.reach&&st.reel.t>st.reel.stops[1]){g.fillStyle=st.reel.hot?'#ff3a5a':'#ff8aa0';g.font='italic 900 20px "Arial Black",sans-serif';g.fillText(st.reel.hot?'激アツ!!':'リーチ!',W/2,lcdTop+lcdH-14);}
 // --- field
 const bl=sx(0,-8),br=sx(100,-8),fl=sx(0,100),fr=sx(100,100),yb=sy(-8),yf=sy(100);
 gr=g.createLinearGradient(0,yb,0,yf);gr.addColorStop(0,fever?'#4a3010':'#173a56');gr.addColorStop(1,fever?'#7a5418':'#2a6286');g.fillStyle=gr;g.beginPath();g.moveTo(bl,yb);g.lineTo(br,yb);g.lineTo(fr,yf);g.lineTo(fl,yf);g.closePath();g.fill();
 g.strokeStyle='#ffffff10';g.lineWidth=1;for(let y=0;y<=100;y+=10){g.beginPath();g.moveTo(sx(0,y),sy(y));g.lineTo(sx(100,y),sy(y));g.stroke();}
 for(const [a,b] of [[0,S.GUTTER],[100-S.GUTTER,100]]){g.fillStyle=sim.wall>0?'#ffd36b33':'#8a1a2a55';g.beginPath();g.moveTo(sx(a,86),sy(86));g.lineTo(sx(b,86),sy(86));g.lineTo(sx(b,100),sy(100));g.lineTo(sx(a,100),sy(100));g.closePath();g.fill();}
 g.fillStyle=sim.wall>0?'#ffe7a0':'#ffb0b8';g.font='800 10px Arial,sans-serif';const lab=sim.wall>0?'WALL':'OUT';g.fillText(lab,sx(S.GUTTER/2,95),sy(95)+4);g.fillText(lab,sx(100-S.GUTTER/2,95),sy(95)+4);
 const ry=sy(-14);g.strokeStyle='#9fb6c8';g.lineWidth=4;g.beginPath();g.moveTo(sx(4,-14),ry);g.lineTo(sx(96,-14),ry);g.stroke();
 const ax=sx(st.aim,-14);g.fillStyle='#ffd36b';g.beginPath();g.moveTo(ax,ry+16);g.lineTo(ax-9,ry+3);g.lineTo(ax+9,ry+3);g.closePath();g.fill();
 const face=sim.face;gr=g.createLinearGradient(0,sy(-8),0,sy(face));gr.addColorStop(0,'#5d6f80');gr.addColorStop(1,'#a9bccb');g.fillStyle=gr;g.beginPath();g.moveTo(bl,yb);g.lineTo(br,yb);g.lineTo(sx(100,face),sy(face));g.lineTo(sx(0,face),sy(face));g.closePath();g.fill();
 g.fillStyle='#3a4856';g.fillRect(sx(0,face),sy(face),sx(100,face)-sx(0,face),12);g.fillStyle='#d9b56a';g.fillRect(sx(0,face),sy(face),sx(100,face)-sx(0,face),2);
 const cy=(sy(-8)+sy(face))/2,cw=62,lit=st.flash||st.reel;g.fillStyle=lit?'#ffd36b':'#1a2a38';rr(g,W/2-cw/2,cy-10,cw,20,6);g.fill();g.strokeStyle='#ffd36b';g.lineWidth=1.5;g.stroke();g.fillStyle=lit?'#3a2000':'#ffd36b';g.font='900 10px Arial,sans-serif';g.fillText('CHECKER',W/2,cy+4);
 const pieces=sim.coins.slice().sort((a,b)=>a.y-b.y);for(const c of pieces){if(c.ball)ballAt(g,c.x,c.y,c.fresh?c.fresh*1.2:0);else coinAt(g,c.x,c.y,c.fresh?c.fresh*(c.fresh>14?2.4:.8):0);}
 for(const c of sim.coins)if(c.ball&&c.y>84){const X=sx(c.x,c.y),Y=sy(c.y)-10;g.strokeStyle=st.frame%16<8?'#ff4a6a':'#ffd36b';g.lineWidth=3;g.beginPath();g.arc(X,Y,22,0,Math.PI*2);g.stroke();g.fillStyle='#fff';g.font='900 11px Arial,sans-serif';g.fillText('あと少し！',X,Y-28);}
 for(const f of st.falling){const k=f.t/18;if(f.chance){const x=f.x+(50-f.x)*k,y=-14+((face-8)/2+8+14)*k*.9;coinAt(g,x,y,(1-k)*26);}else{const y=-14+(S.FACE_MAX*.6+14)*k;coinAt(g,f.x,y,(1-k)*30);}}
 g.fillStyle='#d9b56a';g.fillRect(fl,yf,fr-fl,3);
 if(sim.wall>0){g.fillStyle='#ffd36bdd';for(const x of [S.GUTTER,100-S.GUTTER]){const X=sx(x,100);g.fillRect(X-3,sy(84),6,yf-sy(84)+3);}}
 g.fillStyle='#0a1622';g.beginPath();g.moveTo(-10,yb);g.lineTo(bl,yb);g.lineTo(fl,yf);g.lineTo(-10,yf);g.closePath();g.fill();g.beginPath();g.moveTo(W+10,yb);g.lineTo(br,yb);g.lineTo(fr,yf);g.lineTo(W+10,yf);g.closePath();g.fill();
 for(let i=0;i<10;i++){const t=i/9,y=yb+(yf-yb)*t;for(const [x0,x1] of [[bl,fl],[br,fr]]){const x=x0+(x1-x0)*t;g.beginPath();g.arc(x+(x0<W/2?-8:8),y,3.4,0,Math.PI*2);g.fillStyle=live?((i+(st.frame>>2))%3===0?'#fff':fever?'#ffb21e':kak?'#ff7ae0':'#7ff0ff'):'#24384a';g.fill();}}
 gr=g.createLinearGradient(0,yf,0,H);gr.addColorStop(0,'#1a1208');gr.addColorStop(1,'#0a0704');g.fillStyle=gr;g.fillRect(fl-6,yf+4,fr-fl+12,H-yf-4);
 if(!(sim.wall>0)){g.fillStyle='#5a0f1a';g.fillRect(fl-6,yf+4,sx(S.GUTTER,100)-fl+6,H-yf-4);g.fillRect(sx(100-S.GUTTER,100),yf+4,fr-sx(100-S.GUTTER,100)+6,H-yf-4);}
 const pile=Math.min(46,Math.sqrt(st.sessionOut)*2.2);if(pile>1){g.fillStyle='#e0a82a';g.beginPath();g.ellipse(W/2,H-8,Math.min(150,40+pile*2.6),pile,0,Math.PI,0);g.fill();g.fillStyle='#ffe08a';for(let i=0;i<Math.min(30,pile);i++){const a=(i*137.5)%180*Math.PI/180;g.beginPath();g.ellipse(W/2+Math.cos(a)*(30+pile*2)*((i%5)/5),H-8-Math.sin(a)*pile*((i%7)/7),6,2.6,0,0,Math.PI*2);g.fill();}}
 g.fillStyle=st.outBurst?'#fff4d6':'#d9b56a';g.font=`700 ${12+Math.min(8,st.outBurst/5)}px Georgia,serif`;g.fillText('PAYOUT  '+yen(st.sessionOut),W/2,yf+30);
 for(const o of st.outs){g.globalAlpha=o.out?.55:1;if(o.ball)ballAt(g,o.x,Math.min(o.y,100),-(o.y-100)*3.4);else coinAt(g,o.x,Math.min(o.y,100),-(o.y-100)*3.4);g.globalAlpha=1;}
 if(st.jpl)drawJP(g);
 for(const s of st.sparks){g.globalAlpha=Math.max(0,1-s.t/s.life);g.fillStyle=s.c;g.fillRect(s.x-2,s.y-2,4,4);}g.globalAlpha=1;
 st.pops.forEach((pp,i)=>{const life=pp.big?120:70,k=pp.t/life,sc=pp.t<10?0.6+pp.t/10*0.6:1.2-Math.min(.2,(pp.t-10)/50);g.globalAlpha=Math.min(1,(1-k)*1.8);
  g.save();const y=sy(38)-k*30-i*44;g.translate(W/2,y);g.scale(sc,sc);g.fillStyle=pp.jp?'#ff4a6a':pp.fever?'#ffd36b':pp.chance?'#7ff0ff':'#fff1a0';g.font=`italic 900 ${pp.big?50:pp.chance?28:36}px "Arial Black",Impact,sans-serif`;g.lineWidth=7;g.strokeStyle='#000b';g.strokeText(pp.text,0,0);g.fillText(pp.text,0,0);g.restore();g.globalAlpha=1;});
 g.restore();
}
function drawJP(g){
 const j=st.jpl,stage2=j.stage===2,pockets=stage2?S.STAGE2:S.STAGE1,n=pockets.length,cx=W/2,cy=sy(44),R=stage2?118:136,A=Math.PI*2/n,dur=stage2?260:200;
 g.globalAlpha=Math.min(1,j.t/14);
 g.fillStyle='#050b12f4';g.beginPath();g.arc(cx,cy,R+26,0,Math.PI*2);g.fill();
 g.strokeStyle=stage2?'#ff4a6a':'#ffd36b';g.lineWidth=5;g.beginPath();g.arc(cx,cy,R+22,0,Math.PI*2);g.stroke();
 for(let i=0;i<24;i++){const a=i*Math.PI/12;g.beginPath();g.arc(cx+Math.cos(a)*(R+22),cy+Math.sin(a)*(R+22),3,0,Math.PI*2);g.fillStyle=(i+(st.frame>>2))%3===0?'#fff':stage2?'#ff4a6a':'#ffd36b';g.fill();}
 for(let i=0;i<n;i++){const a0=-Math.PI/2+i*A-A/2,a1=a0+A,v=pockets[i];g.beginPath();g.arc(cx,cy,R+14,a0,a1);g.arc(cx,cy,R-36,a1,a0,true);g.closePath();
  g.fillStyle=v==='JP'?'#c8192e':v==='UP'?'#8a2ad0':v==='BALL'?'#2a7a4a':i%2?'#173a56':'#10263c';g.fill();g.strokeStyle='#d9b56a';g.lineWidth=1.5;g.stroke();
  const am=a0+A/2;g.fillStyle=v==='JP'?'#fff1c4':v==='UP'?'#f0d8ff':'#ffd36b';g.font=`900 ${stage2?22:16}px "Arial Black",sans-serif`;g.fillText(v==='JP'?'JP':v==='UP'?'UP':v==='BALL'?'BALL':'+'+v,cx+Math.cos(am)*(R-11),cy+Math.sin(am)*(R-11)+6);}
 g.fillStyle=stage2?'#ff8aa0':'#ffd36b';g.font='italic 900 15px "Arial Black",sans-serif';g.fillText(stage2?'JP STAGE':'JP CHALLENGE',cx,cy-10);
 g.fillStyle='#fff4d6';g.font='900 20px "Courier New",monospace';g.fillText(yen(Math.floor(st.jp))+'枚',cx,cy+16);
 const k=Math.min(1,j.t/dur),target=-Math.PI/2+j.pocket*A,total=(stage2?4:5)*Math.PI*2+((target-j.spin)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
 const e=stage2?1-Math.pow(1-k,4):1-Math.pow(1-k,3);const ang=j.spin+total*e,rad=R+2-(k>0.88?(k-.88)/.12*14:0);
 const bx=cx+Math.cos(ang)*rad,by=cy+Math.sin(ang)*rad;const s=26;g.drawImage(st.ballImg,bx-s/2,by-s/2-3,s,s);
 g.globalAlpha=1;
}
function close(){if(!st)return;cancelAnimationFrame(st.raf);clearInterval(st.timer);if(st.hold)clearInterval(st.hold);
 // everything already won is resolved now and poured onto the field, so nothing paid for is lost
 for(const f of st.falling){if(f.chance)st.stock++;else S.drop(st.sim,f.x);}
 let rain=st.rain;
 const stage2=pocket=>{const v=S.STAGE2[pocket];if(v==='JP'){const n=Math.floor(st.jp);st.jp=S.JP_BASE;return n;}return v;};
 const jpRun=()=>{const v=S.STAGE1[rnd(S.STAGE1.length)];if(v==='BALL'){S.addBall(st.sim);return 0;}if(v==='UP')return stage2(rnd(S.STAGE2.length));return v;};
 if(st.jpl){const j=st.jpl;if(j.stage===2)rain+=stage2(j.pocket);else{const v=S.STAGE1[j.pocket];if(v==='UP')rain+=stage2(rnd(S.STAGE2.length));else if(v==='BALL')S.addBall(st.sim);else rain+=v;}}
 for(let i=0;i<st.balls;i++)rain+=jpRun();
 const feverPay=()=>{let t=0;for(let i=0;i<S.FEVER_ROUNDS;i++)t+=S.FEVER_PAYS[rnd(S.FEVER_PAYS.length)];return t;};
 if(st.fever)rain+=st.fever.pay;
 for(let i=0;i<st.feverLeft;i++)rain+=S.FEVER_PAYS[rnd(S.FEVER_PAYS.length)];
 if(st.reel){const r=st.reel;if(r.name==='BALL')S.addBall(st.sim);else if(r.name==='SEVEN'){st.kak=S.KAKUHEN_SPINS;rain+=feverPay();}else rain+=r.add;}
 for(let i=0;i<st.stock;i++){const T=st.kak>0?S.LOTTERY_KAKUHEN:S.LOTTERY;if(st.kak>0)st.kak--;const [name,add]=T[S.pick(T,rnd(S.total(T)))];if(name==='BALL')S.addBall(st.sim);else if(name==='SEVEN'){st.kak=S.KAKUHEN_SPINS;rain+=feverPay();}else rain+=add;}
 S.scatter(st.sim,Math.min(rain,420));save();st=null;
 if(pending.spent+pending.won>0)settle();else{walletHold=false;renderProfile();}}
window.addEventListener('pagehide',()=>{if(st)save();});
return {open,close};
})();
