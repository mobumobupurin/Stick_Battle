'use strict';
// STICK ROYALE coin pusher: a small deterministic 2D field (top view). Rendering lives in medalpusher.js.
// Units: field is 100 wide, the front edge is at y=100. The pusher face moves between FACE_MIN and FACE_MAX.
const PusherSim=(()=>{
 const R=4.2,FACE_MIN=10,FACE_MAX=27,PERIOD=150,GUTTER=12,EDGE=100,CHANCE_RATE=0.045,WALL_FRAMES=720,JP_BASE=150,JP_RATE=0.05;
 // CHECKER lottery (3 reels): [result, medals added to the field, weight]. BALL goes to the JP roulette, SEVEN is FEVER (+30 and the side walls rise).
 const LOTTERY=[['MISS',0,560],['CHERRY',5,200],['BELL',10,120],['BAR',20,60],['BALL',0,40],['SEVEN',30,20]];
 const SYMBOLS=['CHERRY','BELL','BAR','BALL','SEVEN'];
 // JP roulette pockets (equal size). 'JP' pays the progressive jackpot.
 const POCKETS=['JP',30,20,10,10,10];
 const lotteryTotal=LOTTERY.reduce((t,l)=>t+l[2],0);
 function lottery(r){let x=r%lotteryTotal,t=0;for(let i=0;i<LOTTERY.length;i++){t+=LOTTERY[i][2];if(x<t)return i;}return 0;}
 // a packed starting field (hex rows with a little jitter), like a machine that has been played for a while
 function create(seedCoins,rnd){const s={t:0,coins:[],face:FACE_MIN};rnd=rnd||Math.random;const n=seedCoins??110,spots=[];
  const dx=2*R+.25,dy=dx*.87;let row=0;for(let y=FACE_MAX+R+.5;y<EDGE-R-1;y+=dy,row++)for(let x=R+(row%2?dx/2:0);x<=100-R;x+=dx)spots.push({x:x+(rnd()-.5)*.2,y:y+(rnd()-.5)*.2});
  while(spots.length>n)spots.splice(Math.floor(rnd()*spots.length),1);s.coins=spots;return s;}
 const faceAt=t=>FACE_MIN+(FACE_MAX-FACE_MIN)*(0.5-0.5*Math.cos(2*Math.PI*t/PERIOD));
 function drop(s,x,rnd){rnd=rnd||Math.random;x=Math.max(R,Math.min(100-R,x));s.coins.push({x:x+(rnd()-0.5)*1.5,y:s.face+R+0.5+rnd()*3,fresh:12});}
 function scatter(s,n,rnd){rnd=rnd||Math.random;for(let i=0;i<n;i++)s.coins.push({x:R+rnd()*(100-2*R),y:s.face+R+1+rnd()*10,fresh:12});}
 // one frame; returns {front, lost}
 function step(s){s.t++;s.face=faceAt(s.t);const c=s.coins,n=c.length,D=2*R,D2=D*D;
  for(let it=0;it<4;it++){
   for(const a of c)if(a.y<s.face+R)a.y=s.face+R;
   for(let i=0;i<n;i++){const a=c[i];for(let j=i+1;j<n;j++){const b=c[j];const dx=b.x-a.x,dy=b.y-a.y;if(dx>D||dx<-D||dy>D||dy<-D)continue;const d2=dx*dx+dy*dy;if(d2>=D2)continue;
     const d=Math.sqrt(d2)||0.001,o=(D-d)/2,nx=d2?dx/d:1,ny=d2?dy/d:0;
     // the coin nearer the pusher is pinned against it, so the front coin takes the whole push
     const pa=a.y<=s.face+R+0.01,pb=b.y<=s.face+R+0.01;let wa=pa&&!pb?0:pb&&!pa?2:1,wb=2-wa;
     a.x-=nx*o*wa;a.y-=ny*o*wa;b.x+=nx*o*wb;b.y+=ny*o*wb;}}
   for(const a of c){if(a.x<R)a.x=R;else if(a.x>100-R)a.x=100-R;}
  }
  if(s.wall>0)s.wall--;let front=0,lost=0;for(let i=c.length-1;i>=0;i--){const a=c[i];if(a.fresh)a.fresh--;if(a.y>EDGE){if(!(s.wall>0)&&(a.x<GUTTER||a.x>100-GUTTER))lost++;else front++;c.splice(i,1);}}
  return {front,lost};}
 return {R,FACE_MIN,FACE_MAX,PERIOD,GUTTER,EDGE,CHANCE_RATE,WALL_FRAMES,JP_BASE,JP_RATE,SYMBOLS,POCKETS,LOTTERY,lotteryTotal,lottery,create,faceAt,drop,scatter,step};
})();
if(typeof module!=='undefined')module.exports=PusherSim;else globalThis.PusherSim=PusherSim;
