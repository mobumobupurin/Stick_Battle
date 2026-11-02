// Boss HP only. Allies use the ordinary percentage, knockback and stock rules.
const RAID_BOSS_ID='raid_dio';
const RAID_BOSSES={dio:{name:'DIO',hp:6400,lives:2}};
const DIO_BODY={...CHARS.jotaro,name:'DIO',en:'DIO / THE WORLD',size:1,wt:.62,pow:1.25,spd:1.32,jump:1.15};
const DIO_STOP_T=240;
const RAID_CITY={name:'カイロ / 最終決戦',w:1800,h:1012.5,wpn:false,plats:[{x:60,y:880,w:1680,h:34},{x:130,y:710,w:285,h:18},{x:650,y:690,w:260,h:18},{x:1090,y:725,w:275,h:18},{x:1485,y:670,w:225,h:18}]};
const DIO_MOVES={
 dioJab:{type:'normal',act0:3,act1:7,end:15,reach:44,R:26,yo:34,dm:8,k0:4,ks:.045,up:.3,cd:5},
 dioKick:{type:'heavy',act0:6,act1:12,end:27,reach:64,R:29,yo:32,dm:14,k0:9,ks:.085,up:.45,lunge:5,cd:10},
 dioRush:{type:'normal',act0:3,act1:31,end:48,reach:78,R:31,yo:36,multi:4,dm:2.4,k0:1.2,ks:.008,up:.12,cd:16},
 dioThrow:{type:'normal',act0:9,act1:10,end:24,reach:0,R:0,yo:34,noHit:true,cd:6},
 dioRoller:{type:'heavy',act0:17,act1:18,end:54,reach:0,R:0,yo:34,noHit:true,cd:13},
 dioRise:{type:'normal',act0:2,act1:16,end:27,reach:18,R:34,yo:53,dm:18,k0:11,ks:.10,up:1.1,cd:7},
 dioSlam:{type:'heavy',act0:15,act1:19,end:42,reach:75,R:48,yo:34,dm:25,k0:16,ks:.12,up:.82,cd:17}
};
Object.assign(MOVE_DEF,DIO_MOVES);
let raid=null,raidFx=[],raidLastWire=-1;
const raidParty={count:3,cids:['jotaro','gojo','kaneki']};
function raidMode(){return online?gmCache?.mode==='raid':offlineMode==='raid';}
function raidActive(){return !!raid&&raidMode()&&battleSessionActive();}
function raidAuthority(){return !online||isHost;}
function raidHeroes(){return fighters.filter(p=>!p.raidBoss&&!p.shadowClone);}
function raidWorldStopped(){return raidActive()&&raid.move==='world'&&raid.at<DIO_STOP_T;}
// In a raid, Jotaro alone can move inside HIS time stop. Teammates and DIO freeze.
function raidJotaroStopId(){
 if(!raidActive()||raidWorldStopped())return '';
 if(raid.jotaroStopId&&raid.frame<raid.jotaroStopUntil)return raid.jotaroStopId;
 return raidHeroes().find(h=>!h.out&&h.cid==='jotaro'&&h.timeStopSelfT>0)?.id||'';
}
function raidFrozen(p){
 if(raidWorldStopped()){
  if(p?.raidBoss)return raid.counterIds.length>0;
  return !p||p.cid!=='jotaro'||!raid.counterIds.includes(p.id);
 }
 const stopper=raidJotaroStopId();
 return !!stopper&&(!p||p.id!==stopper);
}
function raidCanHurtBoss(p){return !!p&&!p.out&&!sameTeam(p,byId(RAID_BOSS_ID))&&!raidFrozen(p)&&(!raidWorldStopped()||p.cid==='jotaro'&&raid.counterIds.includes(p.id));}
function raidCounterWindow(p){return raidWorldStopped()&&p?.cid==='jotaro'&&!p.out&&!raid.counterIds.includes(p.id)&&p.energy>=100;}
const raidAnimeStopActiveBase=animeTimeStopActive;
animeTimeStopActive=function(){return raidWorldStopped()||raidAnimeStopActiveBase();};
function raidInit(){
 raid={boss:'dio',frame:0,move:'fight',at:0,serial:1,counterIds:[],result:'',phase:1,nextWorld:1020,nextControl:0,jotaroStopId:'',jotaroStopUntil:0};
 raidFx=[];raidLastWire=-1;
 stage=RAID_CITY;
 raidHeroes().forEach(p=>{delete p.raidHp;p.s=2;p.team=1;p.raidCounterSerial=0;});
 const host=online?gmCache.hostId||raidHeroes()[0]?.owner:myId;
 const boss=makeFighter({id:RAID_BOSS_ID,cid:'dio',label:'DIO',owner:host,cpu:1,team:2},fighters.length);
 Object.assign(boss,{raidBoss:true,raidHp:6400,s:1,f:-1,c:'#d9bf75',inv:0,dioThink:0,dioKnifeCd:0,dioRollerCd:150,dioBlinkCd:90,dioJumpCd:0});
 fighters.push(boss);battleTeamMode=true;battleWpn=false;hudKey='';
 const starts=chooseSpawnPoints(stage,fighters.length,true,fighters);
 fighters.forEach((p,i)=>{Object.assign(p,{x:starts[i].x,y:starts[i].y,g:true,groundPl:starts[i].pl,vx:0,vy:0});p.f=p.raidBoss?-1:1;});
 document.getElementById('b-char').style.display='none';
}
const raidStartCommonBase=startBattleCommon;
startBattleCommon=function(...args){raid=null;const r=raidStartCommonBase(...args);if(raidMode())raidInit();return r;};
const raidSizeBase=fighterSize,raidConfigBase=fighterConfig;
fighterSize=function(p){return p.raidBoss?DIO_BODY.size:raidSizeBase(p);};
fighterConfig=function(p){return p.raidBoss?(raidWorldStopped()?{...DIO_BODY,spd:1.85}:raidActive()&&raid.phase>=3?{...DIO_BODY,spd:1.65}:raidActive()&&raid.phase===2?{...DIO_BODY,spd:1.46}:DIO_BODY):raidConfigBase(p);};
const raidOfflineBase=startBattleOffline;
startBattleOffline=function(){
 if(offlineMode!=='raid')return raidOfflineBase();
 online=false;aiLv=3;
 const list=[{id:myId,cid:settings.cid,label:cleanName(settings.name),owner:myId,cpu:0,team:1}];
 for(let i=0;i<raidParty.count;i++)list.push({id:'raid_cpu_'+i,cid:pickOfflineCpu(raidParty.cids[i],'all'),label:'CPU '+(i+1),owner:myId,cpu:1,team:1});
 startBattleCommon(list,'wide',false,2,true);modeHeader();
};
const raidHostStartBase=hostStart;
hostStart=async function(){
 if(gmCache?.mode!=='raid')return raidHostStartBase();
 if(!isHost||!roomRef)return;
 const humans=lobbyMembers().filter(m=>!m.cpu);
 if(humans.length<1||humans.length>4){alert('協力ボスは1〜4人で出撃できます。');return;}
 if(humans.some(m=>m.protocol!==NET_PROTOCOL)){alert('全員が最新版に更新して入り直してください。');return;}
 const players=humans.map(m=>({...m,team:1,cpu:0,owner:m.id}));
 for(let i=0;i<Math.min(4-humans.length,clampInt(gmCache.raidCpuN,0,3,0));i++)players.push({id:'raid_cpu_'+i,cid:pickOfflineCpu(gmCache.raidCpuCids?.[i],'all'),label:'CPU '+(i+1),cpu:1,owner:myId,team:1});
 const patch={p:null,items:null,ev:null};for(const id in memCache)if(memCache[id]?.cpu)patch['mem/'+id]=null;
 await roomRef.update(patch);
 await roomRef.child('gm').set({...gmCache,mode:'raid',boss:'dio',hostId:myId,protocol:NET_PROTOCOL,map:'wide',wpn:0,cpuN:0,teamMode:1,stocks:2,players,ph:'play',round:(gmCache.round||0)+1,w:'',wt:0,raidResult:''});
};
function raidBeginWorld(){
 if(!raidActive()||!raidAuthority()||raidWorldStopped()||raidJotaroStopId())return false;
 const p=byId(RAID_BOSS_ID);if(!p||p.out||p.timeStopT||p.domainT)return false;
 raid.move='world';raid.at=0;raid.serial++;raid.counterIds=[];raid.nextWorld=raid.frame+(raid.phase>=3?960:raid.phase===2?1320:1620);
 raidStopActions();
 clearActs(p);p.cd=12;p.kb=p.stn=0;p.vx=p.vy=0;
 p.dioWorldTarget='';
 const cutin={id:p.id,x:p.x,y:p.y-35,raidWorld:raid.serial,raidFrame:raid.frame};
 if(online)requestCinematic('timestop',cutin);else beginJotaroTimeStopCutin(cutin);
 return true;
}
function raidStopActions(){for(const p of fighters)if(!p.raidBoss&&isLocal(p)&&!p.out)clearActs(p);}
function raidReleaseHits(){
 for(const p of fighters)if(isLocal(p)&&p.raidHeldHits){p.raidHeldHits=false;if(!p.timeStopT)releaseStoppedHits(p);}
}
function raidPhaseSurge(phase){
 const boss=byId(RAID_BOSS_ID);if(!boss||boss.out)return;
 const finale=phase>=3;
 raidFx.push({kind:'phase',phase,life:130});
 shake=Math.max(shake,finale?25:17);
 burst(boss.x,boss.y-55,finale?64:40,finale?12:8,finale?'#ee5851':'#f0c779',12);
 ring(boss.x,boss.y-40,finale?40:30,28);
 popups.push({x:boss.x,y:boss.y-125,txt:finale?'DIO 最終暴走！':'DIO 本気の第二段階！',life:100,max:100,size:34,c:finale?'#ff665d':'#ffdf9b'});
 tone(finale?80:145,finale?30:65,.7,.18,'sawtooth');
}
function raidTick(){
 if(!raidActive()||bt.phase!=='play'||freezeT>0)return;
 for(const q of raidFx)q.life--;raidFx=raidFx.filter(q=>q.life>0);
 if(!raidAuthority())return;
 const boss=byId(RAID_BOSS_ID);if(!boss||raid.result)return;
 raid.frame++;
 const previous=raid.phase;
 raid.phase=boss.raidHp<=1250?3:boss.raidHp<=3200?2:1;
 if(raid.phase>previous){
  raidPhaseSurge(raid.phase);
  raid.nextWorld=Math.min(raid.nextWorld,raid.frame+(raid.phase===3?240:450));
 }
 if(boss.dioExposed>0)boss.dioExposed--;
 if(raid.jotaroStopId&&raid.frame>=raid.jotaroStopUntil){raid.jotaroStopId='';raid.jotaroStopUntil=0;raidReleaseHits();}
 if(boss.raidHp<=0){raidFinish(true,'DIO撃破');return;}
 if(raidHeroes().every(p=>p.out)){raidFinish(false,'全員戦闘不能');return;}
 if(raidWorldStopped()&&++raid.at>=DIO_STOP_T){raid.move='fight';raid.counterIds=[];raidReleaseHits();}
}
function raidCounter(p){
 if(!raidCounterWindow(p)||p.raidCounterSerial===raid.serial)return false;
 // A dropped request must not permanently consume the sole counter attempt.
 if(p.raidPendingSerial===raid.serial&&raid.frame-(p.raidPendingAt||0)<15)return false;
 p.raidPendingSerial=raid.serial;p.raidPendingAt=raid.frame;
 const e={k:'raid-counter',id:p.id,serial:raid.serial};
 if(raidAuthority())raidAcceptCounter({...e,by:p.owner});else send(e);
 return true;
}
function raidAcceptCounter(e){
 const p=byId(e.id);if(!raidAuthority()||e.serial!==raid.serial||e.by!==p?.owner||!raidCounterWindow(p))return;
 p.raidCounterSerial=raid.serial;raid.counterIds.push(p.id);byId(RAID_BOSS_ID).inv=0;raidGrantCounter(p);
 const cutin={id:p.id,x:p.x,y:p.y-35,raidCounter:raid.serial};
 if(online)requestCinematic('timestop',cutin);else beginJotaroTimeStopCutin(cutin);
}
function raidGrantCounter(p){
 if(!p||p.raidGrantSerial===raid.serial)return;
 p.raidGrantSerial=raid.serial;p.raidCounterSerial=raid.serial;clearActs(p);p.kb=p.stn=p.timeStopT=p.domainT=p.spc=p.cd=0;p.vx=p.vy=0;p.energy=0;p.timeStopSelfT=Math.max(1,DIO_STOP_T-raid.at);
}
function raidFinish(win,reason){
 if(!raid||raid.result||!raidAuthority())return;
 raid.result=win?'clear':'failed';raid.reason=reason;
 if(win){const p=byId(RAID_BOSS_ID);p.out=true;p.raidHp=0;}
 if(online)roomRef.child('gm').update({ph:'end',w:'',wt:win?1:2,raidResult:raid.result,raidReason:reason}).catch(networkError);
 bt={phase:'game',t:130,winner:null,winnerTeam:win?1:2};sfxGame();
}
// All NPC attacks use the same active frames, melee/projectile collisions and victim ownership as PvP.
function dioMove(p,kind){
 if(p.a||p.kb||p.stn||p.cd||p.timeStopT||p.domainT)return false;
 p.mv={...mkMv(kind)};if(raid.phase>=2){p.mv.dm*=raid.phase>=3?1.34:1.2;p.mv.k0*=raid.phase>=3?1.23:1.1;}
 p.a=1;p.hit={};p.ch=p.sph=0;p.dioCastFired=false;
 if(['dioRush','dioRoller','dioSlam'].includes(kind))p.arm=kind==='dioRush'?34:kind==='dioSlam'?12:28;
 if(kind==='dioSlam'||kind==='dioRoller')
  popups.push({x:p.x,y:p.y-108,txt:kind==='dioSlam'?'ザ・ワールドの強打！':'ロードローラーだッ！',life:42,max:42,size:24,c:'#f8d18a'});
 if(kind==='dioRoller'){p.vy=-15;p.g=false;p.dioRollerCd=raid.phase>=3?235:raid.phase===2?320:450;p.dioExposed=115;}
 if(kind==='dioThrow')p.dioKnifeCd=raid.phase>=3?65:raid.phase===2?90:125;
 return true;
}
function dioProjectile(p,kind,target){
 const knife=kind==='dioKnife',count=knife?(raid.phase>=3?7:raid.phase===2?5:3):1;
 for(let i=0;i<count;i++){
  const aim=target?constrain((target.y-32-(p.y-35))/Math.max(60,Math.abs(target.x-p.x)),-.65,.65):0;
  const vy=knife?aim*17+(i-(count-1)/2)*2.1:4;
  const q={pid:p.id+'_'+(objSeq++),o:p.id,kind,x:p.x+p.f*(knife?27:55),y:p.y-(knife?35:75),vx:p.f*(knife?19:3.5),vy,dir:p.f,rot:0,life:knife?65:100,r:knife?5:62,dm:(knife?6:29)*(raid.phase>=3?1.25:raid.phase===2?1.12:1),k0:knife?5:15,ks:knife?.045:.10,up:knife?.3:.65,pierce:knife?0:1};
  projs.push({...q,local:true,hitIds:{}});send({k:'proj',q});
 }
 if(knife)tone(1100,450,.12,.06,'triangle');else{noiseHit(.55,.28,240);shake=Math.max(shake,13);burst(p.x,p.y-70,25,8,'#ebd190',11);}
}
function dioAiStep(p){
 const I={...p.ai.inp,l:false,r:false,u:false,d:false,a:false,s:false,gd:false,neutralSpecial:false,sideSpecial:0};p.ai.inp=I;
 if(p.out||raidFrozen(p)||p.timeStopT||p.domainT)return;
 for(const k of ['dioKnifeCd','dioRollerCd','dioBlinkCd','dioJumpCd'])if(p[k]>0)p[k]--;
 let target=nearestFoe(p);if(!target)return;
 if(raidWorldStopped()){
  const targets=raidHeroes().filter(h=>!h.out),next=targets[Math.floor(raid.at/(raid.phase>=3?42:60))%Math.max(1,targets.length)];
  if(next){target=next;if(p.dioWorldTarget!==next.id){
   p.dioWorldTarget=next.id;clearActs(p);p.cd=0;p.dioThink=0;
   // DIO traverses stopped time to attack actual opponents. No remote area damage.
   if(Math.abs(next.x-p.x)>120||Math.abs(next.y-p.y)>70){p.x=constrain(next.x+(next.x<stage.w/2?75:-75),40,stage.w-40);p.y=next.y;p.vx=p.vy=0;p.g=next.g;}
  }}
 }
 const dx=target.x-p.x,dy=target.y-p.y,dist=Math.abs(dx),dir=Math.sign(dx)||p.f;
 // Recovery has priority over offense, using the same gravity, jumps and recovery limits.
 if(!overGround(p)||p.y>stage.plats[0].y+30){
  const spot=stage.plats.reduce((best,pl)=>Math.abs(p.x-(pl.x+pl.w/2))<Math.abs(p.x-(best.x+best.w/2))?pl:best,stage.plats[0]);
  const goal=constrain(p.x,spot.x+35,spot.x+spot.w-35);I.l=goal<p.x;I.r=goal>p.x;
  if(p.vy>0&&!p.dioJumpCd){if(p.jn<2){I.jc++;p.dioJumpCd=18;}else if(!p.rec&&!p.a&&!p.cd){dioMove(p,'dioRise');p.vy=-19;p.vx=Math.sign(goal-p.x)*6;p.rec=true;p.dioJumpCd=32;}}
  return;
 }
 if(raid.frame>=raid.nextWorld&&!raidWorldStopped()&&!p.a&&!p.kb&&!p.stn&&dist<600){raidBeginWorld();return;}
 if(p.kb||p.stn)return;
 I.l=dx<-58;I.r=dx>58;
 if(dy<-60&&p.g&&!p.dioJumpCd){I.jc++;p.dioJumpCd=24;}
 if(dy>90&&p.g&&p.groundPl!==lowestPlatformIndex()){I.d=true;I.dc++;}
 if(p.a||p.cd)return;
 p.f=dir;
 // Short think intervals, counter-dodging and instant follow-ups make DIO an aggressive NPC.
 if(--p.dioThink>0)return;p.dioThink=raid.phase>=3?3:raid.phase===2?5:8;
 if(!raidWorldStopped()&&!p.dioBlinkCd&&(dist>190||target.ch>16)&&dist<600){
  const x=constrain(target.x+dir*70,30,stage.w-30);
  if(stage.plats.some(pl=>x>=pl.x+10&&x<=pl.x+pl.w-10&&Math.abs(pl.y-target.y)<45)){p.x=x;p.y=target.y;p.g=target.g;p.vx=0;p.f=-dir;p.inv=8;p.dioBlinkCd=raid.phase>=3?125:raid.phase===2?185:300;burst(p.x,p.y-50,18,8,'#e7c779',9);ring(p.x,p.y-48,22,13);}
  return;
 }
 if(!raidWorldStopped()&&target.a>0&&dist<110&&p.dgc===0&&p.g&&Math.random()<.28){I.l=dir<0;I.r=dir>0;I.cc++;return;}
 if(dist<155&&Math.abs(dy)<80){
  if(!p.dioRollerCd&&Math.random()<(raid.phase>=3?.42:raid.phase===2?.31:.21)){dioMove(p,'dioRoller');return;}
  const v=Math.random();
  dioMove(p,v<(raid.phase>=3?.31:raid.phase===2?.18:.07)?'dioSlam':v<.72?'dioRush':dist<65?'dioJab':'dioKick');
 }else if(!p.dioKnifeCd&&dist<680)dioMove(p,'dioThrow');
}
const raidHitBase=applyHit,raidMeleeBase=resolveMelee,raidProjBase=resolveProj;
function raidBossDamage(p,damage,meta={}){
 if(!raidActive()||!raidAuthority()||bt.phase!=='play'||!raidCanHurtBoss(p)||!Number.isFinite(damage)||damage<=0)return 0;
 const boss=byId(RAID_BOSS_ID);if(!boss||boss.out||isInvuln(boss))return 0;
 const dm=Math.min(boss.raidHp,Math.min(150,damage*(boss.dioExposed>0?1.4:1)));boss.raidHp=Math.max(0,boss.raidHp-dm);
 // DIO reacts to hits and is launched using ordinary physics; HP does not become an accumulating %.
 if(!raidFrozen(boss)&&!boss.arm){
  raidHitBase(boss,{dm,k0:meta.k0||4,ks:0,up:meta.up||.4,f:meta.f||Math.sign(boss.x-p.x)||1,ko:false},false,p.id);
  boss.kb=Math.min(boss.kb,10);boss.vx=constrain(boss.vx,-12,12);boss.vy=Math.max(-10,boss.vy);boss.inv=3;
 }else addDealt(p.shadowOwner||p.id,dm);
 boss.d=0;
 emitFx({res:'hit',t:boss.id,a:p.id,x:boss.x,y:boss.y-34,kb:3,c:'#dfc777',gain:5,kanekiToken:meta.kanekiToken||null,kanekiPhase:meta.kanekiPhase||0,erenToken:meta.erenToken||null});
 if(boss.raidHp<=0)raidFinish(true,'DIO撃破');return dm;
}
function raidStoppedDioHit(t,h){
 if(t.shadowClone){shadowClonePop(t);return;}
 const kb=applyHit(t,h,false,RAID_BOSS_ID);
 emitFx({res:'hit',t:t.id,a:RAID_BOSS_ID,x:t.x,y:t.y-34,kb:Math.round(kb*10)/10,c:'#e5c477',gain:0});
 return kb;
}
resolveMelee=function(A,t){
 if(raidActive()&&t.raidBoss)return raidBossDamage(byId(A.id),A.mv.dm,{...A.mv,f:A.f});
 if(raidWorldStopped()&&A.id===RAID_BOSS_ID&&raidFrozen(t)&&!t.out)return raidStoppedDioHit(t,{dm:A.mv.dm,k0:A.mv.k0,ks:A.mv.ks,up:A.mv.up,f:A.f});
 return raidMeleeBase(A,t);
};
resolveProj=function(q,t){
 if(raidActive()&&t.raidBoss)return raidBossDamage(byId(q.o),q.dm,{...q,f:q.dir||Math.sign(q.vx)});
 if(raidWorldStopped()&&q.o===RAID_BOSS_ID&&raidFrozen(t)&&!t.out)return raidStoppedDioHit(t,{dm:q.dm,k0:q.k0,ks:q.ks,up:q.up,f:q.dir||Math.sign(q.vx)||1});
 return raidProjBase(q,t);
};
const raidInvulnBase=isInvuln;
isInvuln=function(p){if(raidJotaroStopId()&&p?.raidBoss)return false;return raidWorldStopped()&&p&&!p.raidBoss&&raidFrozen(p)?false:raidInvulnBase(p);};
applyHit=function(t,h,bk,id){
 if(raidActive()){
  if(sameTeam(byId(id),t))return 0;
  if(t.raidBoss)return raidBossDamage(byId(id),h.dm,{...h});
  if(byId(id)?.raidBoss&&!h.raidAdjusted){
   const lethal=raidWorldStopped()&&!raidFrozen(byId(id));
   h=lethal?{...h,dm:h.dm*2,k0:h.k0*1.7+8,ks:Math.max(.18,h.ks),up:Math.max(.65,h.up||0),minKb:24,raidAdjusted:true,raidWorldHit:true}:
    {...h,k0:h.k0*.52,ks:h.ks*.45,minKb:(h.minKb||0)*.52,raidAdjusted:true};
  }
  if(raidFrozen(t)&&!t.releasingStop){
   // Use the existing stopped-hit queue; ordinary percentage and knockback resume with time.
   const old=t.timeStopT;t.timeStopT=Math.max(1,old);t.raidHeldHits=true;
   try{return raidHitBase(t,h,bk,id);}finally{t.timeStopT=old;}
  }
 }
 return raidHitBase(t,h,bk,id);
};
const raidMeleeCheckBase=meleeCheck;
meleeCheck=function(p){
 if(raidActive()){
  if(raidFrozen(p))return;
  if(p.raidBoss&&p.mv?.kind==='dioRush'&&p.a>=31)Object.assign(p.mv,{type:'heavy',dm:raid.phase===2?12:10,k0:9,ks:.075,up:.45,minKb:0});
 }
 return raidMeleeCheckBase(p);
};
const raidPauseBase=pausedObject;
pausedObject=function(id){return raidWorldStopped()||raidJotaroStopId()?raidFrozen(byId(id)):raidPauseBase(id);};
const raidStepBase=stepFighter;
stepFighter=function(p,i){
 if(!raidActive())return raidStepBase(p,i);
 if(raidCounterWindow(p)&&i.sc!==p.prev.sc&&(i.gd||i.d&&!i.neutralSpecial))raidCounter(p);
 if(raidFrozen(p)){p.prev={...i};return;}
 const kind=p.mv?.kind,frame=p.a;
 const r=raidStepBase(p,i);
 if(p.raidBoss&&!p.out&&!p.dioCastFired&&p.mv?.kind===kind){
  if((kind==='dioThrow'&&frame<9&&p.a>=9)||(kind==='dioRoller'&&frame<17&&p.a>=17)){p.dioCastFired=true;dioProjectile(p,kind==='dioThrow'?'dioKnife':'dioRoller',nearestFoe(p));}
 }
 return r;
};
const raidKoBase=koFighter;
koFighter=function(p){
 if(raidActive()&&p.raidBoss){
  const pl=stage.plats[0];p.x=pl.x+pl.w*.7;p.y=pl.y-120;p.vx=p.vy=p.kb=p.stn=p.r=0;p.inv=50;p.rec=false;p.jn=0;clearActs(p);return;
 }
 return raidKoBase(p);
};
const raidCinematicBase=requestCinematic;
requestCinematic=function(kind,data){if(raidActive()&&kind==='ko'&&data?.t===RAID_BOSS_ID)return;return raidCinematicBase(kind,data);};
const raidEndFreezeBase=endFreeze;
endFreeze=function(){
 if(raidActive()&&pending?.att?.raidBoss){
  const hit=pending,counter=byId(fz?.cnt);pending=null;
  const r=raidEndFreezeBase();if(counter){hit.att.inv=0;raidBossDamage(counter,hit.dm,{k0:hit.kb0,up:.55,f:hit.dir});}return r;
 }
 return raidEndFreezeBase();
};
const raidTimeBase=animeTimeStop,raidAreaBase=animeArea;
animeTimeStop=function(p){
 if(raidActive()&&raidWorldStopped()){if(!raidCounter(p)&&!p.cpu)sfxNo();return;}
 if(raidActive()&&raidJotaroStopId()){if(!p.cpu)sfxNo();return;}
 return raidTimeBase(p);
};
animeArea=function(e){
 if(!raidActive())return raidAreaBase(e);
 if(['domain','timestop'].includes(e.kind)){
  const p=byId(e.id);if(!p||p.out||raidWorldStopped())return;
  const boss=byId(RAID_BOSS_ID),inRange=e.kind==='timestop'||Math.hypot(boss.x-(e.x??p.x),boss.y-34-(e.y??p.y-34))<=(e.range||255);
  if(e.kind==='timestop'&&p.cid==='jotaro'){
   // animeTimeStop already checked/consumed 100 energy on the casting owner.
   // The host publishes the single moving actor to all peers. Do not set
   // boss.timeStopT: raidFrozen handles this and will not leave a stale timer.
   if(!raid.jotaroStopId&&!raidWorldStopped()&&(raidAuthority()||isLocal(p))){
    raid.jotaroStopId=p.id;raid.jotaroStopUntil=raid.frame+JOTARO_STOP_T;
   }
  }else if(inRange&&raidAuthority()&&e.kind==='domain'&&p.cid==='gojo'&&raid.frame>=raid.nextControl){
   boss.domainT=75;raid.nextControl=raid.frame+1080;
  }
  return;
 }
 return raidAreaBase(e);
};
const raidEndBase=checkEnd,raidHostTickBase=hostTick;
checkEnd=function(){if(raidActive())return;return raidEndBase();};
hostTick=function(){if(raidActive())return;return raidHostTickBase();};
// Existing state transport, hit ownership, round validation and UID deduplication are shared with PvP.
const raidStateBase=stateOf,raidOnPBase=onP,raidEventBase=handleGameplayEvent;
stateOf=function(p){const s=raidStateBase(p);if(raidActive()){if(raidFrozen(p)){s.vx=s.vy=0;s.ats=Math.max(1,s.ats||0);}if(p.raidBoss){s.rhp=p.raidHp;s.raid={...raid,counterIds:raid.counterIds.slice()};}}return s;};
function raidReadSnapshot(v){
 const r=v?.raid;if(!r||v.rd!==curRound||!['fight','world'].includes(r.move)||!['frame','at','serial','phase'].every(k=>Number.isFinite(r[k]))||r.frame<raidLastWire)return;
 if(r.at<0||r.at>DIO_STOP_T||r.frame<0||!Number.isSafeInteger(r.frame)||r.serial<0)return;
 const stopped=raidWorldStopped(),previousPhase=raid?.phase||1;raidLastWire=r.frame;
 raid={...r,counterIds:(Array.isArray(r.counterIds)?r.counterIds:[]).filter(id=>byId(id)?.cid==='jotaro').slice(0,4),jotaroStopId:byId(r.jotaroStopId)?.cid==='jotaro'?r.jotaroStopId:'',jotaroStopUntil:Number.isFinite(r.jotaroStopUntil)&&r.jotaroStopUntil>=r.frame&&r.jotaroStopUntil<=r.frame+JOTARO_STOP_T+5?r.jotaroStopUntil:0};
 if(raid.phase>previousPhase)raidPhaseSurge(raid.phase);
 if(!stopped&&raidWorldStopped())raidStopActions();
 for(const id of raid.counterIds){const p=byId(id);if(p&&isLocal(p))raidGrantCounter(p);}
 if(stopped&&!raidWorldStopped())raidReleaseHits();
}
onP=function(s){
 const f=byId(s.key),v=s.val(),previous=f?.netLastSeq;raidOnPBase(s);
 if(!raidActive()||!f?.remote||!f.raidBoss||!v||v.rd!==curRound||f.netLastSeq===previous)return;
 if(Number.isFinite(v.rhp))f.raidHp=constrain(v.rhp,0,6400);
 if(!isHost)raidReadSnapshot(v);
};
handleGameplayEvent=function(e){
 if(raidActive()){
  if(e.k==='raid-counter'){raidAcceptCounter(e);return;}
  if(e.k==='raid-strike')return; // Retired area-hazard protocol.
  if(['mh','ph'].includes(e.k)){
   const p=byId(e.k==='mh'?e.a:e.q?.o);
   if(!p||p.owner!==e.by||raidFrozen(p))return;
  }
 }
 return raidEventBase(e);
};
const raidProjsBase=stepProjs;
stepProjs=function(){
 if(raidActive())for(const q of projs)if(q.kind==='dioRoller'&&!pausedObject(q.o))q.vy=Math.min(20,(q.vy||0)+.65);
 return raidProjsBase();
};
// Partners use ordinary CPU observation/defense. Only Jotaro's time-stop response is specialized.
const raidAiBase=aiStep;
aiStep=function(p){
 if(!raidActive())return raidAiBase(p);
 if(p.raidBoss)return dioAiStep(p);
 if(raidCounterWindow(p)&&raid.at>=18+(Number(p.id.slice(-1))||0)*6)raidCounter(p);
 if(raidFrozen(p)){p.ai.inp={...p.ai.inp,l:false,r:false,a:false,s:false};return;}
 if(raidWorldStopped()&&p.cid==='jotaro'){
  raidAiBase(p);
  const boss=byId(RAID_BOSS_ID),I=p.ai.inp;
  if(p.ch>0)I.rc++;
  const dx=boss.x-p.x;
  if(Math.abs(dx)<110&&Math.abs(boss.y-p.y)<70&&!p.kb&&!p.stn&&!p.a&&!p.ch&&!p.sph&&p.spc===0){I.a=false;I.u=I.d=I.gd=false;I.neutralSpecial=true;I.sideSpecial=0;p.f=Math.sign(dx)||p.f;I.s=true;I.sc++;}
  p.ai.inp=I;return;
 }
 return raidAiBase(p);
};

function raidCpuSelect(index,value,onChange,prefix='raid-cpu-'){
 const label=document.createElement('label');label.className='raid-cpu-row';label.textContent='味方CPU '+(index+1);
 const select=document.createElement('select');select.id=prefix+index;select.setAttribute('aria-label','味方CPU '+(index+1)+'のキャラクター');
 const option=(id,name)=>{const o=document.createElement('option');o.value=id;o.textContent=name;select.appendChild(o);};
 option('','ランダム（全キャラ）');for(const id of Object.keys(CHARS))option(id,CHARS[id].name);
 select.value=CHARS[value]?value:'';select.onchange=()=>onChange(select.value);label.appendChild(select);return label;
}
function raidRenderParty(){
 const box=document.getElementById('raid-party');if(!box)return;
 box.innerHTML='<b>味方CPUの編成</b><p>自分＋味方CPUで最大4人。CPUの強さは最強固定。</p><div id="raid-cpu-count" class="seg"></div><div id="raid-cpu-slots"></div><p id="raid-party-warning" role="status"></p>';
 seg('raid-cpu-count',['なし','1人','2人','3人'],()=>raidParty.count,n=>{raidParty.count=n;raidRenderParty();});
 const slots=document.getElementById('raid-cpu-slots');for(let i=0;i<raidParty.count;i++)slots.appendChild(raidCpuSelect(i,raidParty.cids[i],v=>{raidParty.cids[i]=v;raidPartyWarning();}));
 raidPartyWarning();
}
function raidPartyWarning(){
 const ids=[settings.cid,...raidParty.cids.slice(0,raidParty.count)];
 setTxt(document.getElementById('raid-party-warning'),ids.includes('jotaro')?'承太郎編成済み：時止めに対抗できます。':'承太郎がいません。DIOの時止め中に反撃できず、攻略は極めて困難です。');
}
function raidOpenSolo(){offlineMode='raid';online=false;offlineTour=null;openChars('raid');raidRenderParty();}
const raidOpenCharsBase=openChars;
openChars=function(mode){
 const r=raidOpenCharsBase(mode);
 const party=document.getElementById('raid-party');if(party)party.hidden=!(offlineMode==='raid'&&!online&&mode==='raid');
 if(offlineMode==='raid'&&!online&&mode==='raid'){document.getElementById('chars-next').textContent='DIOに挑む →';raidRenderParty();}
 return r;
};
const raidLobbyBase=renderLobby;
renderLobby=function(){
 raidLobbyBase();if(gmCache?.mode!=='raid')return;
 const humans=lobbyMembers().filter(p=>!p.cpu),g=gmCache;
 const count=Math.min(Math.max(0,4-humans.length),clampInt(g.raidCpuN,0,3,0));
 document.getElementById('lb-mem').innerHTML='<div class="sh">③ 協力メンバー（'+(humans.length+count)+' / 4）</div>'+humans.map(p=>'<div class="mrow"><div class="mk" style="background:#455064">'+CC(p.cid).mark+'</div><div>'+esc(p.label)+' / '+CC(p.cid).name+(p.host?' <span class="tag">HOST</span>':'')+'</div></div>').join('')+Array.from({length:count},(_,i)=>'<div class="mrow"><div class="mk" style="background:#455064">C</div><div>味方CPU '+(i+1)+' / '+esc(CHARS[g.raidCpuCids?.[i]]?.name||'ランダム')+'</div></div>').join('');
 let html='<div class="sh">DIO / 協力ボスバトル</div><p class="raid-lobby-note">最強NPC戦 · 最大4人 · DIO HP 6,400<br>承太郎だけが時止め中に反撃可能。味方は普段と同じダメージ％・残機2で戦います。</p>';
 html+='<p class="raid-lobby-note">参加者 '+humans.length+'人 ＋ 味方CPU '+count+'人 / 4人</p>';
 if(isHost)html+='<div id="raid-lobby-count" class="seg"></div><div id="raid-lobby-cpus"></div>';
 else for(let i=0;i<count;i++)html+='<p>味方CPU '+(i+1)+'：'+esc(CHARS[g.raidCpuCids?.[i]]?.name||'ランダム')+'</p>';
 html+='<p class="raid-lobby-note">'+(humans.some(p=>p.cid==='jotaro')||Array.from({length:count},(_,i)=>g.raidCpuCids?.[i]).includes('jotaro')?'承太郎編成済み。':'承太郎がいません。時止め中に反撃できません。')+'</p>';
 document.getElementById('lb-set').innerHTML=html;
 document.getElementById('lb-team-pick').style.display='none';
 if(isHost){
  seg('raid-lobby-count',Array.from({length:Math.min(3,4-humans.length)+1},(_,i)=>i?'CPU '+i+'人':'CPUなし'),()=>count,n=>roomRef.child('gm').update({raidCpuN:n}));
  const slots=document.getElementById('raid-lobby-cpus');for(let i=0;i<count;i++)slots.appendChild(raidCpuSelect(i,g.raidCpuCids?.[i],v=>{const ids=Array.from({length:3},(_,j)=>g.raidCpuCids?.[j]||'');ids[i]=v;roomRef.child('gm').update({raidCpuCids:ids});},'raid-lobby-cpu-'));
  const start=document.getElementById('lb-start');start.className='startbig';start.textContent='DIOに挑む（'+(humans.length+count)+'人編成）';
 }
};
const raidModeHeaderBase=modeHeader;
modeHeader=function(){const r=raidModeHeaderBase();if(raidActive()){document.getElementById('b-char').style.display='none';document.getElementById('mode-hud').style.display='none';}return r;};
const raidCharChangeBase=applyCharChange;
applyCharChange=function(id){if(raidActive())return;return raidCharChangeBase(id);};
const raidBuildBase=buildMenus;
buildMenus=function(){
 raidBuildBase();
 const party=document.createElement('section');party.id='raid-party';party.hidden=true;document.getElementById('cpu-opts').after(party);
 document.getElementById('go-raid').onclick=()=>show('sc-raid');
 document.getElementById('raid-back').onclick=()=>show('sc-mode');
 document.getElementById('raid-solo').onclick=raidOpenSolo;
 document.getElementById('raid-online').onclick=()=>{requestedOnlineMode='raid';show('sc-online');};
 const onlineBack=document.getElementById('online-back').onclick;
 document.getElementById('online-back').onclick=()=>requestedOnlineMode==='raid'?show('sc-raid'):onlineBack();
 const next=document.getElementById('chars-next').onclick,back=document.getElementById('chars-back').onclick;
 document.getElementById('chars-next').onclick=()=>{if(!online&&charMode==='raid'){startBattleOffline();return;}next();};
 document.getElementById('chars-back').onclick=()=>{if(!online&&charMode==='raid'){show('sc-raid');return;}back();};
 const choose=renderChars;renderChars=function(){const r=choose();if(!online&&charMode==='raid')raidPartyWarning();return r;};
 const resultChars=document.getElementById('res-chars').onclick;
 document.getElementById('res-chars').onclick=()=>{if(!online&&offlineMode==='raid')raidOpenSolo();else resultChars();};
 document.getElementById('raid-boss-art').innerHTML=raidDossierSVG();
};


function raidDossierSVG(){return `<svg viewBox="0 0 450 600" role="img"><defs><linearGradient id="dio-gold" x2=".8" y2="1"><stop stop-color="#fae7a4"/><stop offset=".5" stop-color="#c69b48"/><stop offset="1" stop-color="#594022"/></linearGradient></defs><g fill="none" stroke="#d0ac6240"><circle cx="225" cy="250" r="180"/><circle cx="225" cy="250" r="155"/><path d="M225 40v420M20 250h410"/>${Array.from({length:12},(_,i)=>`<path d="M225 76v15" transform="rotate(${i*30} 225 250)"/>`).join('')}</g><text x="225" y="548" fill="#b99c64" font-size="10" letter-spacing="8" text-anchor="middle">THE WORLD</text><g transform="translate(280 300) rotate(-8)" opacity=".5"><path d="M-42-98L-65 0-40 67-57 175M37-94L65 0 40 67 62 175" fill="none" stroke="#b3ad85" stroke-width="36"/><path d="M-40-87H40L35 40H-35Z" fill="#898970" stroke="#d1cba6" stroke-width="4"/><ellipse cy="-131" rx="36" ry="44" fill="#c5bb83"/><path d="M-32-140h64M0-170v34M-25-115h50" stroke="#3a423b" stroke-width="10"/><circle cx="-17" cy="-132" r="4" fill="#ec6753"/><circle cx="17" cy="-132" r="4" fill="#ec6753"/></g><g transform="translate(195 320)"><path d="M-29 6L-44 160M27 6l60 148" stroke="#090f18" stroke-width="42"/><path d="M-29 6L-44 160M27 6l60 148" stroke="url(#dio-gold)" stroke-width="29"/><path d="M-44 150l-8 26h-28M86 144l13 24h29" stroke="#657e57" stroke-width="17"/><path d="M-35-116L-52-15-21 34H38L50-18 33-116Z" fill="url(#dio-gold)" stroke="#211e20" stroke-width="5"/><path d="M-17-108L0-40l22-69-6 116h-32Z" fill="#17201f"/><path d="M-36-100L-91-32-123-72M35-98L83-50l36-64" fill="none" stroke="#100f15" stroke-width="30" stroke-linecap="round"/><path d="M-36-100L-91-32-123-72M35-98L83-50l36-64" fill="none" stroke="url(#dio-gold)" stroke-width="22" stroke-linecap="round"/><circle cx="-123" cy="-75" r="14" fill="#d7bb8d"/><circle cx="120" cy="-117" r="14" fill="#d7bb8d"/><ellipse cy="-153" rx="30" ry="40" fill="#d9bd90" stroke="#28201f" stroke-width="4"/><path d="M-30-157l-12-34 19 6 7-26 16 20 23-18 1 24 22 9-20 20-8-15-19 8-16-13Z" fill="url(#dio-gold)"/><path d="M-30-165h59" stroke="#5d825b" stroke-width="9"/><path d="M-7-166q7-13 14 0l-7 8Z" fill="#c7d88f"/><path d="M-21-147l13 2M9-145l13-3" stroke="#392e2a" stroke-width="3"/><path d="M-9-128q11 6 20-1" fill="none" stroke="#694336" stroke-width="2"/><path d="M-43-22h87" stroke="#638260" stroke-width="13"/><path d="M-8-25q8-16 16 0l-8 10Z" fill="#d5d992"/></g><text x="35" y="90" fill="#dfc488" font-size="54" font-family="serif" font-weight="bold" letter-spacing="10">DIO</text><text x="37" y="111" fill="#b3a58c" font-size="9" letter-spacing="4">RAID BOSS / 001</text></svg>`;}
function raidDrawBody(c,x,y,size,stand=false,pose=0,dir=1,gait=0){
 c.save();c.translate(x,y);c.scale(size*dir,size);c.lineCap='round';c.lineJoin='round';
 const gold=c.createLinearGradient(-35,-105,40,10);gold.addColorStop(0,stand?'#e9dfaa':'#f2d683');gold.addColorStop(.5,stand?'#9eaa8a':'#c69843');gold.addColorStop(1,stand?'#596955':'#71502b');
 const path=(points,col,width)=>{c.beginPath();points.forEach(([xx,yy],i)=>i?c.lineTo(xx,yy):c.moveTo(xx,yy));c.strokeStyle='#10151c';c.lineWidth=width+5;c.stroke();c.strokeStyle=col;c.lineWidth=width;c.stroke();};
 path([[-13,-39],[-19+gait*10,-17],[-28+gait*21,0]],gold,14);path([[13,-39],[24-gait*10,-17],[34-gait*21,0]],gold,14);
 path([[-30+gait*21,-2],[-20+gait*21,-1]],stand?'#a4ac8c':'#78926a',10);path([[29-gait*21,-2],[42-gait*21,-2]],stand?'#a4ac8c':'#78926a',10);
 c.fillStyle=gold;c.strokeStyle='#1d2425';c.lineWidth=3;c.beginPath();c.moveTo(-25,-92);c.lineTo(22,-92);c.lineTo(25,-52);c.lineTo(10,-32);c.lineTo(-16,-33);c.lineTo(-27,-52);c.closePath();c.fill();c.stroke();
 c.fillStyle=stand?'#5e705f':'#1c2424';c.beginPath();c.moveTo(-10,-87);c.lineTo(0,-61);c.lineTo(12,-87);c.lineTo(7,-40);c.lineTo(-7,-40);c.fill();
 const armPose=pose>0;
 path([[-23,-84],[-38,-61],[-29,-45]],gold,13);
 path([[23,-84],armPose?[50,-82]:[36,-61],armPose?[75,-88]:[46,-48]],gold,14);
 c.fillStyle=stand?'#cbd1ae':'#dfc096';c.beginPath();c.arc(armPose?78:48,armPose?-88:-48,8,0,Math.PI*2);c.fill();
 c.fillStyle='#78916a';c.fillRect(-25,-48,49,8);c.fillStyle='#d6df9a';c.beginPath();c.moveTo(0,-43);c.lineTo(-7,-50);c.lineTo(0,-54);c.lineTo(7,-50);c.closePath();c.fill();
 c.fillStyle=stand?'#bac5a0':'#dfbf93';c.strokeStyle='#28282a';c.lineWidth=2;c.beginPath();c.ellipse(0,-111,18,24,0,0,Math.PI*2);c.fill();c.stroke();
 if(stand){c.fillStyle='#546858';c.fillRect(-17,-125,34,9);c.fillRect(-3,-135,6,19);c.fillRect(-13,-97,26,6);c.fillStyle='#ef8b75';c.fillRect(-12,-112,7,3);c.fillRect(5,-112,7,3);}
 else{
  c.fillStyle=gold;c.beginPath();[[-18,-113],[-24,-138],[-12,-133],[-10,-150],[1,-137],[16,-148],[15,-134],[28,-132],[19,-113],[10,-125],[0,-120],[-10,-126]].forEach(([a,b],i)=>i?c.lineTo(a,b):c.moveTo(a,b));c.closePath();c.fill();
  c.strokeStyle='#76906a';c.lineWidth=5;c.beginPath();c.moveTo(-17,-121);c.lineTo(16,-121);c.stroke();c.fillStyle='#cfe29b';c.beginPath();c.arc(0,-121,4,0,Math.PI*2);c.fill();
  c.strokeStyle='#473d30';c.lineWidth=2;c.beginPath();c.moveTo(-12,-110);c.lineTo(-5,-108);c.moveTo(5,-108);c.lineTo(12,-111);c.moveTo(-4,-97);c.lineTo(7,-98);c.stroke();
 }
 c.restore();
}

function raidDrawRoller(c,x,y,scale){
 c.save();c.translate(x,y);c.scale(scale,scale);c.lineWidth=4;c.strokeStyle='#191f25';
 c.fillStyle='#8d7238';c.fillRect(-135,-108,250,70);c.strokeRect(-135,-108,250,70);c.fillStyle='#b89e58';c.fillRect(-114,-135,114,28);c.strokeRect(-114,-135,114,28);
 c.fillStyle='#2b3e42';c.fillRect(-100,-167,94,35);c.strokeRect(-100,-167,94,35);c.fillStyle='#b8c9bd';c.fillRect(-90,-160,31,20);c.fillRect(-51,-160,33,20);
 c.fillStyle='#535e61';c.beginPath();c.ellipse(60,-25,79,39,0,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#8d9996';c.beginPath();c.ellipse(64,-28,62,28,0,0,Math.PI*2);c.fill();c.stroke();
 c.fillStyle='#303d3b';c.beginPath();c.arc(-91,-24,32,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#9c946a';c.beginPath();c.arc(-91,-24,17,0,Math.PI*2);c.fill();
 c.strokeStyle='#e4ce86';c.lineWidth=3;for(let i=0;i<5;i++){c.beginPath();c.moveTo(-3+i*22,-95);c.lineTo(-13+i*22,-62);c.stroke();}c.restore();
}

const raidDrawBase=drawFighter;
drawFighter=function(p){
 if(!raidActive())return raidDrawBase(p);
 if(p.raidBoss){
  if(p.out)return;const c=drawingContext,kind=p.mv?.kind,active=isActive(p),attack=p.a>0;
  const gait=!raidFrozen(p)&&!p.timeStopT&&p.g&&Math.abs(p.vx)>.4?Math.sin(visualFrame*.32)*Math.min(1,Math.abs(p.vx)/5):0;
  c.save();c.translate(p.x,p.y);if(p.kb>0)c.rotate(p.r||0);
  if(attack&&['dioRush','dioKick','dioRise'].includes(kind)||raidWorldStopped()){
   c.save();c.globalAlpha=.68;raidDrawBody(c,p.f*22,-7,.60,true,active?1:0,p.f);c.restore();
  }
  raidDrawBody(c,0,-Math.abs(gait)*2,.57,false,active?1:0,p.f,gait);
  if(kind==='dioRush'&&active){c.strokeStyle='#e8d08aa0';c.lineCap='round';c.lineWidth=6;for(let i=0;i<4;i++){const x=p.f*(53+((p.a+i*5)%17)*2);c.beginPath();c.moveTo(p.f*28,-46+i*6);c.lineTo(x,-49+i*6);c.stroke();}}
  if(kind==='dioRoller'&&p.a<17)raidDrawRoller(c,0,-95,.32);
  c.restore();
  c.save();c.textAlign='center';c.font='bold 11px sans-serif';c.fillStyle='#e3cc91';c.fillText('DIO',p.x,p.y-100);c.restore();return;
 }
 const old=visualFrame;
 if(raidFrozen(p)){p.raidPose??=visualFrame;visualFrame=p.raidPose;}else delete p.raidPose;
 try{return raidDrawBase(p);}finally{visualFrame=old;}
};
const raidDrawProjsBase=drawProjs;
drawProjs=function(){
 if(!raidActive())return raidDrawProjsBase();
 const all=projs;projs=all.filter(q=>!['dioKnife','dioRoller'].includes(q.kind));
 try{raidDrawProjsBase();}finally{projs=all;}
 const c=drawingContext;
 for(const q of all){
  if(q.kind==='dioRoller')raidDrawRoller(c,q.x,q.y+25,.34);
  else if(q.kind==='dioKnife'){
   c.save();c.translate(q.x,q.y);c.rotate(Math.atan2(q.vy||0,q.vx));c.fillStyle='#e6e5d6';c.strokeStyle='#a0a69d';c.lineWidth=2;
   c.beginPath();c.moveTo(12,0);c.lineTo(-8,-3);c.lineTo(-5,4);c.closePath();c.fill();c.beginPath();c.moveTo(-6,0);c.lineTo(-18,0);c.stroke();c.restore();
  }
 }
};
const raidBackdropBase=paintAnimeBackdrop;
paintAnimeBackdrop=function(){
 raidBackdropBase();if(!raidWorldStopped())return;
 const c=drawingContext;c.save();c.fillStyle='#17152b66';c.fillRect(0,0,stage.w,stage.h);c.restore();
};
function raidHudEnsure(){
 let h=document.getElementById('raid-boss-hud');if(h)return h;
 h=document.createElement('div');h.id='raid-boss-hud';h.innerHTML='<div class="raid-hud-top"><b>DIO <span id="raid-phase"></span></b><span id="raid-health"></span></div><div class="raid-hp-track" role="progressbar" aria-label="DIOの体力" aria-valuemin="0" aria-valuemax="6400"><div class="raid-hp-fill"></div></div>';
 document.getElementById('wrap').appendChild(h);return h;
}
const raidHudBase=drawHUD;
drawHUD=function(){
 const active=raidActive(),h=raidHudEnsure();h.style.display=active&&!(freezeT>0&&fzType==='timestopcin')?'block':'none';document.getElementById('game').classList.toggle('raid-battle',active);
 if(!active)return raidHudBase();
 const boss=byId(RAID_BOSS_ID),heroes=raidHeroes(),roster=document.getElementById('battle-roster'),key='raid|'+heroes.map(p=>p.id+':'+p.cid).join('|');
 if(hudKey!==key){hudKey=key;roster.style.setProperty('--columns',heroes.length);roster.style.setProperty('--pc-columns',heroes.length);roster.innerHTML=heroes.map(p=>`<div class="hud-card ${p.id===myId?'me':''}"><div class="hud-portrait">${portrait(p.cid)}</div><div class="hud-info"><div class="hud-name">${esc(p.label)}</div><div class="hud-damage"></div></div><div class="hud-stocks"></div><div class="hud-skill"></div><div class="hud-meter"></div></div>`).join('');}
 heroes.forEach((p,i)=>{const el=roster.children[i];if(!el)return;el.classList.toggle('out',p.out);const damage=el.querySelector('.hud-damage');setTxt(damage,Math.round(p.d)+'%');damage.style.color=p.d<60?'#fff9e9':p.d<110?'#ffc363':'#ff6453';setTxt(el.querySelector('.hud-stocks'),p.out?'脱落':'残機 '+p.s);const meter=animeHud(p);setTxt(el.querySelector('.hud-skill'),p.out?'観戦中':raidFrozen(p)?'時間停止中':meter?.label||CC(p.cid).name);setVar(el,'--meter',Math.round(meter?.m||0)+'%');});
 setTxt(document.getElementById('raid-health'),Math.ceil(boss.raidHp).toLocaleString()+' / 6,400');setTxt(document.getElementById('raid-phase'),raid.phase===2?' / 本気':'');
 setVar(h,'--hp',boss.raidHp/6400*100+'%');h.querySelector('[role="progressbar"]').setAttribute('aria-valuenow',Math.ceil(boss.raidHp));
 setTxt(document.getElementById('match-label'),'CO-OP / VS DIO');setTxt(document.getElementById('match-stage'),stage.name+' / 味方は残機2・ダメージ％');
};
const raidControlsBase=updateControlUI;
updateControlUI=function(){
 const r=raidControlsBase();if(!raidActive())return r;const p=byId(myId);
 if(raidWorldStopped()){
  const ready=raidCounterWindow(p),jotaro=p?.cid==='jotaro';
  const b=document.getElementById('btn-g');b.classList.toggle('ready',ready);setTxt(b.querySelector('small'),ready?'時止め返し！':jotaro?'ゲージ不足':'時間停止中');
  setTxt(document.getElementById('combat-hint'),raidFrozen(p)?jotaro?'ゲージ '+Math.floor(p.energy||0)+'/100：MAXでのみ時止め返し可能':'ザ・ワールド！ 承太郎以外は動けない':'スタープラチナ発動！ DIOを攻めろ');
 }
 return r;
};
const raidResultBase=showResult;
showResult=function(){
 if(!raidActive())return raidResultBase();
 raidResultBase();const win=bt.winnerTeam===1;
 document.getElementById('res-win').textContent=win?'DIO DEFEATED':'DIO WIN';document.getElementById('winner-art').innerHTML='';
 document.getElementById('res-list').innerHTML=raidHeroes().map(p=>`<div class="rk"><div class="mk">${CC(p.cid).mark}</div><div>${esc(p.label)} / ${CC(p.cid).name}<div class="result-stats">与ダメージ ${Math.round(p.stats.dealt)} ／ 被ダメージ ${Math.round(p.d)}% ／ 撃墜された回数 ${p.stats.deaths}</div></div></div>`).join('');
 const box=document.getElementById('tour-result');box.style.display='block';box.innerHTML='<h3>'+(win?'DIOを倒した！':esc(gmCache?.raidReason||raid.reason||'DIOに敗北'))+'</h3><p>DIO残りHP '+Math.ceil(byId(RAID_BOSS_ID).raidHp)+' / 6,400 ／ 経過 '+Math.floor(raid.frame/60)+'秒</p>';
};
