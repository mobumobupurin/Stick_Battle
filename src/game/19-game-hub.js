// GAME HUB + QUICK MATCH — additive layer; existing battle simulation stays unchanged.
const HUB_CATALOG = [
  {id:'stickbattle',name:'スティックバトル',category:'2人対戦',players:'2〜8人',ready:true,description:'格闘対戦に戻る。同じ部屋のメンバーで遊べます。'},
  {id:'reversi',name:'リバーシ',category:'2人対戦',players:'2人',ready:true,description:'石を挟んでひっくり返す。置けないときは自動パス。'},
  {id:'connect4',name:'コネクトフォー',category:'2人対戦',players:'2人',ready:true,description:'縦・横・斜めに4個並べた方が勝ち。'},
  {id:'airhockey',name:'エアホッケー',category:'2人対戦',players:'2人',ready:false},
  {id:'chess',name:'チェス',category:'2人対戦',players:'2人',ready:false},
  {id:'shogi',name:'将棋',category:'2人対戦',players:'2人',ready:false},
  {id:'mini-shogi',name:'5五将棋',category:'2人対戦',players:'2人',ready:false},
  {id:'shichinarabe',name:'七並べ',category:'みんなで遊ぶ',players:'3〜8人',ready:false},
  {id:'oldmaid',name:'ババ抜き',category:'みんなで遊ぶ',players:'3〜8人',ready:false},
  {id:'mahjong',name:'麻雀',category:'みんなで遊ぶ',players:'4人',ready:false},
  {id:'blackjack',name:'ブラックジャック',category:'カジノ',players:'2〜8人',ready:false},
  {id:'poker',name:'ポーカー',category:'カジノ',players:'2〜8人',ready:false},
  {id:'baccarat',name:'バカラ',category:'カジノ',players:'2〜8人',ready:false}
];
const hubEl = id => document.getElementById(id);
const hubInBounds = (r,c) => r>=0 && r<8 && c>=0 && c<8;
function hubReversiFlips(board,index,color){
  if(index<0||index>=64||board[index])return [];
  const row=Math.floor(index/8),col=index%8,enemy=3-color,out=[];
  for(const dr of [-1,0,1])for(const dc of [-1,0,1]){
    if(!dr&&!dc)continue;
    const captured=[];let r=row+dr,c=col+dc;
    while(hubInBounds(r,c)&&Number(board[r*8+c])===enemy){
      captured.push(r*8+c);r+=dr;c+=dc;
    }
    if(captured.length&&hubInBounds(r,c)&&Number(board[r*8+c])===color)out.push(...captured);
  }
  return out;
}
function hubReversiMoves(board,color){
  const result=[];
  for(let i=0;i<64;i++)if(hubReversiFlips(board,i,color).length)result.push(i);
  return result;
}
function hubNewGame(kind,players){
  if(!['reversi','connect4'].includes(kind)||players.length!==2||players[0]===players[1])return null;
  const board=Array(kind==='reversi'?64:42).fill(0);
  if(kind==='reversi'){board[27]=2;board[28]=1;board[35]=1;board[36]=2;}
  return {kind,players:players.slice(),board,turn:0,status:'play',winner:-1,moves:0,passes:0,revision:0};
}
function hubConnectWinner(board,row,col,color){
  for(const [dr,dc] of [[1,0],[0,1],[1,1],[1,-1]]){
    let n=1;
    for(const sign of [-1,1]){
      let r=row+dr*sign,c=col+dc*sign;
      while(r>=0&&r<6&&c>=0&&c<7&&Number(board[r*7+c])===color){n++;r+=dr*sign;c+=dc*sign;}
    }
    if(n>=4)return true;
  }
  return false;
}
// Pure rules: returns null for illegal action, otherwise a fresh immutable snapshot.
function hubApplyMove(current,actor,choice){
  if(!current||current.status!=='play'||!Array.isArray(current.players)||
     current.players[current.turn]!==actor)return null;
  const state={...current,board:Array.isArray(current.board)?current.board.slice():[],players:current.players.slice()};
  const color=current.turn+1;
  if(current.kind==='reversi'){
    if(!Number.isInteger(choice)||choice<0||choice>=64||state.board.length!==64)return null;
    const flips=hubReversiFlips(state.board,choice,color);
    if(!flips.length)return null;
    state.board[choice]=color;
    for(const i of flips)state.board[i]=color;
    const other=3-color;
    if(hubReversiMoves(state.board,other).length){state.turn=other-1;state.passes=0;}
    else if(hubReversiMoves(state.board,color).length){state.turn=color-1;state.passes=1;}
    else{
      state.status='done';state.turn=-1;
      const first=state.board.filter(x=>x===1).length,second=state.board.filter(x=>x===2).length;
      state.winner=first===second?-1:first>second?0:1;
    }
  }else if(current.kind==='connect4'){
    if(!Number.isInteger(choice)||choice<0||choice>=7||state.board.length!==42)return null;
    let row=-1;
    for(let r=5;r>=0;r--)if(!state.board[r*7+choice]){row=r;break;}
    if(row<0)return null;
    state.board[row*7+choice]=color;
    if(hubConnectWinner(state.board,row,choice,color)){state.status='done';state.winner=current.turn;state.turn=-1;}
    else if(state.board.every(Boolean)){state.status='done';state.winner=-1;state.turn=-1;}
    else state.turn=1-current.turn;
  }else return null;
  state.moves=(current.moves||0)+1;
  state.revision=(current.revision||0)+1;
  return state;
}
let hubGameSnapshot=null;
let hubRoomBound=null;
let hubBusy=false;
function hubBindRoom(){
  if(!roomRef||hubRoomBound===roomRef)return;
  hubRoomBound=roomRef;
  const ref=roomRef;
  ref.child('hubGame').on('value',s=>{if(ref!==roomRef)return;hubGameSnapshot=s.val();hubRender();});
  ref.child('mem').on('value',()=>{if(ref===roomRef)hubRender();});
}
function hubDisplayName(id){
  const v=memCache[id];
  return v?String(v.label||'PLAYER').slice(0,24):'退出したプレイヤー';
}
function hubRender(){
  if(!online||gmCache?.mode!=='hub'||scene!=='sc-hub-room')return;
  const members=lobbyMembers().filter(x=>!x.cpu);
  const code=hubEl('hub-code');if(code)code.textContent=roomId||'';
  hubEl('hub-members').textContent=members.length+'人が参加中 / '+(isHost?'あなたがホスト':'ホストがゲームを選択します');
  hubEl('hub-roster').textContent=members.map(m=>m.label+(m.host?' ★':'')+(m.id===myId?'（あなた）':'')).join('　/　');
  const cards=hubEl('hub-catalog');
  if(cards){
    cards.innerHTML='';
    for(const category of ['2人対戦','みんなで遊ぶ','カジノ']){
      const section=document.createElement('section');section.className='hub-category';
      const heading=document.createElement('h3');heading.textContent=category;section.appendChild(heading);
      const grid=document.createElement('div');grid.className='hub-cards';
      for(const game of HUB_CATALOG.filter(x=>x.category===category)){
        const b=document.createElement('button');b.type='button';b.className='hub-card'+(hubGameSnapshot?.kind===game.id?' is-current':'');
        b.disabled=!game.ready||!isHost||members.length<2||hubBusy;
        const title=document.createElement('strong');title.textContent=game.name;b.appendChild(title);
        const info=document.createElement('small');info.textContent=game.players+' · '+(game.ready?'対戦可能':'今後追加');b.appendChild(info);
        if(game.ready){
          b.title=game.description||'';
          b.onclick=()=>hubSelectGame(game.id);
        }
        grid.appendChild(b);
      }
      section.appendChild(grid);cards.appendChild(section);
    }
  }
  const info=hubEl('hub-game-info'),boardEl=hubEl('hub-board');
  boardEl.replaceChildren();
  const g=hubGameSnapshot;
  if(!g){info.textContent='ゲームを選んでください。リバーシとコネクトフォーはオンライン対戦に対応しています。';return;}
  const game=HUB_CATALOG.find(x=>x.id===g.kind);
  if(!game||!Array.isArray(g.players)||g.players.length!==2){info.textContent='ゲームのデータを読み込めません。';return;}
  const board=Array.isArray(g.board)?g.board:[],isPlayer=g.players.includes(myId);
  const names=g.players.map(hubDisplayName);
  const current=g.turn>=0?g.players[g.turn]:'';
  if(g.status==='done')info.textContent=game.name+' ／ '+(g.winner>=0?hubDisplayName(g.players[g.winner])+' の勝ち！':'引き分け')+' ／ ホストは同じゲームを押すと再戦できます。';
  else info.textContent=game.name+' ／ '+names[0]+'（先手） vs '+names[1]+'（後手） ／ '+hubDisplayName(current)+' の番'+(g.passes?'（パスが発生しました）':'')+(isPlayer?'':' ／ 観戦中');
  boardEl.className='hub-board '+(g.kind==='reversi'?'hub-reversi':'hub-connect4');
  boardEl.style.gridTemplateColumns='repeat('+(g.kind==='reversi'?8:7)+', minmax(0,1fr))';
  const canAct=g.status==='play'&&current===myId;
  const legal=canAct&&g.kind==='reversi'?new Set(hubReversiMoves(board,g.turn+1)):new Set();
  for(let i=0;i<board.length;i++){
    const c=document.createElement('button');c.type='button';
    const value=Number(board[i])||0;
    c.className='hub-cell'+(value?' occupied':'')+(legal.has(i)?' legal':'');
    c.disabled=!canAct||(g.kind==='reversi'&&!legal.has(i));
    c.setAttribute('aria-label',g.kind==='connect4'?'列'+(i%7+1):'行'+(Math.floor(i/8)+1)+'列'+(i%8+1));
    if(value){
      const disc=document.createElement('span');disc.className='hub-disc '+(value===1?'dark':'light');c.appendChild(disc);
    }else if(legal.has(i)){const dot=document.createElement('span');dot.className='hub-legal-dot';c.appendChild(dot);}
    const choice=g.kind==='connect4'?i%7:i;
    c.onclick=()=>hubSubmitMove(choice);
    boardEl.appendChild(c);
  }
}
async function hubSelectGame(kind){
  if(!isHost||!roomRef||hubBusy||!HUB_CATALOG.some(x=>x.id===kind&&x.ready))return;
  const humans=lobbyMembers().filter(x=>!x.cpu);
  if(humans.length<2){alert('このゲームは2人以上必要です。');return;}
  if(hubGameSnapshot?.status==='play'&&hubGameSnapshot.moves>0&&!confirm('対局中のゲームを終了して切り替えますか？'))return;
  hubBusy=true;hubRender();
  try{
    if(kind==='stickbattle'){
      await roomRef.child('hubGame').remove();
      await roomRef.child('gm').update({mode:'normal',ph:'lobby',cpuN:0,teamMode:0});
      return;
    }
    const ids=humans.slice(0,2).map(x=>x.id);
    const snap=await roomRef.child('hubGame').once('value');
    const prior=snap.val();
    if(prior?.kind===kind&&Array.isArray(prior.players)&&ids.every(x=>prior.players.includes(x)))ids.reverse();
    await roomRef.child('hubGame').set(hubNewGame(kind,ids));
  }catch(e){alert('ゲームを開始できませんでした。'+(e?.message||e));}
  finally{hubBusy=false;hubRender();}
}
async function hubSubmitMove(choice){
  const g=hubGameSnapshot;
  if(!g||hubBusy||!roomRef||g.players[g.turn]!==myId)return;
  hubBusy=true;
  try{
    const result=await roomRef.child('hubGame').transaction(current=>hubApplyMove(current,myId,choice),undefined,false);
    if(!result.committed)console.debug('着手は受理されませんでした。盤面を更新します。');
  }catch(e){alert('着手を送信できませんでした。'+(e?.message||e));}
  finally{hubBusy=false;}
}
const hubOriginalOnGm=onGm;
onGm=function(g){
  if(g&&g.mode==='hub'){
    gmCache=g;
    if(g.protocol!==NET_PROTOCOL){alert('部屋のバージョンが違います。再読み込みしてください。');return;}
    hubBindRoom();
    if(scene!=='sc-hub-room')show('sc-hub-room');
    hubRender();return;
  }
  const wasHub=scene==='sc-hub-room';
  hubOriginalOnGm(g);
  if(wasHub&&g?.ph==='lobby'&&g.mode!=='hub'){
    show('sc-lobby');
    renderLobby();
  }
};
const hubOriginalRenderLobby=renderLobby;
let quickStartPending=false;
renderLobby=function(){
  if(gmCache?.mode==='hub'){
    if(scene!=='sc-hub-room')show('sc-hub-room');
    hubRender();return;
  }
  hubOriginalRenderLobby();
  const switchButton=hubEl('lb-to-hub');
  if(switchButton)switchButton.style.display=(gmCache?.mode==='normal'&&isHost)?'block':'none';
  if(gmCache?.mode!=='match'||scene!=='sc-lobby')return;
  const humans=lobbyMembers().filter(x=>!x.cpu);
  const set=hubEl('lb-set'),start=hubEl('lb-start'),wait=hubEl('lb-wait');
  set.textContent='ランダムマッチ：2人揃うと自動で通常のSTICK BATTLEを開始します。';
  start.style.display='none';
  wait.style.display='block';
  wait.textContent=humans.length<2?'対戦相手を探しています…':'相手と通信を準備しています…';
  if(isHost&&humans.length===2&&humans.every(m=>m.ready)&&!quickStartPending&&gmCache.ph==='lobby'){
    quickStartPending=true;
    setTimeout(async()=>{
      try{
        const snap=await roomRef.child('mem').once('value');
        const players=Object.values(snap.val()||{}).filter(m=>m&&!m.cpu);
        const state=(await roomRef.child('gm').once('value')).val();
        if(players.length===2&&players.every(m=>m.ready)&&state?.ph==='lobby'&&state?.mode==='match'){
          await hostStart();
          await quickReleaseQueue();
        }
      }catch(e){console.warn('ランダムマッチ開始失敗',e);}
      finally{quickStartPending=false;}
    },700);
  }
};
const hubOriginalJoinCommon=joinCommon;
joinCommon=async function(){
  const joined=await hubOriginalJoinCommon();
  if(!joined||!roomRef)return joined;
  const ref=roomRef;
  const meta=(await ref.child('gm').once('value')).val();
  if(meta?.mode==='hub'){
    hubBindRoom();
    if(scene!=='sc-hub-room')show('sc-hub-room');
    hubRender();
  }else if(meta?.mode==='match'){
    await ref.child('mem/'+myId).update({ready:1});
  }
  return joined;
};
let quickQueueRef=null,quickRequest=0,quickBusy=false;
function quickFeedback(message){
  const status=hubEl('online-quick-status');
  if(status)status.textContent=message;
}
async function quickReleaseQueue(){
  if(!quickQueueRef)return;
  try{
    const q=quickQueueRef;
    await q.transaction(v=>v?.owner===myId?null:undefined,undefined,false);
    await q.onDisconnect().cancel();
    quickQueueRef=null;
  }catch(e){console.warn('マッチング待機枠の解除に失敗',e);}
}
async function quickHostRoom(code){
  online=true;isHost=true;roomId=code;
  roomRef=db.ref('rooms/'+code);
  roomRef.onDisconnect().remove();
  await roomRef.child('gm').set({protocol:NET_PROTOCOL,mode:'match',hostId:myId,ph:'lobby',round:0,map:'std',mapChoice:'std',
    wpn:0,stocks:settings.stocks,cpuN:0,cpuLv:1,cpuPool:'all',teamMode:0,w:'',wt:0});
  const joined=await joinCommon();
  if(!joined)throw new Error('ランダムマッチの部屋に入れませんでした。');
  netTimers.push(setInterval(hostTick,200));
  netTimers.push(setInterval(hostSpawn,1000));
}
async function quickJoinReadyRoom(code,request){
  for(let tries=0;tries<18;tries++){
    if(request!==quickRequest)return false;
    const s=await db.ref('rooms/'+code+'/gm').once('value');
    if(s.val()?.mode==='match')return joinRoom(code,false);
    await new Promise(done=>setTimeout(done,250));
  }
  throw new Error('対戦相手の部屋が準備できませんでした。もう一度検索してください。');
}
async function startQuickMatch(){
  if(online||quickBusy)return;
  const request=++quickRequest;
  quickBusy=true;
  const button=hubEl('online-quick');button.disabled=true;
  quickFeedback('対戦相手を検索しています…');
  try{
    if(!await initFirebase())throw new Error(firebaseLastError||'Firebaseに接続できませんでした。');
    const q=db.ref('rooms/_matchmaking/standard'),code=newRoomCode();
    let result=null;
    for(let attempt=0;attempt<12;attempt++){
      const now=Date.now();
      result=await q.transaction(v=>{
        if(!v||v.protocol!==NET_PROTOCOL||now-Number(v.created||0)>90000){
          return {owner:myId,room:code,created:now,protocol:NET_PROTOCOL,status:'waiting'};
        }
        if(v.status==='waiting'&&v.owner!==myId){
          return {...v,status:'matched',guest:myId,matchedAt:now};
        }
        return;
      },undefined,false);
      if(result.committed)break;
      await new Promise(done=>setTimeout(done,300+attempt*100));
    }
    if(!result?.committed)throw new Error('現在マッチングが混み合っています。しばらくして再試行してください。');
    const ticket=result.snapshot.val();
    if(request!==quickRequest)return;
    if(ticket.owner===myId){
      quickQueueRef=q;
      await q.onDisconnect().remove();
      await quickHostRoom(ticket.room);
      quickFeedback('相手の参加を待っています…');
    }else if(ticket.guest===myId){
      quickFeedback('対戦相手が見つかりました。接続中…');
      const joined=await quickJoinReadyRoom(ticket.room,request);
      if(!joined)throw new Error('対戦相手に接続できませんでした。');
    }else throw new Error('待機情報が更新されました。もう一度試してください。');
  }catch(e){
    console.error('ランダムマッチ失敗',e);
    quickFeedback(e?.message||'マッチングに失敗しました。');
    if(quickQueueRef)await quickReleaseQueue();
  }finally{
    quickBusy=false;
    button.disabled=false;
  }
}
const hubOriginalBuildMenus=buildMenus;
buildMenus=function(){
  hubOriginalBuildMenus();
  const hubButton=hubEl('go-hub');
  hubButton.onclick=()=>{requestedOnlineMode='hub';show('sc-online');};
  hubEl('online-quick').onclick=startQuickMatch;
  hubEl('lb-to-hub').onclick=async()=>{
    if(isHost&&roomRef&&gmCache?.mode==='normal'&&gmCache.ph==='lobby'){
      await roomRef.child('gm').update({mode:'hub',ph:'lobby',cpuN:0,teamMode:0});
    }
  };
  hubEl('go-online').addEventListener('click',()=>{hubEl('online-context').textContent='友達との対戦は部屋コードで招待。ランダムマッチなら相手を自動で探せます。';});
  hubButton.addEventListener('click',()=>{hubEl('online-context').textContent='ゲームハブの部屋を作って友達に招待URL・6文字のコードを送ろう！';});
  hubEl('hub-copy').onclick=()=>{
    const url=location.href.split('?')[0]+'?room='+roomId;
    if(navigator.clipboard?.writeText)navigator.clipboard.writeText(url).then(()=>alert('招待URLをコピーしました')).catch(()=>prompt('このURLを送ってください',url));
    else prompt('このURLを送ってください',url);
  };
  hubEl('hub-leave').onclick=()=>{if(confirm('ゲームハブの部屋から退出しますか？'))leaveRoom();};
};
