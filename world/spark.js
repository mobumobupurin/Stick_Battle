'use strict';
// Spark: no Functions, no Firestore. Auth + RTDB. Client-generated game draws are not authoritative.
function sparkAdapter(db, auth, C, random){
 const root=db.ref('stick_world'),off=db.ref('.info/serverTimeOffset');let offset=0;
 off.on('value',s=>{offset=Number(s.val())||0;});
 const now=()=>Date.now()+offset,day=()=>Math.floor((now()+32400000)/86400000);
 const fresh=(nickname)=>{let name=typeof nickname==='string'?nickname.trim():'';let p=C.start(name&&name.length<=20?name:'PLAYER');delete p.day;return {...p,bonusDay:-1,betRound:-1,betAmount:0,betChoice:'none'};};
 const snap=async ref=>(await ref.once('value')).val();
 const isAdmin=async uid=>await snap(root.child('admins').child(uid))===true;
 async function tx(ref,fn){let failure;const keep=()=>{};ref.on('value',keep);try{await ref.once('value');let r=await ref.transaction(v=>{try{return fn(v);}catch(e){failure=e;return undefined;}},undefined,false);if(!r.committed)throw failure||Error('更新できませんでした');return r.snapshot.val();}finally{ref.off('value',keep);}}
 async function presence(uid,p){await root.child('presence').child(uid).set({name:p.name,floor:p.floor,x:p.x,y:p.y,seenAt:firebase.database.ServerValue.TIMESTAMP});}
 async function ensureResult(uid,id){let ref=root.child('rounds').child(String(id)),old=await snap(ref);if(old)return old;if(now()<(id+1)*30000)throw Error('抽選終了までお待ちください');try{return await tx(ref,v=>v||{id,number:random(37)});}catch(e){let v=await snap(ref);if(v)return v;throw e;}}
 return async d=>{
  let u=auth.currentUser;if(!u)throw Error('ログインが必要です');let uid=u.uid,ref=root.child('profiles').child(uid),a=d.action;
  if(a==='sync'){let p=await snap(ref);if(!p)p=await tx(ref,v=>v||fresh(d.nickname));await presence(uid,p);let rd=C.round(now());let previous=rd.id>0?await snap(root.child('rounds').child(String(rd.id-1))):null;let ps=await snap(root.child('presence').orderByChild('seenAt').startAt(now()-30000).limitToLast(60));let peers=Object.entries(ps||{}).filter(([k])=>k!==uid).map(([,v])=>v);return {data:{profile:p,peers,admin:await isAdmin(uid),round:{id:rd.id,open:now()<rd.close,previous:previous?.number??null}}};}
  if(a==='adminList'){if(!await isAdmin(uid))throw Error('管理者のみ');let all=await snap(root.child('profiles'));return {data:{players:Object.entries(all||{}).filter(([,v])=>v&&typeof v.name==='string').map(([id,v])=>({id,name:v.name,cash:v.cash,bank:v.bank}))}};}
  if(a==='admin'){
    if(!await isAdmin(uid))throw Error('管理者のみ');let target=String(d.target||'').trim(),n=C.integer(d.amount,1,C.LIMIT),reason='管理者パネル';if(!/^[A-Za-z0-9_-]{1,128}$/.test(target))throw Error('対象プレイヤーを選択してください');
    let all=await tx(root.child('profiles'),v=>{if(!v?.[target]||!v?.[uid])throw Error('対象プレイヤーの保存データが見つかりません。一覧を更新してください');let q={...v[target]},me=target===uid?q:{...v[uid]};if(d.operation==='mint')q.cash+=n;else if(d.operation==='burn'){if(q.cash<n)throw Error('残高不足');q.cash-=n;}else if(d.operation==='transfer'){if(uid===target||me.cash<n)throw Error('譲渡先または残高を確認してください');me.cash-=n;q.cash+=n;}else throw Error('無効な操作');if(q.cash+q.bank>C.LIMIT)throw Error('残高上限');return {...v,[uid]:me,[target]:q};});let message='管理操作完了';try{await root.child('adminLog').push({actor:uid,target,operation:d.operation,amount:n,reason,at:firebase.database.ServerValue.TIMESTAMP});}catch{message+='（操作履歴の保存に失敗）';}return {data:{profile:all[uid],message}};
  }
  let outcome=null,expected=null;if(a==='settle'){let p=await snap(ref);if(!p||p.betRound<0)throw Error('未精算のベットはありません');expected=p.betRound;outcome=await ensureResult(uid,expected);}
  let message='',result=null,medalRoll=a==='medal'?random(100):0;const pool=a==='slot'||a==='baccarat'?Array.from({length:a==='slot'?640:8},()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296):[];
  let p=await tx(ref,v=>{if(!v)throw Error('プロフィールを作成してください');let p={...v};switch(a){
  case 'bonus':{let t=day();if(p.bonusDay>=t)throw Error('本日分は受取済み');p.bonusDay=t;p.cash+=500;message='ログインボーナス +500 SC';break;}
  case 'refill':if(p.betRound>=0||p.cash+p.bank!==0)throw Error('未精算なし・総資産0のときのみ');p.cash=5000;message='無料補充 +5000 SC';break;
  case 'roulette':{let rd=C.round(now());if(now()>=rd.close)throw Error('受付締切。次のラウンドへ');if(p.betRound>=0)throw Error('前回分を精算してください');let n=C.integer(d.amount);C.roulette(0,d.choice,n);if(p.cash<n)throw Error('残高不足');p.cash-=n;p.betRound=rd.id;p.betAmount=n;p.betChoice=d.choice;message='ベット受付：'+n+' SC / ROUND '+rd.id;break;}
  case 'settle':{if(p.betRound!==expected)throw Error('ベットは変更済みです');let won=C.roulette(outcome.number,p.betChoice,p.betAmount),credit=Math.min(won,C.LIMIT-p.cash-p.bank);p.cash+=credit;p.plays++;if(won>p.betAmount)p.wins++;p.betRound=-1;p.betAmount=0;p.betChoice='none';message='結果 '+outcome.number+' / 払出 '+credit+' SC';break;}
  case 'medal':if(p.betRound>=0)throw Error('先にルーレットを精算してください');
  case 'profile':case 'move':case 'deposit':case 'withdraw':{let r=C.apply(p,a,d,now(),()=>medalRoll);p=r.profile;message=r.message;break;}
  case 'slot':case 'blackjack':case 'baccarat':case 'videopoker':{if(p.betRound>=0)throw Error('先にルーレットを精算してください');let k=0;const r=C.apply(p,a,d,now(),n=>Math.floor((pool[k++]??Math.random())*n));p=r.profile;message=r.message;result=r.result;break;}
  default:throw Error('無効な操作');}
  if(!Number.isSafeInteger(p.cash)||!Number.isSafeInteger(p.bank)||p.cash<0||p.bank<0||p.cash+p.bank>C.LIMIT)throw Error('残高上限');return p;});
  if(a==='move'||a==='profile')try{await presence(uid,p);}catch{}
  return {data:{profile:p,message,result}};
 };
}
