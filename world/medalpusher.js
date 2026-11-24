'use strict';
/* STICK CASINO — "FORTUNE PUSHER" (medal corner). 1 medal = 1 SC. An original machine design.
   Flow: medals → moving CHECKER gate → hold (8, result drawn on entry) → number slot (1–7 + JP ball) → medal rain; odd numbers give 確変; JP balls go onto the field;
   777 = 777 RUSH + 確変. A JP ball pushed off the front goes to the 2-stage JP lottery (stage 2 holds the progressive JACKPOT).
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
 return {coins,upper:up,jps:loadJps(v),kak:Math.max(0,Math.min(99,v.kak|0)),ballStock:Math.max(0,Math.min(2,v.ballStock|0)),pending:{spent:Math.max(0,Math.min(MAX_SPENT(),pd.spent|0)),won:Math.max(0,Math.min(MAX_WON(),pd.won|0))}};}}catch{}return null;}
function save(){if(!st)return;try{localStorage.setItem(storeKey,JSON.stringify({upper:st.upper.coins.map(c=>[Math.round(c.x*10)/10,Math.round(c.y*10)/10]),coins:st.sim.coins.map(c=>c.ball?[Math.round(c.x*10)/10,Math.round(c.y*10)/10,1]:[Math.round(c.x*10)/10,Math.round(c.y*10)/10]),jps:Object.fromEntries(Object.entries(st.jps).map(([k,x])=>[k,Math.round(x*100)/100])),ballStock:st.ballStock,kak:st.kak,pending}));}catch{}}
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
/* ---------- FEVER GAME ranking (best total of one FEVER GAME) ---------- */
let rankBusy=false;
async function refreshRank(best){if(!st||rankBusy&&!best)return;rankBusy=true;const box=st.root.querySelector('.pu-rank');try{const r=await request('pusherRank',best?{best}:{});if(!st)return;renderRank(r);}catch(e){if(box){box.querySelector('.pu-rank-list').innerHTML='';box.querySelector('.pu-rank-me').textContent=/permission|PERMISSION/i.test(String(e&&e.message))?'ランキング準備中（管理者のルール更新待ち）':'ランキングを読み込めませんでした';}}finally{rankBusy=false;}}
function renderRank(r){const box=st&&st.root.querySelector('.pu-rank');if(!box)return;const ol=box.querySelector('.pu-rank-list');ol.innerHTML='';
 (r.rank||[]).forEach((x,i)=>{const li=document.createElement('li');if(x.me)li.className='me';const n=document.createElement('span');n.textContent=(i+1)+'. '+x.name;const v=document.createElement('b');v.textContent=yen(x.best)+' 枚';li.append(n,v);ol.append(li);});
 if(!(r.rank||[]).length){const li=document.createElement('li');li.textContent='まだ記録がありません';ol.append(li);}
 st.myBest=r.mine||0;box.querySelector('.pu-rank-me').textContent='あなたのベスト：'+(r.mine?yen(r.mine)+' 枚':'—')+(r.local?'（オフライン）':'');}
function open(body){
 const root=h('div','egm egm-pusher');
 const top=h('div','egm-topper');top.append(h('small',undefined,'STICK CASINO MEDAL CORNER'),h('b','egm-title','FORTUNE PUSHER'),h('span','egm-sub','1〜7のナンバースロット × JPボール'));
 const screen=h('div','egm-screen pu-screen');const cv=h('canvas','pu-canvas');cv.width=W;cv.height=H;cv.setAttribute('aria-label','コインプッシャー。タップした位置にメダルを落とします');cv.setAttribute('role','img');
 const side=h('div','pu-side');
 const how=h('div','pu-how');how.append(h('b',undefined,'あそびかた'),
  h('p',undefined,'タップした位置（または ◀▶ と DROP）にメダルを投入。メダルはスロープを転がって上段ステージへ。プッシャーが下がるたびに上段のメダルが押し出されて下段に落ち、下段の手前から落ちたメダルが払い出し。左右の端は OUT。'),
  h('p',undefined,'下段の手前から落ちたメダルは正面の坂を滑り落ちる。坂の真ん中の START の穴にメダルが落ちたらスロット抽選（保留は最大8）。上段のふちの CHANCE チェッカーをメダルが通ると、その側のフリッパーがパタパタ動いてメダルを START の方へ寄せてくれる。レバーで CHANCE チェッカーの上をねらおう。'),h('p',undefined,'保留が8個たまってからさらに START に入ると「2周目」：保留ランプが左から順に ×2 になる。全部 ×2 になったら「3周目」で ×4。その保留で当たると配当が2倍・4倍（777 は FEVER の配当、JPボールは個数が増える）。'),h('p',undefined,'777 は 777 RUSH（5ラウンド＋壁UP）。奇数そろいで確変突入。確変中は当たりやすく、当たるたびに確変ボーナス +10枚。偶数がそろうまで続く（偶数でも再抽選で奇数に昇格することがある）。5・7・10・15・20・25連で 連数×10枚 の継続ボーナス。'),
  h('p',undefined,'JPボールは重く、盤面に何個も乗る。ボールが手前に落ちるたびに BALL BONUS ルーレット（+10〜+50枚、BALL＝ボール追加）。手前に落ちたボールは全部ソケットが光り、3つで FEVER GAME。FEVER GAME はバンパー1回 +2枚。バンパーに35回当てると真ん中の JP CHANCE の穴が開く（一度開いたらゲームが終わるまで開きっぱなし）。JP CHANCE の2段目で JP に入れば JACKPOT（最大5000枚）。左右の壁の横穴からはメダルがときどき逃げる。'));
 const table=h('div','pu-table');
 const row=(syms,text,cls)=>{const r=h('span',cls);const icons=h('i','pu-syms');for(const s of syms){const c=document.createElement('canvas');c.width=c.height=44;drawSym(c.getContext('2d'),s,22,22,34);icons.append(c);}r.append(icons,h('b',undefined,text));table.append(r);};
 row(['SEVEN','SEVEN','SEVEN'],'777 RUSH＋確変','fever');row(['BALL','BALL','BALL'],'JPボール投入','jp');row(['5','5','5'],'30枚＋確変','odd');row(['6','6','6'],'20枚');row(['3','3','3'],'30枚＋確変','odd');row(['4','4','4'],'20枚');row(['1','1','1'],'30枚＋確変','odd');row(['2','2','2'],'20枚');
 const rank=h('div','pu-rank');rank.append(h('b',undefined,'FEVER GAME ランキング'),h('small','pu-rank-sub','1回の FEVER GAME で獲得した最高枚数'),h('ol','pu-rank-list'),h('p','pu-rank-me',''));
 side.append(rank,how,table);
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
 st={lever,upper,root,cv,g:cv.getContext('2d'),coin:coinSprite(),ballImg:ballSprite(),sim,msgBar,vCredit,vIn,vOut,drop,cash,aim:50,falling:[],ballFalls:[],embers:[],heatFx:0,sockFx:0,winFx:null,multFx:null,roul:null,roulQ:[],ballStock:saved?.ballStock||0,apron:S.createApron(),apSink:[],outs:[],pops:[],sparks:[],sinks:[],shower:[],queue:[],gate:{x:50},cc:[{lit:true,t:0},{lit:true,t:0}],flights:[],dots:[],shift:0,reel:null,fever:null,feverLeft:0,feverTotal:0,jpl:null,balls:0,rain:0,jps:saved?.jps||loadJps(null),kak:saved?.kak||0,
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
 if(st.kak)say('確変 '+st.kak+'連 からスタート！','win');
 sync();st.raf=requestAnimationFrame(frame);setTimeout(()=>refreshRank(),600);
}
function say(t,kind){if(!st)return;st.msgBar.textContent=t;st.msgBar.dataset.kind=kind||'';}
function sync(){if(!st)return;if(st.lever&&document.activeElement!==st.lever)st.lever.value=String(st.aim);st.vIn.textContent=yen(st.sessionIn);st.vOut.textContent=yen(st.sessionOut);paintCredit();st.drop.disabled=p.cash-pending.spent<1;}
function dropOne(){
 if(!st)return;
 if(p.cash-pending.spent<1){say(pending.won?'精算中… もう一度どうぞ':'CREDIT が足りません','lose');if(pending.won)settle();return;}
 if(pending.spent>=MAX_SPENT()){settle();return;}
 if(st.falling.length>6)return;
 pending.spent++;st.sessionIn++;st.lastAct=performance.now();for(const k in JPS)st.jps[k]=Math.min(JPS[k].max,st.jps[k]+JPS[k].rate);
 st.falling.push({x:st.aim+(Math.random()-.5)*4,t:0,roll:rnd(25),dx:(Math.random()-.5)*12,checked:false});WorldSound.coin();sync();
}
function burst(x,y,n,color){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=2+Math.random()*6;st.sparks.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-3,t:0,life:40+Math.random()*30,c:color||(Math.random()<.5?'#ffd36b':'#fff4d6')});}}
function pop(text,o={}){st.pops.push({text,t:0,...o});}
/* ---------- number slot ---------- */
// 予告 colours (expectation): blue < green < red < gold. Chosen from the real result, so hotter colours mean better odds.
const EXP_COLORS=['#5ab0ff','#4ade80','#ff4a5a','#ffd36b'];
// heat (how hot the current spin is) is shown only with colour, light and motion — never with words
const HEAT_COLORS=[null,'#5ab0ff','#4ade80','#ff4a5a','rainbow'];
const rainbow=(o=0)=>`hsl(${(st.frame*7+o)%360},100%,62%)`;
const heatCol=(h,o)=>h>=4?rainbow(o):HEAT_COLORS[h]||null;
function heatUp(h){const r=st.reel;if(!r)return;if(h>=4&&!r.rainbow)h=3;if(h<=(r.heat||0))return;r.heat=Math.min(4,h);st.heatFx=18;st.shake=Math.max(st.shake,h>=3?12:5);
 const c=h>=4?'#ffffff':HEAT_COLORS[h];burst(W/2,148,h>=3?50:24,c);burst(40,148,10,c);burst(W-40,148,10,c);
 try{h>=3?WorldSound.reach():WorldSound.tease();if(h>=4)WorldSound.fanfare();}catch{}}
const weighted=(opts)=>{let t=0;for(const o of opts)t+=o[1];let x=rnd(t);for(const o of opts){x-=o[1];if(x<0)return o[0];}return opts[0][0];};
// the result is drawn when the medal enters the CHECKER (like a real machine's hold); the hold lamp may already show its colour
// no JP ball anywhere (field, flying in, rolling down, or already won in the holds): the slot gives balls far more often
// the fewer JP balls around (field + flying in + rolling down + already won in the holds), the more often the slot gives one
const BALL_BOOSTS=[6,4,2.2,1.4];
function ballCount(){return st.sim.coins.filter(c=>c.ball).length+st.flights.filter(f=>f.ball).length+st.ballFalls.length+st.queue.filter(q=>q.name==='BALL').length+(st.reel&&st.reel.name==='BALL'?1:0);}
function ballBoost(){const n=ballCount();return n<BALL_BOOSTS.length?BALL_BOOSTS[n]:1;}
function planReel(kak){
 const T0=kak?S.LOTTERY_KAKUHEN:S.LOTTERY,bb=ballBoost(),T=bb>1?T0.map(r=>r[0]==='BALL'?[r[0],r[1],Math.round(r[2]*bb),r[3]]:r):T0;
 const row=T[S.pick(T,rnd(S.total(T)))],[name,add,,grant]=row,win=name!=='MISS';
 let target;const pickSym=()=>S.SYMBOLS[rnd(S.SYMBOLS.length)];
 const pickNum=()=>String(1+rnd(6));
 if(!win){if(rnd(100)<(kak?45:34)){const a=weighted([['SEVEN',5],['BALL',5],[pickNum(),90]]);let c;do{c=pickSym();}while(c===a);target=[a,a,c];}else{do{target=[pickSym(),pickSym(),pickSym()];}while(target[0]===target[1]);}}
 else target=[name,name,name];
 const reach=target[0]===target[1],big=target[0]==='SEVEN'||target[0]==='BALL';
 // expectation colour and pre-announcement
 const exp=win?(big?weighted([[3,35],[2,45],[1,15],[0,5]]):weighted([[3,6],[2,30],[1,40],[0,24]])):reach?(big?weighted([[3,3],[2,30],[1,42],[0,25]]):weighted([[2,8],[1,32],[0,60]])):weighted([[1,8],[0,92]]);
 const blackout=exp>=2&&rnd(100)<(win?70:35);
 // reach type: normal → long → SP → 全回転 (全回転 only on a real 777)
 let rtype=null;if(reach){rtype=win&&name==='SEVEN'?weighted([['zen',30],['sp',55],['long',15]]):big?weighted([['sp',win?75:45],['long',win?25:35],['normal',win?0:20]]):win?weighted([['normal',45],['long',40],['sp',15]]):weighted([['normal',55],['long',35],['sp',10]]);}
 const slip=win&&rtype!=='zen'&&rnd(100)<18,revive=win&&!slip&&rtype!=='zen'&&rnd(100)<14;
 const extra={normal:70,long:150,sp:220,zen:150}[rtype]||0;
 const pre=blackout?70:exp>=1?26:0;
 const stops=[REEL_STOP[0],REEL_STOP[1],REEL_STOP[2]+extra];
 let end=stops[2]+18;if(slip)end+=24;if(revive)end+=110;
 // 虹 (rainbow) is kept for near-certain wins: rare, and almost never on a miss
 const rainbow=rtype==='zen'||(win?rnd(100)<(big?40:12):rnd(1000)<6);
 // an even win can be promoted to odd by the re-lottery (→ 確変)
 const even=win&&/^[246]$/.test(name),promote=even&&rnd(100)<S.RELOT[kak?1:0]?(rnd(100)<(kak?12:6)?'SEVEN':['1','3','5'][rnd(3)]):null;
 // an even win can also go to the re-lottery and stay even (the tease), most often during 確変
 const relot=!!promote||(even&&rnd(100)<(kak?55:25));
 // the freeze (screen dies for a moment): only ever on a win, so it means "it's a hit"
 const freeze=win&&rnd(1000)<(name==='SEVEN'?320:promote==='SEVEN'?450:name==='BALL'?60:25);
 const plan={name,add,grant,target,pre,stops,end,reach,hot:big&&reach,rtype,exp,blackout,slip,revive,kak,win,rainbow:rainbow||freeze,promote,relot,freeze};
 // 先読み: some holds change colour in advance
 plan.hold=exp>=1&&rnd(100)<(win?60:30)?exp:0;return plan;}
function startReel(plan){
 if(!!plan.kak!==st.kak>0){const keep={mult:plan.mult,hold:plan.hold};plan=Object.assign(planReel(st.kak>0),keep);}const {pre,blackout,exp,kak}=plan;
 st.reel={...plan,t:-pre,cur:st.shown.slice(),said:{}};st.shift=12;WorldSound.button();
 st.reel.heat=0;if(plan.freeze){st.freeze={t:0,len:96};WorldSound.bgm(null);}
 if(pre){if(blackout)WorldSound.heartbeat();else if(exp>=1)heatUp(exp);}
 else{WorldSound.spin();say(kak?'確変中 '+st.kak+'連！ ナンバースロット':'CHECKER！ ナンバースロット',kak?'win':'');}
}
// a win: show the payout panel and pour the medals out of the ports while it counts up
function award(n,label){if(!n)return;st.rain+=n;for(let i=0;i<Math.min(140,Math.round(n*(n>=200?.25:.6)));i++)st.shower.push({x:Math.random()*W,y:-20-Math.random()*260,vy:3+Math.random()*4,vx:(Math.random()-.5)*1.2,s:14+Math.random()*12});if(n>=30)WorldSound.coinRush(Math.min(30,8+n/10));if(st.payout&&!st.payout.done){st.payout.total+=n;st.payout.label=label;}else st.payout={total:n,given:0,t:0,label};
 const tier=n>=1000||label==='JACKPOT'?'JACKPOT':n>=300?'SUPER WIN':n>=100?'BIG WIN':'';if(tier){banner(tier,'+'+yen(n)+' 枚',tier==='JACKPOT'?'#ff4a6a':'#ffd36b',true);st.shake=Math.max(st.shake,n>=300?30:16);}}
function portFlight(ball){const side=st.portSide=(st.portSide?0:1);st.flights.push({side,x1:14+Math.random()*72,y1:st.sim.face+(ball?S.BALL_R:S.R)+1+Math.random()*12,t:0,dur:ball?44:26+rnd(12),ball});st.portGlow=24;if(ball)WorldSound.bonus();}
// the centre chucker has a two-bladed shutter that turns irregularly; a medal falls in only through a gap
// payout apron under the field edge: a slanted panel the medals slide down, with the START hole and a flipper each side (physics in PusherSim.stepApron)
const AP=S.APRON,AP_D=[0,10/AP.L,-30/AP.L],AP_N=[0,30/AP.L,10/AP.L],AP_TILT=-Math.atan2(30,10),HOLE_VIS=5;
const apronPos=(u,v,h=0)=>[u,100+v*AP_D[1]+h*AP_N[1],v*AP_D[2]+h*AP_N[2]];const apronP=(u,v,h=0)=>P(...apronPos(u,v,h));
const FIELD_SLOPE_Y=()=>startPos()[1]-20;
const startPos=()=>{const q=apronP(AP.HOLE.u,AP.HOLE.v);return [q[0],q[1]];};

// flippers swing up and down; while up they guide medals into START
function checkerHit(){
 const q=startPos();burst(q[0],q[1],24,'#7ff0ff');st.gateFlash=20;
 if(st.queue.length>=HOLD_MAX){ // 保留 full: the lamps go round again — 2周目 makes holds ×2, 3周目 ×4
  let i=st.queue.findIndex(x=>(x.mult||1)===1),lap=2;if(i<0){i=st.queue.findIndex(x=>x.mult===2);lap=3;}
  if(i<0){pop('STOCK MAX ×4',{small:true,at:[W/2,FIELD_SLOPE_Y()-30]});return;}
  const qq=st.queue[i];qq.mult=lap===2?2:4;qq.up=24;const [hx,hy]=holdPos(i);burst(hx,hy,lap===2?18:30,lap===2?'#7ff0ff':'#ff7ae0');
  pop(lap===2?'2周目 ×2':'3周目 ×4!!',{chance:true,at:[hx,hy-22]});WorldSound.tease();if(lap===3)WorldSound.reach();
  say((lap===2?'保留 2周目！ ':'保留 3周目！！ ')+(i+1)+'番目の保留が ×'+qq.mult+' に','win');return;}
 const plan=planReel(st.kak>0);st.queue.push(plan);
 st.dots.push({x0:q[0],y0:q[1],t:0,slot:st.queue.length-1,color:plan.hold?EXP_COLORS[plan.hold]:'#e8f4ff'});
 pop('START!',{chance:true,at:[q[0],q[1]-24]});WorldSound.tease();if(plan.hold>=2)setTimeout(()=>{try{WorldSound.reach();}catch{}},200);
 if(!st.reel&&!st.fever&&!st.jpl)say('チェッカー入賞！ 抽選スタート','win');else say('チェッカー入賞！ 保留 '+st.queue.length+' 個','win');}
const holdPos=i=>[W/2-98+i*28,249];
// three progressive jackpots (BLUE / RED in the 2nd JP CHANCE stage, GOLD in the 3rd)
const JPS={BLUE:{base:500,max:2500,rate:.02,col:'#6ab8ff',glow:'#2a7aff',dark:'#06183a'},RED:{base:500,max:3000,rate:.02,col:'#ff5a6a',glow:'#ff2a3a',dark:'#3a060c'},GOLD:{base:1000,max:6000,rate:.03,col:'#ffd36b',glow:'#ffb21e',dark:'#3a2606'}};
const JP_ORDER=['BLUE','GOLD','RED'];
function loadJps(v){const o={};for(const k in JPS){const x=v&&v.jps&&Number.isFinite(v.jps[k])?v.jps[k]:k==='RED'&&v&&Number.isFinite(v.jp)?v.jp:JPS[k].base;o[k]=Math.max(JPS[k].base,Math.min(JPS[k].max,x));}return o;}
const BALLS_NEED=3,sockPos=i=>[W-66+i*18,62+120];
function addSocket(){st.ballStock++;st.sockFx=30;const sp=sockPos(st.ballStock-1);burst(sp[0],sp[1],34,'#ff6a80');WorldSound.bonus();
 if(st.ballStock>=BALLS_NEED){st.ballStock=0;st.balls++;st.roulQ.push('stage');st.shake=24;st.heatFx=18;st.winFx={t:0,big:true};WorldSound.fanfare();for(let i=0;i<3;i++){const q=sockPos(i);burst(q[0],q[1],40,'#ffd36b');}}
 else{st.shake=Math.max(st.shake,8);WorldSound.tease();}save();}
/* ---------- roulettes (16 equal segments, so what you see is the real chance) ----------
   BALL BONUS: every JP ball that drops off the front. */
const ROULS={
 bb:{name:'BALL BONUS',col:'#ff9aa8',segs:['10','20','BALL','10','30','10','20','BALL','10','50','10','20','BALL','10','30','20']}};
const ROUL_T=170;
const roulColor=v=>v==='FEVER'?'#ff4a6a':v==='BALL'||v==='B2'?'#ff9ae8':v==='JP'?'#b48cff':+v>=50?'#ffd36b':+v>=10?'#4ade80':'#5ab0ff';
const roulLabel=v=>v==='FEVER'?'FEVER GAME':v==='BALL'?'BALL+1':v==='B2'?'BALL+2':v==='JP'?'JP+10':'+'+v+'枚';
const roulShort=v=>v==='FEVER'?'FEVER':v==='BALL'?'BALL':v==='B2'?'BALL×2':v==='JP'?'JP+10':v;
function startRoul(){const kind=st.roulQ.shift(),R=ROULS[kind],i=rnd(R.segs.length),turns=4+rnd(2);st.roul={kind,t:0,i,from:(st.roulA||0)%(Math.PI*2),to:turns*Math.PI*2+(-(i+.5)/R.segs.length*Math.PI*2),last:-1};WorldSound.spin();say(R.name+' ルーレット！','win');}
function roulPrize(kind,v,live){ // apply one result (live=false: settling on close, returns medals)
 if(v==='FEVER'){st.balls++;if(live){st.winFx={t:0,big:true};WorldSound.fanfare();st.shake=24;say('FEVER GAME 確定！！','win');}return 0;}
 if(v==='BALL'||v==='B2'){const n=v==='B2'?2:1;for(let b=0;b<n;b++){if(live)setTimeout(()=>{if(st)portFlight(true);},b*450);else S.addBall(st.sim);}if(live){WorldSound.fanfare();say('JPボール '+n+' 個追加！ 盤面に落ちてくる！','win');}return 0;}
 if(v==='JP'){st.jps.RED=Math.min(JPS.RED.max,st.jps.RED+10);if(live){WorldSound.bonus();pop('JACKPOT +10',{chance:true,at:[W/2,40]});burst(W/2,34,40,'#b48cff');}return 0;}
 if(live){WorldSound.win(+v>=50?4:+v>=10?3:2);say(ROULS[kind].name+' +'+v+'枚','win');}return +v;}
function stepRoul(){const r=st.roul,segs=ROULS[r.kind].segs;r.t++;const k=Math.min(1,r.t/ROUL_T),e=1-Math.pow(1-k,3),a=r.from+(r.to-r.from)*e;st.roulA=a;
 const seg=Math.floor(((-a/(Math.PI*2))%1+1)%1*segs.length);if(seg!==r.last&&r.t<ROUL_T){r.last=seg;r.flap=8;WorldSound.tick();}if(r.flap>0)r.flap--;
 if(r.t>ROUL_T-55&&r.t<ROUL_T&&r.t%14===0)WorldSound.heartbeat();
 if(r.t>ROUL_T&&r.t<ROUL_T+40&&r.t%3===0)st.shower.push({x:W/2+(Math.random()-.5)*260,y:150,vy:-3-Math.random()*4,vx:(Math.random()-.5)*5,s:16+Math.random()*10});
 if(r.t===ROUL_T){const v=segs[r.i];st.heatFx=18;burst(W/2,330,v==='FEVER'?100:50,roulColor(v));if(!/^\d+$/.test(v))roulPrize(r.kind,v,true);else{WorldSound.win(+v>=50?4:3);}}
 if(r.t===ROUL_T+40&&/^\d+$/.test(segs[r.i]))award(roulPrize(r.kind,segs[r.i],true),ROULS[r.kind].name);
 if(r.t>=ROUL_T+46)st.roul=null;}
// drawn big over the whole cabinet
function drawRoul(g){const r=st.roul,RD=ROULS[r.kind],segs=RD.segs,cx=W/2,cy=318,a=st.roulA||0,done=r.t>=ROUL_T,n=segs.length,late=r.t>ROUL_T-55&&!done,R=128*(late?1+.06*(1-(ROUL_T-r.t)/55):done?1.06:1);
 g.save();g.globalAlpha=Math.min(.78,r.t/10);g.fillStyle='#000';g.fillRect(-10,-10,W+20,H+20);g.globalAlpha=1;
 // light pillars and rays behind the wheel
 g.save();g.translate(cx,cy);g.rotate(st.frame*(late?.05:.02));for(let i=0;i<14;i++){g.rotate(Math.PI/7);g.fillStyle=done?(i%2?'#ffd36b22':'#ffffff18'):late?'#ff4a6a1c':'#ff9aa814';g.beginPath();g.moveTo(0,0);g.lineTo(460,-44);g.lineTo(460,44);g.closePath();g.fill();}g.restore();
 for(const sx of [40,W-40]){const gg=g.createLinearGradient(0,0,0,H);gg.addColorStop(0,'#ff9aa800');gg.addColorStop(.5,(late||done)?'#ffd36b88':'#ff9aa855');gg.addColorStop(1,'#ff9aa800');g.fillStyle=gg;g.globalAlpha=.6+.4*Math.sin(st.frame*(late?.5:.15));g.fillRect(sx-10,0,20,H);g.globalAlpha=1;}
 g.fillStyle=RD.col;g.font='italic 900 26px "Arial Black",Impact,sans-serif';g.lineWidth=6;g.strokeStyle='#000';g.strokeText(RD.name,cx,cy-R-34);g.fillText(RD.name,cx,cy-R-34);
 g.save();g.shadowColor=RD.col;g.shadowBlur=30;g.beginPath();g.arc(cx,cy,R+8,0,Math.PI*2);g.fillStyle='#120a14';g.fill();g.restore();
 for(let i=0;i<n;i++){const a0=a+i/n*Math.PI*2-Math.PI/2,a1=a0+Math.PI*2/n,v=segs[i],win=done&&i===r.i;
  g.beginPath();g.moveTo(cx,cy);g.arc(cx,cy,R,a0,a1);g.closePath();g.fillStyle=roulColor(v);g.globalAlpha=win?(st.frame%10<5?1:.55):i%2?.8:.97;g.fill();g.globalAlpha=1;g.strokeStyle='#0a0a12';g.lineWidth=2;g.stroke();
  const am=(a0+a1)/2;g.save();g.translate(cx+Math.cos(am)*R*.7,cy+Math.sin(am)*R*.7);g.rotate(am+Math.PI/2);g.fillStyle='#0a0a12';const t2=roulShort(v);g.font=`900 ${t2.length>3?11:16}px Arial,sans-serif`;g.fillText(t2,0,5);g.restore();}
 g.beginPath();g.arc(cx,cy,R+4,0,Math.PI*2);g.strokeStyle='#ffd36b';g.lineWidth=5;g.stroke();
 for(let i=0;i<32;i++){const aa=i/32*Math.PI*2;g.fillStyle=(i+(st.frame>>(done?1:2)))%3===0?'#fff':'#ffb21e';g.beginPath();g.arc(cx+Math.cos(aa)*(R+14),cy+Math.sin(aa)*(R+14),3,0,Math.PI*2);g.fill();}
 g.beginPath();g.arc(cx,cy,26,0,Math.PI*2);g.fillStyle='#0a0a12';g.fill();g.drawImage(st.ballImg,cx-20,cy-20,40,40);
 // the pointer flaps as each segment passes
 g.save();g.translate(cx,cy-R-18);g.rotate((r.flap||0)/8*.45);g.fillStyle='#fff';g.beginPath();g.moveTo(0,34);g.lineTo(-14,0);g.lineTo(14,0);g.closePath();g.fill();g.strokeStyle='#ff4a6a';g.lineWidth=3;g.stroke();g.restore();
 if(done&&r.t<ROUL_T+12){g.globalAlpha=(ROUL_T+12-r.t)/12*.7;g.fillStyle='#fff';g.fillRect(-10,-10,W+20,H+20);g.globalAlpha=1;}
 if(done){const v=segs[r.i],k=Math.min(1,(r.t-ROUL_T)/8),sc=2.2-1.2*k;g.save();g.translate(cx,cy+R+52);g.scale(sc,sc);g.font='italic 900 34px "Arial Black",Impact,sans-serif';g.lineWidth=7;g.strokeStyle='#000';g.strokeText(roulLabel(v),0,0);g.fillStyle=roulColor(v);g.fillText(roulLabel(v),0,0);g.restore();}
 g.restore();}
function banner(text,sub,color,big){st.banner={text,sub,color,t:0,big};}
function stepReel(){
 const r=st.reel;r.t++;
 if(r.t<0){if(r.blackout&&r.t%20===0)WorldSound.heartbeat();return;}
 if(r.t===0){WorldSound.spin();if(r.blackout){WorldSound.boom();heatUp(Math.max(2,r.exp));}}
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
  WorldSound.reach();say('','');heatUp(r.rtype==='normal'?1:r.rtype==='long'?2:3);}
 if(r.rtype==='zen'&&r.t===r.stops[1]+14){heatUp(4);st.shake=24;}
 if(r.reach&&r.t>r.stops[1]&&r.t<r.stops[2]&&r.t%(r.rtype==='sp'?12:r.rtype==='long'?16:20)===0)WorldSound.heartbeat();
 // chance-up in the middle of a long / SP reach
 if((r.rtype==='long'||r.rtype==='sp')&&r.t===Math.floor((r.stops[1]+r.stops[2])/2)&&r.exp>=2&&!r.said.cu){r.said.cu=1;heatUp(Math.min(4,(r.heat||0)+1));}
 if(r.slip&&r.t===r.stops[2]+24){r.cur[2]=r.target[2];WorldSound.reelStop(2);st.shake=14;st.heatFx=18;burst(W/2+86,148,40,'#7ff0ff');}
 if(r.revive){const t0=r.stops[2];
  if(r.t===t0+8)say('ハズレ……','');
  if(r.t>t0+50&&r.t<t0+86){if(r.t===t0+51){WorldSound.boom();st.shake=20;heatUp(4);}if(r.t%3===0)r.cur[2]=S.SYMBOLS[rnd(8)];}
  if(r.t===t0+86){r.cur[2]=r.target[2];WorldSound.reelStop(2);}}
 if(r.rtype==='zen'&&r.t===r.stops[2])r.cur=r.target.slice();
 if(r.t>=r.end)finishReel();
}
function finishReel(){
 const r=st.reel;st.shown=r.target.slice();st.reel=null;
 if(r.name==='MISS'){say(r.reach?'リーチ… おしい！':'ハズレ'+(st.kak?'（確変 '+st.kak+'連 中）':''),'');return;}
 // a win: freeze on the line first, then count the medals up step by step
 const inK=st.kak>0,m=r.mult||1,sym=r.promote||r.name,name=sym==='SEVEN'?'SEVEN':r.name==='BALL'?'BALL':sym,num=/^[1-6]$/.test(sym);
 const row=S.LOTTERY.find(x=>x[0]===sym),base=num?row[1]:0,odd=num?row[3]>0:name==='SEVEN';
 const nk=num||name==='SEVEN'?(odd?(inK?st.kak+1:1):0):st.kak;
 const kb=inK?S.KAK_BONUS:0,cb=odd&&inK&&S.CHAIN_BONUS.includes(nk)?nk*10*m:0;
 const steps=[['align',54]];if(r.relot)steps.push(['relot',118]);steps.push(['show',48]);if(kb)steps.push(['kb',44]);if(m>1)steps.push(['mult',72]);if(cb)steps.push(['cb',54]);steps.push(['end',10]);
 let t0=0;for(const s2 of steps){s2.push(t0);t0+=s2[1];}
 st.winSeq={t:0,r,name,m,num,sym,base,kb,cb,nk,inK,odd,steps,len:t0,total:(base+kb)*m+cb,shown:0,orig:r.name};
 st.flash=50;burst(W/2,150,r.name==='SEVEN'?90:30);st.winFx={t:0,big:r.name==='SEVEN'||r.name==='BALL',rainbow:!!r.rainbow};WorldSound.reelStop(2);WorldSound.win(2);
 say(r.relot?'そろった… 再抽選！？':num?'そろった！':r.name==='SEVEN'?'777！！':'JP BALL！','win');}
function seqPhase(q){for(const [n,d,t0] of q.steps)if(q.t<t0+d)return [n,q.t-t0,d];return ['end',0,0];}
function stepWinSeq(){const q=st.winSeq;q.t++;const [ph,t]=seqPhase(q);
 if(ph==='relot'){const land=q.sym,orig=q.orig;if(t===1){WorldSound.heartbeat();st.heatFx=18;}if(t===14)WorldSound.spin();
  if(t>=14&&t<86){const sp=t<60?3:t<76?6:9;if(t%sp===0)st.shown=st.shown.map(()=>S.SYMBOLS[rnd(7)]);if(t%20===0)WorldSound.heartbeat();}
  else if(t===86){const up=!!q.r.promote;st.shown=[land,land,land];if(up){st.shake=land==='SEVEN'?40:24;WorldSound.boom();if(land==='SEVEN'){WorldSound.fanfare();st.winFx={t:0,big:true,rainbow:true};burst(W/2,148,160,'#ffffff');}else{WorldSound.bonus();burst(W/2,148,80,'#ff7ae0');}st.heatFx=18;st.relotUp={t:0,seven:land==='SEVEN'};}
   else{st.shown=[orig,orig,orig];WorldSound.reelStop(2);st.shake=6;}}}
 if(ph==='show'&&t===1){q.shown=q.num?q.base:0;WorldSound.win(q.base>=30?4:3);st.shake=Math.max(st.shake,8);}
 if(ph==='kb'){if(t===1)WorldSound.bonus();q.shown=Math.round(q.base+q.kb*Math.min(1,t/24));if(t%3===0&&t<26)WorldSound.tick();}
 if(ph==='mult'){if(t===10){st.shake=22;WorldSound.boom();burst(W/2,148,q.m>=4?110:70,q.m>=4?'#ff7ae0':'#7ff0ff');st.heatFx=18;}
  if(t>24){const a=q.base+q.kb,k=Math.min(1,(t-24)/40);q.shown=Math.round(a+(a*q.m-a)*k);if(t%3===0&&k<1)WorldSound.tick();}}
 if(ph==='cb'){if(t===1){WorldSound.fanfare();st.shake=14;}const a=(q.base+q.kb)*q.m;q.shown=Math.round(a+q.cb*Math.min(1,t/30));if(t%3===0&&t<32)WorldSound.tick();}
 if(q.t>=q.len){st.winSeq=null;resolveWin(q);}}
function resolveWin(q){const r=q.r,m=q.m,mx=m>1?' ×'+m:'';const was=st.kak;st.kak=q.nk;
 if(q.name==='SEVEN'){st.feverMult=m;st.feverLeft=S.FEVER_ROUNDS;st.feverTotal=0;st.sim.wall=S.WALL_FRAMES;st.shake=24;WorldSound.fanfare();say('★ 777 RUSH 突入！！ 壁UP＆確変 '+st.kak+'連 ★','win');startCut('fever',{m});if(q.kb*m+q.cb)award(q.kb*m+q.cb,'確変ボーナス');}
 else if(q.name==='BALL'){for(let b=0;b<m;b++)setTimeout(()=>{if(st)portFlight(true);},b*450);WorldSound.bonus();say('JPボール'+(m>1?' ×'+m+' 個':'')+'投入！ 手前に落とせ！','win');banner('JP BALL'+mx,m>1?'JPボール '+m+' 個投入！':'フィールドに投入！','#ff6a80');if(q.kb)award(q.kb*m,'確変ボーナス');}
 else{award(q.total,(q.inK?'確変 WIN':'WIN')+mx);WorldSound.win(q.total>=60?4:3);pop('+'+q.total,{fever:q.odd});}
 if(q.num||q.name==='SEVEN'){
  if(q.odd&&!q.inK){if(st.cut)banner('確変突入','','#ff7ae0',true);else startCut('kin',{});say(q.sym+' そろい！ 確変突入！','win');}
  else if(q.odd&&q.inK){if(st.cut)banner('確変継続',st.kak+'連','#ff7ae0',true);else startCut('kcont',{n:st.kak,milestone:S.CHAIN_BONUS.includes(st.kak)});say('確変継続 '+st.kak+'連！','win');}
  else if(!q.odd&&q.inK){banner('確変終了',was+'連','#9fb6c8');say('確変終了（'+was+'連）','');}
  else say(q.sym+' そろい！ +'+q.total+'枚','win');}
 save();}
function drawRelotFx(g){const q=st.winSeq;if(!q)return;const [ph,t]=seqPhase(q);if(ph!=='relot')return;
 const up=!!q.r.promote,seven=q.sym==='SEVEN',landed=t>=86,col=q.inK?'#ff7ae0':'#7ff0ff';
 // darken the field, keep the reels lit
 g.save();g.globalAlpha=Math.min(.82,t/10);g.fillStyle='#000';g.fillRect(-10,240,W+20,H);g.fillRect(-10,-10,22,260);g.fillRect(W-12,-10,22,260);g.globalAlpha=1;
 const cx=W/2,cy=420;
 if(!landed||!up){
  g.save();g.translate(cx,cy);g.rotate(st.frame*(t<60?.03:.07));for(let i=0;i<16;i++){g.rotate(Math.PI/8);g.fillStyle=i%2?col+'22':'#ffffff10';g.beginPath();g.moveTo(0,0);g.lineTo(480,-40);g.lineTo(480,40);g.closePath();g.fill();}g.restore();
  // light pillars rising beside the screen, faster as the reels slow down
  for(let i=0;i<6;i++){const x=40+i*(W-80)/5,hgt=(Math.sin(st.frame*(t<60?.12:.3)+i)*.5+.5)*260;const gg=g.createLinearGradient(0,H,0,H-hgt);gg.addColorStop(0,col+'aa');gg.addColorStop(1,col+'00');g.fillStyle=gg;g.fillRect(x-6,H-hgt,12,hgt);}
  const pulse=1+.08*Math.sin(st.frame*(t<60?.2:.5)),k=Math.min(1,t/10);g.save();g.translate(cx,cy-30);g.scale(pulse*(2-k),pulse*(2-k));g.font='italic 900 50px "Arial Black",Impact,sans-serif';g.lineWidth=8;g.strokeStyle='#000';g.strokeText('再抽選',0,0);g.fillStyle=col;g.shadowColor=col;g.shadowBlur=24;g.fillText('再抽選',0,0);g.restore();
  if(t>20&&t<86){g.font='900 15px Arial,sans-serif';g.fillStyle='#fff';g.globalAlpha=.6+.4*Math.sin(st.frame*.3);g.fillText(q.inK?'奇数で 確変継続！':'奇数で 確変突入！',cx,cy+20);g.globalAlpha=1;}
  // the heartbeat ring tightens toward the stop
  if(t>=40&&t<86){const p=(t-40)/46,hb=Math.abs(Math.sin(t*(.15+p*.25)));g.strokeStyle=col;g.lineWidth=3;g.shadowColor=col;g.shadowBlur=20;g.beginPath();g.arc(cx,cy+90,30+hb*60*(1-p*.5),0,Math.PI*2);g.stroke();g.shadowBlur=0;}
  if(landed&&!up){const k2=Math.min(1,(t-86)/10);g.globalAlpha=k2;g.font='900 18px Arial,sans-serif';g.fillStyle='#9fb6c8';g.fillText('そのまま…',cx,cy+70);g.globalAlpha=1;}}
 else{const k=Math.min(1,(t-86)/10);
  g.save();g.translate(cx,cy);g.rotate(st.frame*.05);for(let i=0;i<18;i++){g.rotate(Math.PI/9);g.fillStyle=seven?`hsla(${(st.frame*8+i*20)%360},100%,60%,.28)`:i%2?'#ff7ae044':'#ffffff22';g.beginPath();g.moveTo(0,0);g.lineTo(520,-46);g.lineTo(520,46);g.closePath();g.fill();}g.restore();
  if(t<96){g.globalAlpha=(1-k);g.fillStyle='#fff';g.fillRect(-10,-10,W+20,H+20);g.globalAlpha=1;}
  const sc=2.4-1.4*k;g.save();g.translate(cx,cy-50);g.scale(sc,sc);g.font='italic 900 56px "Arial Black",Impact,sans-serif';g.lineWidth=9;g.strokeStyle='#000';g.strokeText('昇格!!',0,0);g.fillStyle=seven?rainbow():'#ff9ae8';g.shadowColor=seven?'#ffffff':'#ff7ae0';g.shadowBlur=30;g.fillText('昇格!!',0,0);g.restore();
  for(let i=0;i<3;i++)drawSym(g,q.sym,cx+(i-1)*70,cy+40,58*(1+.08*Math.sin(st.frame*.3+i)));
  if(t%2===0)st.shower.push({x:Math.random()*W,y:-20,vy:4+Math.random()*4,vx:(Math.random()-.5)*1.4,s:14+Math.random()*12});}
 g.restore();}
function drawWinSeq(g,x,y,w,hh){const q=st.winSeq,[ph,t]=seqPhase(q);if(ph==='align')return;
 if(ph==='relot'){const pl=.5+.5*Math.sin(st.frame*(t<60?.3:.6)),col=q.inK?'#ff7ae0':'#7ff0ff';g.save();g.strokeStyle=col;g.shadowColor=col;g.shadowBlur=18+16*pl;g.lineWidth=6;rr(g,x+2,y+2,w-4,hh-4,12);g.stroke();g.shadowBlur=0;
  g.font='italic 900 15px "Arial Black",sans-serif';g.lineWidth=4;g.strokeStyle='#000';const lab=t<86?'再抽選':q.r.promote?(q.sym==='SEVEN'?'777 昇格！！':'昇格！ '+q.sym):'';if(lab){g.strokeText(lab,W/2,y+20);g.fillStyle=t<86?col:q.sym==='SEVEN'?rainbow():'#ff9ae8';g.fillText(lab,W/2,y+20);}
  if(t>=86&&q.r.promote){const k=Math.min(1,(t-86)/10);g.globalAlpha=(1-k)*.8;g.fillStyle=q.sym==='SEVEN'?'#fff':'#ff7ae0';g.fillRect(x,y,w,hh);g.globalAlpha=1;}
  g.restore();return;}
 const cx=W/2,cy=y+hh/2;g.save();rr(g,x,y,w,hh,12);g.clip();g.globalAlpha=Math.min(.88,(q.t-q.steps[ph==='show'?0:0][1])/10+.5);g.fillStyle='#02060c';g.fillRect(x,y,w,hh);g.globalAlpha=1;
 g.translate(cx,cy);g.rotate(st.frame*.02);for(let i=0;i<12;i++){g.rotate(Math.PI/6);g.fillStyle=q.inK?'#ff7ae01c':'#ffd36b1a';g.beginPath();g.moveTo(0,0);g.lineTo(260,-28);g.lineTo(260,28);g.closePath();g.fill();}g.setTransform(1,0,0,1,0,0);
 if(st.shake){}// (shake is applied to the whole canvas)
 const big=(txt,yy,sz,col)=>{g.font='italic 900 '+sz+'px "Arial Black",Impact,sans-serif';g.lineWidth=Math.max(4,sz/9);g.strokeStyle='#000';g.strokeText(txt,cx,yy);g.fillStyle=col;g.fillText(txt,cx,yy);};
 const small=(txt,yy,col)=>{g.font='900 13px Arial,sans-serif';g.lineWidth=4;g.strokeStyle='#000';g.strokeText(txt,cx,yy);g.fillStyle=col;g.fillText(txt,cx,yy);};
 if(!q.num){const sym=q.name;for(let i=0;i<3;i++)drawSym(g,sym,cx+(i-1)*52,cy-6,46);
  if(q.m>1&&(ph==='mult'||ph==='end')&&t>=10||ph==='end'&&q.m>1){const k=ph==='mult'?Math.min(1,(t-10)/8):1,sc=3-2*k;g.save();g.translate(cx+108,cy+4);g.scale(sc,sc);g.font='italic 900 34px "Arial Black",Impact,sans-serif';g.lineWidth=6;g.strokeStyle='#000';g.strokeText('×'+q.m,0,12);g.fillStyle=q.m>=4?'#ff7ae0':'#7ff0ff';g.fillText('×'+q.m,0,12);g.restore();}
  g.restore();return;}
 // number win: the running total, with what is being added on the line above
 const s0=ph==='show'?Math.min(1,t/8):1,val=q.shown;
 let label='',lc='#fff1a0';if(ph==='kb'||(q.kb&&ph!=='show')){label='確変ボーナス +'+q.kb;lc='#ff9ae8';}
 if(ph==='cb'||ph==='end'&&q.cb){label=q.nk+'連 継続ボーナス +'+q.cb+(q.m>1?'（×'+q.m+'）':'');lc='#ffd36b';}
 if(!label&&ph==='show')label=q.inK?'確変 WIN':'WIN';
 if(label)small(label,cy-40,lc);
 g.save();g.translate(cx-(q.m>1&&(ph==='mult'&&t<24)?40:0),cy+18);g.scale(s0*(ph==='show'?1.25-.25*s0:1),s0*(ph==='show'?1.25-.25*s0:1));g.translate(-cx,-(cy+18));big(val+'枚',cy+18,ph==='mult'&&t>24||ph==='cb'||ph==='end'?56:50,'#fff1a0');g.restore();
 if(q.m>1&&(ph==='mult'&&t>=10&&t<24)){const k=Math.min(1,(t-10)/8),sc=3-2*k;g.save();g.translate(cx+86,cy+14);g.scale(sc,sc);g.font='italic 900 40px "Arial Black",Impact,sans-serif';g.lineWidth=6;g.strokeStyle='#000';g.strokeText('×'+q.m,0,12);g.fillStyle=q.m>=4?'#ff7ae0':'#7ff0ff';g.shadowColor=g.fillStyle;g.shadowBlur=20;g.fillText('×'+q.m,0,12);g.restore();}
 if(q.m>1&&(ph==='mult'&&t>=24||ph==='cb'||ph==='end'))small((q.base+q.kb)+'枚 × '+q.m,cy+52,q.m>=4?'#ff9ae8':'#9ff4ff');
 if(ph==='mult'&&t>=10&&t<16){g.globalAlpha=(16-t)/6;g.fillStyle='#fff';g.fillRect(x,y,w,hh);g.globalAlpha=1;}
 g.restore();}
/* ---------- cut-ins: a short build-up before the big moments so nothing starts out of nowhere ---------- */
const CUT_LEN={stage:180,fever:170,jackpot:230,result:190,revive:150,kin:110,kcont:120,jpcin:140};
function startCut(kind,data,done){st.cut={kind,t:0,len:CUT_LEN[kind],data:data||{},done};st.shake=Math.max(st.shake,10);}
function stepCut(){const c=st.cut,t=++c.t,d=c.data;
 if(c.kind==='stage'){if(t===1)WorldSound.heartbeat();if(t===14||t===28||t===42){WorldSound.bumper(t/14);st.shake=10;burst(W/2+(t/14-2)*80,330,30,'#ff6a80');}if(t===60){WorldSound.boom();st.shake=24;burst(W/2,330,120,'#ffd36b');}if(t===150)WorldSound.reach();if(t===168){WorldSound.fanfare();st.shake=16;}}
 if(c.kind==='fever'){if(t===1)WorldSound.spin();if(t===24||t===40||t===56){WorldSound.reelStop((t-24)/16);st.shake=8;}if(t===62){WorldSound.boom();st.shake=26;burst(W/2,330,140,'#ffd36b');WorldSound.fanfare();}if(t===120){WorldSound.bonus();st.shake=14;}}
 if(c.kind==='jackpot'){if(t===1){WorldSound.heartbeat();}if(t===40){WorldSound.boom();st.shake=60;burst(W/2,330,180,'#ff6a80');burst(W/2,330,140);WorldSound.fanfare();}if(t>60&&t<160){d.shown=Math.round(d.n*Math.min(1,(t-60)/95));if(t%3===0)WorldSound.tick();}if(t===160){d.shown=d.n;WorldSound.bigWin();st.shake=30;}if(t>40&&t%2===0)st.shower.push({x:Math.random()*W,y:-20,vy:4+Math.random()*4,vx:(Math.random()-.5)*1.4,s:16+Math.random()*12});}
 if(c.kind==='jpcin'){if(t===1)WorldSound.heartbeat();if(t===20)WorldSound.heartbeat();if(t===40){WorldSound.boom();WorldSound.fanfare();st.shake=30;burst(W/2,330,150,'#ffd36b');burst(W/2,330,100,'#ff4a6a');}if(t===110)WorldSound.reach();}
 if(c.kind==='kin'){if(t===1)WorldSound.boom();if(t===8){WorldSound.fanfare();st.shake=24;burst(W/2,330,120,'#ff7ae0');}}
 if(c.kind==='kcont'){if(t===1){WorldSound.bonus();st.shake=16;}if(t===40){WorldSound.boom();st.shake=22;burst(W/2,340,d.milestone?140:90,d.milestone?'#ffd36b':'#ff7ae0');if(d.milestone)WorldSound.fanfare();}}
 if(c.kind==='revive'){if(t===1){WorldSound.lose();}if(t===30)WorldSound.heartbeat();if(t===56)WorldSound.heartbeat();if(t===80){WorldSound.boom();WorldSound.fanfare();st.shake=36;burst(W/2,330,150,'#7ff0ff');burst(W/2,330,100,'#ffffff');}}
 if(c.kind==='result'){if(t===1)WorldSound.lose();if(t>40&&t<140){d.shown=Math.round(d.tot*Math.min(1,(t-40)/90));if(t%3===0)WorldSound.tick();}if(t===140){d.shown=d.tot;WorldSound.win(d.tot>=200?5:4);st.shake=20;burst(W/2,360,d.tot>=300?140:80,'#ffd36b');if(d.tot>=100)WorldSound.bigWin();}}
 if(t>=c.len){st.cut=null;if(c.done)c.done();}}
function drawCut(g){const c=st.cut,t=c.t,d=c.data,cx=W/2,cy=330;
 const slam=(txt,y,sz,col,t0,glow)=>{if(t<t0)return;const k=Math.min(1,(t-t0)/9),sc=2.6-1.6*k;g.save();g.translate(cx,y);g.scale(sc,sc);g.globalAlpha=k;g.font='italic 900 '+sz+'px "Arial Black",Impact,sans-serif';g.lineWidth=Math.max(5,sz/7);g.strokeStyle='#000';g.strokeText(txt,0,0);g.fillStyle=col;if(glow){g.shadowColor=glow;g.shadowBlur=26;}g.fillText(txt,0,0);g.restore();};
 const rays=(col,a)=>{g.save();g.translate(cx,cy);g.rotate(st.frame*.02);for(let i=0;i<16;i++){g.rotate(Math.PI/8);g.globalAlpha=a;g.fillStyle=col;g.beginPath();g.moveTo(0,0);g.lineTo(520,-48);g.lineTo(520,48);g.closePath();g.fill();}g.restore();g.globalAlpha=1;};
 const fadeOut=t>c.len-14?(c.len-t)/14:1;
 g.save();g.globalAlpha=Math.min(.86,t/10)*fadeOut;g.fillStyle='#000';g.fillRect(-10,-10,W+20,H+20);g.globalAlpha=fadeOut;
 if(c.kind==='stage'){
  if(t<62){for(let i=0;i<3;i++){const t0=14+i*14;if(t<t0)continue;const k=Math.min(1,(t-t0)/8),x=cx+(i-1)*84,sz=64*(2-k);g.globalAlpha=fadeOut;g.drawImage(st.ballImg,x-sz/2,cy-sz/2,sz,sz);}
   if(t>48){const k=(t-48)/14;g.globalAlpha=k*fadeOut;g.fillStyle='#fff';g.fillRect(0,0,W,H);}}
  else{rays('#ffd36b',.14);const k=Math.min(1,(t-62)/20),sz=110*(1.6-.6*k);g.globalAlpha=fadeOut;g.drawImage(st.ballImg,cx-sz/2,cy-sz/2-10,sz,sz);
   slam('FEVER',cy-96,46,'#ffd36b',66,'#ffb21e');slam('GAME',cy+96,46,'#ffd36b',76,'#ffb21e');
   if(t>100){g.font='900 15px Arial,sans-serif';g.fillStyle='#fff';g.fillText('バンパーに当てて TOTAL を増やせ！',cx,cy+140);}
   if(t>=130&&t<150)slam('READY',cy+190,30,'#7ff0ff',130);if(t>=150)slam('GO!!',cy+190,40,'#ff4a6a',150,'#ff4a6a');}}
 if(c.kind==='fever'){
  rays(t>62?'#ffd36b':'#ff4a5a',t>62?.16:.08);
  for(let i=0;i<3;i++){const stop=24+i*16,x=cx+(i-1)*96,y=cy-30;g.save();g.translate(x,y);g.fillStyle='#fff8e8';g.strokeStyle='#ffd36b';g.lineWidth=4;g.beginPath();g.roundRect?g.roundRect(-42,-56,84,112,12):g.rect(-42,-56,84,112);g.fill();g.stroke();
   if(t<stop){drawSym(g,S.SYMBOLS[(st.frame+i*3)%6],0,(st.frame*9%40)-20,60);}else{const bz=t<stop+8?1+(stop+8-t)/16:1+.06*Math.sin(st.frame*.3);drawSym(g,'SEVEN',0,0,66*bz);}g.restore();}
  slam('777 RUSH',cy+70,40,'#ffd36b',62,'#ffb21e');
  if(t>80){g.font='900 18px Arial,sans-serif';g.fillStyle='#fff';g.fillText('5 ROUNDS'+(d.m>1?'   配当 ×'+d.m:''),cx,cy+108);}
  if(t>=120){const k=Math.min(1,(t-120)/16);g.fillStyle='#ffd36b';g.shadowColor='#ffb21e';g.shadowBlur=20;g.fillRect(30,H-k*260,16,k*260);g.fillRect(W-46,H-k*260,16,k*260);g.shadowBlur=0;slam('WALL UP',cy+150,26,'#7ff0ff',124);
   g.font='900 12px Arial,sans-serif';g.fillStyle='#fff';if(t>134)g.fillText('左右の OUT がふさがる＋確変',cx,cy+178);}}
 if(c.kind==='jackpot'){
  if(t<40){const hb=Math.abs(Math.sin(t*.2));g.strokeStyle=JPS[d.kind||'RED'].col;g.lineWidth=4;g.shadowColor='#ff4a6a';g.shadowBlur=30;g.beginPath();g.arc(cx,cy,30+hb*50,0,Math.PI*2);g.stroke();g.shadowBlur=0;}
  else{const J=JPS[d.kind||'RED'];rays(st.frame%8<4?J.col:'#ffffff',.18);slam((d.kind||'')+' JP',cy-118,40,J.col,40,J.glow);slam('JACKPOT',cy-70,58,'#ffd36b',46,J.glow);
   g.font='900 '+(t>=160?50:44)+'px "Courier New",monospace';g.lineWidth=7;g.strokeStyle='#000';const v=yen(d.shown||0)+' 枚';g.strokeText(v,cx,cy+30);g.fillStyle='#fff1a0';g.shadowColor='#ffb21e';g.shadowBlur=t>=160?30:12;g.fillText(v,cx,cy+30);g.shadowBlur=0;
   if(t>=160){g.font='900 14px Arial,sans-serif';g.fillStyle='#fff';g.fillText('TOTAL に加算  →  '+yen(d.total)+' 枚',cx,cy+74);}}}
  if(c.kind==='jpcin'){if(t<40){const hb=Math.abs(Math.sin(t*.25));g.strokeStyle='#ffd36b';g.lineWidth=4;g.shadowColor='#ffd36b';g.shadowBlur=30;g.beginPath();g.ellipse(cx,cy,40+hb*90,(40+hb*90)*.82,0,0,Math.PI*2);g.stroke();g.shadowBlur=0;}
  else{rays(st.frame%6<3?'#ff4a6a':'#ffd36b',.2);if(t<50){g.globalAlpha=(50-t)/10;g.fillStyle='#fff';g.fillRect(0,0,W,H);g.globalAlpha=1;}
   for(let i=0;i<3;i++){const x=cx+(i-1)*120,on=t>60+i*12;g.fillStyle=on?['#ffd36b','#ff5a6a','#fff1a0'][i]:'#333';g.beginPath();g.ellipse(x,cy+120,26,20,0,0,Math.PI*2);g.fill();g.font='900 11px Arial,sans-serif';g.fillStyle='#000';g.fillText(['1st','2nd','GOLD'][i],x,cy+124);}
   slam('JP',cy-90,70,'#ffd36b',40,'#ff4a6a');slam('CHANCE',cy-10,52,'#ffffff',48,'#ffd36b');}}
  if(c.kind==='kin'){rays('#ff7ae0',.18);slam('確変',cy-50,64,'#ff9ae8',2,'#ff4ac8');slam('突入!!',cy+30,50,'#ffffff',10,'#ff7ae0');
}
 if(c.kind==='kcont'){rays(d.milestone?'#ffd36b':'#ff7ae0',.16);slam('確変継続',cy-80,46,'#ff9ae8',2,'#ff4ac8');
  const k=Math.min(1,Math.max(0,(t-30)/10)),num=t<40?d.n-1:d.n,sc=t>=40?2-k*.0-Math.min(1,(t-40)/8):1;g.save();g.translate(cx,cy+20);g.scale(Math.max(1,sc),Math.max(1,sc));g.font='italic 900 84px "Arial Black",Impact,sans-serif';g.lineWidth=10;g.strokeStyle='#000';g.strokeText(num,-30,20);g.fillStyle=d.milestone?'#ffd36b':'#fff';g.shadowColor=d.milestone?'#ffb21e':'#ff7ae0';g.shadowBlur=t>=40?30:10;g.fillText(num,-30,20);g.font='italic 900 40px "Arial Black",Impact,sans-serif';g.strokeText('連',52,20);g.fillText('連',52,20);g.restore();
  if(d.milestone&&t>48){g.font='900 18px Arial,sans-serif';g.fillStyle='#ffd36b';g.fillText(d.n+'連 継続ボーナス獲得！',cx,cy+90);}}
  if(c.kind==='revive'){
  if(t<80){const k=t/80;g.globalAlpha=fadeOut;g.fillStyle='#9fb6c8';g.font='italic 900 30px "Arial Black",Impact,sans-serif';g.lineWidth=6;g.strokeStyle='#000';if(t<30){g.strokeText('OUT…',cx,cy);g.fillText('OUT…',cx,cy);}
   else{const hb=Math.abs(Math.sin(t*.18));g.strokeStyle='#7ff0ff';g.shadowColor='#7ff0ff';g.shadowBlur=30;g.lineWidth=4;g.beginPath();g.arc(cx,cy,24+hb*40*k,0,Math.PI*2);g.stroke();g.shadowBlur=0;const sz=34+hb*8;g.drawImage(st.ballImg,cx-sz/2,cy-sz/2,sz,sz);}}
  else{rays('#7ff0ff',.18);const k=Math.min(1,(t-80)/12);if(t<92){g.globalAlpha=(1-k)*fadeOut;g.fillStyle='#fff';g.fillRect(0,0,W,H);g.globalAlpha=fadeOut;}
   const sz=96;g.drawImage(st.ballImg,cx-sz/2,cy-sz/2+10,sz,sz);slam('復活!!',cy-80,54,'#7ff0ff',82,'#2ad8ff');slam('REVIVAL',cy+100,30,'#ffffff',92);}}
 if(c.kind==='result'){
  rays('#ffd36b',t>=140?.16:.07);slam('FEVER GAME',cy-110,32,'#ffd36b',4);slam('RESULT',cy-74,26,'#fff',12);
  if(d.jp){g.font='900 16px Arial,sans-serif';g.fillStyle='#ff9aa8';if(t>30)g.fillText('JACKPOT ×'+d.jp,cx,cy-30);}
  if(t>40){g.font='900 '+(t>=140?62:52)+'px "Arial Black",Impact,sans-serif';g.lineWidth=8;g.strokeStyle='#000';const v=yen(d.shown||0);g.strokeText(v,cx,cy+40);g.fillStyle='#fff1a0';g.shadowColor='#ffb21e';g.shadowBlur=t>=140?30:8;g.fillText(v,cx,cy+40);g.shadowBlur=0;g.font='900 18px Arial,sans-serif';g.fillStyle='#ffd36b';g.fillText('枚',cx,cy+72);}
  if(t>=150){g.font='900 13px Arial,sans-serif';g.fillStyle='#fff';g.fillText('払い出し開始！',cx,cy+110);}
  if(d.newBest&&t>=144){slam('NEW RECORD!',cy+150,26,'#ff9ae8',144,'#ff4ac8');}}
 g.restore();}
/* ---------- 777 RUSH ---------- */
function startFeverRound(){
 const round=S.FEVER_ROUNDS-st.feverLeft+1,pay=S.FEVER_PAYS[rnd(S.FEVER_PAYS.length)]*(st.feverMult||1);st.feverLeft--;
 st.fever={round,pay,t:0,cur:st.shown.slice()};WorldSound.spin();say('777 RUSH  ROUND '+round+' / '+S.FEVER_ROUNDS,'win');
}
function finishFeverRound(){
 const f=st.fever;st.fever=null;award(f.pay,'RUSH ROUND '+f.round);st.feverTotal+=f.pay;st.shown=['SEVEN','SEVEN','SEVEN'];burst(W/2,150,40);WorldSound.coinRush(16);WorldSound.win(4);pop('+'+f.pay,{fever:true});
 if(st.feverLeft<=0){setTimeout(()=>{if(!st)return;WorldSound.bigWin();say('FEVER 合計 +'+st.feverTotal+'枚！ 確変 '+st.kak+'回 つづく！','win');pop('TOTAL +'+st.feverTotal,{big:true});},500);}
}
/* ---------- JP lottery (2 stages) ---------- */
/* ---------- FEVER GAME (physics bonus game, see feversim.js) ---------- */
const FS=FeverSim;
function startJP(){
 st.balls--;st.jpl=FS.create(Math.random);st.jpl.total=0;st.jpl.jpCount=0;st.jpl.glow=Array(FS.BUMPERS.length).fill(0);st.jpl.trail=[];st.jpl.intro=20;
 st.shake=10;say('FEVER GAME 突入！ バンパーに当てて WIN を増やせ','win');
}
function stepJP(){
 const j=st.jpl;if(j.intro>0){j.intro--;return;}
 // JP CHANCE tease: when the ball creeps slowly past a JP hole, time slows down
 let tease=0;if(j.jpc&&j.jpc.pocket===null){const d=j.jpc,D=FS.DISHES[d.stage],sp=Math.hypot(d.vx,d.vy);D.holes.forEach((v,i)=>{if(!FS.isJP(v)&&!(d.stage===0&&v==='UP'))return;const [hx,hy]=FS.holePos(D,d,i),dist=Math.hypot(d.x-hx,d.y-hy);const k=Math.max(0,1-dist/11)*Math.max(0,1-sp/1.6);if(k>tease)tease=k;});}
 j.tease=(j.tease||0)*.85+tease*.15;
 if(j.tease>.25&&st.frame%18===0)WorldSound.heartbeat();
 if(j.jpc){(j.dtrail=j.dtrail||[]).push([j.jpc.x,j.jpc.y]);if(j.dtrail.length>14)j.dtrail.shift();}else j.dtrail=null;
 const slow=j.tease>.6?3:j.tease>.35?2:1;
 if(slow===1||st.frame%slow===0)FS.step(j,Math.random);else{j.events=[];}
 for(let i=0;i<j.glow.length;i++)if(j.glow[i]>0)j.glow[i]--;
 if(j.ball&&!j.jpc){j.trail.push([j.ball.x,j.ball.y]);if(j.trail.length>10)j.trail.shift();}
 for(const e of j.events){
  if(e.type==='hit'){j.hitPop=10;j.glow[e.i]=14;WorldSound.bumper(e.i);j.total+=e.pay;const m=FS.BUMPERS[e.i];j.popups=(j.popups||[]);j.popups.push({x:m.x,y:m.y-m.r-4,t:0,text:'+'+e.pay});}
  else if(e.type==='revive'){startCut('revive',{});say('復活！！ ボールが戻ってきた！','win');}
  else if(e.type==='allclear'){j.total+=e.pay;j.allClear=(j.allClear||0)+1;j.clearFx=60;banner('全消しボーナス','+'+e.pay+'  OUTブロック全復活！','#7ff0ff',true);WorldSound.fanfare();WorldSound.boom();st.shake=26;burst(W/2,H-60,120,'#7ff0ff');say('ブロック全消し！ +'+e.pay+' ＆ 壁が全部復活！','win');}
  else if(e.type==='block'){WorldSound.crack();if(e.hp===0)say('OUTブロックが割れた… 残り '+j.blocks.filter(x=>x>0).length,'lose');}
  else if(e.type==='shield')WorldSound.shield();
  else if(e.type==='gate'){WorldSound.reach();WorldSound.boom();st.shake=22;j.openFx=50;banner('JP CHANCE OPEN','真ん中の穴はゲーム終了まで開きっぱなし！','#ff6a80',true);say('JP CHANCE の穴が開いた！','win');}
  else if(e.type==='jpc'){startCut('jpcin',{});say('JP CHANCE！！ UP に入れば JP STAGE へ…','win');}
  else if(e.type==='pocket'){const v=e.value;
   if(FS.isJP(v)){const n=Math.floor(st.jps[v]);st.jps[v]=JPS[v].base;j.jpCount++;(j.jpKinds=j.jpKinds||[]).push(v);j.total+=n;startCut('jackpot',{n,total:j.total,kind:v});st.root.classList.add('pu-jackpot');setTimeout(()=>{if(st)st.root.classList.remove('pu-jackpot');},4000);}
   else if(v==='BLOCK'){WorldSound.bonus();banner('BLOCK 回復','OUTブロックが全部もどった！','#7ff0ff');say('OUTブロック全回復！ まだまだ続く','win');}
   else if(v==='UP'){WorldSound.reach();st.shake=e.stage>=1?20:12;if(e.stage>=1){banner('UP!!','3rd STAGE — GOLD JP','#ffd36b',true);say('UP！！ 最上段 GOLD JP STAGE へ！！','win');}else{banner('UP!!','2nd STAGE — BLUE / RED JP','#ff4a6a',true);say('UP！！ 2段目 BLUE / RED JP STAGE へ！','win');}}
   else{j.total+=v;banner('+'+yen(v),'TOTAL '+yen(j.total),'#ffd36b');pop('+'+v,{at:[W/2,330]});WorldSound.win(v>=100?4:3);}}
  else if(e.type==='skim'){if(FS.isJP(e.value)){WorldSound.heartbeat();pop('JP!?',{small:true,at:[W/2,300]});}else if(e.value==='UP')WorldSound.tease();}
  else if(e.type==='pin'){const now=performance.now();if(now-(st.lastPin||0)>70){WorldSound.tick();st.lastPin=now;}}
  else if(e.type==='up'){j.upFx=40;st.shake=Math.max(st.shake,20);WorldSound.boom();say(e.stage>=2?'GOLD JP STAGE！ GOLD に入れ…！！':'JP STAGE！ BLUE か RED に入れ…！','win');}
  else if(e.type==='return'){say('FEVER GAME 続行！ TOTAL '+yen(j.total),'win');}
  else if(e.type==='out'){const tot=j.total,jp=j.jpCount;st.jpl=null;const nb=tot>(st.myBest||0)&&tot>0;startCut('result',{tot,jp,newBest:nb},()=>{st.flash=60;award(tot,jp?'JACKPOT':'FEVER GAME');});if(tot>0)refreshRank(tot);say('FEVER GAME 終了  合計 '+yen(tot)+' 枚'+(j.jpCount?'（JP×'+j.jpCount+'）':''),'win');return;}
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
 st.frame++;if(st.flash>0)st.flash--;if(st.shake>0)st.shake--;if(st.outBurst>0)st.outBurst--;if(st.heatFx>0)st.heatFx--;if(st.sockFx>0)st.sockFx--;
 if(st.winFx&&++st.winFx.t>150)st.winFx=null;
 if(st.relotUp&&++st.relotUp.t>60)st.relotUp=null;
 for(let i=st.ballFalls.length-1;i>=0;i--){const b=st.ballFalls[i];
  if(b.h>0||b.vh>0){b.vh-=.35;b.h+=b.vh;if(b.h<=0){b.h=0;if(b.vh<-1.2){b.vh=-b.vh*.35;WorldSound.tick();}else b.vh=0;}}
  b.vv+=b.h>0?0:.02;b.v+=b.vv;b.spin+=b.vv/S.BALL_R;
  if(b.v>AP.L+S.BALL_R){st.ballFalls.splice(i,1);const q=apronP(b.u,AP.L);burst(q[0],q[1],24,'#ff6a80');WorldSound.bumper(2);st.shake=Math.max(st.shake,6);}}
 if(st.winSeq)stepWinSeq();
 {const h=st.reel?st.reel.heat||0:0;if(h>=3){for(let k=0;k<(h>=4?3:2);k++)st.embers.push({x:24+Math.random()*(W-48),y:228,vy:-1-Math.random()*2.2,vx:(Math.random()-.5)*.6,t:0,life:50+Math.random()*30,c:h>=4?rainbow(Math.random()*360):Math.random()<.5?'#ff4a2a':'#ffb21e'});}
  for(let i=st.embers.length-1;i>=0;i--){const e=st.embers[i];e.t++;e.x+=e.vx+Math.sin((e.t+i)*.15)*.4;e.y+=e.vy;if(e.t>e.life)st.embers.splice(i,1);}}
 for(let i=st.falling.length-1;i>=0;i--){const f=st.falling[i];f.t++;
  if(f.t===LAND_T)WorldSound.medalLand();
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
 if(st.rain>0){const big=st.payout?st.payout.total:st.rain,given=st.payout?st.payout.given:0;
  // 100+ : the first 50 pour out at once, the rest keeps trickling while the counter ticks up
  const n=big>=100?(given<50?5:big>=300?1:(st.frame%2===0?1:0)):big>=40?2:(st.frame%2===0?1:0);if(n>0&&st.frame%5===0)WorldSound.clink(.8);for(let k=0;k<n&&st.rain>0;k++){portFlight(false);st.rain--;if(st.payout&&st.payout.given<st.payout.total)st.payout.given++;}
  const now=performance.now();if(now-(st.lastCoinSnd||0)>48){WorldSound.coin();st.lastCoinSnd=now;}}
 if(st.payout){const pp=st.payout;pp.t++;if(pp.given>=pp.total){pp.done=(pp.done||0)+1;if(pp.done===1){WorldSound.win(pp.total>=300?5:pp.total>=100?4:3);if(pp.total>=100)WorldSound.bigWin();}if(pp.done>70)st.payout=null;}}
 if(st.roul)stepRoul();
 if(st.cut)stepCut();
 const idle=!st.reel&&!st.fever&&!st.jpl&&!st.payout&&!st.winSeq&&!st.roul&&!st.cut&&!st.freeze;
 // one queue, handled in the order things happened: a ball's roulette, then the FEVER GAME its socket completed, then later balls
 if(idle){if(st.roulQ.length){if(st.roulQ[0]==='stage'){st.roulQ.shift();if(st.balls>0)startCut('stage',{},startJP);}else if(!st.ballFalls.length)startRoul();}else if(st.balls>0)startCut('stage',{},startJP);else if(st.feverLeft>0)startFeverRound();else if(st.queue.length){startReel(st.queue.shift());}}
 if(st.freeze){const f=st.freeze;f.t++;if(f.t===f.len){st.freeze=null;st.heatFx=18;st.shake=30;WorldSound.boom();WorldSound.fanfare();burst(W/2,148,140,'#ffffff');st.winFx={t:0,big:true,rainbow:true};if(st.reel)heatUp(4);}}
 else if(st.reel)stepReel();
 if(st.banner&&++st.banner.t>(st.banner.big?120:80))st.banner=null;
 if(st.sevens>0)st.sevens--;
 if(st.fever){const f=st.fever;f.t++;for(let i=0;i<3;i++){if(f.t<FEVER_STOP[i]){if(f.t%2===0)f.cur[i]=S.SYMBOLS[rnd(S.SYMBOLS.length)];}else if(f.t===FEVER_STOP[i]){f.cur[i]='SEVEN';WorldSound.reelStop(i);}}if(f.t>=FEVER_STOP[2]+22)finishFeverRound();}
 if(st.jpl&&!st.cut)stepJP();
 {const want=st.freeze?null:st.jpl?(st.jpl.jpc||st.jpl.gateOpen?'jpc':'fever'):(st.fever||st.feverLeft>0)?'fever':st.kak>0?'kakuhen':'normal';if(WorldSound.bgmName!==want)WorldSound.bgm(want);}
 const before=st.sim.coins.slice(),wall=st.sim.wall>0,face0=st.sim.face;const r=S.step(st.sim);
 {const xs=S.stepUpper(st.upper,st.sim.face,st.sim.face-face0,STAGE_BACK);for(const x of xs){st.sim.coins.push({x,y:st.sim.face+S.R+.6,fresh:10,fall:true});
   // CHANCE checkers on the upper-stage lip: a medal through a lit one turns it off and sets that side's flipper moving
   CC_X.forEach((cx,i)=>{const c=st.cc[i];if(c.lit&&Math.abs(x-cx)<CC_W){c.lit=false;c.t=FLIP_T;WorldSound.tease();const q=P(cx,st.sim.face,PUSHER_H);burst(q[0],q[1],14,'#ff7ae0');pop('CHANCE!',{small:true,at:[q[0],q[1]-14]});say((i?'右':'左')+'のフリッパーが動き出した！ START に入りやすい','win');}});}if(xs.length&&st.frame%3===0)WorldSound.tick();}
 for(const c of st.upper.coins)if(c.fresh)c.fresh--;
 for(const c of st.cc)if(!c.lit&&--c.t<=0)c.lit=true;
 if(!st.sim.ballXs)st.sim.ballXs=[];
 for(const bx of st.sim.ballXs.splice(0)){st.roulQ.push('bb');burst(P(bx,100)[0],P(bx,100)[1],30,'#ff6a80');addSocket();}
 if(r.front||r.lost||r.balls){const alive=new Set(st.sim.coins);for(const c of before)if(!alive.has(c)){if(c.side){const q=P(c.x<50?-.5:100.5,c.y,1);burst(q[0],q[1],6,'#556070');continue;}const out=!c.ball&&!wall&&(c.x<S.GUTTER||c.x>100-S.GUTTER);const o={x:c.x,y:100,z:0,vz:0,vy:.5,out,ball:c.ball,spin:Math.random()*6};
   // medals off the front roll down the payout slope; the round START checker sits in the middle, with a flipper each side
   // medals off the middle of the front edge slide down the payout apron (they are already paid)
   if(!out&&!c.ball&&S.feedApron(st.apron,c.x))continue;
   // a JP ball drops onto the payout apron and rolls down into the tray
   if(c.ball){st.ballFalls.push({u:Math.max(AP.U0+S.BALL_R,Math.min(AP.U1-S.BALL_R,c.x)),v:0,h:S.BALL_R*1.6,vh:.8,vv:.12,spin:0});continue;}
   st.outs.push(o);}
  if(r.front){pending.won+=r.front;st.sessionOut+=r.front;st.lastAct=performance.now();st.outBurst=Math.min(40,st.outBurst+r.front*6);sync();const now=performance.now();if(now-st.lastTick>55){WorldSound.medalFall(r.front);st.lastTick=now;}if(pending.won>=MAX_WON()-80)settle();}}
 for(let i=st.outs.length-1;i>=0;i--){const o=st.outs[i];
  o.y+=o.vy;o.vz-=.5;o.z+=o.vz;if(o.z<-26)st.outs.splice(i,1);}
 {const ev=S.stepApron(st.apron,[!st.cc[0].lit,!st.cc[1].lit]);if(ev.out&&Math.random()<.5)WorldSound.clink(.6);for(const sk of ev.sunk){st.apSink.push({u:sk.u,v:sk.v,t:0});st.sinks.push({x:50,t:0});checkerHit();}
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
 g.fillStyle='#ff9aa8';g.font='900 11px Arial,sans-serif';g.fillText('★  P R O G R E S S I V E   J A C K P O T S  ★',W/2,19);
 JP_ORDER.forEach((k,i)=>{const J=JPS[k],x=W/2+(i-1)*112,gold=k==='GOLD';g.fillStyle=J.col;g.font='900 '+(gold?10:9)+'px Arial,sans-serif';g.fillText(k+' JP',x,33);g.font='900 '+(gold?20:16)+'px "Courier New",monospace';g.shadowColor=J.glow;g.shadowBlur=st.jpl?14:5;g.fillText(yen(Math.floor(st.jps[k])),x,51);g.shadowBlur=0;});
 // cabinet screen with a chrome bezel
 const L=16,T0=62,Wd=W-32,Ht=172;gr=g.createLinearGradient(0,T0,0,T0+Ht);gr.addColorStop(0,'#c8d2dc');gr.addColorStop(.5,'#5a6672');gr.addColorStop(1,'#2a323a');g.fillStyle=gr;rr(g,L,T0,Wd,Ht,18);g.fill();
 gr=g.createLinearGradient(0,T0+8,0,T0+Ht-8);
 if(fever){gr.addColorStop(0,'#6a3200');gr.addColorStop(1,'#2a1000');}else if(kak){gr.addColorStop(0,'#4a0c5a');gr.addColorStop(1,'#16051f');}else{gr.addColorStop(0,'#103a66');gr.addColorStop(1,'#06142a');}
 g.fillStyle=gr;rr(g,L+8,T0+8,Wd-16,Ht-16,12);g.fill();
 // slow rotating light rays behind the reels during big moments (no flashing)
 const R0=st.reel,heat=R0?R0.heat||0:0,hot=heat>=3||fever||!!st.winSeq,expc=st.winFx&&st.winFx.rainbow?rainbow():st.winFx||st.winSeq?'#ffd36b':heat?heatCol(heat):null;
 if(hot){g.save();rr(g,L+8,T0+8,Wd-16,Ht-16,12);g.clip();g.translate(W/2,T0+Ht/2);g.rotate(st.frame*(heat>=4?.04:heat>=3?.022:.01));for(let i=0;i<12;i++){g.rotate(Math.PI/6);g.fillStyle=heat>=4?`hsla(${(st.frame*5+i*30)%360},100%,60%,.16)`:fever?'#ffb21e22':'#ff3a5a22';g.beginPath();g.moveTo(0,0);g.lineTo(300,-40);g.lineTo(300,40);g.closePath();g.fill();}g.restore();}
 for(let i=0;i<26;i++){const x=L+18+i*((Wd-36)/25);for(const y of [T0+15,T0+Ht-15]){g.beginPath();g.arc(x,y,2.8,0,Math.PI*2);g.fillStyle=live?((i+(st.frame>>(heat>=3||st.winFx?1:2)))%4===0?'#ffffff':(heat>=4||st.winFx&&st.winFx.rainbow?rainbow(i*14):st.winFx?'#ffd36b':expc)||(fever?'#ffb21e':kak?'#ff7ae0':'#7ff0ff')):'#2a3a4a';g.fill();}}
 g.fillStyle=fever?'#ffd36b':kak?'#ffb0f0':'#9fd8ff';g.font='italic 900 15px "Arial Black",sans-serif';
 g.fillText(fever?'777 RUSH  '+(st.fever?st.fever.round:S.FEVER_ROUNDS-st.feverLeft)+' / '+S.FEVER_ROUNDS:kak?'確変中  '+st.kak+' 連':'NUMBER SLOT',W/2,T0+36);
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
  else{const wf=st.winFx&&!st.reel&&!st.fever?Math.abs(Math.sin(st.winFx.t*.22+i*.6))*Math.max(0,1-st.winFx.t/120)*.25:0;drawSym(g,cur[i],x+w/2,y+hh/2,58*(1+wf));}
  g.restore();
  if(tease&&(r.rtype==='sp')){g.strokeStyle='#ffd36b';g.lineWidth=2;g.strokeRect(x-4,y-4,w+8,hh+8);}}
 g.font='800 10px Arial,sans-serif';g.fillStyle='#9fb6c8';g.fillText(kak?'確変':'MODE',48,T0+66);g.fillStyle=kak?'#ff7ae0':'#9fd8ff';g.font='900 13px Arial,sans-serif';g.fillText(kak?st.kak+'連':'通常',48,T0+86);
 if(!st.reel&&!st.fever&&!st.jpl&&!st.queue.length&&!st.feverLeft&&!st.rain&&!st.flights.length&&!st.flash&&performance.now()-st.lastAct>1500){g.fillStyle='#fff4d6';g.globalAlpha=.55+.35*Math.sin(st.frame*.06);g.font='900 13px Arial,sans-serif';g.fillText('▼ チェッカーをねらえ！',W/2,T0+Ht-22);g.globalAlpha=1;}
 g.fillStyle='#9fb6c8';g.fillText(st.sim.wall>0?'WALL UP':'ON FIELD',W-48,T0+66);
 for(let i=0;i<BALLS_NEED;i++){const [sx,sy]=sockPos(i),lit=i<st.ballStock,fx=st.sockFx>0&&i===st.ballStock-1;g.beginPath();g.arc(sx,sy,8,0,Math.PI*2);g.fillStyle='#05080c';g.fill();g.strokeStyle=lit?'#ff6a80':'#3a4a5a';g.lineWidth=2;g.stroke();
  if(lit){const z=fx?1+st.sockFx/30*.8:1;g.drawImage(st.ballImg,sx-7*z,sy-7*z,14*z,14*z);if(fx){g.strokeStyle='#fff';g.shadowColor='#ff6a80';g.shadowBlur=18;g.beginPath();g.arc(sx,sy,10+(30-st.sockFx)*.6,0,Math.PI*2);g.stroke();g.shadowBlur=0;}}}
 g.fillStyle=st.sim.wall>0?'#ffd36b':'#fff4d6';g.font='900 15px Arial,sans-serif';g.fillText(st.sim.wall>0?Math.ceil(st.sim.wall/60)+'s':String(st.sim.coins.filter(c=>c.ball).length+st.balls),W-48,T0+88);
 // reach: the two matched reels glow in the heat colour (no words)
 if(R0&&R0.reach&&R0.t>R0.stops[1]&&R0.t<R0.stops[2]){const hc=heatCol(Math.max(1,heat))||'#5ab0ff',pl=.5+.5*Math.sin(st.frame*(heat>=3?.5:.25));for(let i=0;i<3;i++){const x=W/2-126+i*86,y=T0+46;g.save();g.strokeStyle=heatCol(Math.max(1,heat),i*60)||hc;g.shadowColor=g.strokeStyle;g.shadowBlur=10+14*pl;g.lineWidth=i===2?5:3;rr(g,x-3,y-3,86,118,10);g.stroke();g.restore();}}
 // blackout pre-announcement
 if(R0&&R0.t<0&&R0.blackout){const k=Math.min(1,(R0.pre+R0.t)/14);g.fillStyle=`rgba(0,0,0,${.85*k})`;rr(g,L+8,T0+8,Wd-16,Ht-16,12);g.fill();const hb=Math.abs(Math.sin(st.frame*.11));g.globalAlpha=k*(.4+.6*hb);g.strokeStyle=EXP_COLORS[Math.max(2,R0.exp)];g.shadowColor=g.strokeStyle;g.shadowBlur=24;g.lineWidth=3;g.beginPath();g.arc(W/2,T0+Ht/2,18+hb*26,0,Math.PI*2);g.stroke();g.shadowBlur=0;g.globalAlpha=1;}
 else if(R0&&R0.t<0&&R0.exp>=1){g.fillStyle=EXP_COLORS[R0.exp];g.globalAlpha=.25;rr(g,L+8,T0+8,Wd-16,Ht-16,12);g.fill();g.globalAlpha=1;}
 // falling 7s when FEVER starts
 if(st.sevens>0){g.save();rr(g,L+8,T0+8,Wd-16,Ht-16,12);g.clip();for(let i=0;i<7;i++){const t=90-st.sevens,y=T0-40+((t*6+i*53)%(Ht+80)),x=L+40+i*((Wd-80)/6);drawSym(g,'SEVEN',x,y,30+(i%3)*8);}g.restore();}
 if(st.banner)drawBanner(g,L+8,T0+8,Wd-16,Ht-16);
 drawHolds(g);
 if(st.freeze)drawFreeze(g,L,T0,Wd,Ht);
 // heat frame: a glowing border in the heat colour that breathes faster as it gets hotter
 if(heat||st.winFx){const sp=heat>=4?.45:heat>=3?.3:.15,pl=.5+.5*Math.sin(st.frame*sp);g.save();g.lineWidth=heat>=3?7:5;g.strokeStyle=st.winFx?(st.winFx.rainbow?rainbow():'#ffd36b'):heatCol(heat);g.shadowColor=g.strokeStyle;g.shadowBlur=14+20*pl;rr(g,L+3,T0+3,Wd-6,Ht-6,16);g.stroke();g.restore();}
 if(st.heatFx>0){g.save();rr(g,L+8,T0+8,Wd-16,Ht-16,12);g.clip();g.globalAlpha=st.heatFx/18*.55;g.fillStyle=heat>=4?'#ffffff':heatCol(heat)||'#ffffff';g.fillRect(L,T0,Wd,Ht);g.restore();}
 for(const e of st.embers){g.globalAlpha=Math.max(0,1-e.t/e.life);g.fillStyle=e.c;g.beginPath();g.arc(e.x,e.y,2+2*(1-e.t/e.life),0,Math.PI*2);g.fill();}g.globalAlpha=1;
 // a ×2 / ×4 hold: electric arcs run round the screen and an orb shows the multiplier
 {const m=st.winSeq&&st.winSeq.m>1?st.winSeq.m:st.reel&&st.reel.mult>1?st.reel.mult:0;if(m){const col=(o)=>m>=4?'#ff7ae0':'#7ff0ff';
  const pts=[[L+6,T0+6],[L+Wd-6,T0+6],[L+Wd-6,T0+Ht-6],[L+6,T0+Ht-6]],per=2*(Wd+Ht);
  for(let a=0;a<(m>=4?7:4);a++){let d=(st.frame*9+a*per/(m>=4?7:4))%per;g.save();g.strokeStyle=col(a*50);g.shadowColor=g.strokeStyle;g.shadowBlur=14;g.lineWidth=2.2;g.beginPath();
   for(let k=0;k<9;k++){const dd=(d+k*7)%per;let x,y;if(dd<Wd){x=L+dd;y=T0+6;}else if(dd<Wd+Ht){x=L+Wd-6;y=T0+dd-Wd;}else if(dd<2*Wd+Ht){x=L+Wd-(dd-Wd-Ht);y=T0+Ht-6;}else{x=L+6;y=T0+Ht-(dd-2*Wd-Ht);}x+=(Math.random()-.5)*9;y+=(Math.random()-.5)*9;k?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();g.restore();}
  if(!st.winSeq){const ox=48,oy=T0+130,pl=1+.1*Math.sin(st.frame*.3);g.save();g.translate(ox,oy);g.scale(pl,pl);const og=g.createRadialGradient(-5,-6,2,0,0,22);og.addColorStop(0,'#fff');og.addColorStop(.5,col(0));og.addColorStop(1,'#0a1a2a');g.fillStyle=og;g.shadowColor=col(0);g.shadowBlur=20;g.beginPath();g.arc(0,0,21,0,Math.PI*2);g.fill();g.shadowBlur=0;
   g.fillStyle='#04121e';g.font='italic 900 17px "Arial Black",Impact,sans-serif';g.fillText('×'+m,0,6);g.restore();}}}
 if(st.winSeq)drawWinSeq(g,L+8,T0+8,Wd-16,Ht-16);
 if(st.payout)drawPayout(g,L+8,T0+8,Wd-16,Ht-16);
}
// freeze: the LCD monitor alone goes dead (power-cut look), then switches back on like an old CRT with a golden burst
function drawFreeze(g,x,y,w,hh){const f=st.freeze,t=f.t,cx=x+w/2,cy=y+hh/2;
 g.save();rr(g,x+4,y+4,w-8,hh-8,14);g.clip();g.fillStyle='#000';g.fillRect(x,y,w,hh);
 if(t<6){g.fillStyle='#fff';g.globalAlpha=(6-t)/6*.6;g.fillRect(x,y,w,hh);g.globalAlpha=1;}
 // faint scanlines on the dead glass
 g.fillStyle='#ffffff06';for(let yy=y;yy<y+hh;yy+=3)g.fillRect(x,yy,w,1);
 const on=f.len-24;
 if(t>=on){const k=(t-on)/24;
  if(k<.45){const lh=2+k/.45*4;g.fillStyle='#fff';g.shadowColor='#fff';g.shadowBlur=20;g.fillRect(cx-w/2*(k/.45),cy-lh/2,w*(k/.45),lh);g.shadowBlur=0;}
  else{const k2=(k-.45)/.55;g.fillStyle='#fff';g.fillRect(x,cy-hh/2*k2,w,hh*k2);const gg=g.createRadialGradient(cx,cy,10,cx,cy,w/1.5);gg.addColorStop(0,'#fff8d0');gg.addColorStop(1,'#ffb21e');g.globalAlpha=k2;g.fillStyle=gg;g.fillRect(x,y,w,hh);g.globalAlpha=1;
   g.font='italic 900 '+(40+k2*20)+'px "Arial Black",Impact,sans-serif';g.lineWidth=7;g.strokeStyle='#5a2a00';g.strokeText('★',cx,cy+22);g.fillStyle='#fff';g.fillText('★',cx,cy+22);}}
 g.restore();}
function drawWinFx(g){
 const f=st.winFx;if(!f)return;const t=f.t;
 if(t<10){g.globalAlpha=(1-t/10)*(f.big?.75:.45);g.fillStyle='#fff';g.fillRect(-10,-10,W+20,H+20);g.globalAlpha=1;}
 if(t<60)for(let i=0;i<(f.big?4:3);i++){const r=t*9+i*34;g.globalAlpha=Math.max(0,1-t/60);g.strokeStyle=f.rainbow?rainbow(i*60):i%2?'#fff4d6':'#ffd36b';g.lineWidth=6-i;g.beginPath();g.arc(W/2,148,r,0,Math.PI*2);g.stroke();}
 g.globalAlpha=1;
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
  if(q&&!flying){const c=q.hold?EXP_COLORS[q.hold]:'#e8f4ff';const gr=g.createRadialGradient(x+off-3,y-3,1,x+off,y,10);gr.addColorStop(0,'#fff');gr.addColorStop(1,c);g.fillStyle=gr;g.beginPath();g.arc(x+off,y,7,0,Math.PI*2);g.fill();if(q.hold>=2){g.strokeStyle=c;g.lineWidth=2;g.beginPath();g.arc(x+off,y,12+Math.sin(st.frame*.15)*1.5,0,Math.PI*2);g.stroke();}
   if(q.mult>1){const mc=q.mult>=4?`hsl(${(st.frame*6+i*40)%360},100%,65%)`:'#7ff0ff',sz=q.up?1+q.up/24*.8:1;if(q.up)q.up--;
    g.strokeStyle=mc;g.lineWidth=2.5;g.shadowColor=mc;g.shadowBlur=10;g.beginPath();g.arc(x+off,y,10*sz,0,Math.PI*2);g.stroke();g.shadowBlur=0;
    g.fillStyle=mc;g.font=`900 ${Math.round(10*sz)}px Arial,sans-serif`;g.fillText('×'+q.mult,x+off,y+(q.mult>=4?-13:-12)*sz);g.font='800 9px Arial,sans-serif';}}}
 {const n2=st.queue.filter(q=>q.mult===2).length,n4=st.queue.filter(q=>q.mult===4).length;if(n2||n4){g.textAlign='left';g.fillStyle=n4?'#ff9ae8':'#7ff0ff';g.font='900 10px Arial,sans-serif';g.fillText(n4?'3周目':'2周目',W/2+114,252);g.textAlign='center';}}
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
 // floor medals lie flat; medals in the top layer (c.l===1) sit one medal higher, tipped toward what holds them up
 const lower=sim.coins.filter(c=>!c.ball);
 lower.forEach(c=>{const z=c.fresh?(c.fall?c.fresh*1.1:c.fresh>16?(c.fresh-16)*2.4:c.fresh*.12):0,top=c.l===1,off=Math.hypot(c.sx||0,c.sy||0);
  const tilt=top?Math.min(.16,off/S.R*.22):0,spin=top&&off>.01?Math.atan2(c.sy,c.sx)+Math.PI/2:c.x;
  coins.push(coinItem(c.x,c.y,z+(top?1.25:0),z>0&&!top?.4:tilt,spin,col));});
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
 for(const b of balls)if(b[1]>face&&!b[8])sh(b[0],b[1],0,S.BALL_R*1.3);
 // payout apron: medals sliding on the slanted panel, the ones dropping into START, and the flippers
 const flips=[];
 for(const c of st.apron.coins){const p=apronPos(c.u,c.v,.75);coins.push([...p,S.R,S.R,1.4,0,c.id||0,AP_TILT,...col]);}
 for(const k of st.apSink){const q=k.t/18,p=apronPos(k.u+(AP.HOLE.u-k.u)*Math.min(1,q*2),k.v+(AP.HOLE.v-k.v)*Math.min(1,q*2),.75-q*.6),sc=S.R*(1-q*.7);coins.push([...p,sc,sc,1.4,0,0,AP_TILT,col[0]*(1-q*.7),col[1]*(1-q*.7),col[2]*(1-q*.7)]);}
 for(let i=0;i<2;i++){const f=AP.FLIP[i],th=st.apron.ang[i],dir=i?-1:1,on=!st.cc[i].lit;flips.push([...apronPos(f.u,f.v,0),f.len,AP.FLIP_W*2,2.6,0,Math.atan2(Math.sin(th),dir*Math.cos(th)),AP_TILT,...(on?[1,.62,.9]:[.86,.9,.95])]);
  coins.push([...apronPos(f.u,f.v,2.9),2.1,2.1,.9,0,0,AP_TILT,1,.78,.3]);}
 for(const b of st.ballFalls){const p=apronPos(b.u,b.v,S.BALL_R+b.h);balls.push([...p,S.BALL_R,S.BALL_R,S.BALL_R,b.spin,0,AP_TILT,...BALL_C]);}
 const apron={flips,panel:[...apronPos(0,0,-1.2),100,AP.L,1.2,0,0,AP_TILT,.2,.07,.32],info:[AP.U0,AP.U1-AP.U0,AP.L,AP.HOLE.u,AP.HOLE.v,AP.HOLE.cup,HOLE_VIS,st.gateFlash>0?1:0]};
 return {t:st.frame,coins,balls,shadows,face,apron,sideHoles:S.SIDE_HOLES,fever:!!(st.fever||st.feverLeft>0),kak,wall:sim.wall>0,backY:BACK_Y,stageBack:STAGE_BACK,rampTop:RAMP_TOP,rampZ0:rampZ(STAGE_BACK),rampZ1:rampZ(RAMP_TOP),pusherH:PUSHER_H,wallH:WALL_H,gutter:S.GUTTER};
}
function ensureGL(){if(st.gl!==undefined)return st.gl;let r=null;try{if(typeof Pusher3D!=="undefined"&&!/[?&]gl=0/.test(location.search))r=Pusher3D.create(W,H,CAM);}catch(e){console.warn(e);r=null;}return st.gl=r;}
function drawField(g){
 const gl=st.gl;
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
 if(!gl){const pieces=sim.coins.slice().sort((a,b)=>(a.l|0)-(b.l|0)||a.y-b.y);
 for(const c of pieces){if(c.ball)ball3d(g,c.x,c.y,c.fresh?c.fresh*.6:0);else{const z=c.fresh?(c.fall?c.fresh*1.1:c.fresh>16?(c.fresh-16)*2.4:c.fresh*.12):0;if(z>1)shadow(g,c.x,c.y,S.R*.9,.25);coin3d(g,c.x,c.y,z+(c.l===1?1.25:0));}}}
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
  for(let i=0;i<12;i++){const y=BACK_Y+(100-BACK_Y)*i/11,q=P(x,y,WALL_H);g.beginPath();g.arc(q[0],q[1],3.2,0,Math.PI*2);{const hh=st.reel?st.reel.heat||0:0;g.fillStyle=st.freeze?'#111':live||hh?((i+(st.frame>>(hh>=3||st.winFx?1:2)))%3===0?'#fff':hh>=4||st.winFx&&st.winFx.rainbow?rainbow(i*30):st.winFx||st.winSeq?'#ffd36b':hh?HEAT_COLORS[hh]:fever?'#ffb21e':kak?'#ff7ae0':'#7ff0ff'):'#24384a';}g.fill();}}
 // tray below the payout apron
 {const bl=apronP(-4,AP.L),br=apronP(104,AP.L),tl=gl?bl:P(-2,101,-4),tr=gl?br:P(102,101,-4);gr=g.createLinearGradient(0,tl[1],0,H);gr.addColorStop(0,'#2a1a08');gr.addColorStop(1,'#0a0604');g.fillStyle=gr;
  g.beginPath();g.moveTo(...tl);g.lineTo(...tr);g.lineTo(tr[0]+(gl?0:6),H);g.lineTo(tl[0]-(gl?0:6),H);g.closePath();g.fill();}
 if(!gl){ // 2D fallback of the apron
  const c4=[apronP(AP.U0,0),apronP(AP.U1,0),apronP(AP.U1,AP.L),apronP(AP.U0,AP.L)];g.fillStyle='#2a0c40';g.beginPath();c4.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.closePath();g.fill();g.strokeStyle='#d9b56a';g.lineWidth=2;g.stroke();
  const [hx,hy]=startPos(),sc=Math.abs(apronP(51,AP.HOLE.v)[0]-hx);g.fillStyle='#d9a83a';g.beginPath();g.ellipse(hx,hy,AP.HOLE.cup*sc,AP.HOLE.cup*sc*.9,0,0,Math.PI*2);g.fill();g.fillStyle='#000';g.beginPath();g.ellipse(hx,hy,HOLE_VIS*sc,HOLE_VIS*sc*.9,0,0,Math.PI*2);g.fill();
  for(let i=0;i<2;i++){const [x0,y0,x1,y1]=S.flipSeg(st.apron,i),a0=apronP(x0,y0,1),a1=apronP(x1,y1,1);g.strokeStyle=st.cc[i].lit?'#b8c4d0':'#ffb0e8';g.lineWidth=7;g.lineCap='round';g.beginPath();g.moveTo(...a0);g.lineTo(...a1);g.stroke();g.lineCap='butt';}
  for(const c of st.apron.coins){const q=apronP(c.u,c.v,.7),w=S.R*2*sc;g.drawImage(st.coin,q[0]-w/2,q[1]-w*.48,w,w*.96);}
  for(const b of st.ballFalls){const q=apronP(b.u,b.v,S.BALL_R+b.h),w=S.BALL_R*2*sc;g.drawImage(st.ballImg,q[0]-w/2,q[1]-w/2,w,w);}}
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
 g.fillStyle='#ffd36b';g.font='italic 900 13px "Arial Black",sans-serif';g.textAlign='left';g.fillText('FEVER GAME'+(j.jpCount?'  JP×'+j.jpCount:''),ox,top+14);g.textAlign='center';
 g.font='italic 900 30px "Arial Black",Impact,sans-serif';g.lineWidth=6;g.strokeStyle='#000';const wt='TOTAL '+yen(j.total);g.strokeText(wt,W/2,top+40);g.fillStyle='#fff1a0';g.fillText(wt,W/2,top+40);
 const prog=j.gateOpen?1:Math.min(1,(j.hits-j.gateFrom)/FS.GATE_HITS),gw=FS.W*sc,gy=top+46,near=!j.gateOpen&&prog>=.75;
 g.fillStyle='#1a2430';g.fillRect(ox,gy-3,gw,7);
 const gg=g.createLinearGradient(ox,0,ox+gw,0);gg.addColorStop(0,'#3ab8ff');gg.addColorStop(.7,'#b06aff');gg.addColorStop(1,'#ff4a6a');g.fillStyle=j.gateOpen?(st.frame%10<5?'#ff4a6a':'#ffd36b'):gg;if(near){g.shadowColor='#ff6a80';g.shadowBlur=8+6*Math.sin(st.frame*.4);}g.fillRect(ox,gy-3,gw*prog,7);g.shadowBlur=0;
 g.fillStyle='#02050a';for(let i=1;i<4;i++)g.fillRect(ox+gw*i/4-1,gy-3,2,7);
 g.textAlign='right';g.font='900 10px Arial,sans-serif';g.fillStyle=j.gateOpen?(st.frame%16<8?'#ff8aa0':'#ffd36b'):near?'#ff9ae8':'#9fd8ff';g.fillText(j.gateOpen?'JP CHANCE OPEN!':'JP CHANCE まで あと '+Math.max(0,FS.GATE_HITS-(j.hits-j.gateFrom))+' 回',ox+gw,top+14);g.textAlign='center';
 // frame
 g.strokeStyle='#d9b56a';g.lineWidth=3;g.strokeRect(X(0),Y(0),FS.W*sc,FS.H*sc);
 const op=j.gateOpen&&!j.jpc,gr=g.createLinearGradient(0,Y(0),0,Y(FS.H));gr.addColorStop(0,op?'#3a0a2a':'#0c1a3a');gr.addColorStop(1,op?'#1a0410':'#120618');g.fillStyle=gr;g.fillRect(X(0),Y(0),FS.W*sc,FS.H*sc);
 if(op){g.save();g.beginPath();g.rect(X(0),Y(0),FS.W*sc,FS.H*sc);g.clip();g.translate(X(FS.HOLE.x),Y(FS.HOLE.y));g.rotate(st.frame*.02);for(let i=0;i<12;i++){g.rotate(Math.PI/6);g.fillStyle=i%2?'#ff4a6a14':'#ffd36b12';g.beginPath();g.moveTo(0,0);g.lineTo(400,-40);g.lineTo(400,40);g.closePath();g.fill();}g.restore();
  for(let i=0;i<36;i++){const per=2*(FS.W+FS.H),d=i/36*per;let x,y;if(d<FS.W){x=d;y=0;}else if(d<FS.W+FS.H){x=FS.W;y=d-FS.W;}else if(d<2*FS.W+FS.H){x=2*FS.W+FS.H-d;y=FS.H;}else{x=0;y=per-d;}g.fillStyle=(i+(st.frame>>2))%3===0?'#fff':'#ff4a6a';g.beginPath();g.arc(X(x),Y(y),2.6,0,Math.PI*2);g.fill();}}
 if(j.openFx>0){j.openFx--;const k=1-j.openFx/50;g.strokeStyle='#ff6a80';g.lineWidth=5*(1-k)+1;g.globalAlpha=1-k;g.beginPath();g.arc(X(FS.HOLE.x),Y(FS.HOLE.y),FS.HOLE.r*sc*(1+k*8),0,Math.PI*2);g.stroke();g.globalAlpha=k<.2?(.2-k)*3:0;g.fillStyle='#fff';g.fillRect(X(0),Y(0),FS.W*sc,FS.H*sc);g.globalAlpha=1;}
 if(j.clearFx>0){j.clearFx--;g.globalAlpha=j.clearFx/60*.5;g.fillStyle='#7ff0ff';g.fillRect(X(0),Y(FS.BLOCK_Y)-20,FS.W*sc,FS.H*sc-(FS.BLOCK_Y*sc)+20);g.globalAlpha=1;}
 if(j.jpc){drawDish(g,j,X(50),Y(70),Math.min(FS.W*sc,FS.H*sc*.9)/2-8);}
 else{
  // JPC hole
  const H0=FS.HOLE,open=j.gateOpen,hx=X(H0.x),hy=Y(H0.y),hr=H0.r*sc;
  if(open){g.save();g.shadowColor='#ff4a6a';g.shadowBlur=26+10*Math.sin(st.frame*.3);g.beginPath();g.arc(hx,hy,hr+3,0,Math.PI*2);g.fillStyle='#ff4a6a';g.fill();g.restore();
   g.save();g.translate(hx,hy);g.rotate(st.frame*.08);g.setLineDash([5,5]);g.strokeStyle='#ffd36b';g.lineWidth=2.5;g.beginPath();g.arc(0,0,hr+9,0,Math.PI*2);g.stroke();g.restore();
   const by=hy-hr-16-Math.abs(Math.sin(st.frame*.15))*6;g.fillStyle='#ffd36b';g.beginPath();g.moveTo(hx,by+10);g.lineTo(hx-7,by);g.lineTo(hx+7,by);g.closePath();g.fill();}
  else{const p=Math.min(1,(j.hits-j.gateFrom)/FS.GATE_HITS);g.strokeStyle='#ff6a80';g.lineWidth=3;g.beginPath();g.arc(hx,hy,hr+5,-Math.PI/2,-Math.PI/2+Math.PI*2*p);g.stroke();}
  g.beginPath();g.arc(hx,hy,hr,0,Math.PI*2);g.fillStyle=open?'#000':'#0a0f18';g.fill();g.lineWidth=3;g.strokeStyle=open?(st.frame%20<10?'#ff4a6a':'#ffd36b'):'#3a4a5a';g.stroke();
  if(open){g.fillStyle='#ff8aa0';g.font='900 11px Arial,sans-serif';g.fillText('JP',hx,hy+4);}
  else{// the countdown sits right on the locked hole: hits left until it opens
   const left=Math.max(0,FS.GATE_HITS-(j.hits-j.gateFrom)),pop=j.hitPop>0?1+j.hitPop/10*.35:1;if(j.hitPop>0)j.hitPop--;
   g.save();g.translate(hx,hy+1);g.scale(pop,pop);g.font='italic 900 '+(left>=10?15:18)+'px "Arial Black",Impact,sans-serif';g.lineWidth=4;g.strokeStyle='#000';g.strokeText(left,0,6);g.fillStyle=left<=10?(st.frame%10<5?'#ff6a80':'#ffd36b'):'#ffffff';g.fillText(left,0,6);g.restore();
   g.font='900 9px Arial,sans-serif';g.lineWidth=3;g.strokeStyle='#000';g.strokeText('JP まで あと',hx,hy-hr-9);g.fillStyle='#ffb0c0';g.fillText('JP まで あと',hx,hy-hr-9);g.strokeText('回',hx,hy+hr+15);g.fillText('回',hx,hy+hr+15);}
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
 const d=j.jpc,D=FS.DISHES[d.stage],k=R/D.R,X=v=>cx+v*k,Y=v=>cy+v*k*.82,stage2=d.stage>=1,gold=d.stage>=2,tc=gold?'#ffd36b':stage2?'#ff4a6a':'#ffd36b';
 // rays and sweeping spotlights behind the dish
 g.save();g.translate(cx,cy);g.rotate(st.frame*(.02+(j.tease||0)*.06));for(let i=0;i<16;i++){g.rotate(Math.PI/8);g.fillStyle=gold?`hsla(${(st.frame*4+i*22)%360},100%,60%,.12)`:i%2?tc+'1e':'#ffffff0e';g.beginPath();g.moveTo(0,0);g.lineTo(420,-38);g.lineTo(420,38);g.closePath();g.fill();}g.restore();
 for(let i=0;i<2;i++){const a=Math.sin(st.frame*.03+i*Math.PI)*.6,x0=cx+(i?1:-1)*R*1.6;const sg=g.createLinearGradient(x0,cy-R*2,cx+Math.sin(a)*R,cy);sg.addColorStop(0,'#ffffff00');sg.addColorStop(1,tc+'33');g.fillStyle=sg;g.beginPath();g.moveTo(x0-8,cy-R*2.2);g.lineTo(x0+8,cy-R*2.2);g.lineTo(cx+Math.sin(a)*R+40,cy+R*.6);g.lineTo(cx+Math.sin(a)*R-40,cy+R*.6);g.closePath();g.fill();}
 // bowl with a rim (slightly tilted for depth)
 for(let t=10;t>0;t-=2){g.fillStyle=t>2?'#3a1420':stage2?'#ff4a6a':'#ffd36b';g.beginPath();g.ellipse(cx,cy+t,R+10,(R+10)*.82,0,0,Math.PI*2);g.fill();}
 const gr=g.createRadialGradient(cx,cy,R*.1,cx,cy,R);gr.addColorStop(0,stage2?'#5a0a1a':'#0a2a4a');gr.addColorStop(.7,stage2?'#2a0610':'#061a30');gr.addColorStop(1,'#000');
 g.fillStyle=gr;g.beginPath();g.ellipse(cx,cy,R,R*.82,0,0,Math.PI*2);g.fill();
 // rim lamps
 for(let i=0;i<28;i++){const a=i*Math.PI*2/28;g.fillStyle=(i+(st.frame>>2))%4===0?'#fff':stage2?'#ff4a6a':'#ffd36b';g.beginPath();g.arc(cx+Math.cos(a)*(R+6),cy+Math.sin(a)*(R+6)*.82,2.4,0,Math.PI*2);g.fill();}
 // centre dome
 const dg=g.createRadialGradient(cx-6,cy-6,2,cx,cy,11*k);dg.addColorStop(0,'#fff6d0');dg.addColorStop(1,stage2?'#8a1020':'#8a6010');g.fillStyle=dg;g.beginPath();g.ellipse(cx,cy,11*k,11*k*.82,0,0,Math.PI*2);g.fill();
 // holes (rotating ring)
 D.holes.forEach((v,i)=>{const [hx,hy]=FS.holePos(D,d,i),x=X(hx),y=Y(hy),hr=4.3*k,isJ=FS.isJP(v),isU=v==='UP',JC=isJ?JPS[v]:null;
  g.fillStyle='#000';g.beginPath();g.ellipse(x,y,hr,hr*.82,0,0,Math.PI*2);g.fill();
  g.strokeStyle=isJ?(st.frame%20<10?JC.col:'#fff1c4'):isU?'#c08aff':v==='BLOCK'?'#7ff0ff':'#ffd36b';g.lineWidth=isJ?3.5:2;if(isJ){g.shadowColor=JC.glow;g.shadowBlur=16;}g.stroke();g.shadowBlur=0;
  if(d.pocket===i&&st.frame%14<9){g.strokeStyle='#fff';g.lineWidth=4;g.beginPath();g.ellipse(x,y,hr+4,(hr+4)*.82,0,0,Math.PI*2);g.stroke();}
  const lx=X(hx*1.42),ly=Y(hy*1.42);g.fillStyle=isJ?JC.col:isU?'#e0c8ff':v==='BLOCK'?'#bff8ff':'#ffd36b';g.font=`900 ${isJ?11:11}px "Arial Black",Arial,sans-serif`;g.fillText(isJ?v:isU?'UP':v==='BLOCK'?'BLOCK':'+'+v,lx,ly+4);});
 // pins
 for(let i=0;i<D.pins;i++){const [px,py]=FS.pinPos(D,i);g.fillStyle='#e0e8f0';g.beginPath();g.arc(X(px),Y(py),2.6,0,Math.PI*2);g.fill();}
 // glowing trail
 if(j.dtrail)j.dtrail.forEach(([tx,ty],i)=>{g.globalAlpha=i/j.dtrail.length*.5;g.fillStyle=tc;g.beginPath();g.arc(X(tx),Y(ty),FS.BALL_R*k*(i/j.dtrail.length),0,Math.PI*2);g.fill();});g.globalAlpha=1;
 // ball with shadow
 const bx=X(d.x),by=Y(d.y),s2=FS.BALL_R*2*k*1.2;
 // tease: everything but the ball and the JP holes sinks into the dark, a red pulse beats
 if((j.tease||0)>.15){const tz=Math.min(1,j.tease);const vg=g.createRadialGradient(bx,by,R*.25,bx,by,R*1.6);vg.addColorStop(0,'#00000000');vg.addColorStop(1,'rgba(0,0,0,'+(.75*tz)+')');g.fillStyle=vg;g.fillRect(cx-R*2.2,cy-R*2.2,R*4.4,R*4.4);
  const hb=Math.abs(Math.sin(st.frame*(.15+tz*.2)));g.strokeStyle='#ff3a5a';g.globalAlpha=tz;g.lineWidth=3;g.shadowColor='#ff3a5a';g.shadowBlur=24;g.beginPath();g.ellipse(bx,by,s2*(1.2+hb),s2*(1.2+hb)*.82,0,0,Math.PI*2);g.stroke();g.shadowBlur=0;g.globalAlpha=1;
  D.holes.forEach((v,i)=>{if(!FS.isJP(v))return;const [hx,hy]=FS.holePos(D,d,i),hr=4.3*k;g.save();g.shadowColor=JPS[v].glow;g.shadowBlur=30;g.strokeStyle=JPS[v].col;g.lineWidth=4;g.beginPath();g.ellipse(X(hx),Y(hy),hr+3+hb*3,(hr+3+hb*3)*.82,0,0,Math.PI*2);g.stroke();g.restore();});}
 if(j.upFx>0){j.upFx--;const kk=1-j.upFx/40;g.globalAlpha=(1-kk)*.8;g.fillStyle='#fff';g.fillRect(cx-R*2.4,cy-R*2.4,R*4.8,R*4.8);g.globalAlpha=1;g.strokeStyle=tc;g.lineWidth=6*(1-kk);g.beginPath();g.ellipse(cx,cy,R*(1+kk*1.5),R*(1+kk*1.5)*.82,0,0,Math.PI*2);g.stroke();}g.fillStyle='#0008';g.beginPath();g.ellipse(bx+2,by+4,s2*.45,s2*.2,0,0,Math.PI*2);g.fill();
 const sink=d.pocket!==null?Math.min(1,d.done/20):0;g.globalAlpha=1-sink*.6;g.drawImage(st.ballImg,bx-s2/2*(1-sink*.4),by-s2*.8*(1-sink*.4),s2*(1-sink*.4),s2*(1-sink*.4));g.globalAlpha=1;
 g.fillStyle=stage2?'#ff8aa0':'#9fd8ff';g.font='italic 900 17px "Arial Black",sans-serif';g.fillText(gold?'GOLD JP STAGE':stage2?'JP STAGE':'JP CHANCE  1st STAGE',cx,cy-R*.82-18);
 g.fillStyle='#fff4d6';g.font='900 14px "Courier New",monospace';g.fillText(d.stage===0?'UP で JP STAGE へ':d.stage===1?'BLUE '+yen(Math.floor(st.jps.BLUE))+'  /  RED '+yen(Math.floor(st.jps.RED)):'GOLD JP '+yen(Math.floor(st.jps.GOLD))+' 枚',cx,cy+R*.82+28);
}
function draw(){
 const g=st.g;g.save();g.clearRect(0,0,W,H);g.textAlign='center';g.textBaseline='alphabetic';
 let sdx=0,sdy=0;if(st.shake){const k=st.shake/10;sdx=(Math.random()-.5)*6*k;sdy=(Math.random()-.5)*6*k;g.translate(sdx,sdy);}
 const fever=!!(st.fever||st.feverLeft>0),kak=st.kak>0;
 const top=fever?'#2a1406':kak?'#1e0a2a':'#0a1622';
 {const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,top);gr.addColorStop(1,'#030609');g.fillStyle=gr;g.fillRect(-10,-10,W+20,H+20);}
 // the 3D field is rendered off-screen and copied in as one image (a single visible canvas works the same on every browser)
 {const gl=ensureGL();if(gl){try{gl.render(buildScene());g.drawImage(gl.canvas,0,0);}catch(e){console.warn('Pusher3D',e);st.gl=null;}}}
 drawLCD(g);drawField(g);if(st.jpl)drawJP(g);
 drawWinFx(g);
 if(st.winSeq)drawRelotFx(g);
 if(st.cut)drawCut(g);
 if(st.roul)drawRoul(g);
 for(const c of st.shower)g.drawImage(st.coin,c.x-c.s/2,c.y-c.s*.33,c.s,c.s*.66);
 for(const s of st.sparks){g.globalAlpha=Math.max(0,1-s.t/s.life);g.fillStyle=s.c;g.fillRect(s.x-2,s.y-2,4,4);}g.globalAlpha=1;
 st.pops.forEach((pp,i)=>{const life=pp.big?120:70,k=pp.t/life,sc=pp.t<10?0.6+pp.t/10*0.6:1.2-Math.min(.2,(pp.t-10)/50);g.globalAlpha=Math.min(1,(1-k)*1.8);
  g.save();const y=(pp.at?pp.at[1]:420)-k*30-(pp.at?0:i*44);g.translate(pp.at?pp.at[0]:W/2,y);g.scale(sc,sc);g.fillStyle=pp.jp?'#ff4a6a':pp.fever?'#ffd36b':pp.chance?'#7ff0ff':'#fff1a0';g.font=`italic 900 ${pp.big?50:pp.small?16:pp.chance?(pp.at?20:28):36}px "Arial Black",Impact,sans-serif`;g.lineWidth=7;g.strokeStyle='#000b';g.strokeText(pp.text,0,0);g.fillText(pp.text,0,0);g.restore();g.globalAlpha=1;});
 g.restore();
}
function close(){if(!st)return;WorldSound.bgm(null);cancelAnimationFrame(st.raf);clearInterval(st.timer);if(st.hold)clearInterval(st.hold);
 // everything already won is resolved now and poured onto the field, so nothing paid for is lost
 for(const f of st.falling)st.upper.coins.push({x:Math.max(S.R,Math.min(100-S.R,f.x+f.dx)),y:STAGE_BACK+S.R+.5});
 for(const f of st.flights)if(!f.ball){st.upper.coins.push({x:f.x1,y:STAGE_BACK+S.R+.5});f.done=true;}
 st.flights=st.flights.filter(f=>!f.done);
 for(const f of st.flights)st.sim.coins.push(f.ball?{x:f.x1,y:Math.max(f.y1,st.sim.face+S.BALL_R+.5),ball:true}:{x:f.x1,y:Math.max(f.y1,st.sim.face+S.R+.5)});
 let rain=st.rain;if(st.cut&&st.cut.kind==='result')rain+=st.cut.data.tot;st.cut=null;
 const jpVal=kind=>{const n=Math.floor(st.jps[kind]);st.jps[kind]=JPS[kind].base;return n;};
 if(st.jpl){const j=st.jpl;rain+=j.total;let g=0;while(!j.over&&g++<60*400){FS.step(j,Math.random);for(const e of j.events){if(e.type==='hit')rain+=e.pay;if(e.type==='pocket'){if(FS.isJP(e.value))rain+=jpVal(e.value);else if(typeof e.value==='number')rain+=e.value;}}}}
 {const q=st.roulQ.slice();st.roulQ=[];if(st.roul){const r=st.roul,v=ROULS[r.kind].segs[r.i];if(r.t<ROUL_T)q.unshift(r.kind);else if(r.t<ROUL_T+40&&/^\d+$/.test(v))rain+=+v;st.roul=null;}
  for(let k=0;k<q.length;k++){const kind=q[k];if(!ROULS[kind])continue;const v=ROULS[kind].segs[rnd(16)];rain+=roulPrize(kind,v,false);}}
 for(let i=0;i<st.balls;i++)rain+=FS.simulate(Math.random,jpVal).total;
 const feverPay=()=>{let t=0;for(let i=0;i<S.FEVER_ROUNDS;i++)t+=S.FEVER_PAYS[rnd(S.FEVER_PAYS.length)];return t;};
 const apply=(name,add,grant,m=1)=>{const kb=st.kak>0?S.KAK_BONUS*m:0;if(name==='MISS')return;rain+=kb;if(name==='BALL'){for(let b=0;b<m;b++)S.addBall(st.sim);}else if(name==='SEVEN'){st.kak++;rain+=feverPay()*m;}else{rain+=add*m;st.kak=grant?st.kak+1:0;}};
 if(st.fever)rain+=st.fever.pay;
 for(let i=0;i<st.feverLeft;i++)rain+=S.FEVER_PAYS[rnd(S.FEVER_PAYS.length)];
 if(st.reel)apply(st.reel.name,st.reel.add,st.reel.grant,st.reel.mult||1);if(st.winSeq){const q=st.winSeq;st.winSeq=null;if(q.name==='SEVEN'){rain+=feverPay()*q.m+q.kb*q.m+q.cb;}else if(q.name==='BALL'){for(let b=0;b<q.m;b++)S.addBall(st.sim);rain+=q.kb*q.m;}else rain+=q.total;st.kak=q.nk;}
 for(const q of st.queue)apply(q.name,q.add,q.grant,q.mult||1);
 S.scatter(st.sim,Math.min(rain,420));save();st=null;
 if(pending.spent+pending.won>0)settle();else{walletHold=false;renderProfile();}}
window.addEventListener('pagehide',()=>{if(st)save();});
return {open,close};
})();
