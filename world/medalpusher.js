'use strict';
/* STICK ROYALE — COIN PUSHER "FORTUNE PUSHER" (medal corner). 1 medal = 1 SC.
   The field (pushersim.js) runs in the browser and is kept per browser together with the progressive JP;
   medals in and out are settled in batches by core.js ('pusher'). */
const WorldPusher=(()=>{
const S=PusherSim,W=480,H=696,FIELD_TOP=252,FIELD_BOTTOM=604,FRONT_HALF=206,BACK_SCALE=.64;
const STORE='stick-royale-pusher-v1',SETTLE_IDLE=2500,SETTLE_SPENT=200,SETTLE_WON=2000;
const REEL_STOP=[46,70,94],REACH_EXTRA=70,BALL_FRAMES=210;
let st=null,pending={spent:0,won:0},settling=null,storeKey=STORE;
function h(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
const yen=n=>Number(n||0).toLocaleString('ja-JP');
function meter(label){const m=h('div','egm-meter');const v=h('b',undefined,'0');m.append(h('small',undefined,label),v);return [m,v];}
const scaleAt=y=>BACK_SCALE+(1-BACK_SCALE)*Math.max(0,Math.min(110,y))/100;
const sy=y=>FIELD_TOP+(FIELD_BOTTOM-FIELD_TOP)*y/100;
const sx=(x,y)=>W/2+(x-50)*FRONT_HALF/50*scaleAt(y);
const credit=()=>p.cash-pending.spent+pending.won;
const MAX_SPENT=()=>WorldCore.PU_MAX_SPENT,MAX_WON=()=>WorldCore.PU_MAX_WON;

/* ---------- persistence & settlement ---------- */
function keyFor(){return STORE+':'+(mode==='local'?'local':(user?.uid||'guest'));}
function load(){storeKey=keyFor();try{const v=JSON.parse(localStorage.getItem(storeKey)||'null');if(v&&Array.isArray(v.coins)){const coins=v.coins.filter(c=>Array.isArray(c)&&Number.isFinite(c[0])&&Number.isFinite(c[1])).slice(0,400).map(([x,y])=>({x,y}));const pd=v.pending||{};
 return {coins,jp:Number.isFinite(v.jp)?Math.max(S.JP_BASE,Math.min(5000,v.jp)):S.JP_BASE,pending:{spent:Math.max(0,Math.min(MAX_SPENT(),pd.spent|0)),won:Math.max(0,Math.min(MAX_WON(),pd.won|0))}};}}catch{}return null;}
function save(){if(!st)return;try{localStorage.setItem(storeKey,JSON.stringify({coins:st.sim.coins.map(c=>[Math.round(c.x*10)/10,Math.round(c.y*10)/10]),jp:Math.round(st.jp*100)/100,pending}));}catch{}}
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
function drawSym(g,sym,x,y,s){g.save();g.translate(x,y);g.scale(s/40,s/40);g.textAlign='center';g.textBaseline='middle';
 if(sym==='SEVEN'){g.font='italic 900 40px "Arial Black",Impact,sans-serif';g.lineWidth=5;g.strokeStyle='#ffd36b';g.strokeText('7',0,2);const gr=g.createLinearGradient(0,-18,0,18);gr.addColorStop(0,'#ff7a7a');gr.addColorStop(1,'#b0101e');g.fillStyle=gr;g.fillText('7',0,2);}
 else if(sym==='BAR'){g.fillStyle='#14101a';g.strokeStyle='#ffd36b';g.lineWidth=2.5;g.beginPath();g.moveTo(-16,-11);g.arcTo(20,-11,20,11,4);g.arcTo(20,11,-20,11,4);g.arcTo(-20,11,-20,-11,4);g.arcTo(-20,-11,20,-11,4);g.closePath();g.fill();g.stroke();g.fillStyle='#ffd36b';g.font='900 14px "Arial Black",sans-serif';g.fillText('BAR',0,1);}
 else if(sym==='CHERRY'){g.strokeStyle='#2f8a3a';g.lineWidth=3;g.beginPath();g.moveTo(-8,6);g.quadraticCurveTo(-4,-12,6,-16);g.moveTo(9,8);g.quadraticCurveTo(8,-6,6,-16);g.stroke();for(const [cx,cy] of [[-9,9],[9,10]]){const gr=g.createRadialGradient(cx-3,cy-3,1,cx,cy,9);gr.addColorStop(0,'#ff9a9a');gr.addColorStop(1,'#c0102a');g.fillStyle=gr;g.beginPath();g.arc(cx,cy,8.5,0,Math.PI*2);g.fill();}}
 else if(sym==='BELL'){const gr=g.createLinearGradient(-14,-16,14,16);gr.addColorStop(0,'#fff1a0');gr.addColorStop(1,'#d08a10');g.fillStyle=gr;g.beginPath();g.moveTo(0,-17);g.bezierCurveTo(12,-17,12,-2,15,10);g.lineTo(-15,10);g.bezierCurveTo(-12,-2,-12,-17,0,-17);g.fill();g.fillStyle='#8a5a0c';g.fillRect(-16,9,32,4);g.beginPath();g.arc(0,15,4,0,Math.PI*2);g.fill();}
 else if(sym==='BALL'){const gr=g.createRadialGradient(-5,-6,2,0,0,16);gr.addColorStop(0,'#ffffff');gr.addColorStop(.5,'#b9c6d6');gr.addColorStop(1,'#4a5a70');g.fillStyle=gr;g.beginPath();g.arc(0,0,15,0,Math.PI*2);g.fill();g.fillStyle='#c8192e';g.font='900 10px Arial,sans-serif';g.fillText('JP',0,1);}
 g.restore();}
const SYM_NAME={CHERRY:'チェリー',BELL:'ベル',BAR:'BAR',BALL:'JPボール',SEVEN:'7'};

/* ---------- UI ---------- */
function open(body){
 const root=h('div','egm egm-pusher');
 const top=h('div','egm-topper');top.append(h('small',undefined,'STICK ROYALE MEDAL CORNER'),h('b','egm-title','FORTUNE PUSHER'),h('span','egm-sub','CHECKER → スロット抽選 → JACKPOT'));
 const screen=h('div','egm-screen pu-screen');const cv=h('canvas','pu-canvas');cv.width=W;cv.height=H;cv.setAttribute('aria-label','コインプッシャーのフィールド。タップした位置にメダルを落とします');cv.setAttribute('role','img');
 const side=h('div','pu-side');
 const how=h('div','pu-how');how.append(h('b',undefined,'あそびかた'),h('p',undefined,'タップした位置（または ◀▶ と DROP）でメダル投入。プッシャーに押されて手前から落ちたメダルが払い出し。左右の端は OUT。'),h('p',undefined,'メダルが中央の CHECKER に入るとスロット抽選（最大9個までストック）。'));
 const table=h('div','pu-table');
 const row=(syms,text,cls)=>{const r=h('span',cls);const icons=h('i','pu-syms');for(const s of syms){const c=document.createElement('canvas');c.width=c.height=44;drawSym(c.getContext('2d'),s,22,22,34);icons.append(c);}r.append(icons,h('b',undefined,text));table.append(r);};
 row(['BALL','BALL','BALL'],'JPルーレットへ！','jp');row(['SEVEN','SEVEN','SEVEN'],'FEVER +30枚・壁が上がる');row(['BAR','BAR','BAR'],'+20枚');row(['BELL','BELL','BELL'],'+10枚');row(['CHERRY','CHERRY','CHERRY'],'+5枚');
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
 if(saved)pending=saved.pending;
 st={root,cv,g:cv.getContext('2d'),coin:coinSprite(),sim,msgBar,vCredit,vIn,vOut,drop,cash,aim:50,falling:[],outs:[],pops:[],stock:0,reel:null,ball:null,rain:0,jp:saved?.jp??S.JP_BASE,
  shown:['SEVEN','BAR','BELL'],sessionIn:0,sessionOut:0,hold:null,last:performance.now(),acc:0,lastAct:performance.now(),lastSave:0,lastTick:0,raf:0,timer:0,flash:0,frame:0};
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
 const chance=random(10000)<S.CHANCE_RATE*10000;
 st.falling.push({x:st.aim+(Math.random()-.5)*1.2,t:0,chance});WorldSound.coin();sync();
}
/* ---------- lottery ---------- */
function startReel(){
 const idx=S.lottery(random(S.lotteryTotal)),name=S.LOTTERY[idx][0];
 let target;
 if(name==='MISS'){const pick=()=>S.SYMBOLS[random(S.SYMBOLS.length)];
  if(random(100)<35){const a=pick();let c;do{c=pick();}while(c===a);target=[a,a,c];}// a reach that misses
  else{do{target=[pick(),pick(),pick()];}while(target[0]===target[1]);}}
 else target=[name,name,name];
 const reach=target[0]===target[1];
 st.reel={idx,name,target,t:0,stops:[REEL_STOP[0],REEL_STOP[1],REEL_STOP[2]+(reach?REACH_EXTRA:0)],reach,reachSaid:false,cur:st.shown.slice()};
 WorldSound.spin();say('CHECKER！ スロット抽選','');
}
function finishReel(){
 const r=st.reel;st.shown=r.target.slice();st.reel=null;const add=S.LOTTERY[r.idx][1];
 if(r.name==='MISS'){say(r.reach?'リーチ… おしい！':'ハズレ','');return;}
 st.flash=50;
 if(r.name==='BALL'){WorldSound.bonus();say('JPボール！ JPルーレットへ','win');st.ball={t:0,pocket:random(S.POCKETS.length),spin:Math.random()*Math.PI*2};return;}
 st.rain+=add;
 if(r.name==='SEVEN'){st.sim.wall=S.WALL_FRAMES;WorldSound.bigWin();say('FEVER!! +30枚 ＆ 左右の壁が上がった！','win');st.pops.push({text:'FEVER!',t:0,big:true});}
 else{WorldSound.win(r.name==='BAR'?4:r.name==='BELL'?3:2);say(SYM_NAME[r.name]+'そろい！ メダル +'+add+'枚','win');st.pops.push({text:'+'+add,t:0});}
}
function finishBall(){
 const pk=S.POCKETS[st.ball.pocket];st.ball=null;st.flash=70;
 if(pk==='JP'){const v=Math.floor(st.jp);st.jp=S.JP_BASE;st.rain+=v;WorldSound.bigWin();setTimeout(()=>{try{WorldSound.bigWin();}catch{}},1400);st.root.classList.add('pu-jackpot');setTimeout(()=>st&&st.root.classList.remove('pu-jackpot'),5000);say('JACKPOT!!! メダル '+yen(v)+'枚 が降ってくる！','win');st.pops.push({text:'JACKPOT',t:0,big:true,jp:true});}
 else{st.rain+=pk;WorldSound.win(pk>=30?4:pk>=20?3:2);say('JPルーレット +'+pk+'枚','win');st.pops.push({text:'+'+pk,t:0});}
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
 st.frame++;if(st.flash>0)st.flash--;
 for(let i=st.falling.length-1;i>=0;i--){const f=st.falling[i];f.t++;if(f.t>=18){if(f.chance){st.stock=Math.min(9,st.stock+1);st.pops.push({text:'CHECK!',t:0,chance:true});WorldSound.tease();}else S.drop(st.sim,f.x);st.falling.splice(i,1);}}
 if(st.rain>0&&st.sim.t%2===0){S.scatter(st.sim,1);st.rain--;}
 if(!st.reel&&!st.ball&&st.stock>0){st.stock--;startReel();}
 if(st.reel){const r=st.reel;r.t++;
  for(let i=0;i<3;i++){if(r.t<r.stops[i]){if(r.t%3===0)r.cur[i]=S.SYMBOLS[random(S.SYMBOLS.length)];}else if(r.t===r.stops[i]){r.cur[i]=r.target[i];WorldSound.reelStop(i);}}
  if(r.reach&&!r.reachSaid&&r.t===r.stops[1]){r.reachSaid=true;say('リーチ！！','win');WorldSound.tease();}
  if(r.reach&&r.t>r.stops[1]&&r.t<r.stops[2]&&r.t%18===0)WorldSound.tick();
  if(r.t>=r.stops[2]+16)finishReel();}
 if(st.ball){st.ball.t++;if(st.ball.t%10===0&&st.ball.t<BALL_FRAMES-30)WorldSound.tick();if(st.ball.t>=BALL_FRAMES+40)finishBall();}
 const before=st.sim.coins.slice(),wall=st.sim.wall>0;const r=S.step(st.sim);
 if(r.front||r.lost){const alive=new Set(st.sim.coins);for(const c of before)if(!alive.has(c)){const out=!wall&&(c.x<S.GUTTER||c.x>100-S.GUTTER);st.outs.push({x:c.x,y:100,vy:1.2,out});}
  if(r.front){pending.won+=r.front;st.sessionOut+=r.front;st.lastAct=performance.now();sync();const now=performance.now();if(now-st.lastTick>55){WorldSound.tick();st.lastTick=now;}if(pending.won>=MAX_WON()-80)settle();}}
 for(let i=st.outs.length-1;i>=0;i--){const o=st.outs[i];o.y+=o.vy;o.vy+=.35;if(o.y>124)st.outs.splice(i,1);}
 for(let i=st.pops.length-1;i>=0;i--){if(++st.pops[i].t>(st.pops[i].big?110:70))st.pops.splice(i,1);}
}
function coinAt(g,x,y,lift){const s=scaleAt(y),w=S.R*2*FRONT_HALF/50*s*1.04,hh=w*.61;g.drawImage(st.coin,sx(x,y)-w/2,sy(y)-hh*.45-(lift||0),w,hh);}
function roundRect(g,x,y,w,hh,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+hh,r);g.arcTo(x+w,y+hh,x,y+hh,r);g.arcTo(x,y+hh,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function draw(){
 const g=st.g,sim=st.sim;g.clearRect(0,0,W,H);g.textAlign='center';g.textBaseline='alphabetic';
 let gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#0b1a2a');gr.addColorStop(1,'#050b12');g.fillStyle=gr;g.fillRect(0,0,W,H);
 const live=!!(st.reel||st.ball||st.flash);
 // --- top: JACKPOT counter
 g.fillStyle='#1a0608';roundRect(g,60,10,W-120,46,10);g.fill();g.strokeStyle='#ffd36b';g.lineWidth=2;g.stroke();
 g.fillStyle='#ffb0b0';g.font='800 11px Arial,sans-serif';g.fillText('J A C K P O T',W/2,25);
 g.fillStyle='#ffd36b';g.font='900 22px "Courier New",monospace';g.fillText(yen(Math.floor(st.jp))+' 枚',W/2,49);
 // --- slot display with lamps (lamps light up only while something is happening)
 g.fillStyle='#10263c';roundRect(g,30,64,W-60,128,14);g.fill();g.strokeStyle='#d9b56a';g.lineWidth=2;g.stroke();
 for(let i=0;i<22;i++){const x=44+i*((W-88)/21);for(const y of [70,186]){g.beginPath();g.arc(x,y,3,0,Math.PI*2);g.fillStyle=live?((i+(st.frame>>3))%3===0?'#fff4d6':'#ffb21e'):'#3a4a5a';g.fill();}}
 const cur=st.reel?st.reel.cur:st.shown;
 for(let i=0;i<3;i++){const x=W/2-118+i*82;const tease=st.reel&&st.reel.reach&&i===2&&st.reel.t>st.reel.stops[1]&&st.reel.t<st.reel.stops[2];
  g.fillStyle=tease?'#3a0a12':'#f4efe4';roundRect(g,x,80,72,92,8);g.fill();g.strokeStyle=tease?'#ff4a6a':'#5a7a90';g.lineWidth=tease?3:1.5;g.stroke();
  const spinning=st.reel&&st.reel.t<st.reel.stops[i];
  if(spinning){g.save();g.beginPath();g.rect(x,80,72,92);g.clip();const off=(st.frame*9)%46;drawSym(g,cur[i],x+36,126-off+23,40);drawSym(g,S.SYMBOLS[(S.SYMBOLS.indexOf(cur[i])+1)%5],x+36,126-off-23,40);g.restore();}
  else drawSym(g,cur[i],x+36,126,46);}
 g.font='700 10px Arial,sans-serif';g.fillStyle='#9fb6c8';g.fillText('STOCK',W/2-170,104);
 for(let i=0;i<9;i++){g.beginPath();g.arc(W/2-186+(i%3)*16,120+Math.floor(i/3)*14,4.5,0,Math.PI*2);g.fillStyle=i<st.stock?'#7ff0ff':'#1d3346';g.fill();}
 g.fillStyle='#9fb6c8';g.fillText(sim.wall>0?'FEVER':'IN / OUT',W/2+170,104);g.fillStyle=sim.wall>0?'#ffd36b':'#fff4d6';g.font='900 13px Arial,sans-serif';g.fillText(sim.wall>0?Math.ceil(sim.wall/60)+'秒':st.sessionIn+'/'+st.sessionOut,W/2+170,124);
 if(st.reel&&st.reel.reach&&st.reel.t>st.reel.stops[1]){g.fillStyle='#ff4a6a';g.font='italic 900 16px "Arial Black",sans-serif';g.fillText('リーチ！',W/2+170,160);}
 // --- field
 const bl=sx(0,-8),br=sx(100,-8),fl=sx(0,100),fr=sx(100,100),yb=sy(-8),yf=sy(100);
 gr=g.createLinearGradient(0,yb,0,yf);gr.addColorStop(0,'#173a56');gr.addColorStop(1,'#2a6286');g.fillStyle=gr;g.beginPath();g.moveTo(bl,yb);g.lineTo(br,yb);g.lineTo(fr,yf);g.lineTo(fl,yf);g.closePath();g.fill();
 g.strokeStyle='#ffffff10';g.lineWidth=1;for(let y=0;y<=100;y+=10){g.beginPath();g.moveTo(sx(0,y),sy(y));g.lineTo(sx(100,y),sy(y));g.stroke();}
 for(const [a,b] of [[0,S.GUTTER],[100-S.GUTTER,100]]){g.fillStyle=sim.wall>0?'#ffd36b33':'#8a1a2a55';g.beginPath();g.moveTo(sx(a,86),sy(86));g.lineTo(sx(b,86),sy(86));g.lineTo(sx(b,100),sy(100));g.lineTo(sx(a,100),sy(100));g.closePath();g.fill();}
 g.fillStyle=sim.wall>0?'#ffe7a0':'#ffb0b8';g.font='800 10px Arial,sans-serif';const lab=sim.wall>0?'WALL':'OUT';g.fillText(lab,sx(S.GUTTER/2,95),sy(95)+4);g.fillText(lab,sx(100-S.GUTTER/2,95),sy(95)+4);
 // chute rail, aim, CHECKER pocket on the pusher
 const ry=sy(-14);g.strokeStyle='#9fb6c8';g.lineWidth=4;g.beginPath();g.moveTo(sx(4,-14),ry);g.lineTo(sx(96,-14),ry);g.stroke();
 const ax=sx(st.aim,-14);g.fillStyle='#ffd36b';g.beginPath();g.moveTo(ax,ry+16);g.lineTo(ax-9,ry+3);g.lineTo(ax+9,ry+3);g.closePath();g.fill();
 const face=sim.face;gr=g.createLinearGradient(0,sy(-8),0,sy(face));gr.addColorStop(0,'#5d6f80');gr.addColorStop(1,'#a9bccb');g.fillStyle=gr;g.beginPath();g.moveTo(bl,yb);g.lineTo(br,yb);g.lineTo(sx(100,face),sy(face));g.lineTo(sx(0,face),sy(face));g.closePath();g.fill();
 g.fillStyle='#3a4856';g.fillRect(sx(0,face),sy(face),sx(100,face)-sx(0,face),12);g.fillStyle='#d9b56a';g.fillRect(sx(0,face),sy(face),sx(100,face)-sx(0,face),2);
 const cy=(sy(-8)+sy(face))/2,cw=58,lit=st.flash||st.reel;g.fillStyle=lit?'#ffd36b':'#1a2a38';roundRect(g,W/2-cw/2,cy-10,cw,20,6);g.fill();g.strokeStyle='#ffd36b';g.lineWidth=1.5;g.stroke();g.fillStyle=lit?'#3a2000':'#ffd36b';g.font='900 10px Arial,sans-serif';g.fillText('CHECKER',W/2,cy+4);
 // coins
 const coins=sim.coins.slice().sort((a,b)=>a.y-b.y);for(const c of coins)coinAt(g,c.x,c.y,c.fresh?c.fresh*.8:0);
 for(const f of st.falling){const k=f.t/18;if(f.chance){const x=f.x+(50-f.x)*k,y=-14+((face-8)/2+8+14)*k*.9;coinAt(g,x,y,(1-k)*26);}else{const y=-14+(S.FACE_MAX*.6+14)*k;coinAt(g,f.x,y,(1-k)*30);}}
 // front lip, FEVER walls, side walls
 g.fillStyle='#d9b56a';g.fillRect(fl,yf,fr-fl,3);
 if(sim.wall>0){g.fillStyle='#ffd36bcc';for(const x of [S.GUTTER,100-S.GUTTER]){const X=sx(x,100);g.fillRect(X-3,sy(84),6,yf-sy(84)+3);}}
 g.fillStyle='#0a1622';g.beginPath();g.moveTo(0,yb);g.lineTo(bl,yb);g.lineTo(fl,yf);g.lineTo(0,yf);g.closePath();g.fill();g.beginPath();g.moveTo(W,yb);g.lineTo(br,yb);g.lineTo(fr,yf);g.lineTo(W,yf);g.closePath();g.fill();
 g.strokeStyle=sim.wall>0?'#ffd36b':'#9fd8ff40';g.lineWidth=2;g.beginPath();g.moveTo(bl,yb);g.lineTo(fl,yf);g.moveTo(br,yb);g.lineTo(fr,yf);g.stroke();
 // tray
 gr=g.createLinearGradient(0,yf,0,H);gr.addColorStop(0,'#1a1208');gr.addColorStop(1,'#0a0704');g.fillStyle=gr;g.fillRect(fl-6,yf+4,fr-fl+12,H-yf-4);
 if(!(sim.wall>0)){g.fillStyle='#5a0f1a';g.fillRect(fl-6,yf+4,sx(S.GUTTER,100)-fl+6,H-yf-4);g.fillRect(sx(100-S.GUTTER,100),yf+4,fr-sx(100-S.GUTTER,100)+6,H-yf-4);}
 g.fillStyle='#d9b56a';g.font='700 12px Georgia,serif';g.fillText('PAYOUT',W/2,H-22);
 for(const o of st.outs){g.globalAlpha=o.out?.55:1;coinAt(g,o.x,Math.min(o.y,100),-(o.y-100)*3.4);g.globalAlpha=1;}
 if(st.ball)drawBall(g);
 st.pops.forEach((pp,i)=>{const life=pp.big?110:70,k=pp.t/life;g.globalAlpha=Math.min(1,(1-k)*1.6);g.fillStyle=pp.jp?'#ff4a6a':pp.chance?'#7ff0ff':'#ffd36b';g.font=`900 ${pp.big?46:pp.chance?24:32}px "Arial Black",Impact,sans-serif`;g.lineWidth=5;g.strokeStyle='#000a';const y=sy(42)-k*36-i*30;g.strokeText(pp.text,W/2,y);g.fillText(pp.text,W/2,y);g.globalAlpha=1;});
}
function drawBall(g){
 const b=st.ball,n=S.POCKETS.length,cx=W/2,cy=sy(46),R=128,A=Math.PI*2/n;
 g.globalAlpha=Math.min(1,b.t/16);
 g.fillStyle="#050b12f2";g.beginPath();g.arc(cx,cy,R+22,0,Math.PI*2);g.fill();
 g.strokeStyle='#ffd36b';g.lineWidth=4;g.beginPath();g.arc(cx,cy,R+18,0,Math.PI*2);g.stroke();
 for(let i=0;i<n;i++){const a0=-Math.PI/2+i*A-A/2,a1=a0+A,pk=S.POCKETS[i];g.beginPath();g.arc(cx,cy,R+14,a0,a1);g.arc(cx,cy,R-34,a1,a0,true);g.closePath();g.fillStyle=pk==='JP'?'#c8192e':i%2?'#173a56':'#10263c';g.fill();g.strokeStyle='#d9b56a';g.lineWidth=1.5;g.stroke();
  const am=a0+A/2;g.fillStyle=pk==='JP'?'#fff1c4':'#ffd36b';g.font='900 21px "Arial Black",sans-serif';g.fillText(pk==='JP'?'JP':'+'+pk,cx+Math.cos(am)*(R-10),cy+Math.sin(am)*(R-10)+7);}
 g.fillStyle='#ffd36b';g.font='900 14px Arial,sans-serif';g.fillText('JP ROULETTE',cx,cy-6);g.fillStyle='#fff4d6';g.font='900 18px "Courier New",monospace';g.fillText(yen(Math.floor(st.jp))+'枚',cx,cy+18);
 // the ball spins fast and slows down into its pocket
 const k=Math.min(1,b.t/BALL_FRAMES),target=-Math.PI/2+b.pocket*A,start=b.spin;
 const total=5*Math.PI*2+((target-start)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
 const ang=start+total*(1-Math.pow(1-k,3)),rr=R+2-(k>0.85?(k-.85)/.15*14:0);
 const bx=cx+Math.cos(ang)*rr,by=cy+Math.sin(ang)*rr;const grd=g.createRadialGradient(bx-3,by-3,1,bx,by,9);grd.addColorStop(0,'#fff');grd.addColorStop(1,'#7a8aa0');g.fillStyle=grd;g.beginPath();g.arc(bx,by,8,0,Math.PI*2);g.fill();
 g.globalAlpha=1;
}
function close(){if(!st)return;cancelAnimationFrame(st.raf);clearInterval(st.timer);if(st.hold)clearInterval(st.hold);
 // coins in the air land, stocked/running lotteries are drawn now, and pending bonus medals go onto the field: nothing paid for is lost
 for(const f of st.falling){if(f.chance)st.stock++;else S.drop(st.sim,f.x);}
 let rain=st.rain;
 const resolve=idx=>{const [name,add]=S.LOTTERY[idx];if(name==='BALL'){const pk=S.POCKETS[random(S.POCKETS.length)];if(pk==='JP'){const v=Math.floor(st.jp);st.jp=S.JP_BASE;return v;}return pk;}return add;};
 if(st.reel)rain+=resolve(st.reel.idx);
 if(st.ball){const pk=S.POCKETS[st.ball.pocket];if(pk==='JP'){rain+=Math.floor(st.jp);st.jp=S.JP_BASE;}else rain+=pk;}
 for(let i=0;i<st.stock;i++)rain+=resolve(S.lottery(random(S.lotteryTotal)));
 S.scatter(st.sim,Math.min(rain,400));save();st=null;
 if(pending.spent+pending.won>0)settle();else{walletHold=false;renderProfile();}}
window.addEventListener('pagehide',()=>{if(st)save();});
return {open,close};
})();
