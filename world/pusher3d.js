'use strict';
/* STICK CASINO — FORTUNE PUSHER: a small hand-written WebGL2 renderer for the pusher field (no libraries).
   The camera is the same pinhole camera as medalpusher.js' CAM, so 2D overlays drawn with P() line up exactly.
   World units: x 0..100 across, y = depth (front edge at 100), z = up. */
const Pusher3D=(()=>{
const VS=`#version 300 es
layout(location=0) in vec3 aPos;layout(location=1) in vec3 aNor;
layout(location=2) in vec3 iOff;layout(location=3) in vec3 iScl;layout(location=4) in vec3 iRot;layout(location=5) in vec3 iCol;
uniform mat4 uVP;out vec3 vN;out vec3 vW;out vec3 vObj;out vec3 vCol;out vec3 vObjN;
mat3 rotX(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0.,0.,c,s,0.,-s,c);}
mat3 rotZ(float a){float c=cos(a),s=sin(a);return mat3(c,s,0.,-s,c,0.,0.,0.,1.);}
void main(){mat3 R=rotX(iRot.z)*rotZ(iRot.y)*rotX(iRot.x);vec3 p=R*(aPos*iScl)+iOff;vW=p;vN=normalize(R*(aNor/iScl));vObj=aPos;vObjN=aNor;vCol=iCol;gl_Position=uVP*vec4(p,1.);}`;
const FS=`#version 300 es
precision highp float;in vec3 vN;in vec3 vW;in vec3 vObj;in vec3 vCol;in vec3 vObjN;
uniform vec3 uEye;uniform float uShine;uniform float uSpec;uniform float uAlpha;uniform int uKind;uniform float uTime;uniform float uMetal;uniform vec4 uPanel;uniform vec4 uHole;uniform vec2 uFlash;out vec4 o;
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;vec3 col=vCol;
 if(uKind==1){ // coin: embossed rim and centre mark on the faces
  if(abs(vObjN.z)>.5){float r=length(vObj.xy);col*=mix(1.,.72,smoothstep(.66,.7,r)*(1.-smoothstep(.76,.8,r)));col*=mix(1.,.8,1.-smoothstep(.18,.24,r));}
  else col*=.78;}
 if(uKind==2){ // JP ball: red band
  float b=abs(vObj.z);col=b<.3?vec3(1.,.97,.88):col;if(b<.3&&abs(vObj.x)<.22&&vObj.y>0.)col=vec3(.9,.65,.15);}
 if(uKind==3){ // floor: faint grid
  vec2 g=abs(fract(vW.xy/10.)-.5);float l=1.-smoothstep(.0,.03,min(g.x,g.y));col+=l*.05;}
 if(uKind==5&&vObjN.z>.5){ // payout apron: sunburst around the START cup
  float u=vObj.x*100.,v=vObj.y*uPanel.z;vec2 d=vec2(u-uHole.x,v-uHole.y);float r=length(d),a=atan(d.y,d.x);
  bool side=u<uPanel.x||u>uPanel.x+uPanel.y;
  if(side){col=uFlash.y>.5?vec3(.85,.7,.3):vec3(.4,.05,.1);}
  else{col=mix(vec3(.3,.1,.45),vec3(.12,.03,.2),v/uPanel.z);col+=step(.5,fract(a*16./6.2832+uTime*.01))*vec3(.16,.06,.12)*(1.-smoothstep(10.,30.,r));
   if(abs(u-uPanel.x)<.6||abs(u-uPanel.x-uPanel.y)<.6)col=vec3(.95,.75,.35);
   if(r<uHole.z){col=mix(vec3(1.,.82,.35),vec3(.55,.32,.08),r/uHole.z);}
   if(r<uHole.w+.5)col=uFlash.x>.5?vec3(.5,1.,1.):vec3(1.,.3,.35);
   if(r<uHole.w){o=vec4(vec3(.01,.01,.02)+vec3(.05)*(1.-r/uHole.w),1.);return;}}}
 if(uKind==4){o=vec4(0.,0.,0.,uAlpha*(1.-smoothstep(.55,1.,length(vObj.xy))));return;}
 vec3 L1=normalize(vec3(.25,.55,1.)),L2=normalize(vec3(-.6,.2,.5));vec3 V=normalize(uEye-vW);
 float d=max(dot(n,L1),0.)*.75+max(dot(n,L2),0.)*.25+max(dot(n,normalize(uEye-vW)),0.)*.3;vec3 H=normalize(L1+V);float sp=pow(max(dot(n,H),0.),uShine)*uSpec;
 vec3 Rf=reflect(-V,n);vec3 env=mix(vec3(.38,.32,.28),vec3(1.,.96,.86),smoothstep(-.6,.85,Rf.z))+vec3(.5,.35,.2)*pow(max(Rf.y,0.),6.);
 float rim=pow(1.-max(dot(n,V),0.),3.)*.15;
 // spotlight over the play area
 float spot=uKind==3?.75+.45*exp(-pow(length((vW.xy-vec2(50.,55.))/vec2(60.,45.)),2.)):1.;
 vec3 c=mix(col*(.3+d),col*env*(.55+.95*d),uMetal)*spot+vec3(sp)+rim;
 o=vec4(c,uAlpha);}`;
function compile(gl,type,src){const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh;}
// meshes: interleaved pos(3) + normal(3)
function cylinder(n){const v=[];for(let i=0;i<n;i++){const a0=i/n*Math.PI*2,a1=(i+1)/n*Math.PI*2,c0=Math.cos(a0),s0=Math.sin(a0),c1=Math.cos(a1),s1=Math.sin(a1);
  v.push(0,0,.5,0,0,1, c0,s0,.5,0,0,1, c1,s1,.5,0,0,1);v.push(0,0,-.5,0,0,-1, c1,s1,-.5,0,0,-1, c0,s0,-.5,0,0,-1);
  v.push(c0,s0,-.5,c0,s0,0, c1,s1,-.5,c1,s1,0, c1,s1,.5,c1,s1,0, c0,s0,-.5,c0,s0,0, c1,s1,.5,c1,s1,0, c0,s0,.5,c0,s0,0);}return new Float32Array(v);}
function sphere(la,lo){const v=[],pt=(i,j)=>{const t=i/la*Math.PI,p=j/lo*Math.PI*2;return [Math.sin(t)*Math.cos(p),Math.sin(t)*Math.sin(p),Math.cos(t)];};
 for(let i=0;i<la;i++)for(let j=0;j<lo;j++){const a=pt(i,j),b=pt(i+1,j),c=pt(i+1,j+1),d=pt(i,j+1);for(const q of [a,b,c,a,c,d])v.push(...q,...q);}return new Float32Array(v);}
function box(){const v=[],f=(n,a,b,c,d)=>{for(const q of [a,b,c,a,c,d])v.push(...q,...n);};
 f([0,0,1],[0,0,1],[1,0,1],[1,1,1],[0,1,1]);f([0,0,-1],[0,0,0],[0,1,0],[1,1,0],[1,0,0]);f([0,1,0],[0,1,0],[0,1,1],[1,1,1],[1,1,0]);f([0,-1,0],[0,0,0],[1,0,0],[1,0,1],[0,0,1]);f([1,0,0],[1,0,0],[1,1,0],[1,1,1],[1,0,1]);f([-1,0,0],[0,0,0],[0,0,1],[0,1,1],[0,1,0]);return new Float32Array(v);}
function fbox(){const b=box();for(let i=0;i<b.length;i+=6)b[i+1]-=.5;return b;}
function create(W,H,cam){
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
 const gl=canvas.getContext('webgl2',{antialias:true,alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true});if(!gl)return null;
 let prog;try{prog=gl.createProgram();gl.attachShader(prog,compile(gl,gl.VERTEX_SHADER,VS));gl.attachShader(prog,compile(gl,gl.FRAGMENT_SHADER,FS));gl.linkProgram(prog);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(prog));}catch(e){console.warn('Pusher3D',e);return null;}
 const U=n=>gl.getUniformLocation(prog,n),u={vp:U('uVP'),eye:U('uEye'),shine:U('uShine'),spec:U('uSpec'),alpha:U('uAlpha'),kind:U('uKind'),time:U('uTime'),metal:U('uMetal'),panel:U('uPanel'),hole:U('uHole'),flash:U('uFlash')};
 const meshes={};for(const [k,data] of Object.entries({coin:cylinder(28),ball:sphere(14,22),box:box(),fbox:fbox()})){const vao=gl.createVertexArray();gl.bindVertexArray(vao);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,24,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,24,12);
  const ib=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,ib);for(const [loc,size,off] of [[2,3,0],[3,3,12],[4,3,24],[5,3,36]]){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,48,off);gl.vertexAttribDivisor(loc,1);}
  meshes[k]={vao,count:data.length/6,ib,cap:0};}
 gl.bindVertexArray(null);
 // projection matching CAM: screen = (ox + k*xc/zc, oy - k*yc/zc)
 const {C,f,r,up,k,ox,oy}=cam,n=1,fa=600,A=(fa+n)/(fa-n),B=-2*fa*n/(fa-n);
 const row=(a,bx)=>a.map(v=>v*bx);
 // clip = M * [x,y,z,1] with xc=r·(p-C), yc=up·(p-C), zc=f·(p-C)
 const dC=v=>-(v[0]*C[0]+v[1]*C[1]+v[2]*C[2]);
 const X=[...r,dC(r)],Y=[...up,dC(up)],Z=[...f,dC(f)];
 const cx=2*k/W,cxo=2*ox/W-1,cy=2*k/H,cyo=1-2*oy/H;
 const rows=[X.map((v,i)=>cx*v+cxo*Z[i]),Y.map((v,i)=>cy*v+cyo*Z[i]),Z.map((v,i)=>A*v+(i===3?B:0)),Z];
 const VP=new Float32Array(16);for(let c=0;c<4;c++)for(let rr=0;rr<4;rr++)VP[c*4+rr]=rows[rr][c];
 function draw(mesh,list,kind,shine,spec,alpha,metal=0){if(!list.length)return;const m=meshes[mesh],d=new Float32Array(list.length*12);list.forEach((it,i)=>d.set(it,i*12));
  gl.bindVertexArray(m.vao);gl.bindBuffer(gl.ARRAY_BUFFER,m.ib);gl.bufferData(gl.ARRAY_BUFFER,d,gl.DYNAMIC_DRAW);
  gl.uniform1i(u.kind,kind);gl.uniform1f(u.shine,shine);gl.uniform1f(u.spec,spec);gl.uniform1f(u.alpha,alpha);gl.uniform1f(u.metal,metal);gl.drawArraysInstanced(gl.TRIANGLES,0,m.count,list.length);}
 // a box item: [x,y,z, sx,sy,sz, tilt,spin, r,g,b] where (x,y,z) is the min corner
 const B3=(x0,y0,z0,x1,y1,z1,c)=>[x0,y0,z0,x1-x0,y1-y0,z1-z0,0,0,0,...c];
 return {canvas,ok:true,dispose(){try{const x=gl.getExtension('WEBGL_lose_context');x&&x.loseContext();}catch{}},render(scene){
  gl.viewport(0,0,W,H);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);
  gl.useProgram(prog);gl.uniformMatrix4fv(u.vp,false,VP);gl.uniform3f(u.eye,...C);gl.uniform1f(u.time,scene.t||0);
  const S=scene,fc=S.fever?[.42,.28,.08]:S.kak?[.24,.1,.34]:[.07,.2,.34];
  // floor, back, pusher, ramp, lip
  gl.disable(gl.CULL_FACE);
  draw('box',[B3(0,S.backY,-2,100,100,0,fc)],3,20,.15,1);
  draw('box',[B3(-1,S.backY-2,0,101,S.backY,S.wallH+8,[.05,.09,.15])],0,10,.1,1);
  draw('box',[B3(0,S.stageBack,0,100,S.face,S.pusherH,[.7,.75,.8])],0,60,.5,1,.8);
  draw('box',[B3(0,S.face-.6,S.pusherH-.4,100,S.face+.2,S.pusherH+.3,[.95,.78,.3])],0,80,.8,1);
  {const L=Math.hypot(S.stageBack-S.rampTop,S.rampZ1-S.rampZ0),a=-Math.atan2(S.rampZ1-S.rampZ0,S.stageBack-S.rampTop),th=1.2;
   draw('box',[[0,S.rampTop,S.rampZ1-th,100,L,th,a,0,0,.22,.33,.45]],0,30,.35,1);
   draw('box',[B3(0,S.rampTop-1,S.pusherH,100,S.rampTop+.2,S.rampZ1,[.14,.2,.28])],0,10,.1,1);}
  draw('box',[B3(0,99.4,-.4,100,100.6,.8,[.95,.78,.3])],0,80,.9,1);
  // OUT zones / FEVER walls
  const out=S.wall?[.9,.75,.3]:[.55,.08,.14];draw('box',[B3(0,86,0,S.gutter,100,.05,out),B3(100-S.gutter,86,0,100,100,.05,out)],0,8,.05,1);
  if(S.wall)draw('box',[B3(S.gutter-.8,84,0,S.gutter+.8,100,7,[1,.85,.4]),B3(100-S.gutter-.8,84,0,100-S.gutter+.8,100,7,[1,.85,.4])],0,60,.6,1);
  gl.enable(gl.CULL_FACE);
  // medals and balls
  if(S.apron){const A=S.apron,I=A.info;gl.uniform4f(u.panel,I[0],I[1],I[2],0);gl.uniform4f(u.hole,I[3],I[4],I[5],I[6]);gl.uniform2f(u.flash,I[7],S.wall?1:0);
   gl.disable(gl.CULL_FACE);draw('box',[A.panel],5,30,.25,1);draw('fbox',A.flips,0,90,.9,1);gl.enable(gl.CULL_FACE);}
  // contact shadows: soft dark discs on the floor / upper stage
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
  draw('coin',S.shadows,4,1,0,.42);
  gl.depthMask(true);gl.disable(gl.BLEND);
  draw('coin',S.coins,1,90,1.1,1,.85);
  draw('ball',S.balls,2,120,1.2,1,.35);
  // acrylic side walls last, blended
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);gl.disable(gl.CULL_FACE);
  draw('box',[B3(-1.2,S.backY,0,0,100,S.wallH,[.6,.85,1]),B3(100,S.backY,0,101.2,100,S.wallH,[.6,.85,1])],0,120,1,.18);
  gl.depthMask(true);gl.disable(gl.BLEND);
 }};
}
return {create};
})();
