'use strict';
/* STICK CASINO — FEVER STAGE physics (original design).
   A JP ball dropped off the pusher field starts the FEVER STAGE: the ball bounces between bumpers (each hit pays WIN medals)
   above a row of OUT blocks. A block breaks when the ball lands on it; the game lasts as long as the ball survives.
   Every 100 WIN opens the JPC hole; a ball that enters it plays the JP CHANCE dish (a rolling-ball croon), then returns to the stage.
   Results come from the simulation itself — nothing is decided in advance. Units: stage 100 x 150, y grows downward, 60 steps/s. */
const FeverSim=(()=>{
 const W=100,H=150,BALL_R=3.2,G=0.05,KICK=2.35,MAX_V=3.6,BLOCK_Y=138,BLOCKS=6,BLOCK_HP=2,SHIELD_FRAMES=480,GATE_WIN=40,MAX_FRAMES=60*150;
 const BUMPERS=[{x:22,y:56,r:7,pay:2},{x:78,y:56,r:7,pay:2},{x:50,y:80,r:8,pay:4},{x:24,y:102,r:6.5,pay:2},{x:76,y:102,r:6.5,pay:2},{x:50,y:118,r:5.5,pay:2}];
 const HOLE={x:50,y:46,r:6.8};
 // JP CHANCE dish: pockets in a rotating inner ring
 const DISH_R=40,POCKET_R=15,POCKETS=['JP',50,'BLOCK',100,30,'BLOCK',50,200,30,'BLOCK',50,30];
 function create(rnd){rnd=rnd||Math.random;const s={t:0,win:0,gateFrom:0,gateOpen:false,shield:SHIELD_FRAMES,blocks:Array(BLOCKS).fill(BLOCK_HP),ball:null,over:false,jpc:null,cool:[],events:[]};launch(s,rnd);return s;}
 function launch(s,rnd){rnd=rnd||Math.random;s.ball={x:8+rnd()*6,y:10,vx:1.2+rnd()*1.1,vy:-.2-rnd()*.6};}
 function speedClamp(b){const v=Math.hypot(b.vx,b.vy);if(v>MAX_V){b.vx*=MAX_V/v;b.vy*=MAX_V/v;}}
 // one step of the stage; pushes events: {type:'hit',i,pay} {type:'block',i} {type:'shield'} {type:'gate'} {type:'jpc'} {type:'out'}
 function step(s,rnd){
  rnd=rnd||Math.random;s.t++;s.events.length=0;
  if(s.over)return s;
  if(s.jpc){stepDish(s,rnd);return s;}
  if(s.shield>0)s.shield--;
  const b=s.ball,sub=2;
  for(let k=0;k<sub;k++){
   b.vy+=G/sub;b.x+=b.vx/sub;b.y+=b.vy/sub;
   if(b.x<BALL_R){b.x=BALL_R;b.vx=Math.abs(b.vx)*.88;}else if(b.x>W-BALL_R){b.x=W-BALL_R;b.vx=-Math.abs(b.vx)*.88;}
   if(b.y<BALL_R){b.y=BALL_R;b.vy=Math.abs(b.vy)*.8;}
   BUMPERS.forEach((m,i)=>{const dx=b.x-m.x,dy=b.y-m.y,d=Math.hypot(dx,dy),D=m.r+BALL_R;if(d<D&&d>0){const nx=dx/d,ny=dy/d;b.x=m.x+nx*D;b.y=m.y+ny*D;const vn=b.vx*nx+b.vy*ny;if(vn<0){b.vx-=2*vn*nx;b.vy-=2*vn*ny;}
     // the bumper kicks the ball away; a tiny wobble keeps every game different
     const v=Math.max(Math.hypot(b.vx,b.vy)*.92,KICK),a=Math.atan2(b.vy,b.vx)+(rnd()-.5)*.16;b.vx=Math.cos(a)*v;b.vy=Math.sin(a)*v;speedClamp(b);
     if(!(s.t-(s.cool[i]||-99)<=6)){s.cool[i]=s.t;s.win+=m.pay;s.events.push({type:'hit',i,pay:m.pay});}}});
   if(s.gateOpen&&Math.hypot(b.x-HOLE.x,b.y-HOLE.y)<HOLE.r-.5){s.gateOpen=false;s.gateFrom=s.win;startDish(s,rnd);s.events.push({type:'jpc'});return s;}
   if(b.y+BALL_R>=BLOCK_Y&&b.vy>0){const i=Math.min(BLOCKS-1,Math.max(0,Math.floor(b.x/(W/BLOCKS))));
    if(s.shield>0||s.blocks[i]){b.y=BLOCK_Y-BALL_R;b.vy=-Math.max(Math.abs(b.vy)*.9,2.4+rnd()*.5);b.vx+=(rnd()-.5)*.9;speedClamp(b);
     if(s.shield>0)s.events.push({type:'shield'});else{s.blocks[i]--;s.events.push({type:'block',i,hp:s.blocks[i]});}}}
   if(b.y>H){s.over=true;s.events.push({type:'out'});return s;}
  }
  if(!s.gateOpen&&s.win-s.gateFrom>=GATE_WIN){s.gateOpen=true;s.events.push({type:'gate'});}
  if(s.t>MAX_FRAMES&&s.t%60===0){const i=s.blocks.findIndex(x=>x>0);if(i>=0)s.blocks[i]=0;}
  return s;
 }
 function startDish(s,rnd){s.jpc={a:rnd()*Math.PI*2,r:DISH_R-3,w:.13+rnd()*.05,vr:0,ring:rnd()*Math.PI*2,t:0,pocket:null,done:0};}
 // the ball rolls round the rim, slows down, spirals in and drops into whichever pocket is under it
 function stepDish(s,rnd){const j=s.jpc;j.t++;
  if(j.pocket!==null){j.done++;if(j.done===1)s.events.push({type:'pocket',pocket:j.pocket,value:POCKETS[j.pocket]});
   if(j.done>=90){const v=POCKETS[j.pocket];if(v==='BLOCK'){for(let i=0;i<BLOCKS;i++)s.blocks[i]=BLOCK_HP;}
    s.jpc=null;launch(s,rnd);s.shield=Math.max(s.shield,90);s.events.push({type:'return'});}return;}
  j.ring-=.012;j.a+=j.w;j.w*=.9935;
  // small pins on the dish nudge the ball
  if(rnd()<.03){j.w*=.9+rnd()*.18;j.vr+=(rnd()-.5)*.25;}
  const fall=Math.max(0,.075-j.w)*1.6;j.vr=j.vr*.9-fall;j.r=Math.min(DISH_R-3,j.r+j.vr);
  if(j.r<=POCKET_R+1){const n=POCKETS.length,rel=((j.a-j.ring)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);j.pocket=Math.floor(rel/(Math.PI*2/n))%n;j.r=POCKET_R-2;}
 }
 // run a whole stage headless; jpValue() returns the JP amount and is called on each JP
 function simulate(rnd,jpValue){const s=create(rnd);let pay=0,jps=0,jpcs=0,jpPaid=0;while(!s.over&&s.t<MAX_FRAMES*2){step(s,rnd);for(const e of s.events){if(e.type==='jpc')jpcs++;if(e.type==='pocket'){if(e.value==='JP'){jps++;const v=jpValue?jpValue():1000;jpPaid+=v;}else if(typeof e.value==='number')pay+=e.value;}}}
  return {win:s.win,pay,jps,jpcs,jpPaid,total:s.win+pay+jpPaid,frames:s.t};}
 return {W,H,BALL_R,BLOCK_Y,BLOCKS,BLOCK_HP,SHIELD_FRAMES,GATE_WIN,BUMPERS,HOLE,DISH_R,POCKET_R,POCKETS,create,launch,step,simulate};
})();
if(typeof module!=='undefined')module.exports=FeverSim;else globalThis.FeverSim=FeverSim;
