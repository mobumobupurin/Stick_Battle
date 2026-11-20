'use strict';
// STICK CASINO coin pusher: a small 2D field (top view) plus the lottery tables. Rendering lives in medalpusher.js.
// Units: field is 100 wide, the front edge is at y=100. The pusher face moves between FACE_MIN and FACE_MAX.
const PusherSim=(()=>{
 const R=4.2,BALL_R=6.4,FACE_MIN=10,FACE_MAX=27,PERIOD=150,GUTTER=18,EDGE=100;
 const CHANCE_RATE=0.028,WALL_FRAMES=900,JP_BASE=400,JP_MAX=2000,JP_RATE=0.05,KAKUHEN_SPINS=10;
 const FEVER_ROUNDS=5,FEVER_PAYS=[30,30,40,50,100];
 // CHECKER slot (3 reels): [result, medals rained onto the field, weight]. BALL puts a JP ball on the field; SEVEN starts FEVER.
 // Number slot 1–7 + BALL: [result, medals rained, weight, 確変 spins granted]. Odd numbers also start 確変; 777 is FEVER.
 const LOTTERY=[['MISS',0,740,0],['1',30,25,2],['2',20,35,0],['3',30,15,2],['4',20,25,0],['5',30,10,2],['6',20,20,0],['BALL',0,110,0],['SEVEN',0,20,0]];
 // after a FEVER the slot runs in 確変 (better odds) for KAKUHEN_SPINS spins
 const LOTTERY_KAKUHEN=[['MISS',0,600,0],['1',30,45,2],['2',20,55,0],['3',30,35,2],['4',20,45,0],['5',30,20,2],['6',20,40,0],['BALL',0,130,0],['SEVEN',0,30,0]];
 // reel faces: the digits 1–7 and the JP ball
 const SYMBOLS=['1','2','3','4','5','6','SEVEN','BALL'];
 // JP ball lottery: stage 1 (12 equal pockets) — medals, BALL (the ball goes back onto the field) or UP to stage 2 (6 pockets) with the JP
 const STAGE1=[30,50,'UP',30,100,'BALL',30,'UP',50,30,'UP',30];
 const STAGE2=['JP',300,200,500,200,300];
 const total=t=>t.reduce((a,l)=>a+l[2],0);
 function pick(table,r){let x=r%total(table),t=0;for(let i=0;i<table.length;i++){t+=table[i][2];if(x<t)return i;}return 0;}
 const lotteryTotal=total(LOTTERY);
 const lottery=r=>pick(LOTTERY,r);
 // a packed starting field (hex rows with a little jitter), like a machine that has been played for a while
 function create(seedCoins,rnd){const s={t:0,coins:[],face:FACE_MIN,wall:0};rnd=rnd||Math.random;const n=seedCoins??110,spots=[];
  const dx=2*R+.25,dy=dx*.87;let row=0;for(let y=FACE_MAX+R+.5;y<EDGE-R-1;y+=dy,row++)for(let x=R+(row%2?dx/2:0);x<=100-R;x+=dx)spots.push({x:x+(rnd()-.5)*.2,y:y+(rnd()-.5)*.2});
  while(spots.length>n)spots.splice(Math.floor(rnd()*spots.length),1);s.coins=spots;return s;}
 const faceAt=t=>FACE_MIN+(FACE_MAX-FACE_MIN)*(0.5-0.5*Math.cos(2*Math.PI*t/PERIOD));
 const rad=a=>a.ball?BALL_R:R;
 function drop(s,x,rnd){rnd=rnd||Math.random;x=Math.max(R,Math.min(100-R,x));s.coins.push({x:x+(rnd()-0.5)*1.5,y:s.face+R+0.5+rnd()*3,fresh:12});}
 function scatter(s,n,rnd){rnd=rnd||Math.random;for(let i=0;i<n;i++)s.coins.push({x:R+rnd()*(100-2*R),y:s.face+R+1+rnd()*10,fresh:12});}
 function addBall(s,rnd){rnd=rnd||Math.random;s.coins.push({x:30+rnd()*40,y:s.face+BALL_R+1,ball:true,fresh:18});}
 // one frame; returns {front, lost, balls} — balls that fall off the front go to the JP lottery, balls in the side gutters roll back onto the field
 function step(s){s.t++;s.face=faceAt(s.t);const c=s.coins,n=c.length,M=2*BALL_R;
  for(let it=0;it<4;it++){
   for(const a of c){const r=rad(a);if(a.y<s.face+r)a.y=s.face+r;}
   for(let i=0;i<n;i++){const a=c[i],ra=rad(a);for(let j=i+1;j<n;j++){const b=c[j];const dx=b.x-a.x,dy=b.y-a.y;if(dx>M||dx<-M||dy>M||dy<-M)continue;const D=ra+rad(b),d2=dx*dx+dy*dy;if(d2>=D*D)continue;
     const d=Math.sqrt(d2)||0.001,o=(D-d)/2,nx=d2?dx/d:1,ny=d2?dy/d:0;
     // the piece nearer the pusher is pinned against it, so the front piece takes the whole push
     const pa=a.y<=s.face+ra+0.01,pb=b.y<=s.face+rad(b)+0.01;let wa=pa&&!pb?0:pb&&!pa?2:1;
     // a ball is heavy: coins move out of its way more than it moves
     if(wa===1&&a.ball!==b.ball)wa=a.ball?0.4:1.6;const wb=2-wa;
     a.x-=nx*o*wa;a.y-=ny*o*wa;b.x+=nx*o*wb;b.y+=ny*o*wb;}}
   for(const a of c){const r=rad(a);if(a.x<r)a.x=r;else if(a.x>100-r)a.x=100-r;}
  }
  if(s.wall>0)s.wall--;let front=0,lost=0,balls=0;
  for(let i=c.length-1;i>=0;i--){const a=c[i];if(a.fresh)a.fresh--;if(a.y>EDGE){const side=a.x<GUTTER||a.x>100-GUTTER;
    if(a.ball){c.splice(i,1);if(side&&!(s.wall>0))c.push({x:30+Math.random()*40,y:s.face+BALL_R+1,ball:true,fresh:18});else balls++;continue;}
    if(!(s.wall>0)&&side)lost++;else front++;c.splice(i,1);}}
  return {front,lost,balls};}
 return {R,BALL_R,FACE_MIN,FACE_MAX,PERIOD,GUTTER,EDGE,CHANCE_RATE,WALL_FRAMES,JP_BASE,JP_MAX,JP_RATE,KAKUHEN_SPINS,FEVER_ROUNDS,FEVER_PAYS,SYMBOLS,LOTTERY,LOTTERY_KAKUHEN,STAGE1,STAGE2,lotteryTotal,lottery,pick,total,create,faceAt,drop,scatter,addBall,step};
})();
if(typeof module!=='undefined')module.exports=PusherSim;else globalThis.PusherSim=PusherSim;
