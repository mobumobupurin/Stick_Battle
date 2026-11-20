'use strict';
/* STICK CASINO — game speed for the card games (baccarat / blackjack / video poker). Remembered per browser. */
const WorldPace=(()=>{
 const LEVELS=[['slow','じっくり',1],['normal','ふつう',.55],['fast','はやい',.2]];
 let level='slow';try{const v=localStorage.getItem('stick-royale-pace');if(LEVELS.some(l=>l[0]===v))level=v;}catch{}
 const cur=()=>LEVELS.find(l=>l[0]===level);
 const listeners=new Set();
 const api={
  get level(){return level;},get label(){return cur()[1];},
  // scale a "じっくり" duration to the chosen speed
  ms(n){return Math.round(n*cur()[2]);},
  wait(n){return new Promise(r=>setTimeout(r,Math.round(n*cur()[2])));},
  set(v){if(!LEVELS.some(l=>l[0]===v))return;level=v;try{localStorage.setItem('stick-royale-pace',v);}catch{}listeners.forEach(f=>{try{f();}catch{}});},
  next(){const i=LEVELS.findIndex(l=>l[0]===level);api.set(LEVELS[(i+1)%LEVELS.length][0]);return level;},
  onChange(f){listeners.add(f);return ()=>listeners.delete(f);},
  // a small deck button that cycles the speed
  button(){const b=document.createElement('button');b.type='button';b.className='egm-btn egm-btn-small pace-btn';const paint=()=>{if(b.dataset.live&&!b.isConnected){off();return;}b.dataset.live=b.isConnected?'1':'';b.textContent='速度：'+api.label;b.setAttribute('aria-label','演出の速さ：'+api.label+'（押すと切り替え）');};paint();let off=()=>{};off=api.onChange(paint);b.onclick=()=>{api.next();try{WorldSound.button();}catch{}};b._off=off;return b;},
  LEVELS
 };
 return api;
})();
