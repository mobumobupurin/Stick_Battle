// ========================================================
// ⑨ 当たり判定と三すくみ
// ========================================================
function localHitFx(tid, x, y, kb) {
  flash[tid] = 6;
  burst(x, y, 8 + Math.floor(kb), kb * 0.9, '#ffffff', 8);
  ring(x, y, kb * 0.9, 12);
  shake = Math.max(shake, Math.min(kb * 0.35, 7));
  sfxHit(kb);
}

function meleeCheck(a) {
  if (!isLocal(a) || a.out || !isActive(a)) return;
  const mv = a.mv;
  if(a.timeStopT>0)return;
  if (mv.noHit) return;
  const asz = fighterSize(a);
  const giantHit=erenTitan(a)?erenAttackShape(a):null;
  const hx = giantHit?.x??a.x+a.f*mv.reach*asz, hy=giantHit?.y??a.y-mv.yo*asz, R=giantHit?.r??mv.R*asz;
  // A long Rinkaku grab catches the FIRST fighter along its path, not the
  // earliest entry in the roster. Keep victim-authoritative resolution intact.
  const targets=mv.kind==='kanekiBind'
    ? [...fighters].sort((l,r)=>((l.x-a.x)*a.f)-((r.x-a.x)*a.f))
    : fighters;
  for (const t of targets) {
    if(['titanGrab','kanekiBind'].includes(mv.kind)&&Object.keys(a.hit).length)break;
    if (t === a || t.out || a.hit[t.id] || sameTeam(a, t)) continue;
    const tsz = fighterSize(t);
    let touching;
    if (mv.line) {
      const sx = a.x, sy = hy, dx = hx - sx, dy = 0, L2 = dx * dx + dy * dy || 1, ty = t.y - 30 * tsz;
      const u = constrain(((t.x - sx) * dx + (ty - sy) * dy) / L2, 0, 1);
      touching = Math.hypot(t.x - (sx + dx * u), ty - (sy + dy * u)) < R + 16 * tsz;
    } else touching = Math.hypot(hx - t.x, hy - (t.y - 30 * tsz)) < R + 16 * tsz;
    if(erenTitan(t)){const xx=mv.line?constrain(t.x,Math.min(a.x,hx),Math.max(a.x,hx)):hx;touching=erenBodyHit(t,xx,hy,R);}
    if (touching) {
      a.hit[t.id] = true;
      const oraFinish=mv.kind==='ora'&&a.a>=mv.act1-1;
      const A = { contact:erenTitan(t)?{x:hx,y:hy,r:R}:null, id: a.id, x: Math.round(a.x), f: mv.kind==='erenCrossSpin'?(Math.sign(t.x-a.x)||a.f):a.f, c: a.c,
                  mv: { kanekiToken:mv.kanekiToken||null, kanekiPhase:mv.kanekiPhase??0, erenToken:mv.erenToken||null, type: oraFinish?'heavy':mv.type, kind: oraFinish?'orafinish':mv.kind, style:mv.style|| (mv.kind==='gdragon'?'dragon':mv.kind==='gblackflash'?'blackflash':''), dm: Math.round((oraFinish?14.5:mv.dm) * 10) / 10, k0: Math.round((oraFinish?15.0:mv.k0) * 10) / 10, ks: oraFinish?.115:mv.ks, up: oraFinish?.48:mv.up, ko: !!mv.ko, blockOnly: !!mv.blockOnly, ragePunch: !!mv.ragePunch, pierce: !!mv.pierce, minKb:oraFinish?15.5:(mv.minKb||0) } };
      if (isLocal(t)) resolveMelee(A, t);
      else {
        send({ k: 'mh', to: t.id, a: a.id, ax: A.x, f: A.f, c: a.c, mv: A.mv, contact:A.contact });
        // 予測：返事を待たずに手応えを出す
        const front = fromFront(t, a.x) || CC(t.cid).back;
        const willCounter = mv.type === 'heavy' && mv.kind !== 'upper' && !AXE_KINDS.includes(mv.kind) && inCounter(t) && front;
        if (mv.kind === 'upper' && !t.ivf) requestCinematic('ko', { x: Math.round(t.x), y: Math.round(t.y - 30 * tsz), a: a.id, t: t.id, style:'ko', moveKind:'upper' }); // Only boxer KO uses eager preview; named techniques require confirmed hits
        if (!willCounter && !t.ivf && mv.kind !== 'upper') {
          const est = (A.mv.k0 + (t.d + A.mv.dm) * A.mv.ks) * weightFactor(t);
          localHitFx(t.id, t.x, t.y - 30 * tsz, est);
          predicted[a.id] = Date.now();
        }
      }
    }
  }
}

function resolveMelee(A, t) {
  const attacker = byId(A.id); if (attacker && sameTeam(attacker, t)) return;
  const mv = A.mv, ty = t.y - 30 * fighterSize(t);
 if(t.shadowClone){shadowClonePop(t);return;}
  if (isInvuln(t)) { if (t.dg > 0) emitFx({ res: 'evade', t: t.id, a: A.id, x: t.x, y: t.y - 110 }); return; }
  if(animeInfinity(t,mv.type,A.id,mv.kind==='upper'))return;
  const front = fromFront(t, A.x) || CC(t.cid).back;
  if (mv.blockOnly && inCounter(t) && front) { emitFx({ res:'block', t:t.id, a:A.id, x:t.x, y:ty }); return; }
  if (!mv.pierce && !mv.ko && mv.type === 'heavy' && mv.kind !== 'upper' && !AXE_KINDS.includes(mv.kind) && inCounter(t) && front) { startCounter(A, t, mv); return; }
  const h = { dm: mv.dm, k0: mv.k0, ks: mv.ks, up: mv.up, f: A.f, ko: !!mv.ko, ragePunch: !!mv.ragePunch, minKb:mv.minKb||0 };
  const bk = !mv.pierce && !mv.ko && mv.kind !== 'upper' && t.ct > 0 && (mv.type === 'normal' || !front || AXE_KINDS.includes(mv.kind));
  if (!bk && mv.type === 'normal' && isArmored(t)) {
    armorHit(t, h, A.id);
    emitFx({ kanekiToken:mv.kanekiToken||null, kanekiPhase:mv.kanekiPhase??0, erenToken:mv.erenToken||null,res: 'armor', t: t.id, a: A.id, x: t.x, y: ty, gain: 4 });
    return;
  }
  const kb = applyHit(t, h, bk, A.id);
  emitFx({ kanekiToken:mv.kanekiToken||null, kanekiPhase:mv.kanekiPhase??0, erenToken:mv.erenToken||null,res: 'hit', t: t.id, a: A.id, x: t.x, y: ty, kb: Math.round(kb * 10) / 10, bk: bk ? 1 : 0, up: ['upper','gdragon','gblackflash'].includes(mv.kind) || mv.style==='blackflash' ? 1 : 0, style: mv.style|| (mv.kind==='gdragon'?'dragon':mv.kind==='gblackflash'?'blackflash':''), moveKind:mv.kind, c: t.c, gain: 8, axe:mv.kind==='axeheavy'||mv.kind==='axeup' });
}

function resolveProj(Q, t) {
  const owner = byId(Q.o); if (owner && sameTeam(owner, t)) return;
  const ty = t.y - 34 * fighterSize(t);
 if(t.shadowClone){shadowClonePop(t);return;}
  if (isInvuln(t)) { if (t.dg > 0) emitFx({ res: 'evade', t: t.id, a: Q.o, x: t.x, y: t.y - 110 }); return; }
  if (t.projectileSlipT>0) { emitFx({res:'evade',t:t.id,a:Q.o,x:t.x,y:t.y-90}); return; }
  if (t.cid==='yankee' && rageOn(t) && Q.animeKind==='ki') { emitFx({res:'block',t:t.id,a:Q.o,x:t.x,y:ty}); return; }
  if(animeInfinity(t,'projectile',Q.o,!!Q.bypassInfinity||!!Q.senku))return;
  // 気弾は削り専用。%は増えるが一切のノックバック・のけぞりを与えない。
  if (Q.animeKind==='ki') { const dm=armorCut(t,Q.dm);t.d+=dm;addDealt(Q.o,dm);gainRage(t,dm);emitFx({res:'armor',t:t.id,a:Q.o,x:t.x,y:ty,gain:1});return; }
  const front = fromFront(t, Q.x) || CC(t.cid).back;
  if ((Q.senku && inCounter(t)) || (inCounter(t) && front)) { emitFx({ res: 'block', t: t.id, a: Q.o, x: Q.x, y: ty }); return; }
  const h = { dm: Q.dm, k0: Q.k0, ks: Q.ks, up: Q.up, f: Q.dir || Math.sign(Q.vx) || 1 };
  if (rageOn(t) && !Q.senku) {
    t.d += h.dm; addDealt(Q.o, h.dm); gainRage(t, h.dm);
    t.vx += h.f * 0.35;
    emitFx({ res: 'armor', t: t.id, a: Q.o, x: t.x, y: ty, gain: 3 }); return;
  }
  if (isArmored(t)) { armorHit(t, h, Q.o); emitFx({ res: 'armor', t: t.id, a: Q.o, x: t.x, y: ty, gain: 3 }); return; }
  const kb = applyHit(t, h, false, Q.o);
  emitFx({ res: 'hit', t: t.id, a: Q.o, x: t.x, y: ty, kb: Math.round(kb * 10) / 10, bk: 0, up: 0, c: t.c, gain: 5 });
}

function addDealt(attackerId, dm) { const a = byId(attackerId); if (a && a.stats) a.stats.dealt += Math.max(0, dm || 0); }

function armorHit(t, h, attackerId) {
  const dm = armorCut(t, h.dm);
  t.d += dm; addDealt(attackerId, dm);
  gainKO(t, h.dm * 1.2); gainRage(t, h.dm);
}

function applyHit(t, h, bk, attackerId) {
 if(t.shadowClone){const a=byId(attackerId);if(!a||!sameTeam(a,t))shadowClonePop(t);return 0;}
 if(t.timeStopT>0&&!t.releasingStop){const q=t.stoppedHits||(t.stoppedHits=[]);if(q.length<128)q.push({h:{...h},bk,attackerId});return (h.k0+t.d*h.ks)*weightFactor(t);}
  const attacker = byId(attackerId); if (attacker && sameTeam(attacker, t)) return 0;
  const m = bk ? 1.4 : 1;
  const dealt = armorCut(t, h.dm * m);
  t.d += dealt; addDealt(attackerId, dealt);
  gainKO(t, h.dm * 1.2); gainRage(t, dealt);
  let kb = (h.k0 + t.d * h.ks) * m * weightFactor(t);
  if (h.ragePunch) kb = Math.max(kb, RAGE_PUNCH_MIN_KB);
  if (h.minKb) kb = Math.max(kb,h.minKb);
  if (h.ko) {
    // KOアッパー専用：重量補正を超えて確実に撃墜圏へ運ぶ最強吹っ飛ばし
    kb = Math.max(kb, 36);
    t.vx = h.f * 22; t.vy = -36; t.kb = 110;
  } else {
    t.vx = h.f * kb; t.vy = -kb * (h.up || 0.6) - 2; t.kb = Math.floor(10 + kb * 1.8);
  }
  t.f = -h.f;
  clearActs(t); t.stn = 0; t.g = false;
  if (kb >= 13 && t.w) dropWeapon(t, true);
  return kb;
}

function emitFx(e) { playFx(e, false); send({ k: 'fx', ...e }); }

function playFx(e, remote) {
  if(e.axe&&e.res==='hit')sfxAxeImpact();
  // 自分が攻撃して予測済みなら、火花と音は二重に出さない
  const a = e.a ? byId(e.a) : null;
  const pred = remote && a && isLocal(a) && predicted[e.a] && Date.now() - predicted[e.a] < 800;
  if (e.res === 'evade') {
    popups.push({ x: e.x, y: e.y, txt: 'EVADE!', life: 32, max: 32, size: 26, c: '#7ee081' });
  } else if (e.res === 'armor') {
    flash[e.t] = 6;
    popups.push({ x: e.x, y: e.y - 80, txt: 'ARMOR!', life: 30, max: 30, size: 24, c: '#ffd166' });
    sfxArmor();
  } else if (e.res === 'block') {
    burst(e.x, e.y, 12, 6, '#6ec8ff', 7); ring(e.x, e.y, 6, 10);
    popups.push({ x: e.x, y: e.y - 24, txt: 'BLOCKED!', life: 30, max: 30, size: 24, c: '#6ec8ff' });
    sfxBlock();
  } else if (e.res === 'hit') {
    if(e.senku){flash[e.t]=10;burst(e.x,e.y,12,7,'#c6fff0',6);if(e.gain&&a)gainKO(a,e.gain);return;}
    const kb = e.kb, n = 8 + Math.floor(kb);
    if(isAnime(a))animeVisual({kind:'impact',id:a.id,cid:a.cid,x:e.x,y:e.y,f:a.f,boost:a.modeT>0,life:18});
    if(e.style==='blackflash'){
      // アニメの黒閃：黒い衝撃に深紅の稲妻と火花。命中時にだけ表示。
      // 大きな黒い塊は禁止。黒赤の細かな破片＋赤い閃光だけ。
      burst(e.x,e.y,43,19,'#ef2440',8);
      burst(e.x,e.y,22,13,'#ffb1a1',5);
      shake=Math.max(shake,15);
      popups.push({x:e.x,y:e.y-76,txt:'黒閃',life:42,max:42,size:42,c:'#ff454f'});
    }else if(e.style==='dragon'){
      burst(e.x,e.y,38,16,'#ffd75c',13);
      ring(e.x,e.y,23,20);
    }
    if(a?.cid==='rubber'&&!a.w&&!pred){
      const g=a.gear||1;
      if(g>=3){burst(e.x,e.y,g===4?8:6,8,g===4?'#ef4d70':'#fff4db',5);ring(e.x,e.y,Math.min(13,kb*.75),10);}
    }
    if (!pred || e.up) {
      flash[e.t] = 6;
      burst(e.x, e.y, n, kb * 0.9, '#ffffff', 8);
      burst(e.x, e.y, Math.floor(n / 2), kb * 0.7, e.c, 7);
      if(e.style!=='blackflash')ring(e.x, e.y, kb * 0.9, 12);
    }
    if (e.up) {
      if(!online)startKOFreeze(e);else if(!remote)requestCinematic('ko',{x:e.x,y:e.y,a:e.a,t:e.t,style:e.style||'',moveKind:e.moveKind||''});
    } else {
      if (!pred) { shake = Math.max(shake, Math.min(kb * 0.35, 7)); if(a?.cid==='rubber'&&!a.w)sfxLuffyHit(a.gear||1);else sfxHit(kb); }
      if (e.bk) popups.push({ x: e.x, y: e.y - 30, txt: 'GUARD BREAK!', life: 42, max: 42, size: 32, c: '#ef4747' });
      else if (kb >= 14) popups.push({ x: e.x, y: e.y - 30, txt: 'SMASH!', life: 40, max: 40, size: 40, c: '#ffd166' });
    }
  }
  if (e.gain && a) { animeGain(a,e.gain*(a.cid==='goku'?1.3:1)); gainKO(a, e.gain); gainGear(a, e.gain * 1.6); }
}

function startCounter(A, t, mv) {
  if (t.stats) t.stats.counters++;
  const e = { k: 'ctr', att: A.id, cnt: t.id, dm: 6 + mv.dm * 0.4, kb0: 9 + mv.k0 * 0.45,
              dir: Math.sign(A.x - t.x) || -A.f, x: Math.round((A.x + t.x) / 2), y: Math.round(t.y - 34 * fighterSize(t)) };
  doCounter(e);
}

function doCounter(e) {
  if(online&&!cinDispatching){requestCinematic('counter',e);return;}
  freezeT = FREEZE; freezeMax = FREEZE; fzType = 'counter';
  fz = { x: e.x, y: e.y, att: e.att, cnt: e.cnt };
  shake = 6;
  sfxCounter();
  const c = byId(e.cnt);
  if (c && isLocal(c)) { c.ct = 0; c.cs = 24; c.inv = Math.max(c.inv, 30); }
  const a = byId(e.att);
  if (a && isLocal(a)) { clearActs(a); pending = { att: a, dir: e.dir, dm: e.dm, kb0: e.kb0 }; }
}

function startKOFreeze(e) {
  if(online&&!cinDispatching){requestCinematic('ko',e);return;}
  freezeT = FREEZE_KO; freezeMax = FREEZE_KO;
  // ローカル・オンラインとも技固有の漢字カットインを必ず選ぶ。
  // 旧イベントにstyleが欠けていても、攻撃者の技情報から補完する。
  const attacker=byId(e.a);
  const moveName=e.moveKind||attacker?.mv?.kind||'';
  // 一撃必殺の技は必ず日本語専用カットイン。オンラインでもkindを直接伝える。
  const style=e.style==='dragon'||e.style==='blackflash'?e.style:
    moveName==='gdragon'?'dragon':moveName==='gblackflash'?'blackflash':'ko';
  fzType=style;
  fz = { x: e.x, y: e.y, att: e.a, cnt: e.t };
  shake = fzType==='dragon'?20:fzType==='blackflash'?18:12;
  if(fzType==='dragon')animeSound('dragon');
  else if(fzType==='blackflash')animeSound('blackflash');
  else sfxKOHit();
}

function endFreeze() {
  if(fzType==='senku'){releaseSenku();return;}
  if (fzType === 'gear') {
    const c = GEAR_COL[fz?.lv || 2];
    if (fz) { burst(fz.x, fz.y, 50, 15, c, 14); burst(fz.x, fz.y, 20, 9, '#ffffff', 9); ring(fz.x, fz.y, 26, 22); }
    shake = 18; sfxCounterBoom(); return;
  }
  if (fzType === 'animeform') {
    if(fz){
      const pal=animeFormPalette(fz.cid,fz.form),ss3=fz.cid==='goku'&&fz.form===3;
      burst(fz.x,fz.y,ss3?67:47,ss3?19:13,pal.main,14);
      burst(fz.x,fz.y,ss3?34:20,9,pal.hot,9);
      ring(fz.x,fz.y,30,ss3?28:22);
    }
    shake=Math.max(shake,fz?.cid==='goku'&&fz?.form===3?19:13);
    sfxCounterBoom();return;
  }
  if (fzType === 'timestopcin') {
    if(fz){burst(fz.x,fz.y,45,12,'#c1a7fa',12);burst(fz.x,fz.y,20,8,'#adffe6',7);ring(fz.x,fz.y,27,24);}
    shake=Math.max(shake,13);
    // 時止めMP3は発動時に再生しており、解除までは止めない。
    return;
  }
  if (fzType === 'domain') {
    sfxCounterBoom();
    if(fz){burst(fz.x,fz.y,55,12,'#b2b6ff',12);ring(fz.x,fz.y,23,22);}
    shake=Math.max(shake,13);return;
  }
  if (fzType === 'rage') {
    sfxCounterBoom();
    if (fz) { burst(fz.x, fz.y, 55, 17, '#ef4747', 14); burst(fz.x, fz.y, 24, 10, '#ffd166', 10); ring(fz.x, fz.y, 30, 24); }
    shake = 22; return;
  }
  if (['ko','dragon','blackflash'].includes(fzType)) {
    sfxKOBoom();
    if (fz) {
      const ink=fzType==='blackflash',dragon=fzType==='dragon';
      if(ink){
       burst(fz.x,fz.y,85,25,'#fa263d',11);
       burst(fz.x,fz.y,46,16,'#ffad96',8);
      }else{
       burst(fz.x,fz.y,90,24,dragon?'#ffe071':'#ffd166',17);
       burst(fz.x,fz.y,52,17,dragon?'#ff8c26':'#ef4747',13);
       burst(fz.x,fz.y,34,13,'#ffffff',10);
       ring(fz.x,fz.y,30,26);ring(fz.x,fz.y,18,20);
      }
    }
    shake = 28;
    return;
  }
  if (pending) {
    const a = pending.att;
    a.d += armorCut(a, pending.dm);
    const kb = (pending.kb0 + a.d * 0.07) * weightFactor(a);
    a.vx = pending.dir * kb; a.vy = -kb * 0.55 - 3;
    a.kb = Math.floor(12 + kb * 1.8);
    a.f = -pending.dir; a.g = false;
    flash[a.id] = 8;
    pending = null;
  }
  sfxCounterBoom();
  if (fz) {
    burst(fz.x, fz.y, 50, 16, '#ffd166', 14);
    burst(fz.x, fz.y, 25, 12, '#ffffff', 10);
    ring(fz.x, fz.y, 24, 22);
  }
  shake = 20;
}

