'use strict';
/* STICK CASINO — "FORTUNE PUSHER" (medal corner). 1 medal = 1 SC. An original machine design.
   Flow: medals → moving CHECKER gate → hold (8, result drawn on entry) → number slot (1–7 + JP ball) → medal rain; odd numbers give 確変; JP balls go onto the field;
   777 = FEVER GAME + 確変. A JP ball pushed off the front goes to the 2-stage JP lottery (stage 2 holds the progressive JACKPOT).
   The field is drawn with a small perspective camera (pseudo-3D). The field and the JP live in this browser;
   medals in/out are settled in batches by core.js ('pusher'). */
const WorldPusher=(()=>{
const S=PusherSim,W=480,H=740;
const STORE='stick-royale-pusher-v4',SETTLE_IDLE=2500,SETTLE_SPENT=200,SETTLE_WON=2000;
const REEL_STOP=[44,66,88],REACH_EXTRA=84,FEVER_STOP=[16,22,28];
const PUSHER_H=11,WALL_H=16,BACK_Y=-26,STAGE_BACK=-12,RAMP_TOP=-22,RAIL_Y=-25,GATE_Y=-17,HOLD_MAX=8,CC_W=2.5,FLIP_T=360,CC_X=[30,70],LAND_T=18;
let st=null,pending={spent:0,won:0},settling=null,storeKey=STORE;
function h(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
const yen=n=>Number(n||0).toLocaleString('ja-JP');
function meter(label){const m=h('div','egm-meter');const v=h('b',undefined,'0');m.append(h('small',undefined,label),v);return [m,v];}
const credit=()=>p.cash-pending.spent+pending.won;
const MAX_SPENT=()=>WorldCore.PU_MAX_SPENT,MAX_WON=()=>WorldCore.PU_MAX_WON;
const rnd=n=>random(n);

/* ---------- perspective camera ---------- */
const CAM=(()=>{const C=[50,178,118],T=[50,42,0];const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
 cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>{const l=Math.hypot(...a);return a.map(v=>v/l);};
 const f=norm(sub(T,C)),r=norm(cross(f,[0,0,1])),u=cross(r,f);
 const raw=(x,y,z)=>{const d=[x-C[0],y-C[1],z-C[2]],zc=dot(d,f);return [dot(d,r)/zc,-dot(d,u)/zc,zc];};
 // fit the field (and the tray just in front of it) into the lower part of the canvas
 const pts=[raw(0,BACK_Y,0),raw(100,BACK_Y,0),raw(0,108,0),raw(100,108,0),raw(0,BACK_Y,WALL_H+6)];
 const minX=Math.min(...pts.map(q=>q[0])),maxX=Math.max(...pts.map(q=>q[0])),minY=Math.min(...pts.map(q=>q[1])),maxY=Math.max(...pts.map(q=>q[1]));
 const box={x0:30,x1:W-30,y0:272,y1:628},k=Math.min((box.x1-box.x0)/(maxX-minX),(box.y1-box.y0)/(maxY-minY));
 const ox=(box.x0+box.x1)/2-k*(minX+maxX)/2,oy=box.y0-k*minY;
 return {P:(x,y,z=0)=>{const q=raw(x,y,z);return [ox+k*q[0],oy+k*q[1],q[2]];},k,C,f,r,up:u,ox,oy};})();
const P=CAM.P;
// the launch ramp runs from RAMP_TOP (high) down to the upper stage at STAGE_BACK
const rampZ=y=>PUSHER_H+.4+7*Math.max(0,Math.min(1,(STAGE_BACK-y)/(STAGE_BACK-RAMP_TOP)));
// pixels per field unit at a point (for sprite sizes)
const unitAt=(x,y)=>{const a=P(x-1,y),b=P(x+1,y);return Math.hypot(b[0]-a[0],b[1]-a[1])/2;};
const depthAt=(x,y)=>{const a=P(x,y-1),b=P(x,y+1);return Math.abs(b[1]-a[1])/2;};

/* ---------- persistence & settlement ---------- */
function keyFor(){return STORE+':'+(mode==='local'?'local':(user?.uid||'guest'));}
function load(){storeKey=keyFor();try{const v=JSON.parse(localStorage.getItem(storeKey)||'null');if(v&&Array.isArray(v.coins)){
 const coins=v.coins.filter(c=>Array.isArray(c)&&Number.isFinite(c[0])&&Number.isFinite(c[1])).slice(0,420).map(([x,y,b])=>b?{x,y,ball:true}:{x,y});const pd=v.pending||{};
 const up=Array.isArray(v.upper)?v.upper.filter(c=>Array.isArray(c)&&Number.isFinite(c[0])&&Number.isFinite(c[1])).slice(0,120).map(([x,y])=>({x,y})):null;
 return {coins,upper:up,jp:Number.isFinite(v.jp)?Math.max(S.JP_BASE,Math.min(S.JP_MAX,v.jp)):S.JP_BASE,kak:Math.max(0,Math.min(30,v.kak|0)),pending:{spent:Math.max(0,Math.min(MAX_SPENT(),pd.spent|0)),won:Math.max(0,Math.min(MAX_WON(),pd.won|0))}};}}catch{}return null;}
function save(){if(!st)return;try{localStorage.setItem(storeKey,JSON.stringify({upper:st.upper.coins.map(c=>[Math.round(c.x*10)/10,Math.round(c.y*10)/10]),coins:st.sim.coins.map(c=>c.ball?[Math.round(c.x*10)/10,Math.round(c.y*10)/10,1]:[Math.round(c.x*10)/10,Math.round(c.y*10)/10]),jp:Math.round(st.jp*100)/100,kak:st.kak,pending}));}catch{}}
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
function coinSprite(){const c=document.createElement('canvas');c.width=96;c.height=64;const g=c.getContext('2d');
 // edge (thickness) then face
 let gr=g.createLinearGradient(0,30,0,58);gr.addColorStop(0,'#c98a14');gr.addColorStop(1,'#6a4006');g.fillStyle=gr;
 g.beginPath();g.ellipse(48,40,46,20,0,0,Math.PI);g.lineTo(2,28);g.ellipse(48,28,46,20,0,Math.PI,0,true);g.closePath();g.fill();
 g.strokeStyle='#8a5a0c55';g.lineWidth=1;for(let i=0;i<24;i++){const a=Math.PI*i/23;g.beginPath();g.moveTo(48-46*Math.cos(a),28+20*Math.sin(a));g.lineTo(48-46*Math.cos(a),40+20*Math.sin(a));g.stroke();}
 gr=g.createLinearGradient(10,6,80,50);gr.addColorStop(0,'#fff6c0');gr.addColorStop(.4,'#f6c840');gr.addColorStop(1,'#b47a10');
 g.fillStyle=gr;g.beginPath();g.ellipse(48,28,46,20,0,0,Math.PI*2);g.fill();
 g.strokeStyle='#9a6a10';g.lineWidth=2.5;g.beginPath();g.ellipse(48,28,33,14,0,0,Math.PI*2);g.stroke();
 g.fillStyle='#a8700c';g.font='900 15px Georgia,serif';g.textAlign='center';g.textBaseline='middle';g.save();g.translate(48,28);g.scale(1,.45);g.fillText('S',0,1);g.restore();
 g.fillStyle='#ffffffaa';g.beginPath();g.ellipse(34,19,14,4.5,-.1,0,Math.PI*2);g.fill();return c;}
function ballSprite(){const c=document.createElement('canvas');c.width=96;c.height=96;const g=c.getContext('2d');
 const gr=g.createRadialGradient(34,30,4,48,48,46);gr.addColorStop(0,'#ffffff');gr.addColorStop(.25,'#fff0b0');gr.addColorStop(.65,'#e6a822');gr.addColorStop(1,'#7a4a06');
 g.fillStyle=gr;g.beginPath();g.arc(48,48,44,0,Math.PI*2);g.fill();
 g.fillStyle='#c8192e';g.beginPath();g.arc(50,52,20,0,Math.PI*2);g.fill();g.strokeStyle='#fff4d6';g.lineWidth=3;g.stroke();
 g.fillStyle='#fff4d6';g.font='900 19px Arial,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('JP',50,53);
 g.fillStyle='#ffffffdd';g.beginPath();g.ellipse(34,28,13,7,-.6,0,Math.PI*2);g.fill();return c;}
const NUM_COLORS={'1':['#7ad0ff','#1060c0'],'2':['#9cff9a','#18904a'],'3':['#ffd27a','#d06a10'],'4':['#8af6ff','#0a8aa0'],'5':['#e2a6ff','#7a2ad0'],'6':['#ffa6d8','#c0207a'],'SEVEN':['#ffe08a','#d0101e']};
function drawSym(g,sym,x,y,s){g.save();g.translate(x,y);g.scale(s/40,s/40);g.textAlign='center';g.textBaseline='middle';
 if(sym==='BALL'){const gr=g.createRadialGradient(-6,-7,2,0,0,18);gr.addColorStop(0,'#fff');gr.addColorStop(.4,'#ffe08a');gr.addColorStop(1,'#a8700c');g.fillStyle=gr;g.beginPath();g.arc(0,0,17,0,Math.PI*2);g.fill();g.fillStyle='#c8192e';g.beginPath();g.arc(0,1,8.5,0,Math.PI*2);g.fill();g.fillStyle='#fff';g.font='900 8px Arial,sans-serif';g.fillText('JP',0,1.5);}
 else{const label=sym==='SEVEN'?'7':sym,[c1,c2]=NUM_COLORS[sym];g.font='italic 900 42px "Arial Black",Impact,sans-serif';
  // bevelled numeral: dark extrusion, outline, gradient face, shine
  g.fillStyle='#00000066';for(let i=4;i>0;i--)g.fillText(label,i*.8,i*.9+2);
  g.lineWidth=7;g.strokeStyle='#1a0f08';g.strokeText(label,0,2);g.lineWidth=3;g.strokeStyle='#fff';g.strokeText(label,0,2);
  const gr=g.createLinearGradient(0,-20,0,22);gr.addColorStop(0,c1);gr.addColorStop(.55,c2);gr.addColorStop(1,'#1a0a08');g.fillStyle=gr;g.fillText(label,0,2);
  if(sym==='SEVEN'){g.lineWidth=1.5;g.strokeStyle='#ffd36b';g.strokeText(label,0,2);}}
 g.restore();}
const isOdd=n=>n==='1'||n==='3'||n==='5';

/* ---------- UI ---------- */
function open(body){
 const root=h('div','egm egm-pusher');
 const top=h('div','egm-topper');top.append(h('small',undefined,'STICK CASINO MEDAL CORNER'),h('b','egm-title','FORTUNE PUSHER'),h('span','egm-sub','1〜7のナンバースロット × JPボール'));
 const screen=h('div','egm-screen pu-screen');const cv=h('canvas','pu-canvas');cv.width=W;cv.height=H;cv.setAttribute('aria-label','コインプッシャー。タップした位置にメダルを落とします');cv.setAttribute('role','img');
 const side=h('div','pu-side');
 const how=h('div','pu-how');how.append(h('b',undefined,'あそびかた'),
  h('p',undefined,'タップした位置（または ◀▶ と DROP）にメダルを投入。メダルはスロープを転がって上段ステージへ。プッシャーが下がるたびに上段のメダルが押し出されて下段に落ち、下段の手前から落ちたメダルが払い出し。左右の端は OUT。'),
  h('p',undefined,'下段の手前から落ちたメダルは正面の坂を滑り落ちる。坂の真ん中の START の穴にメダルが落ちたらスロット抽選（保留は最大8）。上段のふちの CHANCE チェッカーをメダルが通ると、その側のフリッパーがパタパタ動いてメダルを START の方へ寄せてくれる。レバーで CHANCE チェッカーの上をねらおう。'),h('p',undefined,'奇数そろいは確変、777 は FEVER GAME。当たったメダルは奥の払い出し口から出てくる。'),
  h('p',undefined,'金色の JPボール を手前に落とすと FEVER STAGE。バンパーに当たるたび WIN。OUTブロックが割れて落ちたら終了。40 WIN ごとに JPC の穴が開き、JP CHANCE（2段のクルーン）へ。1段目で UP に入れば JP STAGE、JP の穴で JACKPOT。取っても続く！'));
 const table=h('div','pu-table');
 const row=(syms,text,cls)=>{const r=h('span',cls);const icons=h('i','pu-syms');for(const s of syms){const c=document.createElement('canvas');c.width=c.height=44;drawSym(c.getContext('2d'),s,22,22,34);icons.append(c);}r.append(icons,h('b',undefined,text));table.append(r);};
 row(['SEVEN','SEVEN','SEVEN'],'FEVER＋確変','fever');row(['BALL','BALL','BALL'],'JPボール投入','jp');row(['5','5','5'],'30枚＋確変','odd');row(['6','6','6'],'20枚');row(['3','3','3'],'30枚＋確変','odd');row(['4','4','4'],'20枚');row(['1','1','1'],'30枚＋確変','odd');row(['2','2','2'],'20枚');
 side.append(how,table);
 const stage=h('div','pu-stage');stage.append(cv);screen.append(stage,side);
 const msgBar=h('div','egm-msg','画面をタップ（または DROP）でメダル投入');
 const meters=h('div','egm-meters');const [mC,vCredit]=meter('CREDIT'),[mI,vIn]=meter('IN'),[mO,vOut]=meter('OUT');meters.append(mC,mI,mO);
 const deck=h('div','egm-deck pu-deck');
 const sound=h('button','egm-btn egm-btn-small',WorldSound.muted?'♪ OFF':'♪ ON');sound.type='button';sound.onclick=()=>{sound.textContent=WorldSound.toggle()?'♪ OFF':'♪ ON';};
 const lever=h('input','pu-lever');lever.type='range';lever.min='8';lever.max='92';lever.step='0.5';lever.value='50';lever.setAttribute('aria-label','レバー：発射位置');lever.addEventListener('input',()=>{st.aim=+lever.value;});
 const left=h('button','egm-btn pu-aim','◀');left.type='button';left.setAttribute('aria-label','左へ');
 const right=h('button','egm-btn pu-aim','▶');right.type='button';right.setAttribute('aria-label','右へ');
 const cash=h('button','egm-btn egm-btn-small pu-cash','精算');cash.type='button';cash.title='たまったメダルの出入りを今すぐ保存';
 const drop=h('button','egm-spin pu-drop','DROP');drop.type='button';
 const leverBox=h('label','pu-leverbox');leverBox.append(h('small',undefined,'LEVER'),lever);
 deck.append(sound,cash,left,leverBox,drop,right);
 root.append(top,screen,msgBar,meters,deck);body.append(root);
 const saved=load();
 const sim=saved&&saved.coins.length>=20?Object.assign(S.create(0),{coins:saved.coins}):S.create();
 if(!saved)sim.coins.push({x:50,y:40,ball:true});
 const upper={coins:saved?.upper||(()=>{const c=[];for(let y=STAGE_BACK+S.R+.3;y<S.FACE_MIN-S.R;y+=2*S.R*.9)for(let x=S.R+(c.length%2)*2;x<100-S.R;x+=2*S.R+.6)if(Math.random()<.7)c.push({x,y});return c;})()};
 if(saved)pending=saved.pending;
 st={lever,upper,root,cv,g:cv.getContext('2d'),coin:coinSprite(),ballImg:ballSprite(),sim,msgBar,vCredit,vIn,vOut,drop,cash,aim:50,falling:[],apron:S.createApron(),apSink:[],outs:[],pops:[],sparks:[],sinks:[],shower:[],queue:[],gate:{x:50},cc:[{lit:true,t:0},{lit:true,t:0}],flights:[],dots:[],shift:0,reel:null,fever:null,feverLeft:0,feverTotal:0,jpl:null,balls:0,rain:0,jp:saved?.jp??S.JP_BASE,kak:saved?.kak||0,
  shown:['SEVEN','BALL','3'],sessionIn:0,sessionOut:0,hold:null,last:performance.now(),acc:0,lastAct:performance.now(),lastSave:0,lastTick:0,raf:0,timer:0,flash:0,frame:0,shake:0,outBurst:0,banner:null,sevens:0};
 walletHold=true;paintCredit();
 const aimFromEvent=e=>{const r=cv.getBoundingClientRect();const x=(e.clientX-r.left)/r.width*W;const a=P(0,RAIL_Y,26),b=P(100,RAIL_Y,26);st.aim=Math.max(8,Math.min(92,(x-a[0])/(b[0]-a[0])*100));};
 const startHold=fn=>{stopHold();fn();st.hold=setInterval(fn,190);};
 const stopHold=()=>{if(st?.hold){clearInterval(st.hold);st.hold=null;}};
 const press=(el,fn)=>{el.addEventListener('pointerdown',e=>{e.preventDefault();try{el.setPointerCapture(e.pointerId);}catch{}fn(e);});for(const ev of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(ev,stopHold);};
 press(cv,e=>{aimFromEvent(e);startHold(dropOne);});
 cv.addEventListener('pointermove',e=>{if(st?.hold)aimFromEvent(e);});
 press(drop,()=>startHold(dropOne));drop.addEventListener('click',e=>{if(e.detail===0)dropOne();});
 const nudge=d=>()=>{st.aim=Math.max(8,Math.min(92,st.aim+d));sync();};
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
function sync(){if(!st)return;if(st.lever&&document.activeElement!==st.lever)st.lever.value=String(st.aim);st.vIn.textContent=yen(st.sessionIn);st.vOut.textContent=yen(st.sessionOut);paintCredit();st.drop.disabled=p.cash-pending.spent<1;}
function dropOne(){
 if(!st)return;
 if(p.cash-pending.spent<1){say(pending.won?'精算中… もう一度どうぞ':'CREDIT が足りません','lose');if(pending.won)settle();return;}
 if(pending.spent>=MAX_SPENT()){settle();return;}
 if(st.falling.length>6)return;
 pending.spent++;st.sessionIn++;st.lastAct=performance.now();st.jp=Math.min(S.JP_MAX,st.jp+S.JP_RATE);
 st.falling.push({x:st.aim+(Math.random()-.5)*4,t:0,roll:rnd(25),dx:(Math.random()-.5)*12,checked:false});WorldSound.coin();sync();
}
function burst(x,y,n,color){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=2+Math.random()*6;st.sparks.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-3,t:0,life:40+Math.random()*30,c:color||(Math.random()<.5?'#ffd36b':'#fff4d6')});}}
function pop(text,o={}){st.pops.push({text,t:0,...o});}
/* ---------- number slot ---------- */
// 予告 colours (expectation): blue < green < red < gold. Chosen from the real result, so hotter colours mean better odds.
const EXP_COLORS=['#5ab0ff','#4ade80','#ff4a5a','#ffd36b'],EXP_NAMES=['','チャンス','激アツ','超激アツ'];
const weighted=(opts)=>{let t=0;for(const o of opts)t+=o[1];let x=rnd(t);for(const o of opts){x-=o[1];if(x<0)return o[0];}return opts[0][0];};
// the result is drawn when the medal enters the CHECKER (like a real machine's hold); the hold lamp may already show its colour
function planReel(kak){
 const T=kak?S.LOTTERY_KAKUHEN:S.LOTTERY;
 const row=T[S.pick(T,rnd(S.total(T)))],[name,add,,grant]=row,win=name!=='MISS';
 let target;const pickSym=()=>S.SYMBOLS[rnd(S.SYMBOLS.length)];
 if(!win){if(rnd(100)<(kak?45:34)){const a=rnd(100)<28?'SEVEN':pickSym();let c;do{c=pickSym();}while(c===a);target=[a,a,c];}else{do{target=[pickSym(),pickSym(),pickSym()];}while(target[0]===target[1]);}}
 else target=[name,name,name];
 const reach=target[0]===target[1],big=target[0]==='SEVEN'||target[0]==='BALL';
 // expectation colour and pre-announcement
 const exp=win?(big?weighted([[3,35],[2,45],[1,15],[0,5]]):weighted([[3,6],[2,30],[1,40],[0,24]])):reach?(big?weighted([[3,3],[2,30],[1,42],[0,25]]):weighted([[2,8],[1,32],[0,60]])):weighted([[1,8],[0,92]]);
 const blackout=exp>=2&&rnd(100)<(win?70:35);
 // reach type: normal → long → SP → 全回転 (全回転 only on a real 777)
 let rtype=null;if(reach){rtype=win&&name==='SEVEN'?weighted([['zen',30],['sp',55],['long',15]]):big?weighted([['sp',win?75:45],['long',win?25:35],['normal',win?0:20]]):win?weighted([['normal',45],['long',40],['sp',15]]):weighted([['normal',70],['long',25],['sp',5]]);}
 const slip=win&&rtype!=='zen'&&rnd(100)<18,revive=win&&!slip&&rtype!=='zen'&&rnd(100)<14;
 const extra={normal:70,long:150,sp:220,zen:150}[rtype]||0;
 const pre=blackout?70:exp>=1?26:0;
 const stops=[REEL_STOP[0],REEL_STOP[1],REEL_STOP[2]+extra];
 let end=stops[2]+18;if(slip)end+=24;if(revive)end+=110;
 const plan={name,add,grant,target,pre,stops,end,reach,hot:big&&reach,rtype,exp,blackout,slip,revive,kak,win};
 // 先読み: some holds change colour in advance
 plan.hold=exp>=1&&rnd(100)<(win?60:30)?exp:0;return plan;}
function startReel(plan){
 if(plan.kak&&st.kak>0)st.kak--;const {pre,blackout,exp,kak}=plan;
 st.reel={...plan,t:-pre,cur:st.shown.slice(),said:{}};st.shift=12;WorldSound.button();
 if(pre){if(blackout){WorldSound.heartbeat();say('……！？','');}else say(EXP_NAMES[exp]?EXP_NAMES[exp]+'予告！':'','win');}
 else{WorldSound.spin();say(kak?'確変中！ ナンバースロット':'CHECKER！ ナンバースロット',kak?'win':'');}
}
// a win: show the payout panel and pour the medals out of the ports while it counts up
function award(n,label){if(!n)return;st.rain+=n;for(let i=0;i<Math.min(140,Math.round(n*(n>=200?.25:.6)));i++)st.shower.push({x:Math.random()*W,y:-20-Math.random()*260,vy:3+Math.random()*4,vx:(Math.random()-.5)*1.2,s:14+Math.random()*12});if(n>=30)WorldSound.coinRush(Math.min(30,8+n/10));if(st.payout&&!st.payout.done){st.payout.total+=n;st.payout.label=label;}else st.payout={total:n,given:0,t:0,label};
 const tier=n>=1000||label==='JACKPOT'?'JACKPOT':n>=300?'SUPER WIN':n>=100?'BIG WIN':'';if(tier){banner(tier,'+'+yen(n)+' 枚',tier==='JACKPOT'?'#ff4a6a':'#ffd36b',true);st.shake=Math.max(st.shake,n>=300?30:16);}}
function portFlight(ball){const side=st.portSide=(st.portSide?0:1);st.flights.push({side,x1:14+Math.random()*72,y1:st.sim.face+(ball?S.BALL_R:S.R)+1+Math.random()*12,t:0,dur:ball?44:26+rnd(12),ball});st.portGlow=24;if(ball)WorldSound.bonus();}
// the centre chucker has a two-bladed shutter that turns irregularly; a medal falls in only through a gap
// payout apron under the field edge: a slanted panel the medals slide down, with the START hole and a flipper each side (physics in PusherSim.stepApron)
const AP=S.APRON,AP_D=[0,10/AP.L,-30/AP.L],AP_N=[0,30/AP.L,10/AP.L],AP_TILT=-Math.atan2(30,10),HOLE_VIS=4.4;
const apronPos=(u,v,h=0)=>[u,100+v*AP_D[1]+h*AP_N[1],v*AP_D[2]+h*AP_N[2]];const apronP=(u,v,h=0)=>P(...apronPos(u,v,h));
const FIELD_SLOPE_Y=()=>startPos()[1]-20;
const startPos=()=>{const q=apronP(AP.HOLE.u,AP.HOLE.v);return [q[0],q[1]];};

// flippers swing up and down; while up they guide medals into START
function checkerHit(){
 const q=startPos();burst(q[0],q[1],24,'#7ff0ff');st.gateFlash=20;
 if(st.queue.length>=HOLD_MAX){pop('STOCK MAX',{small:true,at:[W/2,FIELD_SLOPE_Y()-30]});return;}
 const used=st.queue.filter(x=>x.kak).length,plan=planReel(st.kak-used>0);st.queue.push(plan);
 st.dots.push({x0:q[0],y0:q[1],t:0,slot:st.queue.length-1,color:plan.hold?EXP_COLORS[plan.hold]:'#e8f4ff'});
 pop('START!',{chance:true,at:[q[0],q[1]-24]});WorldSound.tease();if(plan.hold>=2)setTimeout(()=>{try{WorldSound.reach();}catch{}},200);
 if(!st.reel&&!st.fever&&!st.jpl)say('チェッカー入賞！ 抽選スタート','win');else say('チェッカー入賞！ 保留 '+st.queue.length+' 個','win');}
const holdPos=i=>[W/2-98+i*28,249];
function banner(text,sub,color,big){st.banner={text,sub,color,t:0,big};}
function stepReel(){
 const r=st.reel;r.t++;
 if(r.t<0){if(r.blackout&&r.t%20===0)WorldSound.heartbeat();return;}
 if(r.t===0){WorldSound.spin();if(r.blackout){st.shake=10;banner(EXP_NAMES[r.exp]||'CHANCE','',EXP_COLORS[r.exp]);WorldSound.boom();}}
 const zen=r.rtype==='zen'&&r.t>r.stops[1]+14&&r.t<r.stops[2];
 for(let i=0;i<3;i++){
  if(zen){if(r.t%5===0){const k=S.SYMBOLS.indexOf(r.cur[0]);const nx=S.SYMBOLS[(k+1)%8];r.cur=[nx,nx,nx];}continue;}
  if(r.t<r.stops[i]){if(r.t%3===0)r.cur[i]=S.SYMBOLS[rnd(S.SYMBOLS.length)];}
  else if(r.t===r.stops[i]){
   if(i===2&&r.slip){const k=S.SYMBOLS.indexOf(r.target[2]);r.cur[2]=S.SYMBOLS[(k+7)%8];}
   else if(i===2&&r.revive){let c;do{c=S.SYMBOLS[rnd(8)];}while(c===r.target[2]);r.cur[2]=c;}
   else r.cur[i]=r.target[i];WorldSound.reelStop(i);}
 }
 if(r.reach&&r.t===r.stops[1]){
  const t={normal:'リーチ！',long:'ロングリーチ！！',sp:'SP リーチ！！！',zen:'SP リーチ！！！'}[r.rtype];say(t,'win');WorldSound.reach();
  if(r.rtype==='sp'||r.rtype==='zen'){st.shake=12;banner(r.target[0]==='BALL'?'JP BALL CHANCE':'SEVEN RUSH','SP REACH',r.target[0]==='BALL'?'#ff6a80':'#ffd36b',true);}
  else if(r.rtype==='long')banner('LONG REACH','',EXP_COLORS[Math.max(1,r.exp)]);}
 if(r.rtype==='zen'&&r.t===r.stops[1]+14){say('全回転！！！ 777 確定！？','win');banner('全回転','ALL ROTATION','#ffd36b',true);WorldSound.fanfare();st.shake=20;}
 if(r.reach&&r.t>r.stops[1]&&r.t<r.stops[2]&&r.t%(r.rtype==='sp'?12:r.rtype==='long'?16:20)===0)WorldSound.heartbeat();
 // chance-up in the middle of a long / SP reach
 if((r.rtype==='long'||r.rtype==='sp')&&r.t===Math.floor((r.stops[1]+r.stops[2])/2)&&r.exp>=2&&!r.said.cu){r.said.cu=1;banner('CHANCE UP!','',EXP_COLORS[r.exp]);WorldSound.tease();}
 if(r.slip&&r.t===r.stops[2]+24){r.cur[2]=r.target[2];WorldSound.reelStop(2);st.shake=10;say('すべった！！','win');banner('SLIP!','','#7ff0ff');}
 if(r.revive){const t0=r.stops[2];
  if(r.t===t0+8)say('ハズレ……','');
  if(r.t>t0+50&&r.t<t0+86){if(r.t===t0+51){WorldSound.boom();st.shake=16;banner('復活!!','REVIVAL','#ff4a5a',true);}if(r.t%3===0)r.cur[2]=S.SYMBOLS[rnd(8)];}
  if(r.t===t0+86){r.cur[2]=r.target[2];WorldSound.reelStop(2);say('復活！！！','win');}}
 if(r.rtype==='zen'&&r.t===r.stops[2])r.cur=r.target.slice();
 if(r.t>=r.end)finishReel();
}
function finishReel(){
 const r=st.reel;st.shown=r.target.slice();st.reel=null;
 if(r.name==='MISS'){say(r.reach?'リーチ… おしい！':'ハズレ'+(st.kak?'（確変 残り'+st.kak+'回）':''),'');return;}
 st.flash=50;burst(W/2,150,r.name==='SEVEN'?90:30);
 if(r.name==='SEVEN'){st.feverLeft=S.FEVER_ROUNDS;st.feverTotal=0;st.kak=S.KAKUHEN_SPINS;st.sim.wall=S.WALL_FRAMES;st.shake=24;WorldSound.fanfare();say('★ 777 FEVER GAME 突入！！ 壁UP＆確変 ★','win');banner('777 FEVER','FEVER GAME 5 ROUNDS','#ffd36b',true);st.sevens=90;return;}
 if(r.name==='BALL'){portFlight(true);WorldSound.bonus();say('JPボール投入！ 手前に落とせ！','win');banner('JP BALL','フィールドに投入！','#ff6a80');return;}
 award(r.add,r.grant?'確変 WIN':'WIN');if(r.grant){st.kak=Math.min(30,st.kak+r.grant);banner('確変突入','KAKUHEN +'+r.grant,'#ff7ae0',true);}
 WorldSound.win(r.add>=10?4:r.add>=6?3:2);say(r.name+' そろい！ +'+r.add+'枚'+(r.grant?'  確変突入！（残り'+st.kak+'回）':''),'win');pop('+'+r.add,{fever:!!r.grant});
}
/* ---------- FEVER GAME ---------- */
function startFeverRound(){
 const round=S.FEVER_ROUNDS-st.feverLeft+1,pay=S.FEVER_PAYS[rnd(S.FEVER_PAYS.length)];st.feverLeft--;
 st.fever={round,pay,t:0,cur:st.shown.slice()};WorldSound.spin();say('FEVER GAME  ROUND '+round+' / '+S.FEVER_ROUNDS,'win');
}
function finishFeverRound(){
 const f=st.fever;st.fever=null;award(f.pay,'FEVER ROUND '+f.round);st.feverTotal+=f.pay;st.shown=['SEVEN','SEVEN','SEVEN'];burst(W/2,150,40);WorldSound.coinRush(16);WorldSound.win(4);pop('+'+f.pay,{fever:true});
 if(st.feverLeft<=0){setTimeout(()=>{if(!st)return;WorldSound.bigWin();say('FEVER 合計 +'+st.feverTotal+'枚！ 確変 '+st.kak+'回 つづく！','win');pop('TOTAL +'+st.feverTotal,{big:true});},500);}
}
/* ---------- JP lottery (2 stages) ---------- */
/* ---------- FEVER STAGE (physics bonus game, see feversim.js) ---------- */
const FS=FeverSim;
function startJP(){
 st.balls--;st.jpl=FS.create(Math.random);st.jpl.total=0;st.jpl.jpCount=0;st.jpl.glow=Array(FS.BUMPERS.length).fill(0);st.jpl.trail=[];st.jpl.intro=70;
 WorldSound.fanfare();st.shake=14;banner('FEVER STAGE','獲得メダルは終了時にまとめて払い出し！','#ffd36b',true);say('FEVER STAGE 突入！ バンパーに当てて WIN を増やせ','win');
}
function stepJP(){
 const j=st.jpl;if(j.intro>0){j.intro--;return;}
 FS.step(j,Math.random);
 for(let i=0;i<j.glow.length;i++)if(j.glow[i]>0)j.glow[i]--;
 if(j.ball&&!j.jpc){j.trail.push([j.ball.x,j.ball.y]);if(j.trail.length>10)j.trail.shift();}
 for(const e of j.events){
  if(e.type==='hit'){j.glow[e.i]=14;WorldSound.bumper(e.i);j.total+=e.pay;const m=FS.BUMPERS[e.i];j.popups=(j.popups||[]);j.popups.push({x:m.x,y:m.y-m.r-4,t:0,text:'+'+e.pay});}
  else if(e.type==='block'){WorldSound.crack();if(e.hp===0)say('OUTブロックが割れた… 残り '+j.blocks.filter(x=>x>0).length,'lose');}
  else if(e.type==='shield')WorldSound.shield();
  else if(e.type==='gate'){WorldSound.reach();banner('JPC OPEN','真ん中の穴をねらえ！','#ff6a80');say('JP CHANCE の穴が開いた！','win');}
  else if(e.type==='jpc'){WorldSound.boom();st.shake=16;banner('JP CHANCE','1st STAGE','#ff4a6a',true);say('JP CHANCE！！ UP に入れば JP STAGE へ…','win');}
  else if(e.type==='pocket'){const v=e.value;
   if(v==='JP'){const n=Math.floor(st.jp);st.jp=S.JP_BASE;j.jpCount++;j.total+=n;banner('JACKPOT','+'+yen(n)+' 枚  TOTAL '+yen(j.total),'#ff4a6a',true);st.shake=60;WorldSound.boom();WorldSound.fanfare();setTimeout(()=>{try{WorldSound.bigWin();}catch{}},1300);burst(W/2,440,160,'#ff6a80');burst(W/2,440,120);st.root.classList.add('pu-jackpot');setTimeout(()=>st&&st.root.classList.remove('pu-jackpot'),6000);say((j.jpCount>1?j.jpCount+'連続 ':'')+'JACKPOT!! '+yen(n)+'枚 — まだ FEVER STAGE は続く！','win');}
   else if(v==='BLOCK'){WorldSound.bonus();banner('BLOCK 回復','OUTブロックが全部もどった！','#7ff0ff');say('OUTブロック全回復！ まだまだ続く','win');}
   else if(v==='UP'){WorldSound.reach();st.shake=12;banner('UP!!','2nd STAGE — JP STAGE','#ff4a6a',true);say('UP！！ 2段目の JP STAGE へ！','win');}
   else{j.total+=v;banner('+'+yen(v),'TOTAL '+yen(j.total),'#ffd36b');pop('+'+v,{at:[W/2,330]});WorldSound.win(v>=100?4:3);}}
  else if(e.type==='skim'){if(e.value==='JP'){WorldSound.heartbeat();pop('JP!?',{small:true,at:[W/2,300]});}else if(e.value==='UP')WorldSound.tease();}
  else if(e.type==='pin'){const now=performance.now();if(now-(st.lastPin||0)>70){WorldSound.tick();st.lastPin=now;}}
  else if(e.type==='up'){say('JP STAGE！ JP の穴に入れ…！','win');}
  else if(e.type==='return'){say('FEVER STAGE 続行！ TOTAL '+yen(j.total),'win');}
  else if(e.type==='out'){const tot=j.total;st.jpl=null;st.flash=60;award(tot,j.jpCount?'JACKPOT':'FEVER STAGE');WorldSound.lose();setTimeout(()=>{try{WorldSound.win(tot>=200?5:3);}catch{}},400);
   banner('TOTAL '+yen(tot),j.jpCount?'JACKPOT ×'+j.jpCount:'FEVER STAGE 終了','#ffd36b',true);say('FEVER STAGE 終了  合計 '+yen(tot)+' 枚'+(j.jpCount?'（JP×'+j.jpCount+'）':''),'win');return;}
 }
 if(j.popups)for(let i=j.popups.length-1;i>=0;i--)if(++j.popups[i].t>30)j.popups.splice(i,1);
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
 for(let i=st.falling.length-1;i>=0;i--){const f=st.falling[i];f.t++;
  if(f.t===LAND_T)WorldSound.tick();
  // crossing the CHANCE hole on the ramp
  if(!f.checked&&f.t>=LAND_T+f.roll)f.checked=true;
  // down the rest of the ramp and onto the upper stage
  if(f.checked&&f.t>=LAND_T+f.roll+8){st.falling.splice(i,1);st.upper.coins.push({x:Math.max(S.R,Math.min(100-S.R,f.x+f.dx)),y:STAGE_BACK+S.R+.4+Math.random()*2,fresh:4});}}
 for(let i=st.sinks.length-1;i>=0;i--)if(++st.sinks[i].t>14)st.sinks.splice(i,1);
 // CHANCE hole: moves left and right, sometimes turning or changing speed, so you have to watch it
 
 // medals and balls flying out of the payout ports
 for(let i=st.flights.length-1;i>=0;i--){const f=st.flights[i];f.t++;if(f.t>=f.dur){if(f.ball){st.sim.coins.push({x:f.x1,y:Math.max(f.y1,st.sim.face+S.BALL_R+.5),ball:true,fresh:6});}else st.upper.coins.push({x:f.x1,y:STAGE_BACK+S.R+.4+Math.random()*Math.max(1,st.sim.face-STAGE_BACK-2*S.R),fresh:3});st.flights.splice(i,1);}}
 for(let i=st.dots.length-1;i>=0;i--){if(++st.dots[i].t>26)st.dots.splice(i,1);}
 if(st.shift>0)st.shift--;
 if(st.rain>0){const big=st.payout?st.payout.total:st.rain,n=big>=500?4:big>=150?3:big>=40?2:(st.frame%2===0?1:0);for(let k=0;k<n&&st.rain>0;k++){portFlight(false);st.rain--;if(st.payout&&st.payout.given<st.payout.total)st.payout.given++;}
  const now=performance.now();if(now-(st.lastCoinSnd||0)>48){WorldSound.coin();st.lastCoinSnd=now;}}
 if(st.payout){const pp=st.payout;pp.t++;if(pp.given>=pp.total){pp.done=(pp.done||0)+1;if(pp.done===1){WorldSound.win(pp.total>=300?5:pp.total>=100?4:3);if(pp.total>=100)WorldSound.bigWin();}if(pp.done>70)st.payout=null;}}
 const idle=!st.reel&&!st.fever&&!st.jpl&&!st.payout;
 if(idle){if(st.balls>0)startJP();else if(st.feverLeft>0)startFeverRound();else if(st.queue.length){startReel(st.queue.shift());}}
 if(st.reel)stepReel();
 if(st.banner&&++st.banner.t>(st.banner.big?120:80))st.banner=null;
 if(st.sevens>0)st.sevens--;
 if(st.fever){const f=st.fever;f.t++;for(let i=0;i<3;i++){if(f.t<FEVER_STOP[i]){if(f.t%2===0)f.cur[i]=S.SYMBOLS[rnd(S.SYMBOLS.length)];}else if(f.t===FEVER_STOP[i]){f.cur[i]='SEVEN';WorldSound.reelStop(i);}}if(f.t>=FEVER_STOP[2]+22)finishFeverRound();}
 if(st.jpl)stepJP();
 {const want=st.jpl?(st.jpl.jpc?'jpc':'fever'):(st.fever||st.feverLeft>0)?'fever':st.kak>0?'kakuhen':'normal';if(WorldSound.bgmName!==want)WorldSound.bgm(want);}
 const before=st.sim.coins.slice(),wall=st.sim.wall>0,face0=st.sim.face;const r=S.step(st.sim);
 {const xs=S.stepUpper(st.upper,st.sim.face,st.sim.face-face0,STAGE_BACK);for(const x of xs){st.sim.coins.push({x,y:st.sim.face+S.R+.6,fresh:10,fall:true});
   // CHANCE checkers on the upper-stage lip: a medal through a lit one turns it off and sets that side's flipper moving
   CC_X.forEach((cx,i)=>{const c=st.cc[i];if(c.lit&&Math.abs(x-cx)<CC_W){c.lit=false;c.t=FLIP_T;WorldSound.tease();const q=P(cx,st.sim.face,PUSHER_H);burst(q[0],q[1],14,'#ff7ae0');pop('CHANCE!',{small:true,at:[q[0],q[1]-14]});say((i?'右':'左')+'のフリッパーが動き出した！ START に入りやすい','win');}});}if(xs.length&&st.frame%3===0)WorldSound.tick();}
 for(const c of st.upper.coins)if(c.fresh)c.fresh--;
 for(const c of st.cc)if(!c.lit&&--c.t<=0)c.lit=true;
 if(r.balls){st.balls+=r.balls;pop('BALL IN!',{chance:true});WorldSound.bonus();}
 if(r.front||r.lost||r.balls){const alive=new Set(st.sim.coins);for(const c of before)if(!alive.has(c)){const out=!c.ball&&!wall&&(c.x<S.GUTTER||c.x>100-S.GUTTER);const o={x:c.x,y:100,z:0,vz:0,vy:.5,out,ball:c.ball,spin:Math.random()*6};
   // medals off the front roll down the payout slope; the round START checker sits in the middle, with a flipper each side
   // medals off the middle of the front edge slide down the payout apron (they are already paid)
   if(!out&&!c.ball&&S.feedApron(st.apron,c.x))continue;
   st.outs.push(o);}
  if(r.front){pending.won+=r.front;st.sessionOut+=r.front;st.lastAct=performance.now();st.outBurst=Math.min(40,st.outBurst+r.front*6);sync();const now=performance.now();if(now-st.lastTick>55){WorldSound.tick();st.lastTick=now;}if(pending.won>=MAX_WON()-80)settle();}}
 for(let i=st.outs.length-1;i>=0;i--){const o=st.outs[i];
  o.y+=o.vy;o.vz-=.5;o.z+=o.vz;if(o.z<-26)st.outs.splice(i,1);}
 {const ev=S.stepApron(st.apron,[!st.cc[0].lit,!st.cc[1].lit]);for(const sk of ev.sunk){st.apSink.push({u:sk.u,v:sk.v,t:0});st.sinks.push({x:50,t:0});checkerHit();}
  for(let i=st.apSink.length-1;i>=0;i--)if(++st.apSink[i].t>18)st.apSink.splice(i,1);
  // near miss: a medal skimming the cup rim
  for(const c of st.apron.coins){const d=Math.hypot(c.u-AP.HOLE.u,c.v-AP.HOLE.v);if(d<AP.HOLE.cup&&d>AP.HOLE.r&&!c.rim){c.rim=1;const q=apronP(c.u,c.v);if(d<AP.HOLE.r+1.6){pop('おしい！',{small:true,at:[q[0],q[1]-18]});WorldSound.tick();}}}
  if(st.flickAnim)st.flickAnim=null;}
 for(let i=st.pops.length-1;i>=0;i--){if(++st.pops[i].t>(st.pops[i].big?120:70))st.pops.splice(i,1);}
 for(let i=st.shower.length-1;i>=0;i--){const c=st.shower[i];c.y+=c.vy;c.x+=c.vx;c.vy+=.12;if(c.y>H+20)st.shower.splice(i,1);}
 for(let i=st.sparks.length-1;i>=0;i--){const s=st.sparks[i];s.t++;s.x+=s.vx;s.y+=s.vy;s.vy+=.18;s.vx*=.98;if(s.t>s.life)st.sparks.splice(i,1);}
}
/* ---------- drawing ---------- */
function rr(g,x,y,w,hh,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+hh,r);g.arcTo(x+w,y+hh,x,y+hh,r);g.arcTo(x,y+hh,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function quad(g,pts,fill,stroke){g.beginPath();pts.forEach((q,i)=>{const s=P(...q);i?g.lineTo(s[0],s[1]):g.moveTo(s[0],s[1]);});g.closePath();if(fill){g.fillStyle=fill;g.fill();}if(stroke){g.strokeStyle=stroke;g.stroke();}}
function coin3d(g,x,y,z,alpha){const u=unitAt(x,y),d=depthAt(x,y),w=S.R*2*u*1.06,hh=Math.max(w*.42,S.R*2*d*1.06)+w*.12,c=P(x,y,z);if(alpha!==undefined)g.globalAlpha=alpha;g.drawImage(st.coin,c[0]-w/2,c[1]-hh*.44,w,hh);if(alpha!==undefined)g.globalAlpha=1;}
function shadow(g,x,y,r,a){const c=P(x,y,0),u=unitAt(x,y),d=depthAt(x,y);g.fillStyle=`rgba(0,0,0,${a})`;g.beginPath();g.ellipse(c[0],c[1]+1,r*u,r*d,0,0,Math.PI*2);g.fill();}
function ball3d(g,x,y,z){shadow(g,x+1.2,y+1.2,S.BALL_R*1.05,.45);const u=unitAt(x,y),w=S.BALL_R*2*u*1.08,c=P(x,y,z+S.BALL_R);g.drawImage(st.ballImg,c[0]-w/2,c[1]-w/2,w,w);}
function drawLCD(g){
 const fever=!!(st.fever||st.feverLeft>0),kak=st.kak>0,live=!!(st.reel||st.fever||st.jpl||st.flash||st.rain);
 // JACKPOT counter
 let gr=g.createLinearGradient(0,6,0,56);gr.addColorStop(0,'#3a0a10');gr.addColorStop(1,'#14040a');g.fillStyle=gr;rr(g,60,6,W-120,50,12);g.fill();g.strokeStyle='#ffd36b';g.lineWidth=2.5;g.stroke();
 g.fillStyle='#ff9aa8';g.font='900 11px Arial,sans-serif';g.fillText('★  P R O G R E S S I V E   J A C K P O T  ★',W/2,21);
 g.fillStyle='#ffd36b';g.font='900 26px "Courier New",monospace';g.shadowColor='#ffb21e';g.shadowBlur=st.jpl?16:6;g.fillText(yen(Math.floor(st.jp))+' 枚',W/2,48);g.shadowBlur=0;
 // cabinet screen with a chrome bezel
 const L=16,T0=62,Wd=W-32,Ht=172;gr=g.createLinearGradient(0,T0,0,T0+Ht);gr.addColorStop(0,'#c8d2dc');gr.addColorStop(.5,'#5a6672');gr.addColorStop(1,'#2a323a');g.fillStyle=gr;rr(g,L,T0,Wd,Ht,18);g.fill();
 gr=g.createLinearGradient(0,T0+8,0,T0+Ht-8);
 if(fever){gr.addColorStop(0,'#6a3200');gr.addColorStop(1,'#2a1000');}else if(kak){gr.addColorStop(0,'#4a0c5a');gr.addColorStop(1,'#16051f');}else{gr.addColorStop(0,'#103a66');gr.addColorStop(1,'#06142a');}
 g.fillStyle=gr;rr(g,L+8,T0+8,Wd-16,Ht-16,12);g.fill();
 // slow rotating light rays behind the reels during big moments (no flashing)
 const R0=st.reel,hot=(R0&&(R0.rtype==='sp'||R0.rtype==='zen')&&R0.t>R0.stops[1])||fever,expc=R0&&R0.t>=-R0.pre?EXP_COLORS[R0.exp]:null;
 if(hot){g.save();rr(g,L+8,T0+8,Wd-16,Ht-16,12);g.clip();g.translate(W/2,T0+Ht/2);g.rotate(st.frame*0.01);for(let i=0;i<12;i++){g.rotate(Math.PI/6);g.fillStyle=fever?'#ffb21e22':'#ff3a5a22';g.beginPath();g.moveTo(0,0);g.lineTo(300,-40);g.lineTo(300,40);g.closePath();g.fill();}g.restore();}
 for(let i=0;i<26;i++){const x=L+18+i*((Wd-36)/25);for(const y of [T0+15,T0+Ht-15]){g.beginPath();g.arc(x,y,2.8,0,Math.PI*2);g.fillStyle=live?((i+(st.frame>>2))%4===0?'#ffffff':expc||(fever?'#ffb21e':kak?'#ff7ae0':'#7ff0ff')):'#2a3a4a';g.fill();}}
 g.fillStyle=fever?'#ffd36b':kak?'#ffb0f0':'#9fd8ff';g.font='italic 900 15px "Arial Black",sans-serif';
 g.fillText(fever?'FEVER GAME  '+(st.fever?st.fever.round:S.FEVER_ROUNDS-st.feverLeft)+' / '+S.FEVER_ROUNDS:kak?'確変中  残り '+st.kak+' 回':'NUMBER SLOT',W/2,T0+36);
 const cur=st.fever?st.fever.cur:st.reel?st.reel.cur:st.shown;
 for(let i=0;i<3;i++){const x=W/2-126+i*86,y=T0+46,w=80,hh=112;
  const r=st.reel,tease=r&&r.reach&&r.rtype!=='zen'&&i===2&&r.t>r.stops[1]&&r.t<r.stops[2];
  // reel drum: curved shading
  gr=g.createLinearGradient(0,y,0,y+hh);gr.addColorStop(0,tease?'#2a0010':'#8a8478');gr.addColorStop(.18,tease?'#5a0a1a':'#fbf7ee');gr.addColorStop(.82,tease?'#5a0a1a':'#fbf7ee');gr.addColorStop(1,tease?'#2a0010':'#8a8478');
  g.fillStyle=gr;rr(g,x,y,w,hh,8);g.fill();
  g.strokeStyle=tease?(r.hot?'#ff4a6a':'#ffd36b'):'#1a2430';g.lineWidth=tease?4:2;g.stroke();
  const RR=st.reel,zenNow=RR&&RR.rtype==='zen'&&RR.t>RR.stops[1]+14&&RR.t<RR.stops[2],spinning=(RR&&RR.t>=0&&(RR.t<RR.stops[i]||zenNow||(i===2&&RR.revive&&RR.t>RR.stops[2]+50&&RR.t<RR.stops[2]+86)))||(st.fever&&st.fever.t<FEVER_STOP[i]);
  g.save();rr(g,x,y,w,hh,8);g.clip();
  if(spinning){const off=(st.frame*(st.fever?16:11))%56,k=S.SYMBOLS.indexOf(cur[i]);g.globalAlpha=.85;for(let n=-1;n<=1;n++)drawSym(g,S.SYMBOLS[(k+n+8)%8],x+w/2,y+hh/2-off+28+n*56,46);g.globalAlpha=1;}
  else drawSym(g,cur[i],x+w/2,y+hh/2,58);
  g.restore();
  if(tease&&(r.rtype==='sp')){g.strokeStyle='#ffd36b';g.lineWidth=2;g.strokeRect(x-4,y-4,w+8,hh+8);}}
 g.font='800 10px Arial,sans-serif';g.fillStyle='#9fb6c8';g.fillText(kak?'確変':'MODE',48,T0+66);g.fillStyle=kak?'#ff7ae0':'#9fd8ff';g.font='900 13px Arial,sans-serif';g.fillText(kak?st.kak+'回':'通常',48,T0+86);
 if(!st.reel&&!st.fever&&!st.jpl&&!st.queue.length&&!st.feverLeft&&!st.rain&&!st.flights.length&&!st.flash&&performance.now()-st.lastAct>1500){g.fillStyle='#fff4d6';g.globalAlpha=.55+.35*Math.sin(st.frame*.06);g.font='900 13px Arial,sans-serif';g.fillText('▼ チェッカーをねらえ！',W/2,T0+Ht-22);g.globalAlpha=1;}
 g.fillStyle='#9fb6c8';g.fillText(st.sim.wall>0?'WALL UP':'BALL',W-48,T0+66);
 g.fillStyle=st.sim.wall>0?'#ffd36b':'#fff4d6';g.font='900 15px Arial,sans-serif';g.fillText(st.sim.wall>0?Math.ceil(st.sim.wall/60)+'s':String(st.sim.coins.filter(c=>c.ball).length+st.balls),W-48,T0+88);
 if(R0&&R0.reach&&R0.t>R0.stops[1]&&R0.t<R0.stops[2]){const lab={normal:'リーチ!',long:'ロングリーチ!!',sp:'SP リーチ!!!',zen:'全回転!!!'}[R0.rtype];g.fillStyle=R0.rtype==='normal'?'#ff8aa0':EXP_COLORS[Math.max(2,R0.exp)];g.font='italic 900 19px "Arial Black",sans-serif';g.lineWidth=4;g.strokeStyle='#000';g.strokeText(lab,W/2,T0+Ht-24);g.fillText(lab,W/2,T0+Ht-24);}
 // blackout pre-announcement
 if(R0&&R0.t<0&&R0.blackout){const k=Math.min(1,(R0.pre+R0.t)/14);g.fillStyle=`rgba(0,0,0,${.85*k})`;rr(g,L+8,T0+8,Wd-16,Ht-16,12);g.fill();g.fillStyle=EXP_COLORS[R0.exp];g.font='italic 900 44px "Arial Black",sans-serif';g.globalAlpha=k;g.fillText('!?',W/2,T0+Ht/2+14);g.globalAlpha=1;}
 else if(R0&&R0.t<0&&R0.exp>=1){g.fillStyle=EXP_COLORS[R0.exp];g.globalAlpha=.25;rr(g,L+8,T0+8,Wd-16,Ht-16,12);g.fill();g.globalAlpha=1;}
 // falling 7s when FEVER starts
 if(st.sevens>0){g.save();rr(g,L+8,T0+8,Wd-16,Ht-16,12);g.clip();for(let i=0;i<7;i++){const t=90-st.sevens,y=T0-40+((t*6+i*53)%(Ht+80)),x=L+40+i*((Wd-80)/6);drawSym(g,'SEVEN',x,y,30+(i%3)*8);}g.restore();}
 if(st.banner)drawBanner(g,L+8,T0+8,Wd-16,Ht-16);
 drawHolds(g);
 if(st.payout)drawPayout(g,L+8,T0+8,Wd-16,Ht-16);
}
function drawBanner(g,x,y,w,hh){
 const b=st.banner,life=b.big?120:80,inT=12,outT=life-14;let off=0;if(b.t<inT)off=(1-b.t/inT)*w;else if(b.t>outT)off=-(b.t-outT)/14*w;
 g.save();rr(g,x,y,w,hh,12);g.clip();
 const cy=y+hh/2,bh=b.big?74:48;g.fillStyle='#000c';g.fillRect(x,cy-bh/2-6,w,bh+12);
 const gr=g.createLinearGradient(x,0,x+w,0);gr.addColorStop(0,'#0000');gr.addColorStop(.2,b.color);gr.addColorStop(.8,b.color);gr.addColorStop(1,'#0000');g.fillStyle=gr;g.globalAlpha=.35;g.fillRect(x,cy-bh/2,w,bh);g.globalAlpha=1;
 g.translate(W/2+off,cy);g.transform(1,0,-.18,1,0,0);
 g.font=`italic 900 ${b.big?46:30}px "Arial Black",Impact,sans-serif`;g.lineWidth=8;g.strokeStyle='#000';g.strokeText(b.text,0,b.sub?4:12);g.fillStyle=b.color;g.fillText(b.text,0,b.sub?4:12);
 g.lineWidth=2;g.strokeStyle='#fff';g.strokeText(b.text,0,b.sub?4:12);
 if(b.sub){g.font='900 12px Arial,sans-serif';g.fillStyle='#fff';g.fillText(b.sub,0,bh/2-6);}
 g.restore();}
function drawPayout(g,x,y,w,hh){
 const pp=st.payout,k=Math.min(1,pp.t/10),done=pp.given>=pp.total,big=pp.total>=100;
 g.save();rr(g,x,y,w,hh,12);g.clip();g.globalAlpha=.88*k;g.fillStyle=big?'#1a0a00':'#04101c';g.fillRect(x,y,w,hh);g.globalAlpha=1;
 // rays
 g.save();g.translate(W/2,y+hh/2);g.rotate(st.frame*.012);for(let i=0;i<10;i++){g.rotate(Math.PI/5);g.fillStyle=big?'#ffb21e1c':'#7ff0ff16';g.beginPath();g.moveTo(0,0);g.lineTo(260,-36);g.lineTo(260,36);g.closePath();g.fill();}g.restore();
 g.fillStyle=pp.label==='JACKPOT'?'#ff8aa0':big?'#ffd36b':'#9fd8ff';g.font='italic 900 15px "Arial Black",sans-serif';g.fillText(pp.label||'WIN',W/2,y+28);
 const sc=done?1+Math.max(0,.25-((pp.done||0)/40)):1+Math.sin(st.frame*.4)*.03;
 g.save();g.translate(W/2,y+hh/2+16);g.scale(sc*k,sc*k);g.font='italic 900 56px "Arial Black",Impact,sans-serif';g.lineWidth=9;g.strokeStyle='#000';const t=yen(pp.given);g.strokeText(t,0,0);
 const gr=g.createLinearGradient(0,-40,0,10);gr.addColorStop(0,'#fff6c0');gr.addColorStop(.5,'#ffd36b');gr.addColorStop(1,'#c8801a');g.fillStyle=gr;g.fillText(t,0,0);g.restore();
 g.fillStyle='#fff4d6';g.font='900 13px Arial,sans-serif';g.fillText(done?'GET!!  '+yen(pp.total)+' 枚':'払い出し中… / '+yen(pp.total)+' 枚',W/2,y+hh-14);
 g.drawImage(st.coin,W/2-150,y+hh/2-6,40,26);g.drawImage(st.coin,W/2+110,y+hh/2-6,40,26);
 g.restore();}
function drawHolds(g){
 g.font='800 9px Arial,sans-serif';g.fillStyle='#9fb6c8';g.textAlign='right';g.fillText('保留',W/2-114,252);g.textAlign='center';
 const off=st.shift/12*32;
 for(let i=0;i<HOLD_MAX;i++){const [x,y]=holdPos(i);const q=st.queue[i],flying=st.dots.some(d=>d.slot===i);
  g.beginPath();g.arc(x+off,y,9,0,Math.PI*2);g.fillStyle='#0a1420';g.fill();g.strokeStyle='#3a4a5a';g.lineWidth=2;g.stroke();
  if(q&&!flying){const c=q.hold?EXP_COLORS[q.hold]:'#e8f4ff';const gr=g.createRadialGradient(x+off-3,y-3,1,x+off,y,10);gr.addColorStop(0,'#fff');gr.addColorStop(1,c);g.fillStyle=gr;g.beginPath();g.arc(x+off,y,7,0,Math.PI*2);g.fill();if(q.hold>=2){g.strokeStyle=c;g.lineWidth=2;g.beginPath();g.arc(x+off,y,12+Math.sin(st.frame*.15)*1.5,0,Math.PI*2);g.stroke();}}}
 for(const d of st.dots){const k=d.t/26,[x1,y1]=holdPos(d.slot),x=d.x0+(x1-d.x0)*k,y=d.y0+(y1-d.y0)*k-Math.sin(k*Math.PI)*60;g.fillStyle=d.color;g.shadowColor=d.color;g.shadowBlur=14;g.beginPath();g.arc(x,y,7,0,Math.PI*2);g.fill();g.shadowBlur=0;}
}
/* ---------- WebGL 3D field (falls back to the 2D sprites) ---------- */
const GOLD=[1,.72,.28],GOLD_K=[1,.62,.86],BALL_C=[.86,.08,.16];
function stackZ(list,thick){ // fake piles: a medal overlapping one listed earlier rests on it, tilted toward it
 const out=[];for(let i=0;i<list.length;i++){const a=list[i];let z=0,tx=0,ty=0;
  for(let j=Math.max(0,i-60);j<i;j++){const b=out[j];if(!b)continue;const dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy);if(d<S.R*1.7){const h=b.z+thick*(d<S.R*.9?1:.6);if(h>z){z=h;const k=(1-d/(S.R*1.7))*.35/(d||1);tx=-dy*k;ty=dx*k;}}}
  out.push({x:a.x,y:a.y,z:Math.min(z,thick*3),tilt:Math.hypot(tx,ty)*(z>0?1:0),spin:Math.atan2(ty,tx)});}return out;}
function coinItem(x,y,z,tilt,spin,col){return [x,y,z+.7,S.R,S.R,1.4,tilt||0,spin||0,0,...(col||GOLD)];}
function buildScene(){
 const sim=st.sim,face=sim.face,coins=[],balls=[],kak=st.kak>0,col=kak?GOLD_K:GOLD;
 const lower=sim.coins.filter(c=>!c.ball),hs=stackZ(lower,1.3);
 lower.forEach((c,i)=>{const z=c.fresh?(c.fall?c.fresh*1.1:c.fresh>16?(c.fresh-16)*2.4:c.fresh*.12):0,h=hs[i];coins.push(coinItem(c.x,c.y,z+(z>0?0:h.z),z>0?.4:h.tilt,z>0?c.x:h.spin,col));});
 const ups=st.upper.coins,hu=stackZ(ups,1.3);
 ups.forEach((c,i)=>{const z=PUSHER_H+.05+(c.fresh?c.fresh*1.5:0),h=hu[i];coins.push(coinItem(c.x,c.y,z+h.z,h.tilt,h.spin,col));});
 for(const c of sim.coins)if(c.ball)balls.push([c.x,c.y,(c.fresh?c.fresh*.6:0)+S.BALL_R,S.BALL_R,S.BALL_R,S.BALL_R,.25,c.x*.3,0,...BALL_C]);
 for(const f of st.falling){if(f.t<LAND_T){const k=f.t/LAND_T,y=RAIL_Y+(RAMP_TOP+1-RAIL_Y)*k,z=26*(1-k)+rampZ(RAMP_TOP+1)*k+Math.sin(k*Math.PI)*8;coins.push(coinItem(f.x,y,z,1.2*(1-k)+.3,f.t*.5,col));}
  else{const tot=f.roll+8,k=Math.min(1,(f.t-LAND_T)/Math.max(1,tot)),kh=Math.min(1,(f.t-LAND_T)/Math.max(1,f.roll)),x=f.x+f.dx*kh;
   const y=f.t-LAND_T<=f.roll?(RAMP_TOP+1)+(GATE_Y-RAMP_TOP-1)*kh:GATE_Y+(STAGE_BACK-GATE_Y)*Math.min(1,(f.t-LAND_T-f.roll)/8);coins.push(coinItem(x,y,rampZ(y)-.2+Math.abs(Math.sin(k*9))*.8,.6,Math.PI/2+Math.sin(k*9)*.2,col));}}
 for(const f of st.flights){const k=f.t/f.dur,x0=f.side?94:6,x=x0+(f.x1-x0)*k,y=BACK_Y+5+(f.y1-BACK_Y-5)*k,z=(WALL_H-4)*(1-k)+Math.sin(k*Math.PI)*(f.ball?10:14);
  if(f.ball)balls.push([x,y,Math.max(0,z-S.BALL_R)+S.BALL_R,S.BALL_R,S.BALL_R,S.BALL_R,f.t*.2,f.t*.1,0,...BALL_C]);else coins.push(coinItem(x,y,z,f.t*.35,f.t*.2,col));}
 const shadows=[];const sh=(x,y,z,r)=>shadows.push([x+.8,y+1,z+.06,r,r,.01,0,0,0,0,0,0]);
 for(const c of coins){if(c[8])continue;const fz=c[1]<STAGE_BACK?rampZ(c[1]):c[1]<face?PUSHER_H+.05:0;if(c[2]-fz<20)sh(c[0],c[1],fz,S.R*(1.25+(c[2]-fz)*.03));}
 for(const b of balls)if(b[1]>face)sh(b[0],b[1],0,S.BALL_R*1.3);
 // payout apron: medals sliding on the slanted panel, the ones dropping into START, and the flippers
 const flips=[];
 for(const c of st.apron.coins){const p=apronPos(c.u,c.v,.75);coins.push([...p,S.R,S.R,1.4,0,c.id||0,AP_TILT,...col]);}
 for(const k of st.apSink){const q=k.t/18,p=apronPos(k.u+(AP.HOLE.u-k.u)*Math.min(1,q*2),k.v+(AP.HOLE.v-k.v)*Math.min(1,q*2),.75-q*.6),sc=S.R*(1-q*.7);coins.push([...p,sc,sc,1.4,0,0,AP_TILT,col[0]*(1-q*.7),col[1]*(1-q*.7),col[2]*(1-q*.7)]);}
 for(let i=0;i<2;i++){const f=AP.FLIP[i],th=st.apron.ang[i],dir=i?-1:1,on=!st.cc[i].lit;flips.push([...apronPos(f.u,f.v,0),f.len,AP.FLIP_W*2,2.6,0,Math.atan2(Math.sin(th),dir*Math.cos(th)),AP_TILT,...(on?[1,.62,.9]:[.86,.9,.95])]);
  coins.push([...apronPos(f.u,f.v,2.9),2.1,2.1,.9,0,0,AP_TILT,1,.78,.3]);}
 const apron={flips,panel:[...apronPos(0,0,-1.2),100,AP.L,1.2,0,0,AP_TILT,.2,.07,.32],info:[AP.U0,AP.U1-AP.U0,AP.L,AP.HOLE.u,AP.HOLE.v,AP.HOLE.cup,HOLE_VIS,st.gateFlash>0?1:0]};
 return {t:st.frame,coins,balls,shadows,face,apron,fever:!!(st.fever||st.feverLeft>0),kak,wall:sim.wall>0,backY:BACK_Y,stageBack:STAGE_BACK,rampTop:RAMP_TOP,rampZ0:rampZ(STAGE_BACK),rampZ1:rampZ(RAMP_TOP),pusherH:PUSHER_H,wallH:WALL_H,gutter:S.GUTTER};
}
function ensureGL(){if(st.gl!==undefined)return st.gl;let r=null;try{if(typeof Pusher3D!=="undefined"&&!/[?&]gl=0/.test(location.search))r=Pusher3D.create(W,H,CAM);}catch(e){console.warn(e);r=null;}
 if(r){r.canvas.className='pu-canvas pu-gl';r.canvas.setAttribute('aria-hidden','true');st.cv.parentNode.insertBefore(r.canvas,st.cv);}return st.gl=r;}
function drawField(g){
 const gl=ensureGL();if(gl)gl.render(buildScene());
 const sim=st.sim,fever=!!(st.fever||st.feverLeft>0),kak=st.kak>0,live=!!(st.reel||st.fever||st.jpl||st.flash||st.rain),face=sim.face;
 // back wall
 if(!gl){quad(g,[[0,BACK_Y,0],[100,BACK_Y,0],[100,BACK_Y,WALL_H+8],[0,BACK_Y,WALL_H+8]],'#0c1826');
 const bwA=P(0,BACK_Y,WALL_H+8),bwB=P(100,BACK_Y,WALL_H+8),bwC=P(0,BACK_Y,0);
 const gr=g.createLinearGradient(0,bwA[1],0,bwC[1]);gr.addColorStop(0,fever?'#5a3008':kak?'#3a0a4a':'#123050');gr.addColorStop(1,'#060c14');g.fillStyle=gr;
 g.beginPath();g.moveTo(bwA[0],bwA[1]);g.lineTo(bwB[0],bwB[1]);const bwD=P(100,BACK_Y,0);g.lineTo(bwD[0],bwD[1]);g.lineTo(bwC[0],bwC[1]);g.closePath();g.fill();}
 let gr;
 g.fillStyle='#d9b56a88';g.font='italic 900 11px Georgia,serif';const bl=P(50,BACK_Y,WALL_H+4);g.fillText('FORTUNE PUSHER',bl[0],bl[1]);
 // chute rail with the aim marker
 const ra=P(4,RAIL_Y,26),rb=P(96,RAIL_Y,26);g.strokeStyle='#c8d2dc';g.lineWidth=4;g.beginPath();g.moveTo(ra[0],ra[1]);g.lineTo(rb[0],rb[1]);g.stroke();
 {const pv=P(st.aim,RAIL_Y-3,34),base=P(st.aim,RAIL_Y,26);g.strokeStyle='#c8d2dc';g.lineWidth=4;g.beginPath();g.moveTo(...base);g.lineTo(pv[0]+(st.aim-50)*.25,pv[1]);g.stroke();g.fillStyle='#ff4a5a';g.beginPath();g.arc(pv[0]+(st.aim-50)*.25,pv[1],6,0,Math.PI*2);g.fill();}
 const am=P(st.aim,RAIL_Y,26);g.fillStyle='#ffd36b';g.beginPath();g.moveTo(am[0],am[1]+14);g.lineTo(am[0]-9,am[1]+2);g.lineTo(am[0]+9,am[1]+2);g.closePath();g.fill();
 // field floor
 if(!gl){gr=g.createLinearGradient(0,P(50,BACK_Y)[1],0,P(50,100)[1]);gr.addColorStop(0,fever?'#4a3010':'#123a5a');gr.addColorStop(1,fever?'#8a6020':'#2f74a0');
 quad(g,[[0,BACK_Y,0],[100,BACK_Y,0],[100,100,0],[0,100,0]],gr);
 g.strokeStyle='#ffffff12';g.lineWidth=1;for(let x=10;x<100;x+=10){const a=P(x,face,0),b=P(x,100,0);g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.stroke();}
 // spotlight
 const sp=P(50,55);gr=g.createRadialGradient(sp[0],sp[1],10,sp[0],sp[1],230);gr.addColorStop(0,'#ffffff26');gr.addColorStop(1,'#ffffff00');g.fillStyle=gr;quad(g,[[0,face,0],[100,face,0],[100,100,0],[0,100,0]],gr);
 for(const [a,b] of [[0,S.GUTTER],[100-S.GUTTER,100]])quad(g,[[a,86,0],[b,86,0],[b,100,0],[a,100,0]],sim.wall>0?'#ffd36b40':'#a01a2a66');}
 g.fillStyle=sim.wall>0?'#ffe7a0':'#ffb0b8';g.font='800 10px Arial,sans-serif';for(const x of [S.GUTTER/2,100-S.GUTTER/2]){const q=P(x,94);g.fillText(sim.wall>0?'WALL':'OUT',q[0],q[1]+4);}
 // pusher block (3D box)
 if(!gl){gr=g.createLinearGradient(0,P(50,STAGE_BACK,PUSHER_H)[1],0,P(50,face,PUSHER_H)[1]);gr.addColorStop(0,'#5a6a7a');gr.addColorStop(1,'#c2cfd8');
 quad(g,[[0,STAGE_BACK,PUSHER_H],[100,STAGE_BACK,PUSHER_H],[100,face,PUSHER_H],[0,face,PUSHER_H]],gr);
 }
 g.fillStyle='#ffffff55';g.font='900 9px Arial,sans-serif';{const q=P(50,(STAGE_BACK+face)/2,PUSHER_H);g.fillText('UPPER STAGE',q[0],q[1]+3);}
 // launch ramp (fixed) whose lower edge holds the medals on the upper stage
 if(!gl){gr=g.createLinearGradient(0,P(50,RAMP_TOP,rampZ(RAMP_TOP))[1],0,P(50,STAGE_BACK,rampZ(STAGE_BACK))[1]);gr.addColorStop(0,'#24384c');gr.addColorStop(1,'#3a5268');
 quad(g,[[0,RAMP_TOP,rampZ(RAMP_TOP)],[100,RAMP_TOP,rampZ(RAMP_TOP)],[100,STAGE_BACK,rampZ(STAGE_BACK)],[0,STAGE_BACK,rampZ(STAGE_BACK)]],gr,'#7a8a9a');
 {const e0=P(0,STAGE_BACK,rampZ(STAGE_BACK)),e1=P(100,STAGE_BACK,rampZ(STAGE_BACK));g.strokeStyle='#c8d2dc';g.lineWidth=2.5;g.beginPath();g.moveTo(...e0);g.lineTo(...e1);g.stroke();}
 // upper-stage medals
 for(const c of st.upper.coins.slice().sort((a,b)=>a.y-b.y))coin3d(g,c.x,c.y,PUSHER_H+.3+(c.fresh?c.fresh*1.5:0));
 const fA=P(0,face,PUSHER_H),fB=P(0,face,0);gr=g.createLinearGradient(0,fA[1],0,fB[1]);gr.addColorStop(0,'#e8eef4');gr.addColorStop(.3,'#8a98a6');gr.addColorStop(1,'#2a343e');
 quad(g,[[0,face,PUSHER_H],[100,face,PUSHER_H],[100,face,0],[0,face,0]],gr);
 const lip=[P(0,face,PUSHER_H),P(100,face,PUSHER_H)];g.strokeStyle='#ffd36b';g.lineWidth=2;g.beginPath();g.moveTo(...lip[0]);g.lineTo(...lip[1]);g.stroke();}
 // payout ports (upper corners of the back wall)
 for(const side of [0,1]){const x=side?94:6,glow=st.portGlow>0&&st.portSide===side;quad(g,[[x-6,BACK_Y,WALL_H-2],[x+6,BACK_Y,WALL_H-2],[x+6,BACK_Y+5,WALL_H-2],[x-6,BACK_Y+5,WALL_H-2]],'#8a98a6','#d2dde6');
  const m=P(x,BACK_Y+5,WALL_H-4),u=unitAt(x,BACK_Y+5);g.fillStyle=glow?'#ffd36b':'#05080c';g.beginPath();g.ellipse(m[0],m[1],5*u,2.2*u,0,0,Math.PI*2);g.fill();if(glow){g.shadowColor='#ffb21e';g.shadowBlur=18;g.fill();g.shadowBlur=0;}}
 if(st.portGlow>0)st.portGlow--;
 // CHANCE checkers on the front lip of the upper stage
 CC_X.forEach((cx,i)=>{const c=st.cc[i],q=P(cx,face,PUSHER_H),u=unitAt(cx,face);g.fillStyle='#05080c';g.fillRect(q[0]-CC_W*u,q[1]-3,CC_W*2*u,6);
  g.fillStyle=c.lit?'#ff7ae0':'#3a2a40';if(c.lit){g.shadowColor='#ff7ae0';g.shadowBlur=12;}g.beginPath();g.arc(q[0],q[1]-9,4.5,0,Math.PI*2);g.fill();g.shadowBlur=0;
  g.fillStyle=c.lit?'#ffd0f4':'#8a7a90';g.font='900 8px Arial,sans-serif';g.fillText(c.lit?'CHANCE':Math.ceil(c.t/60)+'s',q[0],q[1]-16);});
 // pieces back to front (shadows first for balls)
 if(!gl){const pieces=sim.coins.slice().sort((a,b)=>a.y-b.y);
 for(const c of pieces){if(c.ball)ball3d(g,c.x,c.y,c.fresh?c.fresh*.6:0);else{const z=c.fresh?(c.fall?c.fresh*1.1:c.fresh>16?(c.fresh-16)*2.4:c.fresh*.12):0;if(z>1)shadow(g,c.x,c.y,S.R*.9,.25);coin3d(g,c.x,c.y,z);}}}
 for(const c of sim.coins)if(c.ball&&c.y>84){const q=P(c.x,c.y,S.BALL_R*2.6);g.strokeStyle=st.frame%16<8?'#ff4a6a':'#ffd36b';g.lineWidth=3;g.beginPath();g.arc(q[0],q[1]+16,20,0,Math.PI*2);g.stroke();g.fillStyle='#fff';g.font='900 11px Arial,sans-serif';g.fillText('あと少し！',q[0],q[1]-10);}
 // medals in the air from the chute
 if(!gl){for(const f of st.falling){if(f.t<LAND_T){const k=f.t/LAND_T,y=RAIL_Y+(RAMP_TOP+1-RAIL_Y)*k,z=26*(1-k)+rampZ(RAMP_TOP+1)*k+Math.sin(k*Math.PI)*8;coin3d(g,f.x,y,z);}
  else{const tot=f.roll+8,k=Math.min(1,(f.t-LAND_T)/Math.max(1,tot)),kh=Math.min(1,(f.t-LAND_T)/Math.max(1,f.roll)),x=f.x+f.dx*kh;
   // reaches the hole line after f.roll frames, then the stage edge 8 frames later
   const y=f.t-LAND_T<=f.roll?(RAMP_TOP+1)+(GATE_Y-RAMP_TOP-1)*kh:GATE_Y+(STAGE_BACK-GATE_Y)*Math.min(1,(f.t-LAND_T-f.roll)/8);coin3d(g,x,y,rampZ(y)+Math.abs(Math.sin(k*9))*.8);}}
 for(const f of st.flights){const k=f.t/f.dur,x0=f.side?94:6,x=x0+(f.x1-x0)*k,y=BACK_Y+5+(f.y1-BACK_Y-5)*k,z=(WALL_H-4)*(1-k)+Math.sin(k*Math.PI)*(f.ball?10:14);if(f.ball)ball3d(g,x,y,Math.max(0,z-S.BALL_R));else coin3d(g,x,y,z);}}
 // front lip, FEVER walls, side walls (acrylic) with lamps
 if(!gl){const e0=P(0,100,0),e1=P(100,100,0);g.strokeStyle='#ffd36b';g.lineWidth=3;g.beginPath();g.moveTo(...e0);g.lineTo(...e1);g.stroke();
 if(sim.wall>0)for(const x of [S.GUTTER,100-S.GUTTER])quad(g,[[x,84,0],[x,100,0],[x,100,7],[x,84,7]],'#ffd36bcc','#fff4d6');}
 for(const x of [0,100]){if(!gl)quad(g,[[x,BACK_Y,0],[x,100,0],[x,100,WALL_H],[x,BACK_Y,WALL_H]],'#9fd8ff14','#9fd8ff55');
  for(let i=0;i<12;i++){const y=BACK_Y+(100-BACK_Y)*i/11,q=P(x,y,WALL_H);g.beginPath();g.arc(q[0],q[1],3.2,0,Math.PI*2);g.fillStyle=live?((i+(st.frame>>2))%3===0?'#fff':fever?'#ffb21e':kak?'#ff7ae0':'#7ff0ff'):'#24384a';g.fill();}}
 // tray below the payout apron
 {const bl=apronP(-4,AP.L),br=apronP(104,AP.L),tl=gl?bl:P(-2,101,-4),tr=gl?br:P(102,101,-4);gr=g.createLinearGradient(0,tl[1],0,H);gr.addColorStop(0,'#2a1a08');gr.addColorStop(1,'#0a0604');g.fillStyle=gr;
  g.beginPath();g.moveTo(...tl);g.lineTo(...tr);g.lineTo(tr[0]+(gl?0:6),H);g.lineTo(tl[0]-(gl?0:6),H);g.closePath();g.fill();}
 if(!gl){ // 2D fallback of the apron
  const c4=[apronP(AP.U0,0),apronP(AP.U1,0),apronP(AP.U1,AP.L),apronP(AP.U0,AP.L)];g.fillStyle='#2a0c40';g.beginPath();c4.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.closePath();g.fill();g.strokeStyle='#d9b56a';g.lineWidth=2;g.stroke();
  const [hx,hy]=startPos(),sc=Math.abs(apronP(51,AP.HOLE.v)[0]-hx);g.fillStyle='#d9a83a';g.beginPath();g.ellipse(hx,hy,AP.HOLE.cup*sc,AP.HOLE.cup*sc*.9,0,0,Math.PI*2);g.fill();g.fillStyle='#000';g.beginPath();g.ellipse(hx,hy,HOLE_VIS*sc,HOLE_VIS*sc*.9,0,0,Math.PI*2);g.fill();
  for(let i=0;i<2;i++){const [x0,y0,x1,y1]=S.flipSeg(st.apron,i),a0=apronP(x0,y0,1),a1=apronP(x1,y1,1);g.strokeStyle=st.cc[i].lit?'#b8c4d0':'#ffb0e8';g.lineWidth=7;g.lineCap='round';g.beginPath();g.moveTo(...a0);g.lineTo(...a1);g.stroke();g.lineCap='butt';}
  for(const c of st.apron.coins){const q=apronP(c.u,c.v,.7),w=S.R*2*sc;g.drawImage(st.coin,q[0]-w/2,q[1]-w*.48,w,w*.96);}}
 // labels over the apron
 {const [cx,cy]=startPos(),sc=Math.abs(apronP(51,AP.HOLE.v)[0]-cx),lit=st.gateFlash>0;if(st.gateFlash>0)st.gateFlash--;
  g.fillStyle=lit?'#ffffff':'#ffd36b';g.font='italic 900 13px "Arial Black",sans-serif';g.lineWidth=4;g.strokeStyle='#2a0a10';const ty=cy-AP.HOLE.cup*sc-8;g.strokeText('START',cx,ty);g.fillText('START',cx,ty);
  if(lit){g.strokeStyle='#ffffff';g.shadowColor='#7ff0ff';g.shadowBlur=22;g.lineWidth=3;g.beginPath();g.ellipse(cx,cy,(AP.HOLE.cup+.6)*sc,(AP.HOLE.cup+.6)*sc*.92,0,0,Math.PI*2);g.stroke();g.shadowBlur=0;}
  for(const sk of st.sinks){const k=sk.t/14;g.globalAlpha=Math.max(0,1-k);g.strokeStyle='#7ff0ff';g.lineWidth=3;g.beginPath();g.ellipse(cx,cy,AP.HOLE.cup*sc*(1+k),AP.HOLE.cup*sc*.92*(1+k),0,0,Math.PI*2);g.stroke();g.globalAlpha=1;}
  for(let i=0;i<2;i++){const on=!st.cc[i].lit,f=AP.FLIP[i],q=apronP(f.u+(i?-6:6),f.v+AP.FLIP[i].len*.9,0);if(on){g.fillStyle='#ffb0e8';g.font='900 9px Arial,sans-serif';g.fillText('FLIPPER ON',q[0],q[1]);}}
  const idle=!st.queue.length&&!st.reel&&performance.now()-st.lastAct>1500;if(idle){g.fillStyle='#fff';g.globalAlpha=.6+.4*Math.sin(st.frame*.12);g.font='900 11px Arial,sans-serif';g.fillText('坂を滑るメダルが START の穴に落ちたら抽選！',cx,apronP(50,AP.L)[1]+16);g.globalAlpha=1;}}
 const pile=Math.min(40,Math.sqrt(st.sessionOut)*2);if(pile>1){const cx=W/2,by=H-6;g.fillStyle='#c8901e';g.beginPath();g.ellipse(cx,by,Math.min(140,40+pile*2.6),pile,0,Math.PI,0);g.fill();for(let i=0;i<Math.min(36,pile*1.2);i++){const a=((i*137.5)%180)*Math.PI/180,rr2=(i%6)/6;g.drawImage(st.coin,cx+Math.cos(a)*(36+pile*2.4)*rr2-9,by-Math.sin(a)*pile*rr2-6,18,12);}}
 g.fillStyle=st.outBurst?'#fff4d6':'#d9b56a';g.font=`700 ${12+Math.min(8,st.outBurst/5)}px Georgia,serif`;g.fillText('PAYOUT  '+yen(st.sessionOut),W/2,H-10);
 for(const o of st.outs){if(o.ball)ball3d(g,o.x,o.y,o.z);else coin3d(g,o.x,o.y,o.z,o.out?.5:1);}
}
function drawJP(g){
 const j=st.jpl,top=262,bot=H-6,sc=Math.min((W-60)/FS.W,(bot-top-56)/FS.H),ox=W/2-FS.W*sc/2,oy=top+50,X=x=>ox+x*sc,Y=y=>oy+y*sc;
 const k=Math.min(1,(70-(j.intro||0))/20+.0001);g.globalAlpha=Math.min(1,k*1.3);
 g.fillStyle='#02050ae8';g.fillRect(0,top-6,W,H-top+6);
 // HUD: WIN and JPC progress
 g.fillStyle='#ffd36b';g.font='italic 900 13px "Arial Black",sans-serif';g.textAlign='left';g.fillText('FEVER STAGE',ox,top+14);g.textAlign='right';g.fillStyle='#fff4d6';g.font='900 12px Arial,sans-serif';g.fillText(j.jpCount?'JP ×'+j.jpCount:'',ox+FS.W*sc,top+14);g.textAlign='center';
 g.font='italic 900 30px "Arial Black",Impact,sans-serif';g.lineWidth=6;g.strokeStyle='#000';const wt='TOTAL '+yen(j.total);g.strokeText(wt,W/2,top+40);g.fillStyle='#fff1a0';g.fillText(wt,W/2,top+40);
 const prog=j.gateOpen?1:Math.min(1,(j.win-j.gateFrom)/FS.GATE_WIN);g.fillStyle='#1a2430';g.fillRect(ox,top+46,FS.W*sc,6);g.fillStyle=j.gateOpen?'#ff4a6a':'#7ff0ff';g.fillRect(ox,top+46,FS.W*sc*prog,6);
 // frame
 g.strokeStyle='#d9b56a';g.lineWidth=3;g.strokeRect(X(0),Y(0),FS.W*sc,FS.H*sc);
 const gr=g.createLinearGradient(0,Y(0),0,Y(FS.H));gr.addColorStop(0,'#0c1a3a');gr.addColorStop(1,'#120618');g.fillStyle=gr;g.fillRect(X(0),Y(0),FS.W*sc,FS.H*sc);
 if(j.jpc){drawDish(g,j,X(50),Y(70),Math.min(FS.W*sc,FS.H*sc*.9)/2-8);}
 else{
  // JPC hole
  const H0=FS.HOLE,open=j.gateOpen;g.beginPath();g.arc(X(H0.x),Y(H0.y),H0.r*sc,0,Math.PI*2);g.fillStyle=open?'#000':'#0a0f18';g.fill();g.lineWidth=3;g.strokeStyle=open?(st.frame%20<10?'#ff4a6a':'#ffd36b'):'#3a4a5a';g.stroke();
  g.fillStyle=open?'#ff8aa0':'#4a5a6a';g.font='900 10px Arial,sans-serif';g.fillText(open?'JPC':'LOCK',X(H0.x),Y(H0.y)+4);
  // bumpers
  FS.BUMPERS.forEach((m,i)=>{const lit=j.glow[i]>0,cx=X(m.x),cy=Y(m.y),r=m.r*sc;const rg=g.createRadialGradient(cx-r*.3,cy-r*.3,1,cx,cy,r);rg.addColorStop(0,lit?'#ffffff':'#ffe08a');rg.addColorStop(.6,lit?'#ffd36b':'#d08a10');rg.addColorStop(1,'#5a3006');
   if(lit){g.shadowColor='#ffd36b';g.shadowBlur=24;}g.fillStyle=rg;g.beginPath();g.arc(cx,cy,r*(lit?1.12:1),0,Math.PI*2);g.fill();g.shadowBlur=0;g.strokeStyle=lit?'#fff':'#ffd36b';g.lineWidth=2;g.stroke();
   g.fillStyle='#3a1a00';g.font=`900 ${Math.round(r*.7)}px Arial,sans-serif`;g.fillText(m.pay,cx,cy+r*.25);});
  // OUT blocks and shield
  const bw=FS.W/FS.BLOCKS;for(let i=0;i<FS.BLOCKS;i++){const hp=j.blocks[i],x=X(i*bw)+2,y=Y(FS.BLOCK_Y),w=bw*sc-4,hh=(FS.H-FS.BLOCK_Y)*sc*.55;
   if(hp>0){g.fillStyle=hp>=FS.BLOCK_HP?'#3a8ad8':'#d07a2a';g.fillRect(x,y,w,hh);g.strokeStyle='#cfe8ff';g.lineWidth=1.5;g.strokeRect(x,y,w,hh);if(hp<FS.BLOCK_HP){g.strokeStyle='#3a1a00';g.beginPath();g.moveTo(x+w*.3,y);g.lineTo(x+w*.5,y+hh*.6);g.lineTo(x+w*.7,y+hh);g.stroke();}}
   else{g.fillStyle='#3a0610';g.fillRect(x,y,w,hh);g.fillStyle='#ff6a7a';g.font='900 9px Arial,sans-serif';g.fillText('OUT',x+w/2,y+hh*.75);}}
  if(j.shield>0){g.fillStyle='#7ff0ff55';g.fillRect(X(0),Y(FS.BLOCK_Y)-4,FS.W*sc,4);g.fillStyle='#7ff0ff';g.font='900 10px Arial,sans-serif';g.fillText('SAFE '+Math.ceil(j.shield/60)+'s',W/2,Y(FS.BLOCK_Y)-8);}
  // ball with trail
  j.trail.forEach((p2,i)=>{g.globalAlpha=(i+1)/j.trail.length*.35;g.fillStyle='#ffd36b';g.beginPath();g.arc(X(p2[0]),Y(p2[1]),FS.BALL_R*sc*.8,0,Math.PI*2);g.fill();});g.globalAlpha=Math.min(1,k*1.3);
  if(j.ball){const s2=FS.BALL_R*2*sc*1.15;g.drawImage(st.ballImg,X(j.ball.x)-s2/2,Y(j.ball.y)-s2/2,s2,s2);}
  if(j.popups)for(const pp of j.popups){g.globalAlpha=1-pp.t/30;g.fillStyle='#fff1a0';g.font='900 14px "Arial Black",sans-serif';g.fillText(pp.text,X(pp.x),Y(pp.y)-pp.t*.6);}g.globalAlpha=1;
 }
 g.globalAlpha=1;
}
function drawDish(g,j,cx,cy,R){
 const d=j.jpc,D=FS.DISHES[d.stage],k=R/D.R,X=v=>cx+v*k,Y=v=>cy+v*k*.82,stage2=d.stage===1;
 // bowl with a rim (slightly tilted for depth)
 for(let t=10;t>0;t-=2){g.fillStyle=t>2?'#3a1420':stage2?'#ff4a6a':'#ffd36b';g.beginPath();g.ellipse(cx,cy+t,R+10,(R+10)*.82,0,0,Math.PI*2);g.fill();}
 const gr=g.createRadialGradient(cx,cy,R*.1,cx,cy,R);gr.addColorStop(0,stage2?'#5a0a1a':'#0a2a4a');gr.addColorStop(.7,stage2?'#2a0610':'#061a30');gr.addColorStop(1,'#000');
 g.fillStyle=gr;g.beginPath();g.ellipse(cx,cy,R,R*.82,0,0,Math.PI*2);g.fill();
 // rim lamps
 for(let i=0;i<28;i++){const a=i*Math.PI*2/28;g.fillStyle=(i+(st.frame>>2))%4===0?'#fff':stage2?'#ff4a6a':'#ffd36b';g.beginPath();g.arc(cx+Math.cos(a)*(R+6),cy+Math.sin(a)*(R+6)*.82,2.4,0,Math.PI*2);g.fill();}
 // centre dome
 const dg=g.createRadialGradient(cx-6,cy-6,2,cx,cy,11*k);dg.addColorStop(0,'#fff6d0');dg.addColorStop(1,stage2?'#8a1020':'#8a6010');g.fillStyle=dg;g.beginPath();g.ellipse(cx,cy,11*k,11*k*.82,0,0,Math.PI*2);g.fill();
 // holes (rotating ring)
 D.holes.forEach((v,i)=>{const [hx,hy]=FS.holePos(D,d,i),x=X(hx),y=Y(hy),hr=4.3*k,isJ=v==='JP',isU=v==='UP';
  g.fillStyle='#000';g.beginPath();g.ellipse(x,y,hr,hr*.82,0,0,Math.PI*2);g.fill();
  g.strokeStyle=isJ?(st.frame%20<10?'#ff4a6a':'#fff1c4'):isU?'#c08aff':v==='BLOCK'?'#7ff0ff':'#ffd36b';g.lineWidth=isJ?3.5:2;if(isJ){g.shadowColor='#ff4a6a';g.shadowBlur=14;}g.stroke();g.shadowBlur=0;
  if(d.pocket===i&&st.frame%14<9){g.strokeStyle='#fff';g.lineWidth=4;g.beginPath();g.ellipse(x,y,hr+4,(hr+4)*.82,0,0,Math.PI*2);g.stroke();}
  const lx=X(hx*1.42),ly=Y(hy*1.42);g.fillStyle=isJ?'#fff1c4':isU?'#e0c8ff':v==='BLOCK'?'#bff8ff':'#ffd36b';g.font=`900 ${isJ?14:11}px "Arial Black",Arial,sans-serif`;g.fillText(isJ?'JP':isU?'UP':v==='BLOCK'?'BLOCK':'+'+v,lx,ly+4);});
 // pins
 for(let i=0;i<D.pins;i++){const [px,py]=FS.pinPos(D,i);g.fillStyle='#e0e8f0';g.beginPath();g.arc(X(px),Y(py),2.6,0,Math.PI*2);g.fill();}
 // ball with shadow
 const bx=X(d.x),by=Y(d.y),s2=FS.BALL_R*2*k*1.2;g.fillStyle='#0008';g.beginPath();g.ellipse(bx+2,by+4,s2*.45,s2*.2,0,0,Math.PI*2);g.fill();
 const sink=d.pocket!==null?Math.min(1,d.done/20):0;g.globalAlpha=1-sink*.6;g.drawImage(st.ballImg,bx-s2/2*(1-sink*.4),by-s2*.8*(1-sink*.4),s2*(1-sink*.4),s2*(1-sink*.4));g.globalAlpha=1;
 g.fillStyle=stage2?'#ff8aa0':'#9fd8ff';g.font='italic 900 17px "Arial Black",sans-serif';g.fillText(stage2?'JP STAGE':'JP CHANCE  1st STAGE',cx,cy-R*.82-18);
 g.fillStyle='#fff4d6';g.font='900 14px "Courier New",monospace';g.fillText('JACKPOT '+yen(Math.floor(st.jp))+'枚',cx,cy+R*.82+28);
}
function draw(){
 const g=st.g;g.save();g.clearRect(0,0,W,H);g.textAlign='center';g.textBaseline='alphabetic';
 let sdx=0,sdy=0;if(st.shake){const k=st.shake/10;sdx=(Math.random()-.5)*6*k;sdy=(Math.random()-.5)*6*k;g.translate(sdx,sdy);}
 const fever=!!(st.fever||st.feverLeft>0),kak=st.kak>0;
 const top=fever?'#2a1406':kak?'#1e0a2a':'#0a1622';
 if(ensureGL()){ // the WebGL layer sits behind this canvas: paint the backdrop on it and mirror the shake
  const el=st.gl.canvas,bg=`linear-gradient(${top},#030609)`;if(el.dataset.bg!==bg){el.style.background=bg;el.dataset.bg=bg;}
  const tf=st.shake?`translate(${(sdx/W*100).toFixed(2)}%,${(sdy/H*100).toFixed(2)}%)`:'';if(el.style.transform!==tf)el.style.transform=tf;}
 else{const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,top);gr.addColorStop(1,'#030609');g.fillStyle=gr;g.fillRect(-10,-10,W+20,H+20);}
 drawLCD(g);drawField(g);if(st.jpl)drawJP(g);
 for(const c of st.shower)g.drawImage(st.coin,c.x-c.s/2,c.y-c.s*.33,c.s,c.s*.66);
 for(const s of st.sparks){g.globalAlpha=Math.max(0,1-s.t/s.life);g.fillStyle=s.c;g.fillRect(s.x-2,s.y-2,4,4);}g.globalAlpha=1;
 st.pops.forEach((pp,i)=>{const life=pp.big?120:70,k=pp.t/life,sc=pp.t<10?0.6+pp.t/10*0.6:1.2-Math.min(.2,(pp.t-10)/50);g.globalAlpha=Math.min(1,(1-k)*1.8);
  g.save();const y=(pp.at?pp.at[1]:420)-k*30-(pp.at?0:i*44);g.translate(pp.at?pp.at[0]:W/2,y);g.scale(sc,sc);g.fillStyle=pp.jp?'#ff4a6a':pp.fever?'#ffd36b':pp.chance?'#7ff0ff':'#fff1a0';g.font=`italic 900 ${pp.big?50:pp.small?16:pp.chance?(pp.at?20:28):36}px "Arial Black",Impact,sans-serif`;g.lineWidth=7;g.strokeStyle='#000b';g.strokeText(pp.text,0,0);g.fillText(pp.text,0,0);g.restore();g.globalAlpha=1;});
 g.restore();
}
function close(){if(!st)return;WorldSound.bgm(null);if(st.gl)st.gl.dispose();cancelAnimationFrame(st.raf);clearInterval(st.timer);if(st.hold)clearInterval(st.hold);
 // everything already won is resolved now and poured onto the field, so nothing paid for is lost
 for(const f of st.falling)st.upper.coins.push({x:Math.max(S.R,Math.min(100-S.R,f.x+f.dx)),y:STAGE_BACK+S.R+.5});
 for(const f of st.flights)if(!f.ball){st.upper.coins.push({x:f.x1,y:STAGE_BACK+S.R+.5});f.done=true;}
 st.flights=st.flights.filter(f=>!f.done);
 for(const f of st.flights)st.sim.coins.push(f.ball?{x:f.x1,y:Math.max(f.y1,st.sim.face+S.BALL_R+.5),ball:true}:{x:f.x1,y:Math.max(f.y1,st.sim.face+S.R+.5)});
 let rain=st.rain;
 const stage2=pocket=>{const v=S.STAGE2[pocket];if(v==='JP'){const n=Math.floor(st.jp);st.jp=S.JP_BASE;return n;}return v;};
 const jpRun=()=>{const v=S.STAGE1[rnd(S.STAGE1.length)];if(v==='BALL'){S.addBall(st.sim);return 0;}if(v==='UP')return stage2(rnd(S.STAGE2.length));return v;};
 const jpVal=()=>{const n=Math.floor(st.jp);st.jp=S.JP_BASE;return n;};
 if(st.jpl){const j=st.jpl;rain+=j.total;let g=0;while(!j.over&&g++<60*400){FS.step(j,Math.random);for(const e of j.events){if(e.type==='hit')rain+=e.pay;if(e.type==='pocket'){if(e.value==='JP')rain+=jpVal();else if(typeof e.value==='number')rain+=e.value;}}}}
 for(let i=0;i<st.balls;i++)rain+=FS.simulate(Math.random,jpVal).total;
 const feverPay=()=>{let t=0;for(let i=0;i<S.FEVER_ROUNDS;i++)t+=S.FEVER_PAYS[rnd(S.FEVER_PAYS.length)];return t;};
 const apply=(name,add,grant)=>{if(name==='BALL')S.addBall(st.sim);else if(name==='SEVEN'){st.kak=S.KAKUHEN_SPINS;rain+=feverPay();}else{rain+=add;if(grant)st.kak=Math.min(30,st.kak+grant);}};
 if(st.fever)rain+=st.fever.pay;
 for(let i=0;i<st.feverLeft;i++)rain+=S.FEVER_PAYS[rnd(S.FEVER_PAYS.length)];
 if(st.reel)apply(st.reel.name,st.reel.add,st.reel.grant);
 for(const q of st.queue){if(q.kak&&st.kak>0)st.kak--;apply(q.name,q.add,q.grant);}
 S.scatter(st.sim,Math.min(rain,420));save();st=null;
 if(pending.spent+pending.won>0)settle();else{walletHold=false;renderProfile();}}
window.addEventListener('pagehide',()=>{if(st)save();});
return {open,close};
})();
