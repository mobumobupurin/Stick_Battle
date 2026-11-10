// ========================================================
// ⑬ 入力（スティック・ボタン・キーボード）
// ========================================================
const touch={j:false,a:false,s:false,c:false,x:false,v:false,g:false,h:false};
const press={j:false,a:false,s:false,c:false,x:false,v:false,g:false,h:false};
const heldKeys=new Set(),st={x:0,y:0};
const stickEl=document.getElementById('stick'),knob=document.getElementById('knob'),stickZone=document.getElementById('stick-zone');
let stickId=null,scx=0,scy=0,stickUp=false,inputUnfocused=false;
// Direction + B is the default touch scheme. Capture direction when B is pressed:
// a very fast two-finger tap must keep the intended special until readHuman().
let specialTouchDirection='',specialTapDirection='';
function directionTouchEnabled(){return typeof prefs!=='undefined'&&prefs.specialInput==='direction';}
function touchStickSpecialDirection(){
  const x=st.x,y=st.y;
  // The dominant stick axis wins; avoid accidental diagonals.
  if(Math.abs(x)<.35&&Math.abs(y)<.55)return '';
  if(Math.abs(y)>.55&&Math.abs(y)>=Math.abs(x))return y<0?'u':'d';
  if(Math.abs(x)>.35)return x<0?'l':'r';
  return '';
}
function capturedTouchSpecialDirection(){
  if(!directionTouchEnabled())return '';
  return touch.s?specialTouchDirection:press.s?specialTapDirection:'';
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
 if(key==='s'){
   if(press.s&&directionTouchEnabled())specialTapDirection=specialTouchDirection;
   specialTouchDirection='';
 }
 const id=buttonPointers.get(key),b=document.getElementById(controlButtons[key]);buttonPointers.delete(key);touch[key]=false;b.classList.remove('on');if(id!==undefined)safelyRelease(b,id);
}
function resetTouch(){
 endStick();specialTouchDirection='';specialTapDirection='';for(const key of Object.keys(controlButtons))releaseButton(key);for(const k in press)press[k]=false;heldKeys.clear();neutralHuman(true);
}
stickZone.addEventListener('pointerdown',e=>{
 if(stickId!==null||scene!=='battle')return;e.preventDefault();inputUnfocused=false;stickId=e.pointerId;safelyCapture(stickZone,e.pointerId);
 scx=e.clientX;scy=e.clientY;const r=stickZone.getBoundingClientRect();stickEl.style.transform=`translate(${scx-r.left-r.width/2}px,${scy-r.top-r.height/2}px)`;moveStick(e);
});
stickZone.addEventListener('pointermove',e=>{if(e.pointerId!==stickId)return;if(e.pointerType==='mouse'&&e.buttons===0){endStick(e);return;}moveStick(e);});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])stickZone.addEventListener(ev,e=>{endStick(e);});
function bindButton(id,key){const b=document.getElementById(id);b.setAttribute('aria-label',b.textContent.trim());
 b.addEventListener('pointerdown',e=>{if(buttonPointers.has(key)||scene!=='battle')return;e.preventDefault();inputUnfocused=false;buttonPointers.set(key,e.pointerId);touch[key]=true;press[key]=true;
   if(key==='s'){specialTouchDirection=directionTouchEnabled()?touchStickSpecialDirection():'';specialTapDirection=specialTouchDirection;}
   b.classList.add('on');safelyCapture(b,e.pointerId);});
 const off=e=>{if(buttonPointers.get(key)===e.pointerId){if(e.type!=='pointerup')cancelControl(key);releaseButton(key);}};
 for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,off);
 b.addEventListener('contextmenu',e=>e.preventDefault());
}
for(const [key,id]of Object.entries(controlButtons))bindButton(id,key);
function endPointerGlobally(e){
 if(e.pointerId===stickId)endStick(e);
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

  const touchB=touch.s||press.s;
  const directionMode=directionTouchEnabled();
  const capturedDir=capturedTouchSpecialDirection();
  // Only the special press edge overrides directions; holding B does not lock movement.
  const specialEdge=directionMode&&touchB&&!raw.s;
  const touchUp=specialEdge&&capturedDir==='u',touchDown=specialEdge&&capturedDir==='d';
  const touchLeft=specialEdge&&capturedDir==='l',touchRight=specialEdge&&capturedDir==='r';
  // Tilt up + B is an up-special, NOT an unintended jump.
  const j = touch.j || press.j || (stickUp&&!touchUp) || kd(32) || kd(87) || kd(UP_ARROW) || gpJump;
  const a = touch.a || press.a || kd(74) || kd(90) || gpAttack;
  const s = touch.h || press.h || touch.g || press.g || touch.v || press.v || touchB || kd(75) || kd(88) || gpSpecial;
  const c = touch.c || press.c || kd(76) || kd(67) || gpCounter;
  const x = false;

  // Preserve keyboard/gamepad behavior. On the B edge the captured stick vector
  // takes precedence even if the user lifted the other thumb before this frame.
  const normalLeft=st.x < -0.35 || kd(65) || kd(LEFT_ARROW) || gpLeft;
  const normalRight=st.x > 0.35 || kd(68) || kd(RIGHT_ARROW) || gpRight;
  hin.l=touchLeft?true:touchRight?false:normalLeft;
  hin.r=touchRight?true:touchLeft?false:normalRight;
  hin.u=touchUp || touch.v || press.v || st.y < -0.55 || kd(87) || kd(UP_ARROW) || gpUp;

  // A down-special must not simultaneously trigger a platform drop.
  const down=st.y > 0.55 || kd(83) || kd(DOWN_ARROW) || gpDown;
  const downForDrop=down&&!touchDown;
  hin.d=touchDown||down;
  hin.gd=touchDown||touch.g||press.g;
  hin.neutralSpecial=touchB?(!directionMode||capturedDir===''):false;
  hin.sideSpecial=touchLeft?-1:touchRight?1:(touch.h||press.h)?(byId(myId)?.f||1):0;

  if (j && !raw.j) hin.jc++;
  if (a && !raw.a) hin.ac++;
  if (!a && raw.a) hin.rc++;
  if (s && !raw.s) hin.sc++;
  if (c && !raw.c) hin.cc++;
  if (x && !raw.x) hin.xc++;
  if (downForDrop && !raw.d) hin.dc++;

  hin.a = a; hin.s = s;
  raw.j = j; raw.a = a; raw.s = s; raw.c = c; raw.x = x; raw.d = downForDrop;
  for (const key in press) press[key]=false;
  specialTapDirection='';
}

