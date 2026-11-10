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
function hubDiscTone(kind,value){
  if(!value)return '';
  return kind==='connect4'?(value===1?'red':'yellow'):(value===1?'dark':'light');
}
function hubSetEntryMode(mode){
  const entry=hubEl('sc-online');
  if(!entry)return;
  const isHub=mode==='hub';
  entry.dataset.onlineMode=isHub?'hub':mode==='tournament'?'tournament':'normal';
  const title=hubEl('online-page-title');
  if(title)title.innerHTML=(isHub?'ゲーム<span>HUB</span>':mode==='tournament'?'オンライン大会':'オンライン対戦')+'<span class="hub-entry-period">.</span>';
  const eyebrow=hubEl('online-eyebrow');
  if(eyebrow)eyebrow.textContent=isHub?'GAME HUB / INVITE ONLY':mode==='tournament'?'STICK BATTLE / TOURNAMENT':'STICK BATTLE / ONLINE';
  const description=hubEl('online-context');
  if(description)description.textContent=isHub?
    '6文字のルームコードで友達を招待。集まったらリバーシやコネクトフォーを遊ぼう。':
    mode==='tournament'?'友達を招いて、オンラインの勝ち抜きトーナメントを開催しよう。':
    '友達を招待して、専用ルームで対戦しよう。';
}
function hubMake(tag,className,textValue){
  const el=document.createElement(tag);
  if(className)el.className=className;
  if(textValue!==undefined)el.textContent=String(textValue);
  return el;
}
const HUB_ICONS={
  stickbattle:'⚔',reversi:'◑',connect4:'◉',airhockey:'◈',
  chess:'♞',shogi:'将', 'mini-shogi':'五',shichinarabe:'7',
  oldmaid:'♠',mahjong:'🀄',blackjack:'21',poker:'♣',baccarat:'◆'
};
function hubRender(){
  if(!online||gmCache?.mode!=='hub'||scene!=='sc-hub-room'&&scene!=='sc-hub-play')return;
  const members=lobbyMembers().filter(x=>!x.cpu);
  const code=hubEl('hub-code');if(code)code.textContent=roomId||'';
  const count=hubEl('hub-members');
  if(count)count.textContent=members.length+' / '+MAX_PLAYERS+' 人が参加中　'+(isHost?'・あなたはホスト':'・ホストがゲームを選択します');
  const roster=hubEl('hub-roster');
  if(roster){
    roster.replaceChildren();
    for(const m of members){
      const item=hubMake('span','hub-member'+(m.id===myId?' is-you':''));
      const name=String(m.label||'PLAYER');
      const avatar=hubMake('span','hub-member-avatar',name.trim().slice(0,1).toUpperCase()||'P');
      const label=hubMake('span','hub-member-label',name+(m.id===myId?'（あなた）':''));
      item.append(avatar,label);
      if(m.host)item.appendChild(hubMake('span','hub-member-host','HOST'));
      roster.appendChild(item);
    }
  }
  const cards=hubEl('hub-catalog');
  if(cards){
    cards.replaceChildren();
    for(const category of ['2人対戦','みんなで遊ぶ','カジノ']){
      const games=HUB_CATALOG.filter(x=>x.category===category);
      const section=hubMake('section','hub-category');
      const heading=hubMake('div','hub-category-heading');
      const title=hubMake('h4','',category);
      heading.append(title,hubMake('span','hub-category-count',String(games.length).padStart(2,'0')));
      section.appendChild(heading);
      const grid=hubMake('div','hub-cards');
      for(const game of games){
        const isCurrent=hubGameSnapshot?.kind===game.id;
        const b=hubMake('button','hub-card'+(isCurrent?' is-current':'')+(!game.ready?' is-coming':''));
        b.type='button';
        b.dataset.game=game.id;
        b.disabled=!game.ready||!isHost||members.length<2||hubBusy;
        b.setAttribute('aria-label',game.name+(game.ready?'':'（準備中）'));
        b.appendChild(hubMake('span','hub-card-icon',HUB_ICONS[game.id]||'◇'));
        const main=hubMake('span','hub-card-content');
        main.appendChild(hubMake('strong','hub-card-name',game.name));
        main.appendChild(hubMake('small','hub-card-meta',game.players));
        b.appendChild(main);
        let statusText=!game.ready?'COMING SOON':isCurrent?'PLAYING':!isHost?'HOST ONLY':members.length<2?'WAITING':'PLAY ↗';
        b.appendChild(hubMake('span','hub-card-status',statusText));
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
  const titleEl=hubEl('hub-game-title'),meta=hubEl('hub-game-meta'),versus=hubEl('hub-versus');
  const empty=hubEl('hub-empty-state'),footer=hubEl('hub-game-footer');
  boardEl.replaceChildren();
  const g=hubGameSnapshot;
  if(!g){
    titleEl.textContent='ゲームを選ぼう';
    meta.textContent='GAME TABLE / READY';
    info.textContent=isHost?'左の一覧から好きなゲームを選んで、みんなで遊ぼう。':'ホストがゲームを選択するのを待っています。';
    versus.replaceChildren();footer.textContent='リバーシとコネクトフォーは、2人揃えばすぐに遊べます。';
    boardEl.hidden=true;empty.hidden=false;return;
  }
  const game=HUB_CATALOG.find(x=>x.id===g.kind);
  if(!game||!Array.isArray(g.players)||g.players.length!==2){
    titleEl.textContent='ゲームを読み込めません';meta.textContent='GAME TABLE / ERROR';
    info.textContent='対局データを確認してください。';
    versus.replaceChildren();footer.textContent='ホストが別のゲームを選ぶと再開できます。';
    boardEl.hidden=true;empty.hidden=false;return;
  }
  const board=Array.isArray(g.board)?g.board:[],isPlayer=g.players.includes(myId),isConnect=g.kind==='connect4';
  const names=g.players.map(hubDisplayName),current=g.turn>=0?g.players[g.turn]:'';
  titleEl.textContent=game.name;
  meta.textContent=(isConnect?'CONNECT FOUR':'REVERSI')+' / '+(g.status==='done'?'RESULT':'MATCH '+String(g.moves||0).padStart(2,'0'));
  if(g.status==='done'){
    info.textContent=g.winner>=0?hubDisplayName(g.players[g.winner])+' の勝利！':'引き分け！';
    footer.textContent=isHost?'左の同じゲームを選ぶと再戦できます。':'ホストが再戦・ゲーム変更を選ぶまでお待ちください。';
  }else{
    info.textContent=current===myId?'あなたの番です。盤面をタップして着手しよう！':hubDisplayName(current)+' の番です。'+(!isPlayer?'（観戦中）':'');
    if(g.passes)info.textContent+='　※置ける場所がなくパスしました。';
    footer.textContent=isConnect?'列をタップすると、コマが一番下の空きマスに落ちます。':'光っているマスが置ける場所です。';
  }
  versus.replaceChildren();
  for(let n=0;n<2;n++){
    const person=hubMake('div','hub-player'+(g.status==='play'&&g.turn===n?' is-turn':'')+(g.winner===n&&g.status==='done'?' is-winner':''));
    const disc=hubMake('span','hub-player-disc '+hubDiscTone(g.kind,n+1));
    const text=hubMake('span','hub-player-info');
    text.appendChild(hubMake('span','hub-player-label',n===0?'PLAYER 1 / 先手':'PLAYER 2 / 後手'));
    text.appendChild(hubMake('strong','hub-player-name',names[n]+(g.players[n]===myId?'（あなた）':'')));
    const points=isConnect?board.filter(v=>Number(v)===n+1).length:board.filter(v=>Number(v)===n+1).length;
    const counter=hubMake('b','hub-player-score',String(points).padStart(2,'0'));
    person.append(disc,text,counter);
    versus.appendChild(person);
    if(n===0)versus.appendChild(hubMake('span','hub-vs','VS'));
  }
  boardEl.className='hub-board '+(isConnect?'hub-connect4':'hub-reversi');
  boardEl.style.gridTemplateColumns='repeat('+(isConnect?7:8)+',minmax(0,1fr))';
  boardEl.hidden=false;empty.hidden=true;
  const canAct=g.status==='play'&&current===myId;
  const legal=canAct&&!isConnect?new Set(hubReversiMoves(board,g.turn+1)):new Set();
  for(let i=0;i<board.length;i++){
    const c=hubMake('button','hub-cell'+(Number(board[i])?' occupied':'')+(legal.has(i)?' legal':''));
    c.type='button';
    const value=Number(board[i])||0,choice=isConnect?i%7:i;
    c.disabled=!canAct||(!isConnect&&!legal.has(i))||(isConnect&&Number(board[choice])!==0);
    const tone=hubDiscTone(g.kind,value),discLabel=value?(isConnect?(value===1?'赤':'黄色'):(value===1?'黒':'白')):'空き';
    c.setAttribute('aria-label',(isConnect?'列'+(choice+1):'行'+(Math.floor(i/8)+1)+'列'+(i%8+1))+' / '+discLabel);
    if(value){
      c.appendChild(hubMake('span','hub-disc '+tone));
    }else if(legal.has(i)){
      c.appendChild(hubMake('span','hub-legal-dot'));
    }
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
    if(scene!=='sc-hub-room'&&scene!=='sc-hub-play')show('sc-hub-room');
    hubRender();return;
  }
  const wasHub=scene==='sc-hub-room'||scene==='sc-hub-play';
  hubOriginalOnGm(g);
  if(wasHub&&g?.ph==='lobby'&&g.mode!=='hub'){
    show('sc-lobby');
    renderLobby();
  }
};
const hubOriginalRenderLobby=renderLobby;
renderLobby=function(){
  if(gmCache?.mode==='hub'){
    if(scene!=='sc-hub-room'&&scene!=='sc-hub-play')show('sc-hub-room');
    hubRender();
    return;
  }
  hubOriginalRenderLobby();
  const switchButton=hubEl('lb-to-hub');
  if(switchButton)switchButton.style.display=(gmCache?.mode==='normal'&&isHost)?'block':'none';
};
const hubOriginalJoinCommon=joinCommon;
joinCommon=async function(){
  const joined=await hubOriginalJoinCommon();
  if(!joined||!roomRef)return joined;
  const meta=(await roomRef.child('gm').once('value')).val();
  if(meta?.mode==='hub'){
    hubBindRoom();
    if(scene!=='sc-hub-room'&&scene!=='sc-hub-play')show('sc-hub-room');
    hubRender();
  }
  return joined;
};
const hubShowBase=show;
show=function(id){
  if(id==='sc-online')hubSetEntryMode(requestedOnlineMode);
  return hubShowBase(id);
};
const hubOriginalBuildMenus=buildMenus;
buildMenus=function(){
  hubOriginalBuildMenus();
  const hubButton=hubEl('go-hub');
  hubButton.onclick=()=>{requestedOnlineMode='hub';show('sc-online');};
  hubEl('lb-to-hub').onclick=async()=>{
    if(isHost&&roomRef&&gmCache?.mode==='normal'&&gmCache.ph==='lobby'){
      await roomRef.child('gm').update({mode:'hub',ph:'lobby',cpuN:0,teamMode:0});
    }
  };
  hubEl('hub-copy').onclick=()=>{
    const url=location.href.split('?')[0]+'?room='+roomId;
    if(navigator.clipboard?.writeText)navigator.clipboard.writeText(url).then(()=>alert('招待URLをコピーしました')).catch(()=>prompt('このURLを送ってください',url));
    else prompt('このURLを送ってください',url);
  };
  hubEl('hub-leave').onclick=()=>{if(confirm('ゲームHUBの部屋から退出しますか？'))leaveRoom();};
};