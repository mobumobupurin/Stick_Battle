'use strict';
/* STICK CASINO — FEVER GAME (formerly FEVER STAGE) physics (original design).
   A JP ball dropped off the pusher field starts the FEVER STAGE: the ball bounces between bumpers (each hit pays WIN medals)
   above a row of OUT blocks. A block breaks when the ball lands on it; the game lasts as long as the ball survives.
   Every 100 WIN opens the JPC hole; a ball that enters it plays the JP CHANCE dish (a rolling-ball croon), then returns to the stage.
   Results come from the simulation itself — nothing is decided in advance. Units: stage 100 x 150, y grows downward, 60 steps/s. */
const FeverSim=(()=>{
 const W=100,H=150,BALL_R=3.2,G=0.05,KICK=2.35,MAX_V=3.6,BLOCK_Y=138,BLOCKS=6,BLOCK_HP=2,SHIELD_FRAMES=480,GATE_WIN=50,MAX_FRAMES=60*150;
 const BUMPERS=[{x:22,y:56,r:7,pay:1},{x:78,y:56,r:7,pay:1},{x:50,y:80,r:8,pay:2},{x:24,y:102,r:6.5,pay:1},{x:76,y:102,r:6.5,pay:1},{x:50,y:118,r:5.5,pay:1}];
 const HOLE={x:50,y:46,r:6.8};
 // JP CHANCE: two rolling-ball dishes (croons). The ball circles a bowl, bounces off pins and drops into a hole only when it is slow enough
 // to fall in — a fast ball skims over holes. Stage 1: UP goes on to stage 2, which holds the JP. Everything is simulated.
 const DISHES=[{R:40,holeR:22,holes:['UP',30,'BLOCK',50,'UP',30,100,'UP'],pinR:31,pins:8,ringW:.006,pull:.032,friction:.9968,sink:.95},
  {R:36,holeR:19,holes:['BLUE',100,'UP',200,'RED','UP',100,300,'UP'],pinR:28,pins:9,ringW:-.008,pull:.03,friction:.9975,sink:.88},
  {R:32,holeR:16,holes:['GOLD',200,300,500,200,100],pinR:24,pins:6,ringW:.011,pull:.028,friction:.998,sink:.82}];
 const JP_KINDS=['BLUE','RED','GOLD'],isJP=v=>JP_KINDS.includes(v);
 const DISH_R=40,POCKETS=DISHES[1].holes;
 function create(rnd){rnd=rnd||Math.random;const s={t:0,win:0,gateFrom:0,gateOpen:false,shield:SHIELD_FRAMES,blocks:Array(BLOCKS).fill(BLOCK_HP),ball:null,over:false,jpc:null,cool:[],events:[]};launch(s,rnd);return s;}
 function launch(s,rnd){rnd=rnd||Math.random;s.ball={x:8+rnd()*6,y:10,vx:1.2+rnd()*1.1,vy:-.2-rnd()*.6};}
 function speedClamp(b){const v=Math.hypot(b.vx,b.vy);if(v>MAX_V){b.vx*=MAX_V/v;b.vy*=MAX_V/v;}}
 // one step of the stage; pushes events: {type:'hit',i,pay} {type:'block',i} {type:'shield'} {type:'gate'} {type:'jpc'} {type:'out'}
 function step(s,rnd){
  rnd=rnd||Math.random;s.t++;s.events.length=0;
  if(s.over)return s;
  if(s.t>MAX_FRAMES+900&&!s.jpc){s.over=true;s.events.push({type:'out'});return s;}
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
   if(s.gateOpen&&Math.hypot(b.x-HOLE.x,b.y-HOLE.y)<HOLE.r-.5){startDish(s,rnd);s.events.push({type:'jpc'});return s;}
   if(b.y+BALL_R>=BLOCK_Y&&b.vy>0){const i=Math.min(BLOCKS-1,Math.max(0,Math.floor(b.x/(W/BLOCKS))));
    if(s.shield>0||s.blocks[i]){b.y=BLOCK_Y-BALL_R;b.vy=-Math.max(Math.abs(b.vy)*.9,2.4+rnd()*.5);b.vx+=(rnd()-.5)*.9;speedClamp(b);
     if(s.shield>0)s.events.push({type:'shield'});else{s.blocks[i]--;s.events.push({type:'block',i,hp:s.blocks[i]});}}}
   if(b.y>H){s.over=true;s.events.push({type:'out'});return s;}
  }
  if(!s.gateOpen&&s.t<MAX_FRAMES&&s.win-s.gateFrom>=GATE_WIN){s.gateOpen=true;s.events.push({type:'gate'});}
  if(s.t>MAX_FRAMES){if(s.gateOpen)s.gateOpen=false;if(s.t%60===0){const i=s.blocks.findIndex(x=>x>0);if(i>=0)s.blocks[i]=0;}}
  return s;
 }
 function startDish(s,rnd,stage=0){const D=DISHES[stage],a=rnd()*Math.PI*2,v=2.3+rnd()*.5;
  s.jpc={stage,x:Math.cos(a)*(D.R-3),y:Math.sin(a)*(D.R-3),vx:-Math.sin(a)*v,vy:Math.cos(a)*v,ring:rnd()*Math.PI*2,t:0,pocket:null,done:0,skimT:0};}
 const holePos=(D,j,i)=>{const a=j.ring+i*Math.PI*2/D.holes.length;return [Math.cos(a)*D.holeR,Math.sin(a)*D.holeR];};
 const pinPos=(D,i)=>{const a=i*Math.PI*2/D.pins+Math.PI/D.pins;return [Math.cos(a)*D.pinR,Math.sin(a)*D.pinR];};
 function stepDish(s,rnd){const j=s.jpc,D=DISHES[j.stage];j.t++;
  if(j.pocket!==null){j.done++;const v=D.holes[j.pocket];if(j.done===1)s.events.push({type:'pocket',stage:j.stage,pocket:j.pocket,value:v});
   if(j.done>=80){if(v==='UP'){startDish(s,rnd,j.stage+1);s.events.push({type:'up',stage:j.stage+1});return;}
    if(v==='BLOCK'&&s.t<MAX_FRAMES){for(let i=0;i<BLOCKS;i++)s.blocks[i]=BLOCK_HP;}
    s.jpc=null;launch(s,rnd);s.shield=Math.max(s.shield,90);s.events.push({type:'return'});}return;}
  j.ring+=D.ringW;
  for(let k=0;k<2;k++){
   const r=Math.hypot(j.x,j.y)||.001,ux=j.x/r,uy=j.y/r;
   // the bowl slopes down to the hole ring (a dome in the middle pushes outward), so a slow ball ends up circling the holes
   const f=-D.pull*Math.max(-1,Math.min(1,(r-D.holeR)/5));j.vx+=ux*f/2;j.vy+=uy*f/2;
   j.vx*=Math.pow(D.friction,.5);j.vy*=Math.pow(D.friction,.5);
   j.x+=j.vx/2;j.y+=j.vy/2;
   const r2=Math.hypot(j.x,j.y);if(r2>D.R-BALL_R){const nx=j.x/r2,ny=j.y/r2;j.x=nx*(D.R-BALL_R);j.y=ny*(D.R-BALL_R);const vn=j.vx*nx+j.vy*ny;if(vn>0){j.vx-=1.75*vn*nx;j.vy-=1.75*vn*ny;}}
   for(let i=0;i<D.pins;i++){const [px,py]=pinPos(D,i),dx=j.x-px,dy=j.y-py,d=Math.hypot(dx,dy),M=BALL_R+1.6;if(d<M&&d>0){const nx=dx/d,ny=dy/d;j.x=px+nx*M;j.y=py+ny*M;const vn=j.vx*nx+j.vy*ny;if(vn<0){j.vx-=1.8*vn*nx;j.vy-=1.8*vn*ny;}const a=(rnd()-.5)*.3,c=Math.cos(a),sn=Math.sin(a),vx=j.vx;j.vx=vx*c-j.vy*sn;j.vy=vx*sn+j.vy*c;s.events.push({type:'pin'});}}
  }
  const sp=Math.hypot(j.vx,j.vy);if(j.skimT>0)j.skimT--;
  for(let i=0;i<D.holes.length;i++){const [hx,hy]=holePos(D,j,i),d=Math.hypot(j.x-hx,j.y-hy);
   if(d<3.6&&sp<D.sink){j.pocket=i;j.x=hx;j.y=hy;j.vx=j.vy=0;return;}
   if(d<4.5&&j.skimT===0){j.skimT=20;s.events.push({type:'skim',stage:j.stage,value:D.holes[i]});}}
  // a ball that has almost stopped is carried by the turning ring until a hole reaches it
  if(sp<.08){j.vx+=(rnd()-.5)*.06;j.vy+=(rnd()-.5)*.06;}
 }
 // run a whole stage headless; jpValue() returns the JP amount and is called on each JP
 function simulate(rnd,jpValue){const s=create(rnd);let pay=0,jps=0,jpcs=0,jpPaid=0;while(!s.over&&s.t<MAX_FRAMES*2){step(s,rnd);for(const e of s.events){if(e.type==='jpc')jpcs++;if(e.type==='pocket'){if(isJP(e.value)){jps++;const v=jpValue?jpValue(e.value):1000;jpPaid+=v;}else if(typeof e.value==='number')pay+=e.value;}}}
  return {win:s.win,pay,jps,jpcs,jpPaid,total:s.win+pay+jpPaid,frames:s.t};}
 return {JP_KINDS,isJP,W,H,BALL_R,BLOCK_Y,BLOCKS,BLOCK_HP,SHIELD_FRAMES,GATE_WIN,BUMPERS,HOLE,DISHES,DISH_R,POCKETS,holePos,pinPos,create,launch,step,simulate};
})();
if(typeof module!=='undefined')module.exports=FeverSim;else globalThis.FeverSim=FeverSim;
