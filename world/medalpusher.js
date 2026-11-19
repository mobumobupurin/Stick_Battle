'use strict';
/* STICK ROYALE — COIN PUSHER (medal corner). 1 medal = 1 SC.
   The field (pushersim.js) runs in the browser and is kept per browser; medals in and out are settled in batches by core.js ('pusher'). */
const WorldPusher=(()=>{
const S=PusherSim,W=480,H=600,FIELD_TOP=168,FIELD_BOTTOM=512,FRONT_HALF=206,BACK_SCALE=.64;
const STORE='stick-royale-pusher-v1',SETTLE_IDLE=2500,SETTLE_SPENT=200,SETTLE_WON=2000;
const DIGITS={0:null,1:'333',2:'555',3:'777',4:'★★★'};
let st=null,pending={spent:0,won:0},settling=null,storeKey=STORE;
function h(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
const yen=n=>Number(n||0).toLocaleString('ja-JP');
function meter(label){const m=h('div','egm-meter');const v=h('b',undefined,'0');m.append(h('small',undefined,label),v);return [m,v];}
const scaleAt=y=>BACK_SCALE+(1-BACK_SCALE)*Math.max(0,Math.min(110,y))/100;
const sy=y=>FIELD_TOP+(FIELD_BOTTOM-FIELD_TOP)*y/100;
const sx=(x,y)=>W/2+(x-50)*FRONT_HALF/50*scaleAt(y);
const credit=()=>p.cash-pending.spent+pending.won;

/* ---------- persistence & settlement ---------- */
function keyFor(){return STORE+':'+(mode==='local'?'local':(user?.uid||'guest'));}
function load(){storeKey=keyFor();try{const v=JSON.parse(localStorage.getItem(storeKey)||'null');if(v&&Array.isArray(v.coins)){const coins=v.coins.filter(c=>Array.isArray(c)&&Number.isFinite(c[0])&&Number.isFinite(c[1])).slice(0,400).map(([x,y])=>({x,y}));const pd=v.pending||{};return {coins,pending:{spent:Math.max(0,Math.min(WorldCore.PU_MAX_SPENT,pd.spent|0)),won:Math.max(0,Math.min(WorldCore.PU_MAX_WON,pd.won|0))}};}}catch{}return null;}
function save(){if(!st)return;try{localStorage.setItem(storeKey,JSON.stringify({coins:st.sim.coins.map(c=>[Math.round(c.x*10)/10,Math.round(c.y*10)/10]),pending}));}catch{}}
function savePending(){try{const v=JSON.parse(localStorage.getItem(storeKey)||'{}');v.pending=pending;localStorage.setItem(storeKey,JSON.stringify(v));}catch{}}
async function settle(){
 if(settling)return settling;if(pending.spent+pending.won<1)return;
 const batch={spent:pending.spent,won:pending.won};pending={spent:0,won:0};savePending();
 settling=(async()=>{try{await request('pusher',batch);}catch(e){pending.spent+=batch.spent;pending.won+=batch.won;savePending();if(st)say('精算できませんでした：'+e.message,'lose');}
  finally{settling=null;if(st){paintCredit();sync();}else{walletHold=false;renderProfile();}}})();
 return settling;
}
function paintCredit(){if(!st)return;st.vCredit.textContent=yen(credit());const cd=document.getElementById('cashDisplay');if(cd)cd.textContent=yen(credit())+' SC';}

/* ---------- coin sprite ---------- */
function sprite(){const c=document.createElement('canvas');c.width=72;c.height=44;const g=c.getContext('2d');
 g.fillStyle='#7a4a08';g.beginPath();g.ellipse(36,26,34,16,0,0,Math.PI*2);g.fill();
 const gr=g.createLinearGradient(0,4,0,40);gr.addColorStop(0,'#fff3b0');gr.addColorStop(.45,'#f5c43a');gr.addColorStop(1,'#b97a10');
 g.fillStyle=gr;g.beginPath();g.ellipse(36,20,34,16,0,0,Math.PI*2);g.fill();
 g.strokeStyle='#8a5a0c';g.lineWidth=2;g.beginPath();g.ellipse(36,20,24,10.5,0,0,Math.PI*2);g.stroke();
 g.fillStyle='#fff8d8';g.globalAlpha=.55;g.beginPath();g.ellipse(28,15,11,4,-.15,0,Math.PI*2);g.fill();return c;}

/* ---------- UI ---------- */
function open(body){
 const C=WorldCore,root=h('div','egm egm-pusher');
 const top=h('div','egm-topper');top.append(h('small',undefined,'STICK ROYALE MEDAL CORNER'),h('b','egm-title','COIN PUSHER'),h('span','egm-sub','CHANCE → 最大 150枚'));
 const screen=h('div','egm-screen pu-screen');const cv=h('canvas','pu-canvas');cv.width=W;cv.height=H;cv.setAttribute('aria-label','コインプッシャーのフィールド。タップした位置にメダルを落とします');cv.setAttribute('role','img');
 const side=h('div','pu-side');
 const how=h('div','pu-how');how.append(h('b',undefined,'あそびかた'),h('p',undefined,'メダルを落とすと、前後に動くプッシャーがフィールドのメダルを押し出します。手前から落ちたメダルが払い出し（左右の端は OUT）。'),h('p',undefined,'落としたメダルがときどき CHANCE に入ると抽選。そろうとメダルがフィールドに降ってきます。'));
 const table=h('div','pu-table');for(const [k,label] of [[4,'★★★'],[3,'777'],[2,'555'],[1,'333']]){const r=h('span');r.append(h('em',undefined,label),h('b',undefined,'+'+S.LOTTERY[k][1]+'枚'));table.append(r);}
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
 st={root,cv,g:cv.getContext('2d'),coin:sprite(),sim,msgBar,vCredit,vIn,vOut,drop,cash,aim:50,falling:[],outs:[],pops:[],stock:0,lottery:null,rain:0,sessionIn:0,sessionOut:0,hold:null,last:performance.now(),acc:0,lastAct:performance.now(),lastSave:0,lastTick:0,raf:0,digits:['7','1','4'],timer:0};
 walletHold=true;paintCredit();
 // aiming & dropping
 const aimFromEvent=e=>{const r=cv.getBoundingClientRect();const x=(e.clientX-r.left)/r.width*W;st.aim=Math.max(8,Math.min(92,50+(x-W/2)/(FRONT_HALF/50*BACK_SCALE)));};
 const startHold=fn=>{stopHold();fn();st.hold=setInterval(fn,190);};
 const stopHold=()=>{if(st?.hold){clearInterval(st.hold);st.hold=null;}};
 cv.addEventListener('pointerdown',e=>{e.preventDefault();try{cv.setPointerCapture(e.pointerId);}catch{}aimFromEvent(e);startHold(dropOne);});
 cv.addEventListener('pointermove',e=>{if(st?.hold)aimFromEvent(e);});
 for(const ev of ['pointerup','pointercancel','lostpointercapture'])cv.addEventListener(ev,stopHold);
 drop.addEventListener('pointerdown',e=>{e.preventDefault();try{drop.setPointerCapture(e.pointerId);}catch{}startHold(dropOne);});
 for(const ev of ['pointerup','pointercancel','lostpointercapture'])drop.addEventListener(ev,stopHold);
 drop.addEventListener('click',e=>{if(e.detail===0)dropOne();});
 const nudge=d=>()=>{st.aim=Math.max(8,Math.min(92,st.aim+d));};
 left.addEventListener('pointerdown',e=>{e.preventDefault();try{left.setPointerCapture(e.pointerId);}catch{}startHold(nudge(-4));});
 right.addEventListener('pointerdown',e=>{e.preventDefault();try{right.setPointerCapture(e.pointerId);}catch{}startHold(nudge(4));});
 for(const b of [left,right])for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,stopHold);
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
 if(pending.spent>=WorldCore.PU_MAX_SPENT){settle();return;}
 if(st.falling.length>6)return;
 pending.spent++;st.sessionIn++;st.lastAct=performance.now();
 const chance=random(1000)<S.CHANCE_RATE*1000;
 st.falling.push({x:st.aim+(Math.random()-.5)*1.2,t:0,chance});WorldSound.coin();sync();
}
function startLottery(){
 const idx=S.lottery(random(S.lotteryTotal));st.lottery={idx,t:0};WorldSound.spin();say('CHANCE!  抽選中…','');
}
function finishLottery(){
 const idx=st.lottery.idx,add=S.LOTTERY[idx][1];
 st.digits=DIGITS[idx]?[...DIGITS[idx]]:(()=>{let d;do{d=[random(10),random(10),random(10)].map(String);}while(d[0]===d[1]&&d[1]===d[2]);return d;})();
 st.lottery=null;
 if(add){st.rain+=add;const lv=idx>=4?5:idx>=3?4:idx>=2?3:2;WorldSound.win(lv);if(idx>=3)WorldSound.bigWin();say((idx===4?'JACKPOT!! ':'')+st.digits.join(' ')+'  メダル +'+add+'枚 がフィールドに！','win');st.pops.push({text:'+'+add,t:0,big:idx>=3});if(idx===4)st.root.classList.add('pu-jackpot');setTimeout(()=>st&&st.root.classList.remove('pu-jackpot'),3200);}
 else{say('ハズレ… CHANCE をねらおう','');}
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
 // dropping medals
 for(let i=st.falling.length-1;i>=0;i--){const f=st.falling[i];f.t++;if(f.t>=16){S.drop(st.sim,f.x);if(f.chance){st.stock=Math.min(9,st.stock+1);st.pops.push({text:'CHANCE!',t:0,chance:true});WorldSound.tease();}st.falling.splice(i,1);}}
 // CHANCE rain
 if(st.rain>0&&st.sim.t%3===0){S.scatter(st.sim,1);st.rain--;}
 if(!st.lottery&&st.stock>0){st.stock--;startLottery();}
 if(st.lottery){st.lottery.t++;if(st.lottery.t%4===0)st.digits=[0,1,2].map(i=>st.lottery.t>40+i*18?st.digits[i]:String(random(10)));if(st.lottery.t>=100)finishLottery();}
 const before=st.sim.coins.slice();const r=S.step(st.sim);
 if(r.front||r.lost){const alive=new Set(st.sim.coins);for(const c of before)if(!alive.has(c)){const out=c.x<S.GUTTER||c.x>100-S.GUTTER;st.outs.push({x:c.x,y:100,vy:1.2,out});}
  if(r.front){pending.won+=r.front;st.sessionOut+=r.front;st.lastAct=performance.now();sync();const now=performance.now();if(now-st.lastTick>55){WorldSound.tick();st.lastTick=now;}if(pending.won>=WorldCore.PU_MAX_WON-60)settle();}}
 for(let i=st.outs.length-1;i>=0;i--){const o=st.outs[i];o.y+=o.vy;o.vy+=.35;if(o.y>124)st.outs.splice(i,1);}
 for(let i=st.pops.length-1;i>=0;i--){if(++st.pops[i].t>70)st.pops.splice(i,1);}
}
function coinAt(g,x,y,lift){const s=scaleAt(y),w=S.R*2*FRONT_HALF/50*s*1.04,hh=w*.61;g.drawImage(st.coin,sx(x,y)-w/2,sy(y)-hh*.45-(lift||0),w,hh);}
function draw(){
 const g=st.g,sim=st.sim;g.clearRect(0,0,W,H);
 // cabinet
 let gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#0b1a2a');gr.addColorStop(1,'#050b12');g.fillStyle=gr;g.fillRect(0,0,W,H);
 // back panel with CHANCE display
 g.fillStyle='#10263c';roundRect(g,40,14,W-80,108,14);g.fill();g.strokeStyle='#d9b56a';g.lineWidth=2;g.stroke();
 g.fillStyle='#d9b56a';g.font='700 13px Georgia,serif';g.textAlign='center';g.fillText('C H A N C E',W/2,36);
 for(let i=0;i<3;i++){const x=W/2-84+i*62;g.fillStyle='#050b12';roundRect(g,x,44,44,54,6);g.fill();g.strokeStyle=st.lottery?'#ffd36b':'#5a7a90';g.lineWidth=1.5;g.stroke();g.fillStyle=st.digits[i]==='★'?'#ffd36b':'#fff4d6';g.font='900 34px "Arial Black",Impact,sans-serif';g.fillText(st.digits[i],x+22,84);}
 g.font='700 10px Arial,sans-serif';g.fillStyle='#9fb6c8';g.fillText('STOCK',82,58);for(let i=0;i<5;i++){g.beginPath();g.arc(62+i*10,72,3.6,0,Math.PI*2);g.fillStyle=i<st.stock?'#ffd36b':'#24384a';g.fill();}
 g.fillText('IN / OUT',W-82,58);g.fillStyle='#fff4d6';g.font='900 13px Arial,sans-serif';g.fillText(st.sessionIn+' / '+st.sessionOut,W-82,76);
 // field
 const bl=sx(0,-8),br=sx(100,-8),fl=sx(0,100),fr=sx(100,100),yb=sy(-8),yf=sy(100);
 gr=g.createLinearGradient(0,yb,0,yf);gr.addColorStop(0,'#173a56');gr.addColorStop(1,'#2a6286');g.fillStyle=gr;g.beginPath();g.moveTo(bl,yb);g.lineTo(br,yb);g.lineTo(fr,yf);g.lineTo(fl,yf);g.closePath();g.fill();
 g.strokeStyle='#ffffff10';g.lineWidth=1;for(let y=0;y<=100;y+=10){g.beginPath();g.moveTo(sx(0,y),sy(y));g.lineTo(sx(100,y),sy(y));g.stroke();}
 // OUT zones at the front corners
 for(const [a,b] of [[0,S.GUTTER],[100-S.GUTTER,100]]){g.fillStyle='#8a1a2a55';g.beginPath();g.moveTo(sx(a,86),sy(86));g.lineTo(sx(b,86),sy(86));g.lineTo(sx(b,100),sy(100));g.lineTo(sx(a,100),sy(100));g.closePath();g.fill();}
 g.fillStyle='#ffb0b8';g.font='800 10px Arial,sans-serif';g.fillText('OUT',sx(S.GUTTER/2,95),sy(95)+4);g.fillText('OUT',sx(100-S.GUTTER/2,95),sy(95)+4);
 // chute rail and aim
 const ry=sy(-14);g.strokeStyle='#9fb6c8';g.lineWidth=4;g.beginPath();g.moveTo(sx(4,-14),ry);g.lineTo(sx(96,-14),ry);g.stroke();
 const ax=sx(st.aim,-14);g.fillStyle='#ffd36b';g.beginPath();g.moveTo(ax,ry+16);g.lineTo(ax-9,ry+3);g.lineTo(ax+9,ry+3);g.closePath();g.fill();
 g.fillStyle='#ffd36b30';g.beginPath();g.moveTo(ax-7,ry+16);g.lineTo(ax+7,ry+16);g.lineTo(sx(st.aim,sim.face+6)+10,sy(sim.face+6));g.lineTo(sx(st.aim,sim.face+6)-10,sy(sim.face+6));g.closePath();g.fill();
 // pusher slab
 const face=sim.face;gr=g.createLinearGradient(0,sy(-8),0,sy(face));gr.addColorStop(0,'#5d6f80');gr.addColorStop(1,'#a9bccb');g.fillStyle=gr;g.beginPath();g.moveTo(bl,yb);g.lineTo(br,yb);g.lineTo(sx(100,face),sy(face));g.lineTo(sx(0,face),sy(face));g.closePath();g.fill();
 g.fillStyle='#3a4856';g.fillRect(sx(0,face),sy(face),sx(100,face)-sx(0,face),12);g.fillStyle='#d9b56a';g.fillRect(sx(0,face),sy(face),sx(100,face)-sx(0,face),2);
 g.fillStyle='#ffffff55';g.font='italic 700 12px Georgia,serif';g.fillText('STICK ROYALE',W/2,(sy(-8)+sy(face))/2+4);
 // coins (back to front)
 const coins=sim.coins.slice().sort((a,b)=>a.y-b.y);for(const c of coins)coinAt(g,c.x,c.y,c.fresh?c.fresh*.8:0);
 // falling (from the chute)
 for(const f of st.falling){const k=f.t/16,y=-14+(S.FACE_MAX*.6+14)*k;coinAt(g,f.x,y,(1-k)*30);}
 // front lip & side walls
 g.fillStyle='#d9b56a';g.fillRect(fl,yf,fr-fl,3);
 g.fillStyle='#0a1622';g.beginPath();g.moveTo(0,yb);g.lineTo(bl,yb);g.lineTo(fl,yf);g.lineTo(0,yf);g.closePath();g.fill();g.beginPath();g.moveTo(W,yb);g.lineTo(br,yb);g.lineTo(fr,yf);g.lineTo(W,yf);g.closePath();g.fill();
 g.strokeStyle='#9fd8ff40';g.lineWidth=2;g.beginPath();g.moveTo(bl,yb);g.lineTo(fl,yf);g.moveTo(br,yb);g.lineTo(fr,yf);g.stroke();
 // tray
 gr=g.createLinearGradient(0,yf,0,H);gr.addColorStop(0,'#1a1208');gr.addColorStop(1,'#0a0704');g.fillStyle=gr;g.fillRect(fl-6,yf+4,fr-fl+12,H-yf-4);
 g.fillStyle='#5a0f1a';g.fillRect(fl-6,yf+4,sx(S.GUTTER,100)-fl+6,H-yf-4);g.fillRect(sx(100-S.GUTTER,100),yf+4,fr-sx(100-S.GUTTER,100)+6,H-yf-4);
 g.fillStyle='#d9b56a';g.font='700 12px Georgia,serif';g.fillText('PAYOUT',W/2,H-22);
 for(const o of st.outs){g.globalAlpha=o.out?.55:1;coinAt(g,o.x,Math.min(o.y,100),-(o.y-100)*3.4);g.globalAlpha=1;}
 // pops
 for(const pp of st.pops){const k=pp.t/70;g.globalAlpha=1-k;g.fillStyle=pp.chance?'#7ff0ff':'#ffd36b';g.font=`900 ${pp.big?40:pp.chance?26:30}px "Arial Black",Impact,sans-serif`;g.fillText(pp.text,W/2,sy(45)-k*40-st.pops.indexOf(pp)*34);g.globalAlpha=1;}
}
function roundRect(g,x,y,w,hh,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+hh,r);g.arcTo(x+w,y+hh,x,y+hh,r);g.arcTo(x,y+hh,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function close(){if(!st)return;cancelAnimationFrame(st.raf);clearInterval(st.timer);if(st.hold)clearInterval(st.hold);
 // coins still in the air land on the field, and stocked CHANCEs are drawn now, so nothing paid for is lost
 for(const f of st.falling){S.drop(st.sim,f.x);if(f.chance)st.stock++;}
 let rain=st.rain;if(st.lottery)rain+=S.LOTTERY[st.lottery.idx][1];for(let i=0;i<st.stock;i++)rain+=S.LOTTERY[S.lottery(random(S.lotteryTotal))][1];
 S.scatter(st.sim,rain);save();st=null;
 if(pending.spent+pending.won>0)settle();else{walletHold=false;renderProfile();}}
window.addEventListener('pagehide',()=>{if(st)save();});
return {open,close};
})();
