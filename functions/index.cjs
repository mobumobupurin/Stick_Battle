'use strict';
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {initializeApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const {randomInt}=require('node:crypto');
const C=require('./core.cjs');
initializeApp();const db=getFirestore(),profiles=db.collection('stickWorldProfiles'),rounds=db.collection('stickWorldRounds'),audit=db.collection('stickWorldAudit');
const validId=s=>typeof s==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(s);
const view=p=>{let {pending,...pub}=p;return pub;};
function error(e){if(e instanceof HttpsError)throw e;throw new HttpsError('failed-precondition',e.message||'操作失敗');}
async function ensureRound(id){let ref=rounds.doc(String(id));return db.runTransaction(async t=>{let s=await t.get(ref);if(s.exists)return s.data();let r={number:randomInt(37),createdAt:Date.now()};t.create(ref,r);return r;});}
exports.worldAction=onCall({region:'asia-southeast1',maxInstances:12},async req=>{
 if(!req.auth)throw new HttpsError('unauthenticated','ログインが必要です');
 const uid=req.auth.uid,d=req.data||{},action=d.action,now=Date.now(),ref=profiles.doc(uid);
 if(!validId(d.requestId))throw new HttpsError('invalid-argument','requestIdが不正です');
 try{
 if(action==='sync'){const p=await db.runTransaction(async t=>{let s=await t.get(ref),p=s.exists?s.data():C.start();if(!s.exists)t.create(ref,{...p,seenAt:now});else t.update(ref,{seenAt:now});return p;});let rd=C.round(now),previous=rd.id>0?await ensureRound(rd.id-1):null;let snap=await profiles.where('seenAt','>',now-30000).limit(60).get();let peers=snap.docs.filter(x=>x.id!==uid).map(x=>{let q=x.data();return {name:q.name,floor:q.floor,x:q.x,y:q.y};});return {profile:view(p),peers,round:{id:rd.id,open:now<rd.close,previous:previous?.number??null}};}
 if(action==='move'||action==='profile'){return db.runTransaction(async t=>{let s=await t.get(ref),p=s.exists?s.data():C.start();let r=C.apply(p,action,d,now,randomInt);t.set(ref,{...r.profile,seenAt:now});return {profile:view(r.profile),message:r.message};});}
 const receipt=ref.collection('receipts').doc(d.requestId);
 return await db.runTransaction(async t=>{
 let [s,old]=await Promise.all([t.get(ref),t.get(receipt)]);let p=s.exists?s.data():C.start(),message='',detail={};
 if(old.exists)return {profile:view(p),message:old.data().message};
 if(action==='roulette'){
 let rd=C.round(Date.now());if(Date.now()>=rd.close)throw Error('受付締切。次のラウンドをお待ちください');if(p.pending)throw Error('前回のベットを精算してください');let n=C.integer(d.amount);C.roulette(0,d.choice,n);if(p.cash<n)throw Error('残高不足');p.cash-=n;p.pending={round:rd.id,amount:n,choice:d.choice};message='ベット受付：'+n+' SC / ROUND '+rd.id;
 }else if(action==='settle'){
 if(!p.pending)throw Error('未精算のベットはありません');let b=p.pending;if(Date.now()<(b.round+1)*30000)throw Error('抽選終了までお待ちください');let rr=rounds.doc(String(b.round)),rs=await t.get(rr);let num=rs.exists?rs.data().number:randomInt(37);if(!rs.exists)t.create(rr,{number:num,createdAt:now});let won=C.roulette(num,b.choice,b.amount);let credited=Math.min(won,C.LIMIT-p.cash-p.bank);p.cash+=credited;p.plays++;if(won>b.amount)p.wins++;delete p.pending;message='結果 '+num+' / 払出 '+credited+' SC（残高上限あり）';
 }else if(action==='admin'){
 if(req.auth.token.stickWorldAdmin!==true)throw new HttpsError('permission-denied','管理者のみ');if(!validId(d.target)||typeof d.reason!=='string'||!d.reason.trim()||d.reason.length>200)throw Error('対象UIDと理由が必要です');let n=C.integer(d.amount,1,C.LIMIT);let target=profiles.doc(d.target),ts=d.target===uid?s:await t.get(target);if(!ts.exists)throw Error('対象ユーザーが未登録です');let q=d.target===uid?p:ts.data();if(d.operation==='mint')q.cash+=n;else if(d.operation==='burn'){if(q.cash<n)throw Error('対象の手持ち不足');q.cash-=n;}else if(d.operation==='transfer'){if(d.target===uid)throw Error('自分自身には譲渡できません');if(p.cash<n)throw Error('手持ち不足');p.cash-=n;q.cash+=n;}else throw Error('無効な管理操作');if(q.cash+q.bank>C.LIMIT)throw Error('残高上限');if(d.target!==uid)t.set(target,q);t.create(audit.doc(),{actor:uid,target:d.target,operation:d.operation,amount:n,reason:d.reason.trim(),at:now});message='管理操作完了';
 }else if(['bonus','deposit','withdraw','refill','medal'].includes(action)){let r=C.apply(p,action,d,now,randomInt);p=r.profile;message=r.message;}
 else throw Error('無効な操作');
 if(!Number.isSafeInteger(p.cash)||!Number.isSafeInteger(p.bank)||p.cash<0||p.bank<0||p.cash+p.bank>C.LIMIT)throw Error('残高上限');t.set(ref,{...p,seenAt:now});t.create(receipt,{action,message,at:now});return {profile:view(p),message,...detail};
 });
 }catch(e){error(e);}
});
