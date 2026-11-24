'use strict';
/* STICK CASINO — synthesized casino sounds (Web Audio, no files). Muted state is remembered per browser. */
const WorldSound=(()=>{
 let ctx=null,master=null,muted=false;
 try{muted=localStorage.getItem('stick-royale-muted')==='1';}catch{}
 function ac(){if(muted)return null;if(!ctx){const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;ctx=new A();master=ctx.createGain();master.gain.value=.32;master.connect(ctx.destination);}if(ctx.state==='suspended')ctx.resume();return ctx;}
 function tone(freq,dur,{type='square',vol=.25,at=0,slide=0,attack=.004}={}){const c=ac();if(!c)return;const t=c.currentTime+at,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*slide),t+dur);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+attack);g.gain.exponentialRampToValueAtTime(.0008,t+dur);o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+.02);}
 function noise(dur,{vol=.2,at=0,hp=900}={}){const c=ac();if(!c)return;const t=c.currentTime+at,len=Math.ceil(c.sampleRate*dur),b=c.createBuffer(1,len,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();f.type='highpass';f.frequency.value=hp;g.gain.value=vol;s.buffer=b;s.connect(f);f.connect(g);g.connect(master);s.start(t);}
 const notes=[523.25,659.25,783.99,1046.5,1318.5,1567.98];
 let bgmName=null,bgmTimer=null,bgmStep=0,bgmNext=0;
 const hz=n=>440*Math.pow(2,(n-69)/12);
 // songs: 8th-note steps; chords are MIDI roots per bar (8 steps), lead is a per-step MIDI note list (0 = rest)
 const SONGS={
  normal:{bpm:92,vol:.05,chords:[57,53,60,55],lead:[0,76,0,74,72,0,69,0, 0,72,0,69,67,0,65,0, 0,72,74,76,79,0,76,0, 74,0,72,0,71,0,0,0],bass:'sine',leadType:'triangle'},
  kakuhen:{bpm:116,vol:.055,chords:[62,58,60,57],lead:[74,0,77,0,81,0,79,77, 74,0,77,0,79,81,0,0, 72,0,76,0,79,0,77,76, 74,0,73,0,74,0,0,0],bass:'triangle',leadType:'square'},
  fever:{bpm:144,vol:.06,chords:[60,65,67,60,57,65,67,67],lead:[72,76,79,84,79,76,72,76, 77,81,84,81,77,81,84,86, 79,83,86,91,86,83,79,83, 84,0,84,86,88,0,91,0],bass:'square',leadType:'square'},
  jpc:{bpm:128,vol:.06,chords:[45,45,46,46,47,47,48,48],lead:[0,0,69,0,0,0,70,0, 0,0,71,0,0,0,72,0, 0,0,73,0,74,0,75,0, 76,77,78,79,80,81,82,83],bass:'sawtooth',leadType:'square'}
 };
 function playStep(song,i,at){const bar=Math.floor(i/8)%song.chords.length,root=song.chords[bar],v=song.vol;
  if(i%2===0)tone(hz(root-12),60/song.bpm*.9,{type:song.bass,vol:v*1.2,at});
  if(i%4===2){tone(hz(root+4),.12,{type:'triangle',vol:v*.6,at});tone(hz(root+7),.12,{type:'triangle',vol:v*.6,at});}
  const n=song.lead[i%song.lead.length];if(n)tone(hz(n),60/song.bpm*.45,{type:song.leadType,vol:v*.9,at});
  if(song.bpm>=128&&i%2===1)noise(.03,{vol:v*.8,hp:6000,at});}
 const api={
  get muted(){return muted;},
  toggle(){muted=!muted;try{localStorage.setItem('stick-royale-muted',muted?'1':'0');}catch{}if(muted&&ctx)ctx.suspend();if(!muted&&bgmName){const n=bgmName;bgmName=null;api.bgm(n);}return muted;},
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
  // medal-corner extras
  reach(){for(let i=0;i<10;i++)tone(440+i*60,.09,{type:'sawtooth',vol:.07,at:i*.07});},
  heartbeat(){tone(70,.12,{type:'sine',vol:.35});tone(62,.14,{type:'sine',vol:.3,at:.16});},
  fanfare(){const seq=[[0,.12],[0,.12],[0,.12],[3,.36],[1,.18],[3,.18],[4,.5]];let t=0;seq.forEach(([k,d])=>{tone(notes[k],d,{type:'square',vol:.15,at:t});tone(notes[k]/2,d,{type:'triangle',vol:.12,at:t});t+=d*.9;});},
  // metallic medal sounds: bright partial pairs + a little noise, random pitch so a stream never sounds looped
  clink(v=1){const f=2600+Math.random()*1800;tone(f,.045,{type:'triangle',vol:.05*v});tone(f*1.52,.06,{type:'sine',vol:.035*v,at:.004});noise(.02,{vol:.03*v,hp:5000});},
  medalLand(){const f=1500+Math.random()*700;tone(f,.03,{type:'triangle',vol:.035});noise(.015,{vol:.025,hp:3000});},
  medalFall(n=1){const k=Math.min(6,n);for(let i=0;i<k;i++){const f=2200+Math.random()*2000,at=i*.028+Math.random()*.01;tone(f,.05,{type:'triangle',vol:.045,at});tone(f*1.47,.05,{type:'sine',vol:.03,at:at+.004});}noise(.04+k*.01,{vol:.035,hp:4200});},
  jingle(n=8){for(let i=0;i<n;i++){const f=2400+Math.random()*2200;tone(f,.05,{type:'triangle',vol:.04,at:i*.035+Math.random()*.015});}noise(.08+n*.02,{vol:.04,hp:4500});},
  coinRush(n=12){for(let i=0;i<n;i++){tone(1600+Math.random()*900,.05,{type:'square',vol:.06,at:i*.045});}},
  boom(){noise(.7,{vol:.25,hp:120});tone(90,.6,{type:'sine',vol:.4,slide:.4});},
  lose(){tone(330,.18,{type:'triangle',vol:.1});tone(247,.26,{type:'triangle',vol:.1,at:.16});},
  bumper(i=0){const f=[784,880,1047,698,740,659][i%6];tone(f,.09,{type:'square',vol:.16});tone(f*1.5,.12,{type:'triangle',vol:.1,at:.03});},
  crack(){noise(.12,{vol:.16,hp:600});tone(180,.12,{type:'square',vol:.12,slide:.5});},
  shield(){tone(520,.06,{type:'sine',vol:.12});tone(780,.08,{type:'sine',vol:.08,at:.04});},
  // simple original background music per game state (Web Audio sequencer). bgm(null) stops.
  bgm(name){if(name===bgmName)return;bgmName=name;bgmStep=0;if(bgmTimer){clearInterval(bgmTimer);bgmTimer=null;}if(!name||!SONGS[name])return;const song=SONGS[name],c=ac();if(!c)return;bgmNext=c.currentTime+.05;
   bgmTimer=setInterval(()=>{const cc=ac();if(!cc||muted)return;while(bgmNext<cc.currentTime+.25){playStep(song,bgmStep,bgmNext-cc.currentTime);bgmStep++;bgmNext+=60/song.bpm/2;}},60);},
  get bgmName(){return bgmName;}
 };
 return api;
})();
