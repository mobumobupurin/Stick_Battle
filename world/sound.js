'use strict';
/* STICK ROYALE — synthesized casino sounds (Web Audio, no files). Muted state is remembered per browser. */
const WorldSound=(()=>{
 let ctx=null,master=null,muted=false;
 try{muted=localStorage.getItem('stick-royale-muted')==='1';}catch{}
 function ac(){if(muted)return null;if(!ctx){const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;ctx=new A();master=ctx.createGain();master.gain.value=.32;master.connect(ctx.destination);}if(ctx.state==='suspended')ctx.resume();return ctx;}
 function tone(freq,dur,{type='square',vol=.25,at=0,slide=0,attack=.004}={}){const c=ac();if(!c)return;const t=c.currentTime+at,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*slide),t+dur);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+attack);g.gain.exponentialRampToValueAtTime(.0008,t+dur);o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+.02);}
 function noise(dur,{vol=.2,at=0,hp=900}={}){const c=ac();if(!c)return;const t=c.currentTime+at,len=Math.ceil(c.sampleRate*dur),b=c.createBuffer(1,len,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();f.type='highpass';f.frequency.value=hp;g.gain.value=vol;s.buffer=b;s.connect(f);f.connect(g);g.connect(master);s.start(t);}
 const notes=[523.25,659.25,783.99,1046.5,1318.5,1567.98];
 const api={
  get muted(){return muted;},
  toggle(){muted=!muted;try{localStorage.setItem('stick-royale-muted',muted?'1':'0');}catch{}if(muted&&ctx)ctx.suspend();return muted;},
  button(){tone(880,.05,{type:'square',vol:.12});},
  coin(){tone(1318,.07,{type:'square',vol:.14});tone(1760,.12,{type:'square',vol:.12,at:.06});},
  spin(){noise(.35,{vol:.08,hp:2000});tone(220,.25,{type:'sawtooth',vol:.06,slide:2.5});},
  reelStop(i=0){tone(140-i*8,.09,{type:'square',vol:.22,slide:.6});noise(.05,{vol:.12,hp:3000});},
  tease(){for(let i=0;i<6;i++)tone(600+i*90,.12,{type:'triangle',vol:.1,at:i*.12});},
  tick(){tone(1760,.03,{type:'square',vol:.07});},
  win(level=1){const n=Math.min(6,2+level);for(let i=0;i<n;i++)tone(notes[i],.16,{type:'square',vol:.14,at:i*.075});},
  bigWin(){const seq=[0,2,4,3,5,4,5];seq.forEach((k,i)=>{tone(notes[k],.22,{type:'square',vol:.16,at:i*.13});tone(notes[k]/2,.22,{type:'triangle',vol:.12,at:i*.13});});noise(.6,{vol:.06,at:.9,hp:4000});},
  bonus(){[0,1,2,3,4,5,4,5].forEach((k,i)=>tone(notes[k],.14,{type:'square',vol:.15,at:i*.09}));},
  card(){noise(.08,{vol:.16,hp:1800});},
  chip(){tone(2400,.03,{type:'triangle',vol:.12});tone(1900,.04,{type:'triangle',vol:.1,at:.03});},
  lose(){tone(330,.18,{type:'triangle',vol:.1});tone(247,.26,{type:'triangle',vol:.1,at:.16});}
 };
 return api;
})();
