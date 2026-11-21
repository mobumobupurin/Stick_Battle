'use strict';
// STICK CASINO coin pusher: a small 2D field (top view) plus the lottery tables. Rendering lives in medalpusher.js.
// Units: field is 100 wide, the front edge is at y=100. The pusher face moves between FACE_MIN and FACE_MAX.
const PusherSim=(()=>{
 const R=4.2,BALL_R=6.4,FACE_MIN=10,FACE_MAX=27,PERIOD=150,GUTTER=18,EDGE=100;
 const CHANCE_RATE=0.028,WALL_FRAMES=900,JP_BASE=400,JP_MAX=2000,JP_RATE=0.05,KAKUHEN_SPINS=10;
 const FEVER_ROUNDS=5,FEVER_PAYS=[30,30,40,50,100];
 // CHECKER slot (3 reels): [result, medals rained onto the field, weight]. BALL puts a JP ball on the field; SEVEN starts FEVER.
 // Number slot 1–7 + BALL: [result, medals rained, weight, 確変 spins granted]. Odd numbers also start 確変; 777 is FEVER.
 const LOTTERY=[['MISS',0,1450,0],['1',30,8,2],['2',20,12,0],['3',30,5,2],['4',20,10,0],['5',30,3,2],['6',20,7,0],['BALL',0,8,0],['SEVEN',0,3,0]];
 // after a FEVER the slot runs in 確変 (better odds) for KAKUHEN_SPINS spins
 const LOTTERY_KAKUHEN=[['MISS',0,1394,0],['1',30,16,2],['2',20,24,0],['3',30,10,2],['4',20,20,0],['5',30,6,2],['6',20,14,0],['BALL',0,16,0],['SEVEN',0,6,0]];
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
    if(!(s.wall>0)&&side)lost++;else{front++;if(s.frontXs)s.frontXs.push(a.x);}c.splice(i,1);}}
  return {front,lost,balls};}
 // Upper stage (the pusher's top surface). Medals ride with the pusher; when it pulls back, the fixed back edge holds them,
 // so they shuffle forward and drop off the front edge onto the lower field. back = y of that fixed edge.
 function stepUpper(u,face,dface,back){const c=u.coins,n=c.length,D=2*R,D2=D*D;
  for(const a of c)a.y+=dface;
  for(let it=0;it<3;it++){
   for(const a of c)if(a.y<back+R)a.y=back+R;
   for(let i=0;i<n;i++){const a=c[i];for(let j=i+1;j<n;j++){const b=c[j];const dx=b.x-a.x,dy=b.y-a.y;if(dx>D||dx<-D||dy>D||dy<-D)continue;const d2=dx*dx+dy*dy;if(d2>=D2)continue;
     const d=Math.sqrt(d2)||0.001,o=(D-d)/2,nx=d2?dx/d:1,ny=d2?dy/d:0;const pa=a.y<=back+R+0.01,pb=b.y<=back+R+0.01;const wa=pa&&!pb?0:pb&&!pa?2:1,wb=2-wa;
     a.x-=nx*o*wa;a.y-=ny*o*wa;b.x+=nx*o*wb;b.y+=ny*o*wb;}}
   for(const a of c){if(a.x<R)a.x=R;else if(a.x>100-R)a.x=100-R;}
  }
  const fall=[];for(let i=c.length-1;i>=0;i--){if(c[i].y>face+0.6){fall.push(c[i].x);c.splice(i,1);}}return fall;}

 /* ---------- payout apron: the slanted front panel the medals slide down after falling off the field ----------
   Local coords: u = field x (panel spans GUTTER..100-GUTTER), v = distance down the slope from the front edge.
   START is a real hole: a medal whose centre passes over it drops in. While a CHANCE checker is off, the
   flipper on that side swings and steers / flicks medals toward the middle. */
 const APRON={L:31.6,U0:18,U1:82,HOLE:{u:50,v:21,r:3.8,cup:6.5,pull:.05},PINS:[],
  FLIP:[{u:20,v:8,len:13},{u:80,v:8,len:13}],FLIP_W:1.3,G:.05,PIN_E:.3,PERIOD:40,REST:1.75,UP:.55,DOWN:1.5,SPEED:.16};
 function createApron(){return {coins:[],ang:[APRON.REST,APRON.REST],om:[0,0],t:0};}
 function feedApron(a,x,rnd){const r=rnd||Math.random;if(a.coins.length>=60)return false;a.coins.push({u:Math.max(APRON.U0+R,Math.min(APRON.U1-R,x)),v:0,vu:(r()-.5)*.25,vv:.35+r()*.25,id:a.t*64+a.coins.length});return true;}
 // flipper angle measured from +u, v down; the right flipper is mirrored
 function flipSeg(a,i){const f=APRON.FLIP[i],th=a.ang[i],dir=i?-1:1;return [f.u,f.v,f.u+dir*Math.cos(th)*f.len,f.v+Math.sin(th)*f.len];}
 function stepApron(a,active){a.t++;const A=APRON,ev={hits:0,sunk:[],out:0};
  for(let i=0;i<2;i++){const tgt=active[i]?((a.t+i*A.PERIOD/2)%A.PERIOD<A.PERIOD/2?A.UP:A.DOWN):A.REST,d=Math.max(-A.SPEED,Math.min(A.SPEED,tgt-a.ang[i]));a.om[i]=d;a.ang[i]+=d;}
  const cs=a.coins,Hh=A.HOLE;
  for(const c of cs){c.vv+=A.G;{const dx=Hh.u-c.u,dy=Hh.v-c.v,d=Math.hypot(dx,dy);if(d<Hh.cup&&d>1e-6){const k=Hh.pull*(1-d/Hh.cup)/d;c.vu+=dx*k*2;c.vv+=dy*k*2;c.vu*=.97;c.vv*=.97;}}c.vu*=.985;c.vv*=.995;c.u+=c.vu;c.v+=c.vv;
   if(c.u<A.U0+R){c.u=A.U0+R;c.vu=Math.abs(c.vu)*.4;}if(c.u>A.U1-R){c.u=A.U1-R;c.vu=-Math.abs(c.vu)*.4;}
   for(const [pu,pv,pr] of A.PINS){const dx=c.u-pu,dy=c.v-pv,d=Math.hypot(dx,dy),m=R+pr;if(d<m&&d>1e-6){const nx=dx/d,ny=dy/d;c.u=pu+nx*m;c.v=pv+ny*m;const vn=c.vu*nx+c.vv*ny;if(vn<0){c.vu-=(1+A.PIN_E)*vn*nx;c.vv-=(1+A.PIN_E)*vn*ny;}}}
   for(let i=0;i<2;i++){const [x0,y0,x1,y1]=flipSeg(a,i),sx=x1-x0,sy=y1-y0,l2=sx*sx+sy*sy,t=Math.max(0,Math.min(1,((c.u-x0)*sx+(c.v-y0)*sy)/l2)),px=x0+sx*t,py=y0+sy*t,dx=c.u-px,dy=c.v-py,d=Math.hypot(dx,dy),m=R+A.FLIP_W;
    if(d<m){const nx=d>1e-6?dx/d:0,ny=d>1e-6?dy/d:-1;c.u=px+nx*m;c.v=py+ny*m;
     // surface velocity of the flipper at the contact point (mirrored on the right)
     const w=a.om[i]*(i?-1:1),fu=-w*(py-y0),fv=w*(px-x0);let ru=c.vu-fu,rv=c.vv-fv;const vn=ru*nx+rv*ny;if(vn<0){ru-=1.35*vn*nx;rv-=1.35*vn*ny;}c.vu=ru+fu;c.vv=rv+fv;}}}
  // medals push each other apart a little
  for(let i=0;i<cs.length;i++)for(let j=i+1;j<cs.length;j++){const p=cs[i],q=cs[j],dx=q.u-p.u,dy=q.v-p.v,d=Math.hypot(dx,dy);if(d<2*R&&d>1e-6){const nx=dx/d,ny=dy/d,o=(2*R-d)/2;p.u-=nx*o;p.v-=ny*o;q.u+=nx*o;q.v+=ny*o;const vn=(q.vu-p.vu)*nx+(q.vv-p.vv)*ny;if(vn<0){const k=vn*.65;p.vu+=k*nx;p.vv+=k*ny;q.vu-=k*nx;q.vv-=k*ny;}}}
  for(let i=cs.length-1;i>=0;i--){const c=cs[i];if(Math.hypot(c.u-A.HOLE.u,c.v-A.HOLE.v)<A.HOLE.r){ev.hits++;ev.sunk.push({u:c.u,v:c.v});cs.splice(i,1);}else if(c.v>A.L+R){ev.out++;cs.splice(i,1);}}
  return ev;}
 return {APRON,createApron,feedApron,flipSeg,stepApron,R,BALL_R,FACE_MIN,FACE_MAX,PERIOD,GUTTER,EDGE,CHANCE_RATE,WALL_FRAMES,JP_BASE,JP_MAX,JP_RATE,KAKUHEN_SPINS,FEVER_ROUNDS,FEVER_PAYS,SYMBOLS,LOTTERY,LOTTERY_KAKUHEN,STAGE1,STAGE2,lotteryTotal,lottery,pick,total,create,faceAt,drop,scatter,addBall,step,stepUpper};
})();
if(typeof module!=='undefined')module.exports=PusherSim;else globalThis.PusherSim=PusherSim;
