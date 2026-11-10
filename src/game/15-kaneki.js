// Kaneki's mechanics are isolated; victims confirm hits/pulls, owners confirm regeneration.
const KANEKI={duration:900,cutin:84,fatigue:24,regenCooldown:360,regenCap:20,regenHits:3,pullTime:30,pullImmunity:120};
CHARS.kaneki={name:'金木 研',en:'KEN KANEKI',mark:'赫',spd:1.12,jump:1.08,jumps:2,wt:1.18,pow:1.08,size:1,ctx:0,back:false,ctc:1,dgc:1,dgs:1,st:[4,2,3],sp:'特殊：赫子乱舞 → 最後にスマッシュ（連打でも出し切り）／横：長射程の赫子捕縛（途中の敵も捕らえ、攻撃を中断）',up:'赫子跳躍：方向を選んで大きく上昇する復帰技（空中1回）',ab:'白髪・四尾鱗赫。確認済み攻撃3回で2%再生（6秒間隔・残機20%まで）。MAXで下特殊：半赫者「百足」15秒。覚醒中下特殊：狂乱衝撃'};
SPECIAL_IDS.push('kaneki');ANIME_COLORS.kaneki='#e94b69';fighterRoles.kaneki='鱗赫 / 捕縛・再生';
const KANEKI_MOVES={
 kanekiJab:{type:'normal',act0:3,act1:7,end:16,reach:42,R:24,yo:32,dm:8,k0:3,ks:.035,up:.3,cd:5},
 kanekiPierce:{type:'heavy',act0:15,act1:21,end:48,reach:95,R:27,yo:34,line:true,dm:25,k0:16,ks:.12,up:.5,cd:15},
 kanekiDance:{type:'normal',act0:4,act1:30,end:44,reach:68,R:30,yo:34,multi:7,dm:6,k0:1,ks:.012,up:.12,cd:12},
 kanekiBind:{type:'heavy',act0:9,act1:16,end:48,reach:235,R:26,yo:32,line:true,dm:8,k0:2,ks:.02,up:.2,cd:20},
 kanekiRise:{type:'normal',act0:3,act1:14,end:28,reach:15,R:33,yo:55,dm:13,k0:7,ks:.06,up:1.1,cd:12},
 kakujaJab:{type:'normal',act0:2,act1:8,end:14,reach:52,R:28,yo:33,multi:6,dm:5,k0:2,ks:.025,up:.2,cd:4},
 kakujaPierce:{type:'heavy',act0:17,act1:24,end:52,reach:120,R:32,yo:34,line:true,dm:30,k0:18,ks:.13,up:.6,cd:20},
 kakujaDance:{type:'normal',act0:3,act1:32,end:46,reach:86,R:38,yo:35,multi:5,dm:5,k0:1,ks:.012,up:.12,cd:14},
 kakujaRaid:{type:'normal',act0:5,act1:23,end:43,reach:55,R:32,yo:33,multi:6,dm:5,k0:2,ks:.02,up:.2,lunge:9,rush:true,cd:18},
 kakujaRise:{type:'normal',act0:3,act1:16,end:30,reach:18,R:39,yo:60,dm:16,k0:9,ks:.07,up:1.2,cd:15},
 kakujaBurst:{type:'heavy',act0:22,act1:26,end:65,reach:0,R:125,yo:32,dm:23,k0:17,ks:.12,up:.7,cd:30}
};
Object.assign(MOVE_DEF,KANEKI_MOVES);
let kanekiLifeSerial=0;
function kanekiAwake(p){return p?.cid==='kaneki'&&p.kanekiTime>0;}
function kanekiReset(p){Object.assign(p,{kanekiLife:++kanekiLifeSerial,kanekiSwing:0,kanekiGauge:0,kanekiTime:0,kanekiFatigue:0,kanekiRegenCd:0,kanekiHealed:0,kanekiHits:0,kanekiGlow:0,kanekiBurstCd:0,kanekiAttacks:new Map(),kanekiReceipts:new Set(),kanekiPull:null,kanekiPullSeen:new Set(),kanekiPullImmune:0,kanekiBuffer:null});}
const kanekiInitBase=animeInit;
animeInit=function(p){kanekiInitBase(p);kanekiReset(p);};
function kanekiMove(p,kind,extra={}){
 const token=p.id+':'+curRound+':'+p.kanekiLife+':'+(++p.kanekiSwing);
 p.mv={...mkMv(kind),...extra,kanekiToken:token,kanekiPhase:0};p.a=1;p.ch=0;p.hit={};p.kanekiBuffer=null;
 p.kanekiAttacks.set(token,{kind,connected:false});if(p.kanekiAttacks.size>128)p.kanekiAttacks.delete(p.kanekiAttacks.keys().next().value);
 tone(190,65,.12,.09,'sawtooth');
}
function kanekiAttack(p,ch){if(p.kanekiFatigue)return;const awake=kanekiAwake(p),heavy=ch>=CH_TH,q=constrain((ch-CH_TH)/(CH_FULL-CH_TH),0,1);kanekiMove(p,awake?(heavy?'kakujaPierce':'kakujaJab'):(heavy?'kanekiPierce':'kanekiJab'),heavy?{dm:(awake?20:15)+(awake?10:10)*q}:{});}
const kanekiAttackBase=fireAttack;
fireAttack=function(p,ch){if(p.cid==='kaneki')return kanekiAttack(p,ch);return kanekiAttackBase(p,ch);};
function kanekiCutin(e){freezeT=freezeMax=KANEKI.cutin;fzType='kakuja';fz={att:e.id};tone(110,32,.7,.16,'sawtooth');}
function kanekiTransform(p){
 if(p.out||kanekiAwake(p)||p.kanekiGauge<100||p.kanekiFatigue)return false;
 clearActs(p);p.kanekiPull=null;p.kanekiGauge=0;p.kanekiTime=KANEKI.duration;
 const e={id:p.id,x:p.x,y:p.y};if(online)requestCinematic('kakuja',e);else kanekiCutin(e);return true;
}
function kanekiSpecial(p,i){
 const up=i.u&&!i.neutralSpecial&&!i.sideSpecial,down=i.gd||i.d&&!i.neutralSpecial&&!i.sideSpecial,side=i.sideSpecial||(!i.neutralSpecial&&!up?((i.r?1:0)-(i.l?1:0)):0),awake=kanekiAwake(p);
 if((p.spc>0&&!up)||p.kanekiFatigue)return;
 if(down){if(!awake){if(!kanekiTransform(p))animeNotice(p,'KAKUJA GAUGE '+Math.floor(p.kanekiGauge)+'/100','#e94b69');}else if(!p.kanekiBurstCd){kanekiMove(p,'kakujaBurst');p.kanekiBurstCd=300;p.spc=75;}return;}
 if(up){if(p.rec)return;p.rec=true;p.g=false;p.groundPl=-1;p.vy=awake?-18:-16;const steer=(i.r?1:0)-(i.l?1:0);p.vx=steer*(awake?6:5)||constrain(p.vx,-5,5);kanekiMove(p,awake?'kakujaRise':'kanekiRise');p.spc=32;}
 else if(side){p.f=side;kanekiMove(p,awake?'kakujaRaid':'kanekiBind');p.spc=awake?65:80;}
 else{kanekiMove(p,awake?'kakujaDance':'kanekiDance');p.spc=awake?48:44;}
}
function kanekiGain(p,n){if(p?.cid!=='kaneki'||!isLocal(p)||p.out||kanekiAwake(p)||p.kanekiFatigue)return;const old=p.kanekiGauge;p.kanekiGauge=Math.min(100,old+n);if(old<100&&p.kanekiGauge===100){p.kanekiGlow=30;animeNotice(p,'KAKUJA READY','#f25a78');}}
function kanekiConfirm(e){
 const p=byId(e.a),target=byId(e.t);if(p?.cid!=='kaneki'||!isLocal(p)||p.out||!target||sameTeam(p,target)||target.shadowClone||!['hit','armor'].includes(e.res)||e.bk)return;
 const token=e.kanekiToken,record=p.kanekiAttacks.get(token);if(!record)return;
 record.connected=true;
 if(e.res==='hit'&&record.kind.includes('Dance')&&e.kanekiPhase===Math.floor((KANEKI_MOVES[record.kind].act1-KANEKI_MOVES[record.kind].act0)/KANEKI_MOVES[record.kind].multi)&&!record.finished){record.finished=true;shake=Math.max(shake,7);noiseHit(.15,.18,1100,true);tone(160,45,.15,.13,'sawtooth');if(!online){freezeT=freezeMax=5;fzType='erenHitstop';fz=null;}}
 if(record.kind==='kakujaBurst'&&!online){freezeT=Math.max(freezeT,5);freezeMax=freezeT;fzType='erenHitstop';fz=null;shake=Math.max(shake,8);}
 // Once per committed attack, independent of number of tails, victims or replays.
 if(!remember(p.kanekiReceipts,token,128))return;
 kanekiGain(p,record.kind.includes('Dance')?16:12);p.kanekiHits=Math.min(KANEKI.regenHits,p.kanekiHits+1);
 if(p.kanekiHits>=KANEKI.regenHits&&!p.kanekiRegenCd&&p.d>0&&p.kanekiHealed<KANEKI.regenCap){
  const n=Math.min(2,p.d,KANEKI.regenCap-p.kanekiHealed);p.d-=n;p.kanekiHealed+=n;p.kanekiHits=0;p.kanekiRegenCd=KANEKI.regenCooldown;p.kanekiGlow=24;ring(p.x,p.y-30,20,12);burst(p.x,p.y-30,6,1,'#e94b69',12);
 }
}
const kanekiFxBase=playFx;
playFx=function(e,remote){kanekiFxBase(e,remote);kanekiConfirm(e);};
// Share the exact finish definition with the victim's authoritative hit resolver.
function kanekiHitSpec(kind,phase,charge){
 const base=KANEKI_MOVES[kind],last=base.multi&&phase===Math.floor((base.act1-base.act0)/base.multi);
 const dance=kind==='kanekiDance'||kind==='kakujaDance',awake=kind==='kakujaDance';
 if(dance&&last)return {...base,type:'heavy',dm:awake?16:14,k0:awake?19:17,ks:awake?.13:.12,up:.55,minKb:14,reach:base.reach+8,R:base.R+12};
 if(last)return {...base,type:'heavy',k0:10,ks:.08,up:.6};
 return {...base,dm:kind.includes('Pierce')?constrain(charge,kind==='kakujaPierce'?20:15,base.dm):base.dm};
}
function kanekiPrepare(p){
 const m=p.mv;if(p.cid!=='kaneki'||!m||!KANEKI_MOVES[m.kind])return;
 const base=KANEKI_MOVES[m.kind],phase=base.multi?Math.max(0,Math.floor((p.a-base.act0)/base.multi)):0;
 Object.assign(m,kanekiHitSpec(m.kind,phase,m.dm),{kanekiPhase:phase});
}
const kanekiCheckBase=meleeCheck;
meleeCheck=function(p){kanekiPrepare(p);return kanekiCheckBase(p);};
function kanekiCaptureConfirmed(actor,token,target){
 const a=byId(actor),r=a?.kanekiAttacks?.get(token);
 if(a?.cid!=='kaneki'||!isLocal(a)||a.out||a.kb||a.stn||a.mv?.kanekiToken!==token||r?.kind!=='kanekiBind')return;
 r.connected=true;r.captured=true;r.target=target;
}
function kanekiPullTick(p){
 const g=p.kanekiPull;if(!g)return false;const a=byId(g.by);
 if(!a||a.out||a.cid!=='kaneki'||!g.token.startsWith(a.id+':'+curRound+':'+a.kanekiLife+':')||kanekiAwake(a)||a.kb||a.stn||a.timeStopT||a.domainT||p.out||erenTitan(p)||p.kanekiTime>0||isInvuln(p)||Math.hypot(p.x-a.x,p.y-a.y)>315 ){p.kanekiPull=null;return false;}
 if(--g.t<=0){p.kanekiPull=null;clearActs(p);p.stn=Math.max(p.stn,8);return false;}
 // Victim owner moves its own body; bounded displacement, no teleport across the arena.
 p.x+=constrain(a.x+g.dir*52-p.x,-9,9);p.y+=constrain(a.y-p.y,-6,6);p.vx=p.vy=0;clearActs(p);return true;
}
const kanekiMeleeBase=resolveMelee;
resolveMelee=function(A,t){
 const a=byId(A.id),m=A.mv;
 if(a?.cid==='kaneki'&&KANEKI_MOVES[m.kind]){
  const token=m.kanekiToken;if(!Number.isInteger(m.kanekiPhase)||m.kanekiPhase<0||m.kanekiPhase>Math.floor((KANEKI_MOVES[m.kind].act1-KANEKI_MOVES[m.kind].act0)/(KANEKI_MOVES[m.kind].multi||1000)))return;
  if(typeof token!=='string'||token.length>180||!token.startsWith(a.id+':'+curRound+':'+a.kanekiLife+':'))return;
  if(t.out||sameTeam(a,t)||isInvuln(t)||t.timeStopT||Math.hypot(a.x-t.x,a.y-t.y)>300)return;
  const key=token+':'+(m.kanekiPhase||0);if(!remember(t.kanekiPullSeen,key,256))return;
  const safe={...kanekiHitSpec(m.kind,m.kanekiPhase,m.dm),kanekiToken:token,kanekiPhase:m.kanekiPhase,ko:false,pierce:false};
  const protectedTarget=isArmored(t);
  const before=t.d;kanekiMeleeBase({...A,mv:safe},t);
  if(m.kind==='kanekiBind'&&t.d>before&&!t.ct&&!protectedTarget&&!erenTitan(t)&&fighterSize(t)<=1.5&&!t.shadowClone&&!t.erenGrab&&!t.kanekiPullImmune&&!kanekiAwake(t)){
   t.kanekiPull={by:a.id,dir:A.f,t:KANEKI.pullTime,token};t.kanekiPullImmune=KANEKI.pullImmunity;t.kb=t.stn=0;clearActs(t);
   kanekiCaptureConfirmed(a.id,token,t.id);
   if(online)send({k:'kaneki-capture',a:a.id,t:t.id,token});
  }
  return;
 }
 return kanekiMeleeBase(A,t);
};
const kanekiHitBase=applyHit;
applyHit=function(p,h,bk,id){const before=p.d,r=kanekiHitBase(p,h,bk,id);if(p.d>before){p.kanekiPull=null;p.kanekiBuffer=null;kanekiGain(p,(p.d-before)*.4);}return r;};
function kanekiTick(p){
 for(const k of ['kanekiFatigue','kanekiRegenCd','kanekiGlow','kanekiBurstCd'])if(p[k]>0)p[k]--;
 if(kanekiAwake(p)&&--p.kanekiTime===0){p.kanekiGauge=0;p.kanekiFatigue=KANEKI.fatigue;clearActs(p);burst(p.x,p.y-30,12,2,'#a82a49',16);}
}
const kanekiStepBase=stepFighter;
stepFighter=function(p,i){
 if(bt.phase==='play'&&!freezeT&&!p.timeStopT&&!p.out){
  if(p.kanekiPullImmune>0)p.kanekiPullImmune--;
  if(p.kanekiPull&&kanekiPullTick(p)){p.prev={...i};return;}
  if(p.cid==='kaneki'){
   kanekiTick(p);
   const record=p.mv&&p.kanekiAttacks.get(p.mv.kanekiToken);
   const neutralRepeat=p.mv?.kind.includes('Dance')&&i.sc!==p.prev.sc&&!i.u&&!i.d&&!i.gd&&!i.sideSpecial;
   const edge=(!neutralRepeat&&i.sc!==p.prev.sc)||i.ac!==p.prev.ac;
   if(neutralRepeat)p.kanekiBuffer=null;
   const binding=record?.kind==='kanekiBind';
   if(edge&&!p.kb&&!p.stn&&((binding&&p.a>=4)||record?.connected&&p.a>=8))p.kanekiBuffer={i:{...i},t:binding?24:10};
   if(p.kanekiBuffer){const b=p.kanekiBuffer;if(--b.t<=0||p.kb||p.stn)p.kanekiBuffer=null;else if(p.mv&&((record?.captured&&record.kind==='kanekiBind')||record?.connected&&p.a>=p.mv.act1)){clearActs(p);p.cd=p.spc=0;i=b.i;p.prev.sc=i.sc-1;p.prev.ac=i.ac-1;p.kanekiBuffer=null;}}
   if(p.kanekiFatigue)i={...blankInput(),ac:i.ac,sc:i.sc};
  }
 }
 return kanekiStepBase(p,i);
};
const kanekiConfigBase=fighterConfig;
fighterConfig=function(p){const c=kanekiConfigBase(p);return kanekiAwake(p)?{...c,spd:1.24}:c;};
const kanekiKOBase=koFighter;
koFighter=function(p){kanekiKOBase(p);kanekiReset(p);};
const kanekiPickupBase=tryPickup;
tryPickup=function(p,id,it){if(p.cid==='kaneki')return;return kanekiPickupBase(p,id,it);};
// Bounded snapshots; no remote map/set assignment or remote healing commands.
function kanekiRead(s){const k=s.kn||{},n=(v,max)=>Number.isFinite(v)?constrain(v,0,max):0;return {kanekiLife:n(k.life,1e9),kanekiGauge:n(k.gauge,100),kanekiTime:n(k.time,900),kanekiHealed:n(k.healed,20),kanekiRegenCd:n(k.regen,360),kanekiGlow:n(k.glow,30),kanekiFatigue:n(k.fatigue,24)};}
function kanekiRestore(p,s){if(p.cid==='kaneki')Object.assign(p,kanekiRead(s));const g=s.kg,a=g&&byId(g.by);p.kanekiPull=g&&a?.cid==='kaneki'&&Number.isInteger(g.t)&&g.t>0&&g.t<=KANEKI.pullTime&&typeof g.token==='string'&&g.token.length<=180&&Math.abs(g.dir)===1?{by:g.by,t:g.t,token:g.token,dir:g.dir}:null;}
const kanekiStateBase=stateOf;
stateOf=function(p){const s=kanekiStateBase(p);if(p.cid==='kaneki')s.kn={life:p.kanekiLife,gauge:p.kanekiGauge,time:p.kanekiTime,healed:p.kanekiHealed,regen:p.kanekiRegenCd,glow:p.kanekiGlow,fatigue:p.kanekiFatigue};if(p.kanekiPull)s.kg=p.kanekiPull;return s;};
const kanekiEventBase=handleGameplayEvent;
handleGameplayEvent=function(e){if(e.k==='kaneki-capture'){if(byId(e.t)?.owner===e.by&&typeof e.token==='string')kanekiCaptureConfirmed(e.a,e.token,e.t);return;}if(e.k==='mh'&&KANEKI_MOVES[e.mv?.kind]&&byId(e.a)?.owner!==e.by)return;if(e.k==='fx'&&e.kanekiToken&&byId(e.t)?.owner!==e.by)return;return kanekiEventBase(e);};
const kanekiReceiveBase=receiveNetEvent;
receiveNetEvent=function(e){if(e?.k==='cinx'&&e.kind==='kakuja'&&byId(e.data?.id)?.owner!==e.by)return;return kanekiReceiveBase(e);};
AI_CHARACTER_PLAN.kaneki={ideal:105,near:48,far:220,shoot:180,skill:.65,charge:.25,guard:.3};
AI_SKILLS.kaneki={range:105,startup:4,damage:24,hold:2,dir:'neutral'};
const kanekiSkillsBase=aiSkillOptions;
aiSkillOptions=function(p,t){if(p.cid!=='kaneki')return kanekiSkillsBase(p,t);return [{name:'special',dir:'neutral',range:kanekiAwake(p)?140:110,startup:4,damage:24,recovery:13,hold:2},{name:'side',dir:'side',range:250,startup:9,damage:8,recovery:32,hold:2,ready:()=>!erenTitan(t)&&!t.kanekiPullImmune}];};
const kanekiTacticsBase=aiTacticalAction;
aiTacticalAction=function(p,t,A,I,D,plan){
 if(p.cid==='kaneki'&&p.mv&&!p.kb&&!p.stn&&!p.ct&&!p.dg){
  const record=p.kanekiAttacks.get(p.mv.kanekiToken);
  if(record?.connected&&!record.comboIssued&&p.a>=Math.max(8,p.mv.act1-6)&&Math.abs(t.x-p.x)<150&&Math.random()>D.error){
   const rise=p.mv.kind==='kanekiDance'&&!p.rec;
   if(p.mv.kind==='kanekiBind'||rise){record.comboIssued=true;I.s=true;I.sc++;I.u=rise;I.neutralSpecial=!rise;I.sideSpecial=0;I.gd=I.d=false;A.shold=2;return rise?'kagune-follow-rise':'kagune-follow-dance';}
  }
 }
 if(p.cid==='kaneki'&&aiReady(p)&&!p.spc&&!p.kanekiFatigue){if(!kanekiAwake(p)&&p.kanekiGauge>=100&&Math.abs(t.x-p.x)<240){aiUseSpecial(p,I,A,2,'down');return 'kakuja-awaken';}if(!p.rec&&t.y<p.y-35&&Math.abs(t.x-p.x)<70){aiUseSpecial(p,I,A,2,'up');return 'kagune-rise';}if(kanekiAwake(p)&&!p.kanekiBurstCd&&Math.abs(t.x-p.x)<100&&t.d>70){aiUseSpecial(p,I,A,2,'down');return 'kakuja-burst';}}return kanekiTacticsBase(p,t,A,I,D,plan);};
const kanekiProfileBase=aiMeleeProfile;
aiMeleeProfile=function(p,hold=2){if(p.cid!=='kaneki')return kanekiProfileBase(p,hold);const m=KANEKI_MOVES[kanekiAwake(p)?hold>=CH_TH?'kakujaPierce':'kakujaJab':hold>=CH_TH?'kanekiPierce':'kanekiJab'];return {range:m.reach+m.R,startup:m.act0+hold,damage:m.dm,hold,type:m.type,recovery:m.end-m.act1};};
// Rest poses never depend on a clock: only committed attacks move the kagune.
const KANEKI_REST=[[-78,-77,-94,-18],[-58,-110,-101,-72],[47,-104,17,-118],[67,-49,95,-80]];
function kanekiTailPose(p,index,time){
 const awake=kanekiAwake(p),m=p.mv,base=KANEKI_MOVES[m?.kind],a=p.a||0;
 const attack=!!base&&a>0,active=attack&&a>=base.act0&&a<=base.act1;
 const phase=base?.multi?Math.max(0,Math.floor((a-base.act0)/base.multi)):0;
 const rest=KANEKI_REST[index],size=awake?1.28:1;
 let x=rest[0]*size,y=rest[1]*size,cx=rest[2]*size,cy=rest[3]*size;
 let extend=active&&(m.kind.includes('Dance')?(phase===Math.floor((base.act1-base.act0)/base.multi)||index===phase%4):m.kind.includes('Pierce')||m.kind.includes('Burst')||index<2);
 if(attack){
  // A braced windup, one decisive stroke, then a short retract. No idle spring simulation.
  const wind=constrain(a/base.act0,0,1),recover=constrain((base.end-a)/(base.end-base.act1),0,1);
  const stroke=active?1:a>base.act1?recover*recover:0;
  if(!active&&a<=base.act0){x-=wind*15;cx-=wind*12;}
  const selected=m.kind.includes('Dance')?(phase===Math.floor((base.act1-base.act0)/base.multi)||index===phase%4):m.kind.includes('Pierce')||m.kind.includes('Burst')||index<2;
  if(selected&&stroke>0){
   const reach=base.reach||70;
   let tx=reach+index*3,ty=-base.yo+(index-1.5)*7;
   if(m.kind.includes('Dance')){ty+=[-6,12,-21,0][phase%4];cx=-20;cy=phase%4===2?-115:-65;}
   if(m.kind.includes('Rise')){tx=18+(index-1)*14;ty=-91-index*8;cx=-45;cy=-22;}
   if(m.kind.includes('Bind')){tx=base.reach;ty=-32+(index?8:-8);cx=base.reach*.37;cy=-83;}
   if(m.kind.includes('Burst')){tx=[-111,-74,72,114][index];ty=[-32,-110,-112,-32][index];cx=tx*.3;cy=-62;}
   x+=(tx-x)*stroke;y+=(ty-y)*stroke;
  }
 }
 return {x,y,cx,cy,extend};
}
// Tapered ribbons, highlights and centipede plates share a small fixed point budget.
function kanekiPaintTail(ctx,q,index,awake){
 const points=[],steps=10;
 for(let n=0;n<=steps;n++){
  const t=n/steps,u=1-t;
  points.push({x:u*u*u*(-5)+3*u*u*t*q.cx+3*u*t*t*(q.cx+q.x*.6)+t*t*t*q.x,y:u*u*u*(-28)+3*u*u*t*q.cy+3*u*t*t*(q.y-17)+t*t*t*q.y});
 }
 const edges=points.map((p,n)=>{const prev=points[Math.max(0,n-1)],next=points[Math.min(steps,n+1)],dx=next.x-prev.x,dy=next.y-prev.y,len=Math.hypot(dx,dy)||1,w=(awake?10:5.8)*(1-n/(steps+1))+.4;return {x:p.x,y:p.y,nx:-dy/len,ny:dx/len,w};});
 ctx.beginPath();edges.forEach((p,i)=>{const x=p.x+p.nx*p.w,y=p.y+p.ny*p.w;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});
 for(let i=edges.length-1;i>=0;i--){const p=edges[i];ctx.lineTo(p.x-p.nx*p.w,p.y-p.ny*p.w);}ctx.closePath();
 ctx.fillStyle=awake?'#822341':'#9e2147';ctx.fill();ctx.strokeStyle='#ef5276';ctx.lineWidth=awake?1.6:1.2;ctx.stroke();
 ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=awake?'#f0527a':'#ed6a87';ctx.lineWidth=awake?2:1;ctx.stroke();
 if(awake){
  ctx.strokeStyle='#ef8298';ctx.lineWidth=1.4;ctx.beginPath();
  for(let n=1;n<steps;n++){const p=edges[n],w=p.w+5;ctx.moveTo(p.x+p.nx*w-4,p.y+p.ny*w+3);ctx.lineTo(p.x+p.nx*p.w,p.y+p.ny*p.w);ctx.lineTo(p.x-p.nx*p.w,p.y-p.ny*p.w);ctx.lineTo(p.x-p.nx*w-4,p.y-p.ny*w+3);}ctx.stroke();
 }
}
function kanekiPaintBody(c,awake,attack){
 c.save();c.translate(attack?9:awake?6:0,0);c.lineCap='round';c.lineJoin='round';
 const lines=(segments,color,width)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();for(const [x,y,xx,yy]of segments){c.moveTo(x,y);c.lineTo(xx,yy);}c.stroke();};
 const poly=(points,color)=>{c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
 const oval=(x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
 const legs=[[-3,-24,-12,0],[3,-24,13,0]],arms=[[1,-44,attack?23:12,attack?-33:-26],[-1,-43,-12,-25]],torso=[[0,-24,awake?7:1,-47]];
 lines(legs,'#9e8396',8);lines(legs,'#101421',6);lines(torso,'#b1a7b5',12);lines(torso,'#151522',10);lines(arms,'#726575',6);lines(arms,'#171421',4);
 oval(attack?23:12,attack?-33:-26,2.5,2.5,'#ded3d3');oval(-12,-25,2.5,2.5,'#ded3d3');lines([[3,-43,4,-27],[-6,-4,-14,-2],[10,-4,16,-2]],'#d9a5b5',1);
 if(awake){poly([[-8,-47],[11,-53],[17,-30],[-4,-23]],'#37152b');lines(Array.from({length:5},(_,n)=>[-4,-29-n*4,12,-33-n*4]),'#e44c73',2);}
 oval(1,-61,9.5,11.5,'#151d2c');
 poly([[-10,-55],[-14,-64],[-11,-71],[-7,-69],[-4,-77],[0,-72],[5,-76],[6,-70],[12,-72],[10,-58],[7,-64],[4,-59],[1,-66],[-3,-61],[-5,-65]],'#eaf0f5');
 poly([[-9,-58],[11,-59],[10,-49],[-8,-49]],'#080d18');lines([[-5,-54,9,-54],...[-4,-1,2,5,8].map(x=>[x,-56,x,-52])],'#b7bcc9',1);
 // No individually drawn eyes: the masked face follows the game's stick-fighter style.
 if(awake){poly([[-9,-69],[7,-81],[17,-53]],'#4e1632');lines([[7,-77,14,-58]],'#f56788',1);poly([[8,-53],[18,-48],[10,-49]],'#ddd5d6');}
 c.restore();
}
// Two static path sets. No idle simulation, tessellation, bitmap upload or network fields.
const kanekiRestSprites=new Map();
function kanekiRestSprite(awake){
 if(kanekiRestSprites.has(awake))return kanekiRestSprites.get(awake);
 const curves=new Path2D(),plates=new Path2D(),tips=new Path2D();
 for(let j=0;j<4;j++){
  const q=kanekiTailPose({cid:'kaneki',kanekiTime:awake?900:0},j,0);
  curves.moveTo(-5,-28);curves.bezierCurveTo(q.cx,q.cy,q.cx+q.x*.6,q.y-17,q.x,q.y);
  tips.moveTo(q.x-6,q.y-3);tips.lineTo(q.x+5,q.y);tips.lineTo(q.x-6,q.y+4);tips.closePath();
  if(awake)for(let n=2;n<10;n+=2){const t=n/10,u=1-t,x=u*u*u*(-5)+3*u*u*t*q.cx+3*u*t*t*(q.cx+q.x*.6)+t*t*t*q.x,y=u*u*u*(-28)+3*u*u*t*q.cy+3*u*t*t*(q.y-17)+t*t*t*q.y;plates.moveTo(x-8,y-7);plates.lineTo(x+6,y+6);plates.lineTo(x+2,y+12);}
 }
 const paths={curves,plates,tips};kanekiRestSprites.set(awake,paths);return paths;
}
function kanekiPaintRest(ctx,awake){
 const s=kanekiRestSprite(awake);ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 ctx.strokeStyle='#3d122a';ctx.lineWidth=awake?16:9;ctx.stroke(s.curves);
 ctx.strokeStyle=awake?'#a92c53':'#c13660';ctx.lineWidth=awake?11:5;ctx.stroke(s.curves);
 ctx.strokeStyle='#f17d9c';ctx.lineWidth=1;ctx.stroke(s.curves);
 if(awake){ctx.lineWidth=1.5;ctx.stroke(s.plates);}ctx.fillStyle='#f37c98';ctx.fill(s.tips);
 ctx.restore();kanekiPaintBody(ctx,awake,false);
}
function kanekiAttackAccent(p,awake){
 const m=p.mv,base=KANEKI_MOVES[m?.kind];if(!base||p.a<base.act0||p.a>base.act1)return;
 const phase=base.multi?Math.floor((p.a-base.act0)/base.multi):0;
 const q=kanekiTailPose(p,m.kind.includes('Dance')?phase%4:0,0);
 push();noFill();stroke(232,45,91,145);strokeWeight(m.kind.includes('Dance')&&phase===Math.floor((base.act1-base.act0)/base.multi)?9:awake?7:4);
 if(m.kind.includes('Pierce')||m.kind.includes('Bind')){
  line(5,-33,q.x,q.y);stroke('#ffe4eb');strokeWeight(1.4);line(24,-33,q.x,q.y);
  if(m.kind==='kanekiBind'){
   // Two light hooks make the long-range grab readable without expensive particles.
   stroke('#fba3bb');strokeWeight(2.1);
   line(q.x-13,q.y-10,q.x+3,q.y);line(q.x-13,q.y+10,q.x+3,q.y);
   stroke('#ffffff');strokeWeight(1);line(q.x-9,q.y,q.x+13,q.y);
  }
 }
 else{const r=m.kind.includes('Burst')?base.R*2:base.R*2.2;arc(base.reach,-base.yo,r,r*.72,-1.8,1.4);stroke('#ffd5df');strokeWeight(1.4);arc(base.reach+2,-base.yo,r*.9,r*.64,-1.7,1.25);}
 noStroke();fill('#ffe3ed');triangle(q.x+6,q.y,q.x-8,q.y-4,q.x-5,q.y+5);pop();
}
function kanekiDraw(p,time=visualFrame){
 if(p.out)return;const awake=kanekiAwake(p),attack=p.mv&&KANEKI_MOVES[p.mv.kind]&&p.a>0;
 push();translate(p.x,p.y);scale(p.f,1);
 if(attack){for(let j=0;j<4;j++)kanekiPaintTail(drawingContext,kanekiTailPose(p,j,0),j,awake);}else kanekiPaintRest(drawingContext,awake);
 kanekiAttackAccent(p,awake);
 if(attack)kanekiPaintBody(drawingContext,awake,true);
 pop();
 if(p.kanekiGlow>0){push();noFill();stroke(245,83,122,160);strokeWeight(2);circle(p.x,p.y-35,46*p.kanekiGlow/30);pop();}
 push();textAlign(CENTER,CENTER);textSize(11);stroke('#121424');strokeWeight(3);fill('#f2c9d5');text(p.label,p.x,p.y-(awake?151:125));pop();
}
const kanekiDrawBase=drawFighter;
drawFighter=function(p){if(p.cid==='kaneki')return kanekiDraw(p);const r=kanekiDrawBase(p);if(p.kanekiPull){const a=byId(p.kanekiPull.by);if(a){push();stroke('#c73759');strokeWeight(3);noFill();bezier(a.x,a.y-27,a.x+a.f*80,a.y-70,p.x,p.y-60,p.x,p.y-28);ellipse(p.x,p.y-30,25,13);ellipse(p.x,p.y-23,23,10);pop();}}return r;};
function kanekiPortraitSVG(){return `<svg viewBox="0 0 100 82" aria-hidden="true">
 <defs><linearGradient id="kaneki-coat" x2="1" y2="1"><stop stop-color="#4a3349"/><stop offset="1" stop-color="#0c101b"/></linearGradient><linearGradient id="kaneki-rinkaku"><stop stop-color="#4c1230"/><stop offset=".6" stop-color="#c8335c"/><stop offset="1" stop-color="#ff8da5"/></linearGradient></defs>
 <path d="M0 20L75 0H100V62L23 82H0Z" fill="#57152f"/><path d="M0 70L100 12M0 79L100 21" stroke="#d74465" opacity=".4"/>
 <g fill="none" stroke="url(#kaneki-rinkaku)" stroke-linecap="round"><path d="M46 73C4 73-5 27 20 18M44 65C-6 51 8 0 36 9M56 64C77 1 106 12 89 35M57 71C84 39 110 42 93 67" stroke-width="7"/><path d="M46 73C4 73-5 27 20 18M56 64C77 1 106 12 89 35" stroke="#ff8da5" stroke-width="1"/></g>
 <path d="M20 82L31 49 43 42H60L75 53 84 82Z" fill="url(#kaneki-coat)" stroke="#aa829b" stroke-width="1"/><path d="M38 48L47 62 56 47M48 62V82" fill="none" stroke="#c6a7b9" stroke-width="1"/>
 <path d="M34 22Q50 4 66 23L63 46 50 52 36 42Z" fill="#141c2a"/><path d="M31 36L28 19 35 8 39 12 44 1 49 7 56 0 60 8 69 7 69 27 64 41 61 25 57 31 52 17 48 31 43 20 38 37 35 27Z" fill="#f2f4fa" stroke="#b7becd" stroke-width=".7"/>
 <path d="M36 34L64 31 65 46 54 53 39 47Z" fill="#090f1b" stroke="#b2a1b6" stroke-width="1"/><path d="M42 41L60 39M44 38V44M48 37V43M52 37V43M56 36V42" stroke="#e7e5ec" stroke-width="1.2"/><path d="M38 34L33 31M63 32L68 28" stroke="#4a3b50" stroke-width="2"/>
 <!-- Featureless shadowed face, no pupil, slit or red eye. -->
 </svg>`;}
const kanekiPortraitBase=portrait;
portrait=function(id,gear=1,form=0,mode=false){return id==='kaneki'?kanekiPortraitSVG():kanekiPortraitBase(id,gear,form,mode);};
const kanekiHudBase=animeHud;
animeHud=function(p){if(p.cid!=='kaneki')return kanekiHudBase(p);return {m:kanekiAwake(p)?p.kanekiTime/9:p.kanekiGauge,label:p.kanekiFatigue?'解除疲労':kanekiAwake(p)?'HALF-KAKUJA '+Math.ceil(p.kanekiTime/60)+'秒':(p.kanekiGauge>=100?'KAKUJA READY':'KAKUJA GAUGE '+Math.floor(p.kanekiGauge)+'/100')+' / 再生 '+p.kanekiHealed.toFixed(1)+'/20'};};
const kanekiControlBase=updateControlUI;
updateControlUI=function(){kanekiControlBase();const p=byId(myId);if(p?.cid!=='kaneki')return;setTxt(document.querySelector('#btn-s small'),kanekiAwake(p)?'百足乱舞':'赫子乱舞');setTxt(document.querySelector('#btn-g small'),kanekiAwake(p)?'狂乱衝撃':'半赫者覚醒');document.getElementById('btn-g').classList.toggle('ready',!kanekiAwake(p)&&p.kanekiGauge>=100);setTxt(document.getElementById('combat-hint'),'横：長射程で捕縛・敵の技を中断 → 特殊：乱舞／上：復帰／MAXで下：半赫者');};
const kanekiFreezeWorldBase=drawFreezeWorld,kanekiFreezeTextBase=drawFreezeText,kanekiEndFreezeBase=endFreeze;
drawFreezeWorld=function(){if(fzType==='kakuja')return;return kanekiFreezeWorldBase();};
endFreeze=function(){if(fzType==='kakuja')return;return kanekiEndFreezeBase();};
drawFreezeText=function(){
 if(fzType!=='kakuja')return kanekiFreezeTextBase();
 const p=byId(fz?.att);if(!p)return;
 const q=1-freezeT/Math.max(1,freezeMax),reveal=constrain((q-.2)*2,0,1);
 push();noStroke();fill(9,5,16,prefs.lowFlash?235:248);rect(0,0,W,WH);
 fill('#3c1027');quad(0,WH*.24,W,WH*.04,W,WH*.73,0,WH*.94);
 // A few graphic cuts replace continuous full-screen particle emitters.
 stroke('#b53059');strokeWeight(2);line(0,WH*.25,W,WH*.05);line(0,WH*.93,W,WH*.72);
 stroke('#f17b99');strokeWeight(1);line(W*.05,WH*.29,W*.93,WH*.12);
 push();translate(W*.6,WH*.79);scale(3.1+reveal*.7);
 kanekiDraw({...p,label:'',x:0,y:0,kanekiTime:q>.3?900:0,a:q>.5?24:0,mv:mkMv('kakujaBurst')},0);pop();
 noStroke();fill('#f6e8f0');textAlign(LEFT,CENTER);textStyle(BOLD);textSize(W*.085);text('金木 研',W*.06,WH*.42);
 fill('#ee527a');textSize(W*.029);text(q<.3?'RINKAKU  /  鱗赫解放':'HALF-KAKUJA',W*.065,WH*.55);
 fill('#e6c4d1');textSize(W*.018);text(q<.5?'4本の鱗赫が、異形へ。':'半赫者「百足」  —  15秒の覚醒',W*.065,WH*.64);
 fill('#f3bacb');textSize(W*.014);text('KEN KANEKI',W*.065,WH*.21);
 textStyle(NORMAL);pop();
};
const kanekiArmorBase=armorHit;
armorHit=function(p,h,id){const before=p.d,r=kanekiArmorBase(p,h,id);kanekiGain(p,(p.d-before)*.4);return r;};
const kanekiProjBase=resolveProj;
resolveProj=function(q,p){const before=p.d,r=kanekiProjBase(q,p);if(q.animeKind==='ki')kanekiGain(p,(p.d-before)*.4);return r;};
