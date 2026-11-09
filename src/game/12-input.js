// ========================================================
// ⑬ 入力（スティック・ボタン・キーボード）
// ========================================================
const touch={j:false,a:false,s:false,c:false,x:false,v:false,g:false,h:false};
const press={j:false,a:false,s:false,c:false,x:false,v:false,g:false,h:false};
const heldKeys=new Set(),st={x:0,y:0};
const stickEl=document.getElementById('stick'),knob=document.getElementById('knob'),stickZone=document.getElementById('stick-zone');
let stickId=null,scx=0,scy=0,stickUp=false,inputUnfocused=false;
const SPECIAL_SWIPE_THRESHOLD=19;
const SPECIAL_HOLD_DELAY=145;
let specialGesture=null;
let swipeSideDirection=0;
function swipeSpecialEnabled(){return typeof prefs!=='undefined'&&prefs.specialInput==='swipe';}
function specialGestureKey(dx,dy){
 if(Math.hypot(dx,dy)<SPECIAL_SWIPE_THRESHOLD)return '';
 if(Math.abs(dx)>Math.abs(dy)*1.12)return 'h';
 return dy<0?'v':'g';
}
function specialGestureTrigger(key,held=false){
 if(!key)return;
 const b=document.getElementById('btn-s');
 if(held){touch[key]=true;b.classList.add('on');}
 else press[key]=true;
}
function finishSpecialGesture(e,cancelled=false){
 const gesture=specialGesture;
 if(!gesture||e&&e.pointerId!==gesture.id)return;
 clearTimeout(gesture.timer);
 if(cancelled)cancelControl(gesture.fired||'s');
 if(!cancelled&&!gesture.fired){
  const dx=(e?.clientX??gesture.x)-gesture.x;
  const key=specialGestureKey(dx,(e?.clientY??gesture.y)-gesture.y)||'s';
  if(key==='h')swipeSideDirection=Math.sign(dx)||1;
  specialGestureTrigger(key);
 }
 if(gesture.fired){touch[gesture.fired]=false;if(!cancelled&&!gesture.ack)press[gesture.fired]=true;}
 specialGesture=null;
 const b=document.getElementById('btn-s');b.classList.remove('on');
 safelyRelease(b,gesture.id);
}
function bindSpecialSwipe(){
 const b=document.getElementById('btn-s');
 b.addEventListener('pointerdown',e=>{
  if(!swipeSpecialEnabled()||scene!=='battle'||specialGesture)return;
  e.preventDefault();inputUnfocused=false;safelyCapture(b,e.pointerId);
  const g={id:e.pointerId,x:e.clientX,y:e.clientY,fired:'',ack:false,timer:null};specialGesture=g;b.classList.add('on');
  // Holding still must work for characters with a chargeable neutral special.
  g.timer=setTimeout(()=>{if(specialGesture!==g||g.fired)return;g.fired='s';touch.s=true;},SPECIAL_HOLD_DELAY);
 });
 b.addEventListener('pointermove',e=>{
  const g=specialGesture;if(!g||g.id!==e.pointerId||g.fired)return;
  const key=specialGestureKey(e.clientX-g.x,e.clientY-g.y);
  if(!key)return;clearTimeout(g.timer);g.fired=key;if(key==='h')swipeSideDirection=Math.sign(e.clientX-g.x)||1;specialGestureTrigger(key,true);
 });
 for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,e=>{
  if(!specialGesture||specialGesture.id!==e.pointerId)return;
  finishSpecialGesture(e,name!=='pointerup');
 });
 b.addEventListener('contextmenu',e=>e.preventDefault());
}
const buttonPointers=new Map(),controlButtons={j:'btn-j',a:'btn-a',s:'btn-s',c:'btn-c',v:'btn-v',g:'btn-g',h:'btn-h'};
function editingText(el=document.activeElement){return !!el&&(el.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));}
function safelyCapture(el,id){try{el.setPointerCapture(id);}catch(_){} }
function safelyRelease(el,id){try{if(id!==null&&el.hasPointerCapture(id))el.releasePointerCapture(id);}catch(_){} }
function neutralHuman(cancelCharge=false){
 hin.l=hin.r=hin.u=hin.d=hin.a=hin.s=hin.gd=hin.neutralSpecial=false;hin.sideSpecial=0;
 for(const k in raw)raw[k]=false;
 for(const p of fighters){if(p.id!==myId||p.cpu)continue;p.prev={...hin};if(cancelCharge){p.ch=0;p.sph=0;}}
}
function moveStick(e){
 let dx=e.clientX-scx,dy=e.clientY-scy;const d=Math.hypot(dx,dy),m=36;if(d>m){dx*=m/d;dy*=m/d;}
 st.x=dx/m;st.y=dy/m;
 // Hysteresis: one jump on upward tilt, never repeated while the thumb stays up.
 if(st.y<-.58)stickUp=true;else if(st.y>-.30)stickUp=false;
 knob.style.transform=`translate(${dx}px,${dy}px)`;
}
function endStick(e){
 if(e&&e.pointerId!==stickId)return;const old=stickId;stickId=null;st.x=st.y=0;stickUp=false;
 knob.style.transform='';stickEl.style.transform='';safelyRelease(stickZone,old);
}
function releaseButton(key){
 const id=buttonPointers.get(key),b=document.getElementById(controlButtons[key]);buttonPointers.delete(key);touch[key]=false;b.classList.remove('on');if(id!==undefined)safelyRelease(b,id);
}
function resetTouch(){
 finishSpecialGesture(null,true);endStick();swipeSideDirection=0;for(const key of Object.keys(controlButtons))releaseButton(key);for(const k in press)press[k]=false;heldKeys.clear();neutralHuman(true);
}
stickZone.addEventListener('pointerdown',e=>{
 if(stickId!==null||scene!=='battle')return;e.preventDefault();inputUnfocused=false;stickId=e.pointerId;safelyCapture(stickZone,e.pointerId);
 scx=e.clientX;scy=e.clientY;const r=stickZone.getBoundingClientRect();stickEl.style.transform=`translate(${scx-r.left-r.width/2}px,${scy-r.top-r.height/2}px)`;moveStick(e);
});
stickZone.addEventListener('pointermove',e=>{if(e.pointerId!==stickId)return;if(e.pointerType==='mouse'&&e.buttons===0){endStick(e);return;}moveStick(e);});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])stickZone.addEventListener(ev,e=>{endStick(e);});
function bindButton(id,key){const b=document.getElementById(id);b.setAttribute('aria-label',b.textContent.trim());
 b.addEventListener('pointerdown',e=>{if(key==='s'&&swipeSpecialEnabled()||buttonPointers.has(key)||scene!=='battle')return;e.preventDefault();inputUnfocused=false;buttonPointers.set(key,e.pointerId);touch[key]=true;press[key]=true;b.classList.add('on');safelyCapture(b,e.pointerId);});
 const off=e=>{if(buttonPointers.get(key)===e.pointerId){if(e.type!=='pointerup')cancelControl(key);releaseButton(key);}};
 for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,off);
 b.addEventListener('contextmenu',e=>e.preventDefault());
}
for(const [key,id]of Object.entries(controlButtons))bindButton(id,key);
bindSpecialSwipe();
function endPointerGlobally(e){
 if(e.pointerId===stickId)endStick(e);
 if(specialGesture?.id===e.pointerId)finishSpecialGesture(e,e.type!=='pointerup');
 for(const [key,id]of [...buttonPointers])if(id===e.pointerId){if(e.type==='pointercancel')cancelControl(key);releaseButton(key);}
}
for(const ev of ['pointerup','pointercancel'])window.addEventListener(ev,endPointerGlobally,true);
window.addEventListener('touchend',e=>{if(!e.touches.length){endStick();for(const k of [...buttonPointers.keys()])releaseButton(k);}},{passive:true});
window.addEventListener('touchcancel',e=>{if(!e.touches.length)resetTouch();},{passive:true});
window.addEventListener('keydown',e=>{
 if(editingText(e.target)||e.isComposing||e.ctrlKey||e.metaKey||e.altKey||scene!=='battle')return;
 inputUnfocused=false;heldKeys.add(e.keyCode);if([32,37,38,39,40].includes(e.keyCode))e.preventDefault();
});
window.addEventListener('keyup',e=>heldKeys.delete(e.keyCode));
window.addEventListener('blur',()=>{inputUnfocused=true;resetTouch();});
window.addEventListener('focus',()=>{inputUnfocused=false;resetTouch();if(online)requestEventReplay();});
window.addEventListener('pagehide',resetTouch);let inputWidth=innerWidth,inputHeight=innerHeight;window.addEventListener('resize',()=>{if(Math.abs(innerWidth-inputWidth)>30||Math.abs(innerHeight-inputHeight)>170)resetTouch();inputWidth=innerWidth;inputHeight=innerHeight;});window.addEventListener('orientationchange',resetTouch);
document.addEventListener('focusin',e=>{if(editingText(e.target))resetTouch();});
document.addEventListener('visibilitychange',()=>{
 resetTouch();inputUnfocused=document.hidden;
 if(document.hidden){if(actx)actx.suspend().catch(()=>{});}else{if(actx)actx.resume().catch(()=>{});if(online)requestEventReplay();}
});
document.querySelectorAll('#bar button').forEach(b=>{if(b.id!=='btn-x')b.addEventListener('pointerdown',resetTouch);});

// ========================================================
// Switch Pro Controller / Gamepad
// Standard Gamepad mappingを基準にする。Switch Proコンでは通常、
// B=0 / A=1 / Y=2 / X=3 / L=4 / R=5 / ZL=6 / ZR=7 / 十字キー=12〜15 として扱われる。
// ========================================================
const GP_DEAD = 0.28;
let activeGamepadIndex = null;

window.addEventListener('gamepadconnected', e => {
  activeGamepadIndex = e.gamepad.index;
  console.log('Gamepad connected:', e.gamepad.id);
});
window.addEventListener('gamepaddisconnected', e => {
  if (activeGamepadIndex === e.gamepad.index) activeGamepadIndex = null;
});

function currentGamepad() {
  if (!navigator.getGamepads) return null;
  const pads = navigator.getGamepads();
  if (activeGamepadIndex !== null && pads[activeGamepadIndex]) return pads[activeGamepadIndex];
  for (const g of pads) {
    if (g && g.connected) { activeGamepadIndex = g.index; return g; }
  }
  return null;
}

function gpButton(g, i) {
  return !!(g && g.buttons && g.buttons[i] && g.buttons[i].pressed);
}

function readHuman() {
  if(scene!=='battle'||document.hidden||inputUnfocused||editingText()||settingsDialog.open){neutralHuman(true);return;}
  const kd = k => heldKeys.has(k);
  const gp = currentGamepad();
  const gx = gp && gp.axes.length > 0 ? gp.axes[0] : 0;
  const gy = gp && gp.axes.length > 1 ? gp.axes[1] : 0;

  // Switch Proコン（物理ボタン表記）:
  // Y/X/L/ZL=ジャンプ / A=攻撃 / B=特殊 / R・ZR=カウンター
  const gpJump = gpButton(gp, 2) || gpButton(gp, 3) || gpButton(gp, 4) || gpButton(gp, 6);
  const gpAttack = gpButton(gp, 1);
  const gpSpecial = gpButton(gp, 0);
  const gpCounter = gpButton(gp, 5) || gpButton(gp, 7);

  const gpLeft  = gx < -GP_DEAD || gpButton(gp, 14);
  const gpRight = gx >  GP_DEAD || gpButton(gp, 15);
  const gpUp    = gy < -0.55 || gpButton(gp, 12);
  const gpDown  = gy >  0.55 || gpButton(gp, 13);

  const j = touch.j || press.j || stickUp || kd(32) || kd(87) || kd(UP_ARROW) || gpJump;
  const a = touch.a || press.a || kd(74) || kd(90) || gpAttack;
  const s = touch.h || press.h || touch.g || press.g || touch.v || press.v || touch.s || press.s || kd(75) || kd(88) || gpSpecial;
  const c = touch.c || press.c || kd(76) || kd(67) || gpCounter;
  // PCではEだけ。ProコンではL/ZL。
  const x = false; // 捨てる操作は廃止（吹っ飛ばされた時だけ武器を落とす）

  hin.l = st.x < -0.35 || kd(65) || kd(LEFT_ARROW) || gpLeft;
  hin.r = st.x > 0.35 || kd(68) || kd(RIGHT_ARROW) || gpRight;
  hin.u = touch.v || press.v || st.y < -0.55 || kd(87) || kd(UP_ARROW) || gpUp;

  // 足場降り：スマホのスティック↓、PCのS/↓、Proコンのスティック↓/十字↓。
  const down = st.y > 0.55 || kd(83) || kd(DOWN_ARROW) || gpDown;
  hin.d = down;
  hin.gd = touch.g || press.g;
  hin.neutralSpecial=!!(touch.s||press.s);hin.sideSpecial=(touch.h||press.h)?(swipeSideDirection||(byId(myId)?.f||1)):0;

  if (j && !raw.j) hin.jc++;
  if (a && !raw.a) hin.ac++;
  if (!a && raw.a) hin.rc++;
  if (s && !raw.s) hin.sc++;
  if (c && !raw.c) hin.cc++;
  if (x && !raw.x) hin.xc++;
  if (down && !raw.d) hin.dc++;

  if(specialGesture?.fired)specialGesture.ack=true;
  hin.a = a; hin.s = s;
  raw.j = j; raw.a = a; raw.s = s; raw.c = c; raw.x = x; raw.d = down;
  if(!touch.h&&!press.h)swipeSideDirection=0;
  for (const key in press) press[key]=false;
}

