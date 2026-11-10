// ========================================================
// ② 基本設定（数字で調整できます）
// ========================================================
const W = 800, WH = 450, H = 450;
const GRAV = 0.6, DEFAULT_STOCK = 3, MAX_STOCK = 5, MAX_PLAYERS = 8;
const CH_TH = 12, CH_FULL = 50, CH_WARN = 70, CH_OVER = 100, STUN_T = 80;
const CT_ON = 3, CT_OFF = 20, CT_END = 46, CT_COOL = 90;
const DG_T = 18, DG_INV0 = 2, DG_INV1 = 14, DG_COOL = 40, DG_SPD = 9;
const FREEZE = 28, FREEZE_KO = 36;
const INTERP = 95, SEND_MS = 50;            // 20Hz：最新状態を優先して送信。通信遅延を溜めない
const FIXED_MS = 1000 / 60, MAX_SIM_STEPS = 5; // 端末FPSに左右されない60Hz固定更新
// 波動拳は同時発射数の制限なし
const RAGE_MAX = 100, RAGE_T = 600, RAGE_FREEZE = 44; // ヤンキー：10秒覚醒＋変身演出
const RAGE_PASSIVE_FILL = RAGE_MAX / (65 * 60), RAGE_HIT_GAIN = 1.55; // 放置なら約65秒、被弾なら一気に溜まる
const RAGE_DMG = 1.85, RAGE_KB = 1.75, RAGE_SPD = 1.22, RAGE_JUMP = 1.10, RAGE_WT = 0.78;
const RAGE_PUNCH_MIN_KB = 16.5;                 // 怒り中の通常パンチは撃墜択になる
const SENKU_MAX = 100, SENKU_FILL = 100 / (18 * 60), SENKU_WIND = 42; // 旧予告演出との互換用。新しい旋空は待機なしでSENKU_STOPへ移行
const LANCE_CHARGE_MAX = 60;                    // 最大まで溜めたら自動で突撃
const GUN_MAX = 6, GUN_RELOAD = 108, GUN_COOLDOWN = 36;             // リボルバー：6発、射撃間隔0.6秒、装填1.8秒
const SWORD_DUR = 5;                            // 拾った剣の耐久（振るたび1、溜めは2消費）
const GEAR_FILL = 100 / (9 * 60), GEAR5_T = 900, GEAR_TIRED = 180, GEAR_FREEZE = 40;
const ANIME_FORM_FREEZE = 42; // ルフィのギアチェンジと同じ全員停止カットイン
const JOTARO_TIMESTOP_CUTIN_FREEZE = 48; // 時止めの3.5秒とは別枠の0.8秒カットイン
const GEAR_NAME = ['', 'BASE', 'GEAR 2', 'GEAR 3', 'GEAR 4', 'GEAR 5'];
const GEAR_JP = ['', '通常', 'ギア2', 'ギア3', 'ギア4', 'ギア5'];
const GEAR_COL = ['', '#ffd55e', '#ff5549', '#ff8a5b', '#7b4b9f', '#ffffff'];
function gearStat(p) {
  const g = p && p.cid === 'rubber' ? (p.gear || 1) : 1;
  return { spd: [1,1,1.32,0.92,1.12,1.38][g], jump: [1,1,1.05,0.95,1.3,1.32][g], jumps: [2,2,2,2,4,4][g],
    dm: [1,1.15,1.4,1.85,1.45,1.95][g], kb: [1,1.1,1.25,1.55,1.35,1.65][g], reach: [0,0,0,24,10,34][g],
    fist: [7,7,8,22,11,24][g], wt: [1,1,1,0.9,0.72,0.68][g] };
}
function jumpsOf(p) { return p.cid === 'rubber' ? gearStat(p).jumps : CC(p.cid).jumps; }
function decorateRubber(mv, p) {
  if (!mv || p.cid !== 'rubber' || p.w) return mv;
  const gs = gearStat(p), big = p.gear === 3 || p.gear === 5;
  if (mv.kind === 'normal') mv.reach += 38;
  if (mv.kind === 'charge') mv.reach += 62;
  if (['normal', 'charge', 'rpistol', 'rflurry', 'rtwin'].includes(mv.kind)) { mv.reach += gs.reach; mv.R += big ? 14 : 0; mv.line = 1; }
  mv.rubber = 1; return mv;
}
function gainGear(p, n) {
  if (!p || p.cid !== 'rubber' || !isLocal(p) || p.gear >= 5 || p.tired > 0 || p.gearM >= 100) return;
  p.gearM = Math.min(100, p.gearM + n);
  if (p.gearM >= 100) { popups.push({ x: p.x, y: p.y - 112, txt: 'GEAR READY! ↓特殊', life: 55, max: 55, size: 20, c: GEAR_COL[Math.min(5, p.gear + 1)] }); sfxKOReady(); }
}
function sfxRubber() { tone(220, 760, 0.13, 0.11, 'sine'); tone(760, 330, 0.09, 0.06, 'triangle', 0.1); }
function sfxGear(lv) {
 // Original synthesized audio, bounded to this transformation's 40-frame duration.
 noiseHit(.13,.16,2200,true);tone(80,38,.24,.24,'sine');
 if(lv===5){for(const d of [0,.13,.34,.46]){tone(105,42,.14,.23,'sine',d);noiseHit(.045,.08,800,false,d);}tone(510,760,.24,.055,'triangle',.25);}
 else if(lv===4){tone(65,32,.42,.27,'sine',.16);noiseHit(.2,.25,1250,false,.16);tone(330,90,.14,.07,'sawtooth',.17);}
 else {noiseHit(.28,.17,lv===2?5500:1000,lv===2,.12);tone(lv===2?170:90,lv===2?450:35,.25,.13,'triangle',.13);}
}
function rubberSpecial(p) {
  if (p.tired > 0 || p.spc > 0) { if (!p.cpu) sfxNo(); return; }
  const gs = gearStat(p), C = CC(p.cid);
  if (p.gear === 2 || p.gear === 5) {
    p.mv = decorateRubber({ ...mkMv('rflurry'), dm: 3.6 * gs.dm * C.pow, k0: 3 * gs.kb, ks: 0.03, up: 0.35 }, p); p.spc = 34;
    popups.push({x:p.x,y:p.y-105,txt:p.gear===5?'白い銃乱打 / DAWN GATLING':'JET GATLING!',life:34,max:34,size:18,c:p.gear===5?'#ffffff':'#ff9b4a'});
  } else {
    const big = p.gear === 3 || p.gear === 5;
    p.mv = decorateRubber({ ...mkMv('rpistol'), type: big ? 'heavy' : 'normal', dm: 10 * gs.dm * C.pow, k0: 8 * gs.kb, ks: 0.08, up: 0.5 }, p); p.spc = big ? 30 : 20;
    popups.push({x:p.x,y:p.y-105,txt:p.gear===3?'巨人の銃 / GIGANT PISTOL':p.gear===4?'猿王銃 / KONG GUN':'ゴムゴムの銃！',life:34,max:34,size:18,c:p.gear===3?'#ff5d5d':'#ffd55e'});
  }
  p.a = 1; p.hit = {}; sfxRubber();
}
function rubberSide(p, dir) {
  if (p.tired > 0 || p.spc > 0) { if (!p.cpu) sfxNo(); return; }
  const gs = gearStat(p);
  p.f = dir; p.vx *= 0.3;
  p.mv = decorateRubber({ ...mkMv('rtwin'), dm: 15 * gs.dm, k0: 13 * gs.kb, ks: 0.11, up: 0.55 }, p);
  p.a = 1; p.hit = {}; p.spc = 48; popups.push({x:p.x,y:p.y-108,txt:p.gear===4?'獅子・バズーカ！':p.gear===5?'白いバズーカ！':'ゴムゴムのバズーカ！',life:38,max:38,size:18,c:'#ffd55e'}); sfxWindup();
}
function gearShift(p) {
  if (p.tired > 0 || p.gear >= 5 || p.gearM < 100) { if (!p.cpu) sfxNo(); return; }
  doGearShift({ k: 'gear', id: p.id, lv: p.gear + 1, x: Math.round(p.x), y: Math.round(p.y - 30) });
}
function doGearShift(e) {
  if (online && !cinDispatching) { requestCinematic('gear', e); return; }
  const p = byId(e.id); if (!p) return;
  if (isLocal(p)) { p.gear = e.lv; p.gearM = 0; clearActs(p); p.inv = Math.max(p.inv, GEAR_FREEZE + 10); if (e.lv === 5) p.gearT = GEAR5_T; }
  else p.gear = e.lv;
  freezeT = GEAR_FREEZE; freezeMax = GEAR_FREEZE; fzType = 'gear';
  fz = { x: e.x, y: e.y, att: e.id, cnt: e.id, lv: e.lv };
  shake = 8; sfxGear(e.lv);
}
// ルフィ同等の変身専用シネマティック。状態変更はアニメキャラ側で既に確定している。
function animeFormShift(e){
 if(online&&!cinDispatching){requestCinematic('animeform',e);return;}
 const p=byId(e.id);if(!p)return;
 freezeT=ANIME_FORM_FREEZE;freezeMax=ANIME_FORM_FREEZE;fzType='animeform';
 fz={x:e.x,y:e.y,att:e.id,cnt:e.id,cid:e.cid,form:e.form,title:e.title};
 shake=Math.max(shake,e.cid==='goku'&&e.form===3?15:9);
}

function animeFormPalette(cid,form){
 if(cid==='tanjiro')return {main:'#ff653b',hot:'#ffe5a6',shadow:'#401b20',tag:'ヒノカミ神楽',sub:'燃え上がる剣技  /  日の呼吸'};
 if(cid==='naruto')return form===2
  ?{main:'#ffc548',hot:'#fff8bb',shadow:'#462a16',tag:'NINE-TAILS CHAKRA',sub:'九尾チャクラモード'}
  :{main:'#f6a54f',hot:'#fff0ce',shadow:'#40301c',tag:'SAGE MODE',sub:'仙人モード'};
 return form===3
  ?{main:'#fff1a0',hot:'#ffffff',shadow:'#40352b',tag:'SUPER SAIYAN 3',sub:'超サイヤ人3  /  限界突破'}
  :form===2
  ?{main:'#f6d248',hot:'#dcfaff',shadow:'#393127',tag:'SUPER SAIYAN 2',sub:'超サイヤ人2  /  稲妻の覚醒'}
  :{main:'#f6c957',hot:'#fff3bb',shadow:'#3b3024',tag:'SUPER SAIYAN',sub:'超サイヤ人  /  覚醒'};
}

function rubberTick(p) {
  if (p.cid !== 'rubber') return;
  if (p.tired > 0) { p.tired--; return; }
  if (p.gear < 5) gainGear(p, GEAR_FILL);
  if (p.gearT > 0 && --p.gearT === 0) {
    p.gear = 1; p.gearM = 0; p.tired = GEAR_TIRED; clearActs(p);
    popups.push({ x: p.x, y: p.y - 110, txt: 'ギア5終了…', life: 60, max: 60, size: 22, c: '#b8c2cc' }); sfxStun();
  }
}
const COLORS = ['#e63946', '#1f8ef1', '#f4a261', '#2a9d8f', '#9b5de5', '#ef476f', '#06d6a0', '#ff9f1c'];

const CHARS = {
  karate: { name: '格闘家', en: 'KARATE', mark: '空', spd: 1.0, jump: 1.0, jumps: 2, wt: 1.0, pow: 1.0, size: 1.0,
            ctx: 14, back: true, ctc: 1.0, dgc: 1.0, dgs: 1.0, st: [3, 3, 3],
            sp: '波動拳：遅い気弾を好きなだけ連続で撃てる', up: '昇龍拳：炎をまとって高く飛び上がる強力なアッパー',
            ab: 'カウンターの受付が長く、背後からの攻撃も返せる' },
  bomber: { name: '爆弾魔', en: 'BOMBER', mark: '爆', spd: 0.95, jump: 1.0, jumps: 2, wt: 1.05, pow: 0.9, size: 1.0,
            ctx: 0, back: false, ctc: 1.0, dgc: 1.0, dgs: 1.0, st: [3, 2, 3],
            sp: '爆弾投げ：まっすぐ飛び、当たると即爆発。投げた後の待ち時間は0.5秒', up: '爆風ジャンプ：足元を爆破して大ジャンプ。周りも吹っ飛ぶ',
            ab: '特殊を長押しで地雷を設置。自分の爆発は半減' },
  ninja:  { name: '忍者', en: 'NINJA', mark: '忍', spd: 1.3, jump: 1.08, jumps: 3, wt: 1.25, pow: 0.9, size: 0.9,
            ctx: 0, back: false, ctc: 1.0, dgc: 0.6, dgs: 1.2, st: [5, 2, 1],
            sp: '手裏剣：速いけど射程は短め。連続OK', up: '変わり身：煙と共に上へワープ（一瞬無敵）',
            ab: '3段ジャンプ。足がとても速い。でも軽い' },
  sumo:   { name: '力士', en: 'SUMO', mark: '力', spd: 0.78, jump: 0.88, jumps: 2, wt: 0.65, pow: 1.2, size: 1.22,
            ctx: 0, back: false, ctc: 1.0, dgc: 1.2, dgs: 0.85, st: [1, 5, 5],
            sp: '張り手：溜め攻撃級の一撃をすぐ出せる（クールタイム約2.5秒）', up: 'どすこいジャンプ：アーマー付きで飛び上がる復帰技（攻撃判定なし）',
            ab: '動きは遅いが、とても吹っ飛びにくい' },
  boxer:  { name: 'ボクサー', en: 'BOXER', mark: '拳', spd: 1.15, jump: 0.95, jumps: 2, wt: 1.0, pow: 1.18, size: 1.0,
            ctx: 0, back: false, ctc: 0.35, dgc: 0.9, dgs: 1.0, st: [4, 5, 3],
            sp: 'KOアッパー：ゲージ満タンで放つゲーム最強の一撃。カウンターも貫通', up: 'ジャンピングアッパー：上昇しながらパンチ',
            ab: '通常パンチは約12.4ダメージ。KOゲージMAXで必殺の一撃。カウンターの待ち時間が短い' },
  yankee: { name: 'ヤンキー', en: 'YANKEE', mark: '怒', spd: 1.0, jump: 1.0, jumps: 2, wt: 0.72, pow: 1.08, size: 1.03,
            ctx: 0, back: false, ctc: 1.0, dgc: 1.0, dgs: 1.0, st: [3, 4, 4],
            sp: '怒り：時間でもゆっくり、被弾で一気に蓄積。MAX時に特殊で10秒間の超強化へ変身', up: '根性ジャンプ：大ジャンプする復帰技。攻撃判定なし',
            ab: '通常時も吹っ飛びにくく、移動は標準、通常パンチは約9.2ダメージ。怒り中は超高火力・高機動・さらにタフ。飛び道具・爆弾の爆発で怯まない（ダメージは受ける）' },
  swordsman: { name: '剣士', en: 'SWORDSMAN', mark: '剣', spd: 1.00, jump: 1.0, jumps: 2, wt: 0.96, pow: 1.14, size: 1.0,
            ctx: 0, back: false, ctc: 1.0, dgc: 1.0, dgs: 1.0, st: [3, 4, 4],
            sp: '旋空：ゲージMAXで即時発動。時を止め、前方の敵をガード・アーマーごと一閃する', up: '斬り上げ：上昇しながら頭上を斬る',
            ab: '通常攻撃が剣。拳より長いリーチと少し高い火力を持つ' },
  lancer: { name: '槍使い', en: 'LANCER', mark: '槍', spd: 0.92, jump: 0.96, jumps: 2, wt: 0.92, pow: 1.02, size: 1.0,
            ctx: 0, back: false, ctc: 1.0, dgc: 1.05, dgs: 0.98, st: [2, 4, 5],
            sp: '突撃：特殊を長押しして溜め、離すと槍を構えて長距離を突進。突進中はアーマー。溜めるほど遠く強く', up: '昇槍：槍を突き上げて高く飛び上がる復帰技。頭上を攻撃',
            ab: '通常・溜め攻撃のリーチが非常に長い。突撃は最大チャージで自動発動する' },
  gunman: { name: 'ガンマン', en: 'GUNMAN', mark: '銃', spd: 1.02, jump: 1.0, jumps: 2, wt: 1.03, pow: 0.96, size: 1.0,
            ctx: 0, back: false, ctc: 1.0, dgc: 0.95, dgs: 1.0, st: [3, 4, 5],
            sp: 'リボルバー：6発装填・1発19ダメージ。射撃間隔0.6秒。空で自動、長押しで装填（1.8秒）', up: 'ガンジャンプ：足元へ撃ち込んだ爆風で大ジャンプ。周りも吹っ飛ぶ（弾は消費しない）',
            ab: '弾数管理型の遠距離キャラ。リロードの隙をどう作るかが重要' },
  archer: {name:'弓使い',en:'ARCHER',mark:'弓',spd:1.12,jump:1.05,jumps:2,wt:0.95,pow:1.0,size:1.0,
    ctx:0,back:false,ctc:0.8,dgc:0.85,dgs:1.1,st:[4,4,3],
    sp:'弓射ち：短押しで高速の貫通矢（20ダメージ）。0.45秒以上引いて離すと、扇状に5本の貫通矢（1本14）',
    up:'天射ち：真上へ3本の矢を放つ。上昇しない',ab:'矢はすべて敵を貫通。弓を引きながらでも素早く動ける'},
  rubber: {name:'ルフィ',en:'LUFFY',mark:'麦',spd:1.05,jump:1.0,jumps:2,wt:0.95,pow:1.0,size:1.0,
    ctx:0,back:false,ctc:1,dgc:1,dgs:1.05,st:[3,3,3],
    sp:'ゴムゴムの銃：腕を伸ばして遠くを殴る。横＋特殊は両腕を引き絞って放つ「ゴムゴムのバズーカ」',
    up:'ゴムゴムのロケット：ゴムの反動で超大ジャンプ。頭上に攻撃判定',
    ab:'下＋特殊でギアチェンジ（ゲージMAX時）。ギア2→ギア3→ギア4→ギア5と段階的に強化。ギア5は15秒の超強化'},
  berserker: {name:'狂戦士',en:'BERSERKER',mark:'斧',spd:0.66,jump:0.85,jumps:2,wt:0.58,pow:1.35,size:1.16,
    ctx:0,back:false,ctc:1.2,dgc:1.35,dgs:0.8,st:[1,5,5],
    sp:'断頭斬：巨大斧の一撃で48ダメージと超強力な吹っ飛ばし。カウンターで返されない。クールタイムなし（振りは遅く後隙大）',
    up:'天断ち：その場で頭上を薙ぎ払う。42ダメージ。上昇しない',ab:'非常に遅いが、とても吹っ飛びにくい。重い鎧で受けるダメージが半分。特殊はカウンター無効でクールタイムなし'}
};
// SECRET ROSTER — owner-authoritative combat, cosmetic events never stop the global simulation.
const ANIME_IDS=['goku','gojo','tanjiro','naruto','jotaro'];
const SECRET_IDS=['rubber',...ANIME_IDS];
const SPECIAL_IDS=SECRET_IDS;

const ANIME_COLORS={rubber:'#e8bb66',goku:'#ffb445',gojo:'#a48cff',tanjiro:'#5cdbc1',naruto:'#ffb558',jotaro:'#8b69c7'};
const ANIME_COMMON={ctx:0,back:false,ctc:1,dgc:1,dgs:1,jumps:2,size:1};
Object.assign(CHARS,{
 goku:{...ANIME_COMMON,name:'孫悟空',en:'SON GOKU',mark:'悟',spd:1.08,jump:1.05,wt:.94,pow:1.14,st:[4,4,3],sp:'特殊：気弾。長押しして離すとかめはめ波（移動しながらチャージ可能）。下特殊：気を溜め、MAXでもう一度押すと超サイヤ人→2→3',up:'通常～超2は攻撃判定なしの大ジャンプ。超3のみ龍拳',ab:'SS1は総合強化。SS2は火力特化＋溜め攻撃貫通。SS3は15秒限定の完全無敵・超火力ボス性能。横特殊は足場から落ちない瞬間移動。気弾には吹っ飛ばしなし'},
 gojo:{...ANIME_COMMON,name:'五条悟',en:'SATORU GOJO',mark:'無',spd:1.04,jump:1.05,wt:.98,pow:1.05,st:[3,5,3],sp:'特殊：即離し＝蒼／少し溜め＝赫／長押し＝茈。横特殊は踏み込み強打で約1/6の確率で黒閃',up:'上特殊：攻撃判定のない大ジャンプ。下特殊：術式ゲージMAXで領域展開「無量空処」',ab:'無下限により飛び道具を常時無効。横特殊は踏み込み打撃、稀に黒閃。無量空処は範囲内の敵を行動不能にするが、被弾・吹っ飛び・撃墜は通常どおり発生'},
 tanjiro:{...ANIME_COMMON,name:'竈門炭治郎',en:'TANJIRO',mark:'水',spd:1.08,jump:1.02,wt:1.25,pow:1.12,st:[4,4,1],sp:'通常攻撃は日輪刀。特殊＝壱ノ型 水面斬り／横特殊＝参ノ型 流流舞い／上特殊＝弐ノ型 水車',up:'下特殊で呼吸ゲージMAX時にヒノカミ神楽へ。神楽中：特殊＝碧羅の天、横＝烈日紅鏡、上＝飛輪陽炎、下＝幻日虹',ab:'水の呼吸は高火力の剣技。ヒノカミ神楽は18秒、火力と吹っ飛ばしが大幅強化。幻日虹は残像を残して攻撃を回避'},
 naruto:{...ANIME_COMMON,name:'うずまきナルト',en:'NARUTO',mark:'忍',spd:1.13,jump:1.08,wt:.96,pow:1.05,st:[5,3,3],sp:'特殊短押し＝螺旋手裏剣、長押し約0.5秒で即影分身（チャクラ60消費・同時最大2体・被弾で消滅）。横特殊＝螺旋丸、下特殊＝チャクラ解放・2段変身',up:'上特殊：一瞬で上へ移動する高速瞬身（攻撃判定なし）',ab:'チャクラは時間経過で蓄積。特殊長押しでチャクラを60消費し、最強級AIの影分身を即召喚（離す必要なし）。分身は敵の一撃で煙になり消える。MAXで仙人モード→九尾チャクラモード'},
 jotaro:{...ANIME_COMMON,name:'空条承太郎',en:'JOTARO KUJO',mark:'星',spd:1.02,jump:1.02,wt:.90,pow:1.13,st:[4,4,4],sp:'特殊＝スタープラチナのオラオララッシュ。横特殊＝スターフィンガー',up:'上特殊：スタープラチナと共に大ジャンプ（攻撃判定なし）。下特殊：ゲージMAXで時を止める',ab:'時止め中は時間経過・攻撃ヒットのどちらでもゲージが増えない。承太郎だけが行動でき、止まった相手へのダメージと吹っ飛ばしは時が動き出した瞬間に反映される'}

});

const STANDARD_IDS=Object.keys(CHARS).filter(id=>!SPECIAL_IDS.includes(id));
const CPU_POOL_LABEL={normal:'通常キャラ',special:'スペシャルキャラ',all:'全キャラ'};
function cpuCharacterPool(mode='all'){
  if(mode==='normal') return STANDARD_IDS.slice();
  if(mode==='special') return SPECIAL_IDS.filter(id=>CHARS[id]);
  return Object.keys(CHARS);
}
function cpuPoolIndex(mode){return mode==='normal'?0:mode==='special'?1:2;}
function cpuPoolFromIndex(i){return i===0?'normal':i===1?'special':'all';}

const ANIME_MOVES={
 gupper:{type:'normal',act0:3,act1:13,end:24,reach:8,R:27,yo:60,cd:8},
 gdragon:{type:'heavy',act0:3,act1:21,end:37,reach:68,R:88,yo:66,cd:18,glow:14},
 gojopunch:{type:'heavy',act0:5,act1:12,end:29,reach:55,R:35,yo:35,cd:12,glow:4},
 gblackflash:{type:'heavy',act0:6,act1:13,end:36,reach:70,R:54,yo:35,cd:22,glow:14},
 tazure:{type:'heavy',act0:6,act1:12,end:23,reach:52,R:34,yo:40,cd:8},
 tredmirror:{type:'heavy',act0:6,act1:18,end:35,reach:88,R:32,yo:36,cd:12,line:1,multi:7},
 tflame:{type:'heavy',act0:3,act1:16,end:29,reach:20,R:42,yo:63,cd:10},
 tcut1:{type:'normal',act0:4,act1:8,end:17,reach:43,R:24,yo:34,cd:2},
 tcut2:{type:'normal',act0:4,act1:9,end:18,reach:48,R:25,yo:33,cd:2},
 twheel:{type:'normal',act0:5,act1:13,end:25,reach:29,R:38,yo:42,cd:6},
 tflow:{type:'normal',act0:7,act1:13,end:27,reach:100,R:22,yo:34,cd:8,line:1},
 ttide:{type:'normal',act0:6,act1:22,end:34,reach:66,R:30,yo:34,cd:8,multi:8},
 trise:{type:'normal',act0:3,act1:13,end:25,reach:7,R:32,yo:62,cd:8},
 rasengan:{type:'heavy',act0:7,act1:21,end:36,reach:43,R:28,yo:34,cd:10,lunge:13,rush:true},
 nkick:{type:'normal',act0:2,act1:10,end:22,reach:7,R:23,yo:51,cd:8},
 purplecast:{type:'heavy',act0:32,act1:33,end:51,reach:0,R:0,yo:34,cd:15,noHit:true},
 beamcast:{type:'normal',act0:1,act1:18,end:31,reach:0,R:0,yo:34,cd:12,noHit:true},
 ora:{type:'normal',act0:3,act1:31,end:45,reach:62,R:27,yo:38,cd:9,multi:4},
 starfinger:{type:'heavy',act0:7,act1:12,end:27,reach:188,R:18,yo:38,cd:10,line:1}
};
let animeFx=[],animeClock=0;
function isAnime(p){return !!p&&ANIME_IDS.includes(p.cid);}
function animeInit(p){Object.assign(p,{energy:0,form:0,modeT:0,fatigue:0,infinityCd:0,domainT:0,slowT:0,combo:0,comboT:0,waterForm:0,cloneT:0,echoQueue:[],castFired:false,boostFlash:0,orbColor:'blue',castStyle:'',teleportCd:0,projectileSlipT:0,timeStopT:0,timeStopSelfT:0});}
function animeTimeStopActive(){
 return animeFx.some(e=>e.kind==='timestop'&&e.life>0)||
        fighters.some(f=>f&&!f.out&&((f.timeStopSelfT||0)>0||(f.timeStopT||0)>0));
}
function animeGain(p,n){
 if(!isAnime(p)||!isLocal(p)||p.out||p.fatigue>0||
    (p.cid==='goku'&&p.form===3)||(p.cid==='naruto')||
    (p.cid==='jotaro'&&animeTimeStopActive()))return;
 p.energy=Math.min(100,(p.energy||0)+n);
}
function animeStats(p){
 if(p.cid==='goku'){
  const g=p.form||0;
  return{
   spd:[1,1.18,1.30,1.58][g],
   dm:[1,1.48,2.08,2.82][g],
   kb:[1,1.30,1.62,2.28][g]
  };
 }
 if(p.cid==='tanjiro'&&p.modeT>0)return{spd:1.24,dm:2.02,kb:1.69};
 if(p.cid==='naruto'){const f=p.form||0;return{spd:[1,1.20,1.36][f],dm:[1,1.18,1.42][f],kb:[1,1.12,1.30][f]};}
 return{spd:p.fatigue>0?.62:1,dm:1,kb:1};
}
function animeSlow(p){return p.slowT>0?.38:1;}
function animeLocked(p){return isAnime(p)&&((p.cid==='goku'&&p.castStyle==='beamcast'&&p.a>0)||p.mv?.kind==='purplecast');}
function animeNotice(p,txt,col=ANIME_COLORS[p.cid],size=18,life=46){popups.push({x:p.x,y:p.y-115,txt,life,max:life,size,c:col});}
function animeVoice(){ /* 音声合成は使用しない */ }
function animeCall(p,txt,col=ANIME_COLORS[p.cid],voice=false,rate=1.35,pitch=.9){animeNotice(p,txt,col,18,42);}
function animeSound(kind){
 if(kind==='charge'){tone(180,650,.18,.045,'triangle');return;}
 if(kind==='water'){noiseHit(.14,.17,3300,true);tone(620,230,.14,.07,'triangle');return;}
 if(kind==='clone'){noiseHit(.11,.18,1300);return;}
 if(kind==='infinity'){tone(1400,2100,.12,.055,'sine');noiseHit(.045,.1,5300,true);return;}
 if(kind==='blue'){tone(620,90,.36,.13,'sine');noiseHit(.18,.15,1200);return;}
 if(kind==='red'){tone(150,36,.24,.28,'sine');noiseHit(.13,.3,2000);return;}
 if(kind==='domain'){tone(75,45,.6,.24,'sine');tone(880,878,.65,.07,'sine');noiseHit(.35,.13,800);return;}
 if(kind==='ora'){noiseHit(.08,.17,2800,true);tone(185,105,.09,.10,'square');tone(125,82,.08,.08,'sawtooth',.055);return;}
 if(kind==='orafinish'){noiseHit(.22,.31,950,true);tone(105,42,.24,.28,'sawtooth');tone(360,82,.12,.10,'square',.02);shake=Math.max(shake,10);return;}
 if(kind==='starfinger'){tone(260,760,.12,.08,'sawtooth');noiseHit(.08,.17,2200,true);return;}
 if(kind==='timestop'){
  // Original layered stop cue: abrupt metallic sweep + sub drop + vacuum pulse.
  noiseHit(.075,.34,5200,true);tone(1550,125,.16,.11,'sawtooth');tone(86,31,.72,.34,'sine',.035);tone(44,38,1.05,.24,'sine',.15);
  tone(760,290,.11,.065,'square',.09);tone(340,112,.19,.08,'triangle',.22);return;
 }
 if(kind==='timego'){tone(120,820,.16,.12,'sawtooth');noiseHit(.065,.12,3600,true,.04);return;}
 if(kind==='blackflash'){tone(72,28,.4,.38,'sawtooth');tone(480,90,.18,.12,'square',.06);noiseHit(.32,.33,1000);shake=Math.max(shake,20);return;}
 if(kind==='gojopunch'){tone(185,65,.18,.17,'sawtooth');noiseHit(.12,.22,1800);return;}
 if(kind==='dragon'){tone(110,950,.48,.24,'sawtooth');noiseHit(.48,.32,1700);shake=Math.max(shake,17);return;}
 if(kind==='beam'||kind==='purple'){noiseHit(.4,.24,1800);tone(140,36,.42,.25,'sine');tone(780,190,.28,.09,'sawtooth');return;}
 tone(90,32,.3,.23,'sine');noiseHit(.17,.23,1500);tone(320,640,.22,.055,'triangle');
}
function animeVisual(e){
 if(animeFx.length>=80)animeFx.shift();
 animeFx.push({...e,life:e.life||36,max:e.life||36});
 if(e.kind==='transform'){
  const c=e.cid==='tanjiro'?'#ff653b':e.cid==='naruto'?(e.form===2?'#ffd84f':'#ff9b42'):'#ffdd65';
  const n=e.cid==='goku'&&e.form===3?34:22;
  burst(e.x,e.y+4,n,e.cid==='goku'&&e.form===3?9:6,c,7);
  ring(e.x,e.y,15,e.cid==='goku'&&e.form===3?24:18);
  shake=Math.max(shake,e.cid==='goku'&&e.form===3?16:10);
 }
 if(e.cid==='goku'&&e.kind==='transform')playGokuMp3('transform',{dedupe:220,volume:.92});
 if(e.cid==='goku'&&e.kind==='instant'&&e.phase==='out')playGokuMp3('teleport',{dedupe:180,volume:.92});
 const gokuMp3Fx=e.cid==='goku'&&(e.kind==='transform'||e.kind==='instant');
 const localJotaroMp3Fx=e.cid==='jotaro'&&e.kind==='timestop'&&e.id===myId;
 if(e.kind!=='echo'&&e.kind!=='impact'&&!gokuMp3Fx&&!localJotaroMp3Fx)animeSound(e.kind);
}
function animeEmit(p,kind,data={}){
 const e={k:'animefx',id:p.id,kind,x:Math.round(p.x),y:Math.round(p.y-34),f:p.f,cid:p.cid,form:p.form||0,boost:p.modeT>0,...data};
 animeVisual(e);send(e);
 // ルフィのギアチェンジと同じ「世界停止→キャラ中心の演出→解除」の流れ。
 if(kind==='transform'&&['goku','naruto','tanjiro'].includes(p.cid))
   animeFormShift({id:p.id,cid:p.cid,form:p.form||0,x:e.x,y:e.y,title:e.title||'TRANSFORM'});
}
function animeMove(p,kind,dm,kb,extra={}){const s=animeStats(p);p.mv={...mkMv(kind),dm:dm*s.dm,k0:kb*s.kb,ks:.075,up:.6,...extra};p.a=1;p.hit={};p.sph=0;p.castFired=false;}
function animeBasic(p,ch){return false;} // 隠しキャラも通常攻撃／溜め攻撃は共通。個性は火力・武器描画・形態補正で付ける。
function animeDecorate(p,mv){
 if(!isAnime(p)||p.w||!mv)return;
 const s=animeStats(p);mv.dm*=s.dm;mv.k0*=s.kb;mv.ks*=s.kb;
 if(p.cid==='goku'){
   if(p.form===1&&mv.kind==='charge'){mv.k0*=1.08;mv.ks*=1.05;}
   if(p.form===2){
     if(mv.kind==='normal'){mv.dm*=1.12;mv.k0*=1.08;}
     if(mv.kind==='charge'){
       mv.pierce=true;mv.dm*=1.25;mv.k0*=1.20;mv.ks*=1.15;
       mv.minKb=Math.max(mv.minKb||0,16);
     }
   }
   if(p.form===3){
     mv.pierce=true;
     if(mv.kind==='normal'){
       mv.dm*=1.20;mv.minKb=20;mv.k0=Math.max(mv.k0,18);mv.ks=Math.max(mv.ks,.125);
     }
     if(mv.kind==='charge'){
       mv.dm*=1.24;mv.minKb=28;mv.k0=Math.max(mv.k0,24);mv.ks=Math.max(mv.ks,.15);
     }
   }
 }
 if(p.cid==='tanjiro'){mv.reach+=22;mv.R+=6;mv.charSword=true;mv.dm*=1.13;}
 if(p.cid==='naruto'&&p.form>0){mv.reach+=p.form===2?26:13;mv.R+=p.form===2?7:3;}
}
// Special button interpretation: neutral / side / up / down are distinct commands.
function animeStart(p,inp,up=false){
 if(p.spc>0||p.fatigue>0){if(!p.cpu)sfxNo();return;}
 const side=inp.sideSpecial||(!inp.neutralSpecial?((inp.r?1:0)-(inp.l?1:0)):0);
 if(up||(!inp.neutralSpecial&&inp.u)){animeUp(p);return;}
 if(inp.gd||(!inp.neutralSpecial&&inp.d)){animeDown(p);return;}
 if(side){animeSide(p,side);return;}
 if(p.cid==='goku'){p.castStyle='ki';p.sph=1;animeSound('charge');}
 else if(p.cid==='gojo'){p.castStyle='orb';p.sph=1;p.orbColor='blue';animeSound('charge');}
 else if(p.cid==='tanjiro'){animeTanjiroMove(p,false);}
 else if(p.cid==='naruto'){p.castStyle='shadow-charge';p.sph=1;}
 else if(p.cid==='jotaro'){animeOra(p);}
}
function animeDown(p){
 if(p.cid==='goku'){
  if(p.form>=3){sfxNo();return;}
  if(p.energy>=100){
   p.form++;p.energy=p.form===3?100:0;p.castStyle='';clearActs(p);
   p.spc=p.form===3?44:34;p.boostFlash=p.form===3?78:58;
   p.inv=Math.max(p.inv,p.form===3?64:46);
   animeEmit(p,'transform',{title:['','SUPER SAIYAN','SUPER SAIYAN 2','SUPER SAIYAN 3'][p.form],life:p.form===3?72:p.form===2?64:58});
  }
  else{p.castStyle='charge';p.sph=1;}
 }else if(p.cid==='gojo'){
  animeDomain(p);
 }else if(p.cid==='tanjiro'){
  if(p.modeT>0){animeKaguraDodge(p);return;}
  if(p.energy>=100)animeKagura(p);else sfxNo();
 }else if(p.cid==='naruto'){
  if(p.energy<100||p.form>=2){sfxNo();return;}
  p.form++;p.energy=0;clearActs(p);p.spc=p.form===2?40:34;p.boostFlash=p.form===2?70:56;
  p.inv=Math.max(p.inv,p.form===2?56:44);
  if(p.form===2)p.modeT=900;
  const call=p.form===1?'仙人モード！':'九尾チャクラモード！';
  animeCall(p,call,'#ffcf6e',true,1.18,.95);
  animeEmit(p,'transform',{title:call,life:p.form===2?68:58});
 }else if(p.cid==='jotaro'){
  animeTimeStop(p);
 }
}
function animeSide(p,side){
 if(p.cid==='goku'){animeTeleport(p,side);return;}
 if(p.cid==='gojo'){p.f=side;animeGojoRush(p);return;}
 if(p.cid==='tanjiro'){p.f=side;animeTanjiroMove(p,true);return;}
 if(p.cid==='naruto'){p.f=side;animeRasengan(p);return;}
 if(p.cid==='jotaro'){p.f=side;animeStarFinger(p);}
}

// 五条：横特殊は踏み込み打撃。黒閃は攻撃ごとに約1/6で抽選。
// 抽選は操作権のある端末で1回だけ行い、KO属性はヒット情報として相手へ送信する。
const GOJO_BLACK_FLASH_RATE=1/6;
function animeGojoRush(p){
 if(p.spc>0)return;
 const black=Math.random()<GOJO_BLACK_FLASH_RATE;
 const kind=black?'gblackflash':'gojopunch';
 p.vx=p.f*Math.max(2.5,Math.abs(p.vx)*.35);
 animeMove(p,kind,black?56:12,black?31:9.5,
  black?{lunge:13,reach:70,R:54,yo:35,ks:.19,up:.57,ko:true,pierce:true,minKb:42}:
        {lunge:10,reach:55,R:35,yo:35,ks:.065,up:.40,pierce:false});
 p.spc=black?115:66;
 // 黒閃は命中して初めて判明する。空振りでは予兆・黒球・専用文字を一切出さない。
 animeCall(p,'踏み込み打撃','#c4ddff',true);
 animeEmit(p,'gojopunch',{life:27});
}

const JOTARO_FILL=100/(22*60),JOTARO_STOP_T=210;
function animeOra(p){
 if(p.spc>0)return;
 // Rapid hits keep knockback tiny; the last ORA is replaced by a much heavier finisher in meleeCheck.
 animeMove(p,'ora',3.0,1.0,{ks:.005,up:.15});
 p.spc=49;animeCall(p,'オラオラオラオラオラ！','#d8c0ff',true,2.05,.72);animeEmit(p,'ora',{life:43});
}
function animeStarFinger(p){
 if(p.spc>0)return;
 animeMove(p,'starfinger',13.5,10.2,{ks:.072,up:.40,pierce:false});
 p.spc=42;animeCall(p,'スターフィンガー！','#d8c0ff',true,1.25,.78);animeEmit(p,'starfinger',{life:31});
}
function animeTimeStop(p){
 if(p.energy<100||p.timeStopSelfT>0){sfxNo();return;}
 p.energy=0;p.spc=24;p.timeStopSelfT=JOTARO_STOP_T;p.boostFlash=40;
 if(isLocal(p))playJotaroTimeStopBgm();
 animeCall(p,'スタープラチナ！ ザ・ワールド！','#efe1ff',true,1.05,.70);
 const e={k:'animearea',id:p.id,kind:'timestop',x:p.x,y:p.y-34,f:p.f,range:9999,life:JOTARO_STOP_T};
 animeArea(e);send(e);animeEmit(p,'timestop',{life:JOTARO_STOP_T});
 // ギア変身と同じ：全員停止→承太郎＋スタープラチナの専用カットイン→時が止まった世界。
 beginJotaroTimeStopCutin({id:p.id,x:Math.round(p.x),y:Math.round(p.y-38)});
}
function beginJotaroTimeStopCutin(e){
 if(online&&!cinDispatching){requestCinematic('timestop',e);return;}
 const p=byId(e.id);if(!p||p.cid!=='jotaro')return;
 freezeT=JOTARO_TIMESTOP_CUTIN_FREEZE;freezeMax=JOTARO_TIMESTOP_CUTIN_FREEZE;
 fzType='timestopcin';fz={x:e.x,y:e.y,att:e.id,cnt:e.id};
 shake=Math.max(shake,12);
}
function animeTeleport(p,side){
 if(p.teleportCd>0){sfxNo();return;}
 const startX=p.x,startY=p.y,targetX=Math.max(20,Math.min(stage.w-20,p.x+side*165));
 // 悟空の瞬間移動：煙や忍者ワープではなく、額へ指を当てる残像→一瞬で消失・再出現。
 const candidate=stage.plats.map((pl,i)=>({pl,i,px:Math.max(pl.x+24,Math.min(pl.x+pl.w-24,targetX))}))
   .filter(v=>v.pl.w>=50&&v.pl.y>=p.y-70).sort((a,b)=>Math.abs(a.px-targetX)+Math.abs(a.pl.y-p.y)*.55-(p.g&&a.i===p.groundPl?22:0)-(a.pl.y===Math.max(...stage.plats.map(x=>x.y))?8:0));
 const dest=candidate[0]||stage.plats.map((pl,i)=>({pl,i,px:Math.max(pl.x+24,Math.min(pl.x+pl.w-24,targetX))})).sort((a,b)=>Math.abs(a.px-targetX))[0];
 if(!dest){sfxNo();return;}
 animeEmit(p,'instant',{x:startX,y:startY-34,phase:'out',life:18});
 p.x=dest.px;p.y=dest.pl.y;p.vx=0;p.vy=0;p.g=true;p.groundPl=dest.i;p.dropT=0;p.dropPl=-1;p.inv=Math.max(p.inv,11);p.teleportCd=82;p.spc=27;
 animeEmit(p,'instant',{phase:'in',life:18});
 tone(900,1450,.07,.045,'sine');tone(1450,650,.08,.04,'triangle',.055);
}
const DOMAIN_STOP_T=240;
function animeDomain(p){
 if(p.energy<100){sfxNo();return;}
 p.energy=0;p.spc=285;p.sh=38;animeCall(p,'領域展開・無量空処！','#d7c8ff',true,1.05,.82);
 const e={k:'animearea',id:p.id,kind:'domain',x:p.x,y:p.y-34,f:p.f,range:270};animeArea(e);send(e);
 animeEmit(p,'domain',{title:'領域展開「無量空処」',life:DOMAIN_STOP_T});
 // 効果発動後、全員が一瞬止まる領域専用シネマティックへ移行。
 beginDomainCutin({id:p.id,x:Math.round(p.x),y:Math.round(p.y-38)});
}
const DOMAIN_CUTIN_FREEZE=65;
function beginDomainCutin(e){
 if(online&&!cinDispatching){requestCinematic('domain',e);return;}
 const p=byId(e.id);if(!p||p.cid!=='gojo')return;
 freezeT=DOMAIN_CUTIN_FREEZE;freezeMax=DOMAIN_CUTIN_FREEZE;fzType='domain';
 fz={x:e.x,y:e.y,att:e.id,cnt:e.id};shake=Math.max(shake,12);
}

function animeKagura(p){
 if(p.energy<100||p.modeT>0||p.fatigue>0)return;
 p.energy=0;p.modeT=1080;clearActs(p);p.sph=0;p.spc=36;p.boostFlash=62;
 p.inv=Math.max(p.inv,48);
 animeCall(p,'ヒノカミ神楽！','#ff9a61',true,1.22,.92);
 animeEmit(p,'transform',{title:'ヒノカミ神楽',life:64});
}
function animeKaguraDodge(p){if(p.dgc>0){sfxNo();return;}p.dg=1;p.dgd=p.f;p.inv=Math.max(p.inv,32);p.dgc=95;p.spc=29;p.vx=p.f*11;animeCall(p,'幻日虹！','#ff9a61',true,1.28,.93);animeEmit(p,'blink',{title:'幻日虹',life:30});}
function animeTanjiroMove(p,side){
 const flame=p.modeT>0;
 const kind=flame?(side?'tredmirror':'tazure'):(side?'tflow':'tcut1');
 const dm=flame?(side?13:25):(side?9:17),kb=flame?(side?11:16):(side?7:10);
 const extra=side?{lunge:flame?11:15,rush:true,multi:6}:{};
 animeMove(p,kind,dm,kb,extra);p.spc=flame?39:side?33:22;
 if(!flame&&side)p.projectileSlipT=29;
 const call=flame?(side?'烈日紅鏡！':'碧羅の天！'):(side?'参ノ型・流流舞い！':'壱ノ型・水面斬り！');
 animeCall(p,call,flame?'#ff9a61':'#8ee9ff',true,1.28,.93);
 animeEmit(p,flame?'flameslash':'water',{title:call,life:25});
}
function animeRasengan(p){animeMove(p,'rasengan',p.form===2?22:p.form===1?18:15,p.form===2?15:p.form===1?12:10,{lunge:p.form===2?16:12,R:p.form===2?36:29});p.spc=45;animeCall(p,'螺旋丸！','#8fe4ff',true,1.28,.95);animeEmit(p,'rasengan',{title:'螺旋丸',life:27});}
function animeRasenShuriken(p){
 p.spc=62;
 animeProjectile(p,'rasenshuriken',{vx:p.f*10,r:p.form===2?34:25,dm:20*animeStats(p).dm,k0:12*animeStats(p).kb,ks:.085,life:85});
 animeCall(p,'風遁・螺旋手裏剣！','#8fe4ff',true,1.2,.94);animeEmit(p,'rasenshuriken',{title:'風遁・螺旋手裏剣',life:32});
}
const GOJO_RED_HOLD=30,GOJO_PURPLE_HOLD=150;
const GOJO_CD_BLUE=80,GOJO_CD_RED=112,GOJO_CD_PURPLE=230;
function animeHold(p,inp){
 if(inp.s){p.sph=Math.min(190,p.sph+1);
  if(p.cid==='goku'&&p.castStyle==='charge')animeGain(p,100/(3*60)); // 約3秒で100。
  if(p.cid==='goku'&&p.castStyle==='ki'&&p.sph===85)animeNotice(p,'かめはめ波 MAX','#99eaff');
  if(p.cid==='naruto'&&p.castStyle==='shadow-charge'&&!p.shadowClone&&p.sph>=NARUTO_CLONE_HOLD){
   // 長押し約0.5秒で即召喚。指を離す必要はない。
   if(shadowClonesAlive(p.id).length>=NARUTO_CLONE_MAX||(p.energy||0)>=NARUTO_CLONE_COST){
    p.sph=0;p.castStyle='';shadowCloneSummon(p);return;
   }
   if(p.sph===NARUTO_CLONE_HOLD)animeNotice(p,'影分身：チャクラ60必要','#ffdf8f',17,50);
  }
  if(p.cid==='gojo'&&p.castStyle==='orb'){
   if(p.sph>=GOJO_PURPLE_HOLD){if(p.orbColor!=='purple')animeNotice(p,'茈 READY','#d7aaff');p.orbColor='purple';}
   else if(p.sph>=GOJO_RED_HOLD)p.orbColor='red';
   else p.orbColor='blue';
  }
  return;
 }
 const held=p.sph,style=p.castStyle;p.sph=0;p.castStyle='';
 if(p.cid==='goku'){
  if(style==='charge')return;
  const st=animeStats(p),charge=Math.max(0,Math.min(1,(held-28)/65));
  if(held>=28){
   animeMove(p,'beamcast',0,0);p.castStyle='beamcast';p.spc=65;
   animeProjectile(p,'kamehameha',{range:1050+(p.form||0)*75,r:22+charge*13,dm:(12+9*charge)*st.dm,k0:(9+4*charge)*st.kb,ks:.085,life:24,beam:true});
   animeCall(p,'かめはめ波！','#aeefff',true,1.24,.92);animeEmit(p,'beam',{title:'かめはめ波',life:31});
  }else{animeProjectile(p,'ki',{vx:p.f*13,r:10+(p.form||0)*2,dm:9*st.dm,k0:0,ks:0,up:0,life:65});p.sh=12;p.spc=15;animeSound('red');}
 }else if(p.cid==='naruto'&&style==='shadow-charge'){
   if(held>=NARUTO_CLONE_HOLD&&!p.shadowClone)shadowCloneSummon(p);
   else animeRasenShuriken(p);
  }else if(p.cid==='gojo'&&style==='orb'){
  const purple=held>=GOJO_PURPLE_HOLD,red=!purple&&held>=GOJO_RED_HOLD;
  const kind=purple?'purple':red?'red':'blue';
  // Purple keeps its existing power; blue/red retain the nerfed power but have longer cooldowns.
  animeProjectile(p,kind,{vx:p.f*(purple?5.1:3.25),r:purple?34:21,dm:purple?52:red?7:8,k0:purple?28:red?13:2.5,ks:purple?.14:red?.09:.018,life:purple?170:145});
  p.spc=purple?GOJO_CD_PURPLE:red?GOJO_CD_RED:GOJO_CD_BLUE;
  const call=purple?'虚式「茈」！':red?'術式反転「赫」！':'術式順転「蒼」！';animeCall(p,call,purple?'#d7aaff':red?'#ff6a78':'#74caff',true,purple?1.05:1.25,.86);
  animeEmit(p,kind,{title:call,life:34});
 }
}
function animeUp(p){
 if(p.rec){sfxNo();return;}
 p.rec=true;p.g=false;p.jn=jumpsOf(p);p.rise=22;
 if(p.cid==='goku'){
  if(p.form===3){p.vx=p.f*9;p.vy=-23;animeMove(p,'gdragon',52,31,{up:1.55,ko:true,pierce:true,R:88,reach:68,minKb:40,ks:.19});p.spc=123;animeCall(p,'龍拳！！','#ffe08c',true,1.2,.88);animeEmit(p,'dragon',{title:'龍拳',life:28});}
  else{p.vy=-19.3;p.spc=31;animeEmit(p,'rise',{life:22});}
 }else if(p.cid==='gojo'){p.vy=-19.5;p.spc=30;animeEmit(p,'rise',{life:16});}
 else if(p.cid==='tanjiro'){p.vy=-17;animeMove(p,p.modeT>0?'tflame':'trise',p.modeT>0?23:16,p.modeT>0?16:10,{up:1.35});p.spc=34;const call=p.modeT>0?'飛輪陽炎！':'弐ノ型・水車！';animeCall(p,call,p.modeT>0?'#ff9a61':'#8ee9ff',true,1.25,.92);animeEmit(p,p.modeT>0?'flameslash':'water',{title:call,life:28});}
 else if(p.cid==='naruto'){animeEmit(p,'blink',{x:p.x,y:p.y-34,life:24});p.y=Math.max(-65,p.y-110);p.vy=-6;p.inv=Math.max(p.inv,13);p.spc=37;animeEmit(p,'blink',{life:24});}
 else if(p.cid==='jotaro'){
  p.vy=-19.0;p.vx+=p.f*1.0;p.spc=31;p.inv=Math.max(p.inv,8);
  animeEmit(p,'starjump',{life:24});
 }
}
function animeArea(e){
 const a=byId(e.id);if(!a||a.out)return;
 if(e.kind==='domain'&&a.cid!=='gojo')return;
 if(e.kind==='timestop'&&a.cid!=='jotaro')return;
 for(const t of fighters){
  if(!isLocal(t)||t.id===a.id||t.out)continue;
  if(e.kind==='domain'){
   if(sameTeam(a,t))continue;
   const dx=t.x-e.x,dy=t.y-34-e.y;
   if(Math.hypot(dx,dy)<= (e.range||255)){
    t.domainT=Math.max(t.domainT||0,DOMAIN_STOP_T);clearActs(t);t.ch=0;t.ct=0;
    emitFx({res:'block',t:t.id,a:a.id,x:t.x,y:t.y-32});
   }
  }else if(e.kind==='timestop'){
   t.timeStopT=Math.max(t.timeStopT||0,JOTARO_STOP_T);clearActs(t);t.ch=0;t.ct=0;
  }
 }
}
function animeInfinity(t,kind,attackerId,bypass=false){
 if(t.cid!=='gojo')return false;
 if(kind==='projectile'){
   if(t.infinityCd<=0){t.infinityCd=12;animeEmit(t,'infinity',{life:16});}
   return true; // 無下限：気弾・銃弾・斬撃飛び道具・茈も無効化する
 }
 if(kind!=='normal'||t.energy<16||t.infinityCd>0||t.kb>0||t.stn>0||bypass)return false;
 t.energy-=16;t.infinityCd=24;animeEmit(t,'infinity',{life:18});return true;
}
function animeProjectile(p,kind,opts={}){
 const q={pid:p.id+'_a'+(objSeq++),o:p.id,kind,x:Math.round(p.x+p.f*25),y:Math.round(p.y-34),vx:0,dir:p.f,life:50,r:16,dm:10,k0:8,ks:.07,up:.5,rot:0,anime:true,...opts};
 projs.push({...q,local:true,hitIds:{}});send({k:'proj',q});
}
function animeProjStep(q){
 const oldx=q.x;const a=byId(q.o);q.life--;q.rot+=.3;
 if(!q.beam)q.x+=q.vx;
 if(q.local&&q.life>0){for(const t of fighters){if(t.id===q.o||t.out||sameTeam(a,t)||q.hitIds?.[t.id]||isInvuln(t))continue;
  const y=t.y-32,dx=(t.x-q.x)*q.dir;
  let touching=q.beam?(dx>=-10&&dx<=q.range&&Math.abs(y-q.y)<q.r+20):(t.x>=Math.min(oldx,q.x)-q.r-14&&t.x<=Math.max(oldx,q.x)+q.r+14&&Math.abs(y-q.y)<q.r+25);
  if(erenTitan(t)){const xx=q.beam?constrain(t.x,Math.min(q.x,q.x+q.dir*q.range),Math.max(q.x,q.x+q.dir*q.range)):constrain(t.x,Math.min(oldx,q.x),Math.max(oldx,q.x));touching=erenBodyHit(t,xx,q.y,q.r);}
  if(!touching)continue;q.hitIds=q.hitIds||{};q.hitIds[t.id]=1;
  const Q={y:q.y,r:q.r,o:q.o,x:q.x,vx:q.vx,dir:q.dir,dm:q.dm,k0:q.k0,ks:q.ks,up:q.up,animeKind:q.kind,bypassInfinity:q.kind==='purple'||q.beam};
  if(isLocal(t))resolveProj(Q,t);else send({k:'ph',to:t.id,q:Q});
  if(!q.beam&&q.kind!=='purple'){q.life=0;send({k:'pg',pid:q.pid});break;}
 }}
 return q.life<=0||q.x<-450||q.x>stage.w+450;
}
const NARUTO_PASSIVE_FILL=100/(14*60);
const GOKU_PASSIVE_KI=100/(45*60); // 45秒で100（SS3は消費のみ）
function animeTick(p){
 for(const k of ['infinityCd','slowT','comboT','fatigue','boostFlash','teleportCd','projectileSlipT'])if(p[k]>0)p[k]--;
 const stopBefore=p.timeStopSelfT||0;if(p.timeStopSelfT>0)p.timeStopSelfT--;if(stopBefore===1&&p.cid==='jotaro'){if(isLocal(p))stopJotaroTimeStopBgm();animeSound('timego');}
 if(!isAnime(p))return;
 if(p.cid==='goku'&&p.form===3){p.energy=Math.max(0,p.energy-100/900);if(p.energy<=.0001){p.form=0;p.energy=0;p.fatigue=60;if(isLocal(p))playGokuMp3('revert',{dedupe:250,volume:.9});animeNotice(p,'超サイヤ人3 終了');}}
 if(p.modeT>0&&--p.modeT===0){p.energy=0;if(p.cid==='tanjiro')p.fatigue=95;if(p.cid==='naruto'&&p.form===2)p.form=1;animeNotice(p,p.cid==='tanjiro'?'ヒノカミ神楽終了':'九尾チャクラ終了');}
 if(p.cid==='goku'&&isLocal(p)&&!p.out&&p.fatigue<=0&&p.form<3&&!animeTimeStopActive())p.energy=Math.min(100,(p.energy||0)+GOKU_PASSIVE_KI);
 else if(p.cid==='naruto'&&!p.shadowClone&&isLocal(p)&&!p.out&&p.fatigue<=0&&p.form<2)p.energy=Math.min(100,(p.energy||0)+NARUTO_PASSIVE_FILL);
 else if(p.cid==='jotaro'&&isLocal(p)&&!p.out&&p.timeStopSelfT<=0&&!animeTimeStopActive())p.energy=Math.min(100,(p.energy||0)+JOTARO_FILL);
 else animeGain(p,p.cid==='gojo'?.055:p.cid==='tanjiro'?.070:0);
}
function animeWorldTick(){
 animeClock++;
 // 時止めの発動カットイン中は3.5秒の停止時間を消費しない。
 for(const e of animeFx){if(!(freezeT>0&&((fzType==='timestopcin'&&e.kind==='timestop')||(fzType==='domain'&&e.kind==='domain'))))e.life--;}
 animeFx=animeFx.filter(e=>e.life>0);
}
function animeAI(p,I,A,adx){
 if(!isAnime(p)||p.spc>0||p.a>0||p.sph>0||p.fatigue>0||p.domainT>0)return false;
 if(p.energy>=100){if(p.cid==='gojo'){I.gd=true;aiSpecial(I,A,2);return true;}if(p.cid==='goku'||p.cid==='naruto'||p.cid==='tanjiro'){I.gd=true;aiSpecial(I,A,2);return true;}}
 if(p.cid==='goku'&&adx>150){I.gd=p.energy<95;aiSpecial(I,A,p.energy<95?28:60);return true;}
 if(p.cid==='gojo'&&adx<260){if(adx<130&&Math.random()<.44){I[p.f>0?'r':'l']=true;aiSpecial(I,A,2);}else aiSpecial(I,A,adx<95?5:(p.energy>70?155:42));return true;}
 if(p.cid==='tanjiro'&&adx<160){aiSpecial(I,A,2);return true;}
 if(p.cid==='naruto'&&adx<250){if(adx<115)I[p.f>0?'r':'l']=true;aiSpecial(I,A,2);return true;}
 if(p.cid==='jotaro'){if(p.energy>=100){I.gd=true;aiSpecial(I,A,2);return true;}if(adx<82){aiSpecial(I,A,2);return true;}if(adx<220){I[p.f>0?'r':'l']=true;aiSpecial(I,A,2);return true;}}
 return false;
}
function animeRemoteMove(f){if(!isAnime(f)||!f.mv)return;if(f.cid==='naruto'&&f.form>0&&['normal','charge'].includes(f.mv.kind))f.mv.reach+=f.form===2?26:13;if(f.cid==='tanjiro'&&['normal','charge'].includes(f.mv.kind))f.mv.reach+=22;}

function animeGlow(x,y,r,c,alpha=1){push();noStroke();const cc=color(c);for(let i=3;i>=1;i--){cc.setAlpha((i===1?220:i===2?65:22)*alpha);fill(cc);circle(x,y,r*(i===1?1:i===2?1.6:2.3));}fill(255,255,245,220*alpha);circle(x,y,r*.48);pop();}
function animeLightning(x,y,w,h,t,col){push();noFill();stroke(col);strokeWeight(1.3);for(let j=0;j<3;j++){const phase=Math.floor(t/4)+j*3;beginShape();for(let i=0;i<6;i++){const xx=x+Math.sin(phase*2.1+i*4.3+j)*w*.35+(j-1)*w*.32;vertex(xx,y-h/2+i*h/5);}endShape();}pop();}
function animeAura(p,t){
 const g=p.form||0,mode=p.modeT>0,powerCharging=p.cid==='goku'&&p.castStyle==='charge'&&p.sph>6;
 if((p.cid==='goku'&&(g||powerCharging))||(p.cid==='naruto'&&(p.form>0||mode))||(p.cid==='tanjiro'&&mode)){
  const c=p.cid==='tanjiro'?'#ff6236':p.cid==='naruto'?(p.form===2?'#ffd85a':'#ffad55'):g===3?'#fff09a':g===2?'#ffd84f':g?'#ffd45e':'#fff0a6';
  const h=p.cid==='goku'?(g===3?124:g===2?100:84):p.cid==='naruto'?(p.form===2?94:76):88;
  const w=p.cid==='goku'?(g===3?50:g===2?36:29):p.cid==='naruto'?(p.form===2?38:28):32;
  push();noStroke();const cc=color(c);cc.setAlpha(25);fill(cc);ellipse(0,-h*.48,w*2.3,h*1.2);
  for(let layer=0;layer<2;layer++){cc.setAlpha(layer?52:27);fill(cc);beginShape();vertex(-w*.7,0);for(let i=0;i<=12;i++){const a=PI+i*PI/12,spike=1+Math.sin(i*5+t*.17)*.15;vertex(Math.cos(a)*w*spike,Math.sin(a)*h-7);}vertex(w*.7,0);endShape(CLOSE);}
  noFill();stroke(c);strokeWeight(1);for(let i=0;i<5;i++){const x=(i-2)*w*.36,y=-((t*2+i*19)%h);line(x,y,x+Math.sin(t*.1+i)*4,y-8);}ellipse(0,1,w*1.8,9);pop();
  if(p.cid==='goku'&&g>=2){
   animeLightning(0,-40,w*1.55,h,t,'#b9eaff');
   if(g===3)animeLightning(5,-47,w*1.85,h*1.05,t+13,'#ffffff');
  }
 }
 if(p.cid==='goku'&&powerCharging){push();
  // 同期された溜め動作。相手画面でも、金色の上昇エネルギーと明滅する輪で分かる。
  noStroke();fill(255,195,69,45+Math.sin(t*.25)*14);ellipse(0,-48,92,148);
  noFill();stroke(255,232,140,190);strokeWeight(2.6);for(let i=0;i<4;i++){const rr=24+((t*2.4+i*20)%68);ellipse(0,1,rr,rr*.18);}
  stroke(255,250,211,210);strokeWeight(1.9);
  for(let i=0;i<12;i++){const x=(i-5.5)*7+Math.sin(t*.13+i)*3,y=5-((t*3.5+i*13)%103);line(x,y,x+Math.sin(t*.2+i)*4,y-16-(i%3)*5);}
  pop();}
 if(p.cid==='gojo'&&(p.infinityCd>7||p.sph>0)){push();noFill();stroke(125,189,255,80);strokeWeight(1);ellipse(0,-34,62,84);pop();}
 if(p.slowT>0||p.domainT>0){push();noFill();stroke(150,142,244,150);strokeWeight(1);for(let i=0;i<3;i++)ellipse(0,-15-i*20,53,10);pop();}
 if(p.timeStopT>0){push();noFill();stroke(218,189,255,180);strokeWeight(1.4);ellipse(0,-36,58,58);for(let i=0;i<6;i++){const a=i*TWO_PI/6;line(Math.cos(a)*24,-36+Math.sin(a)*24,Math.cos(a)*29,-36+Math.sin(a)*29);}line(0,-36,Math.sin(t*.02)*16,-36-Math.cos(t*.02)*16);pop();}
}
function animeHair(id,g,t,back=false){if(id==='goku'&&g===3&&back){ss3Mane(t);return;}
 const gold=id==='goku'&&g>0,col=id==='gojo'?'#e8edf4':gold?'#ffdf70':id==='naruto'?'#e9b843':id==='tanjiro'?'#462129':'#161e2d';
 stroke(gold?'#bd7d29':'#162333');strokeWeight(1);fill(col);
 if(id==='goku'){
  if(g===3&&back){beginShape();vertex(-5,-69);bezierVertex(-24,-71,-40,-61,-39,-43);vertex(-34,-50);bezierVertex(-42,-32,-35,-17,-28,-7);vertex(-23,-20);vertex(-18,-5);vertex(-14,-23);vertex(-9,-11);vertex(-7,-31);vertex(-2,-18);bezierVertex(3,-38,9,-53,8,-68);endShape(CLOSE);stroke('#d4a43e');strokeWeight(1.2);for(let i=0;i<5;i++)bezier(-8-i*4,-66,-24-i*2,-55,-29-i*2,-28,-24-i*1.5,-10);fill(col);return;}
  beginShape();vertex(-11,-57);vertex(-18,-67);vertex(-8,-64);vertex(-16,g===0?-74:-84);vertex(-3,-69);vertex(-2,g===0?-83:-91);vertex(5,-72);vertex(15,g===0?-79:-88);vertex(12,-67);vertex(24,-72);vertex(15,-60);vertex(8,-54);vertex(4,-65);vertex(-2,-58);vertex(-4,-66);endShape(CLOSE);
  if(g===2){fill('#ffe99a');noStroke();triangle(-6,-71,-9,-90,0,-74);triangle(5,-72,9,-93,10,-72);}
  if(gold){stroke('#fff3aa');line(0,-79,3,-70);line(11,-77,10,-69);}
 }else if(id==='gojo'){
  beginShape();vertex(-11,-56);vertex(-17,-64);vertex(-11,-65);vertex(-14,-75);vertex(-5,-70);vertex(-3,-82);vertex(2,-72);vertex(9,-80);vertex(10,-71);vertex(18,-74);vertex(14,-63);vertex(9,-56);vertex(2,-63);endShape(CLOSE);
 }else if(id==='tanjiro'){
  beginShape();vertex(-11,-54);vertex(-16,-65);vertex(-10,-64);vertex(-12,-76);vertex(-4,-70);vertex(0,-80);vertex(5,-71);vertex(14,-74);vertex(12,-65);vertex(17,-63);vertex(8,-55);vertex(8,-64);vertex(-4,-65);endShape(CLOSE);stroke('#86434a');line(-5,-69,0,-74);line(6,-67,10,-70);
 }else if(id==='naruto'){
  beginShape();vertex(-12,-57);vertex(-17,-66);vertex(-9,-65);vertex(-11,-76);vertex(-4,-69);vertex(0,-80);vertex(5,-71);vertex(13,-76);vertex(12,-67);vertex(19,-68);vertex(12,-57);endShape(CLOSE);
 }else if(id==='jotaro'){
  fill('#111724');stroke('#080c13');strokeWeight(1.2);
  beginShape();vertex(-14,-59);vertex(-17,-69);vertex(-9,-76);vertex(5,-77);vertex(13,-72);vertex(15,-62);vertex(8,-56);vertex(-5,-55);endShape(CLOSE);
  fill('#1c2331');rect(-15,-69,30,7,2);fill('#c9ad55');rect(5,-67,10,3,1);triangle(16,-69,28,-65,16,-62);
 }
}
function baseAnimeBody(p,t,ghost=false){
 const id=p.cid,g=p.form||0,mode=p.modeT>0,skin=flash[p.id]>0&&!ghost?'#fff9e8':'#e2b496';
 const walk=p.g?Math.sin(t*.30)*Math.min(4,Math.abs(p.vx||0))*1.5:4;
 const base=id==='goku'?'#ed7d32':id==='gojo'?'#1c243c':id==='tanjiro'?'#222c32':id==='jotaro'?'#171d2b':mode?'#f9ba4b':'#e98b37';
 if(id==='goku'&&g===3)animeHair(id,g,t,true);
 if(id==='naruto'){noFill();stroke(mode?'#fbdc80':'#1b2939');strokeWeight(3);bezier(-10,-60,-18,-65,-21,-52+Math.sin(t*.2)*3,-32,-58);bezier(-10,-59,-20,-57,-22,-48,-30,-50);}
 // Clothing has a separate outlined silhouette rather than recolored stick limbs.
 for(const side of [-1,1]){const foot=side*10+side*walk;stroke('#111b29');strokeWeight(11);line(side*7,-24,foot,-5);stroke(base);strokeWeight(8);line(side*7,-24,foot,-5);stroke(id==='goku'?'#234e84':'#182332');strokeWeight(7);line(foot,-9,foot,-2);stroke(id==='tanjiro'?'#e4e3d5':'#6686a3');strokeWeight(1.5);if(id==='tanjiro'){line(foot-3,-13,foot+3,-13);line(foot-3,-10,foot+3,-10);}line(foot-3,-1,foot+5,-1);}
 stroke('#111b29');strokeWeight(1.5);fill(base);quad(-12,-50,12,-50,15,-25,-15,-25);
 if(id==='goku'){
  fill('#20477c');triangle(-8,-50,0,-36,8,-50);stroke('#ffb15b');strokeWeight(2);line(-11,-48,-1,-37);line(10,-49,2,-38);stroke('#244e85');strokeWeight(5);line(-13,-27,14,-27);strokeWeight(3);line(5,-27,11,-14);
  noStroke();fill('#f6ecdb');circle(8,-40,9);fill('#162739');textAlign(CENTER,CENTER);textStyle(BOLD);textSize(7);text('悟',8,-40);
 }else if(id==='gojo'){
  fill('#303a56');quad(-11,-50,7,-52,10,-27,-3,-27);fill('#1b2338');rect(-11,-57,22,10,3);stroke('#53627e');strokeWeight(1);line(9,-50,10,-28);noStroke();fill('#a2abc1');circle(7,-46,2);
 }else if(id==='tanjiro'){
  fill('#53a78b');quad(-14,-50,-4,-50,-6,-18,-22,-21);quad(4,-50,14,-50,22,-21,6,-18);
  fill('#142b2a');for(let side of [-1,1])for(let row=0;row<4;row++){const x=side<0?-14-row*1.4:7+row*1.4;rect(x,-49+row*7,6,6);if(row%2===0)rect(x+(side<0?6:-6),-42+row*7,5,5);}
  stroke('#eee9d7');strokeWeight(3);line(-8,-28,8,-28);noStroke();fill('#c9c9b2');for(let i=0;i<3;i++)circle(0,-44+i*5,1.6);
 }else if(id==='naruto'){
  fill(mode?'#272732':'#273746');quad(-12,-50,12,-50,12,-38,-12,-38);stroke(mode?'#3a2b2c':'#aeb7bb');strokeWeight(2);line(0,-48,0,-25);
  if(mode){noFill();stroke('#503831');strokeWeight(1.6);circle(5,-33,7);for(let i=0;i<3;i++)circle(-7+i*7,-44,3);}
  else{fill('#728088');noStroke();rect(-14,-31,7,8,1);stroke('#dad6be');strokeWeight(2);line(8,-17,13,-16);}
 }else if(id==='jotaro'){
  fill('#171d2b');quad(-13,-52,13,-52,17,-22,-17,-22);fill('#242c3c');quad(-14,-51,-4,-50,-5,-20,-19,-16);quad(4,-50,14,-51,19,-16,5,-20);
  stroke('#d7b85b');strokeWeight(2);line(9,-47,16,-42);line(16,-42,13,-34);noStroke();fill('#d7b85b');circle(16,-42,3.4);
  fill('#7550a4');triangle(-7,-51,0,-39,7,-51);stroke('#c6b7de');strokeWeight(1);line(-8,-24,9,-24);
 }
 stroke('#152131');strokeWeight(1.3);fill(skin);ellipse(0,-59,20,22);
 animeHair(id,g,t);
 if(id==='gojo'){noStroke();fill('#10182b');rect(-11,-62,22,6,2);stroke('#3f4d6a');strokeWeight(1);line(-10,-61,10,-61);}
 if(id==='naruto'){fill('#26374b');noStroke();rect(-12,-64,24,6,1);fill('#afbcc8');rect(-8,-64,16,5,1);noFill();stroke('#3a4c5d');strokeWeight(.9);arc(0,-61,5,3,0,PI*1.8);}
 if(id==='jotaro'){noStroke();fill('#111724');rect(-12,-66,25,6,1);fill('#c8a94d');rect(5,-65,8,2,1);triangle(13,-66,24,-63,13,-60);}
 if(id==='tanjiro'){noStroke();fill('#8d4140');quad(5,-65,10,-63,9,-58,5,-60);stroke('#d9cdb8');strokeWeight(1);line(-10,-54,-12,-46);line(10,-54,12,-46);fill('#e8e3d4');rect(-14,-49,4,7);rect(10,-49,4,7);stroke('#ba514e');line(-14,-47,-10,-47);line(10,-47,14,-47);}
 return {base,skin};
}
function animeArm(x,y,hx,hy,c,w=5){noFill();stroke('#162131');strokeWeight(w+2);line(x,y,hx,hy);stroke(c);strokeWeight(w);line(x,y,hx,hy);}

function legacy_drawStarPlatinum(p,t,mv,active){
 const starJump=(p.rise||0)>0&&p.rec; const show=(p.a>0&&mv&&['ora','starfinger'].includes(mv.kind))||p.timeStopSelfT>0||starJump||(freezeT>0&&fzType==='timestopcin'&&fz?.att===p.id);
 if(!show)return;
 // drawAnimeActor側ですでにscale(p.f,1)済み。ここでは+Xを常に前方として扱う。
 push();translate(-12,-18);drawingContext.globalAlpha*=.72;
 noStroke();fill('#553c78');ellipse(-8,-48,30,34);fill('#6e4b99');quad(-24,-42,14,-44,22,-5,-20,-5);
 fill('#7f5aad');ellipse(-9,-60,22,24);fill('#d9c3ee');ellipse(-13,-62,4,3);ellipse(-5,-62,4,3);
 stroke('#29203e');strokeWeight(2);line(-18,-54,-26,-47);line(-1,-54,7,-47);

 if(mv&&mv.kind==='ora'&&p.a>0){
   const isActive=p.a>=mv.act0&&p.a<=mv.act1;
   const finalFrame=isActive&&p.a>=mv.act1-1;
   // Actual ORA hit center = reach 62 / y -38 / R 27.
   // Fists now orbit that exact volume instead of extending independently of the hitbox.
   const cx=62,cy=-38;
   if(isActive){
     for(let i=0;i<8;i++){
       const ph=t*.78+i*1.31;
       const x=cx-20+((i*13+Math.floor(t*7))%40);
       const y=cy+Math.sin(ph)*20;
       stroke(105,76,153,110);strokeWeight(7);line(7,-34,x,y);
       noStroke();fill(205,181,235,195);circle(x,y,11);
     }
     noFill();stroke(205,181,235,55);strokeWeight(1.5);circle(cx,cy,54);
     if(finalFrame){
       stroke('#6d4b9a');strokeWeight(13);line(8,-35,cx,cy);
       noStroke();fill('#f0e3ff');circle(cx,cy,24);
       fill(255,255,255,120);circle(cx-4,cy-4,8);
     }
   }else{
     stroke('#6d4b9a');strokeWeight(8);line(5,-34,25,-37);
     noStroke();fill('#d9c3ee');circle(25,-37,12);
   }
 }

 if(mv&&mv.kind==='starfinger'&&p.a>0){
   const wind=p.a<mv.act0;
   const retract=p.a>mv.act1;
   let ext=wind?16+(p.a/Math.max(1,mv.act0))*55:188;
   if(retract)ext=188*Math.max(0,1-(p.a-mv.act1)/Math.max(1,mv.end-mv.act1));
   stroke('#6d4b9a');strokeWeight(9);line(12,-38,ext,-38);
   stroke('#d7c4ef');strokeWeight(3);line(12,-38,ext,-38);
   noStroke();fill('#eadfff');ellipse(ext,-38,14,8);
   if(active){noFill();stroke(220,199,243,55);strokeWeight(1.2);line(0,-38,188,-38);}
 }
 if(starJump){
   drawingContext.globalAlpha*=.96;
   noFill();stroke(166,127,218,100);strokeWeight(2);
   ellipse(-8,-42,58,96);
   stroke('#6d4b9a');strokeWeight(9);
   line(-7,-34,-8,-82);line(5,-34,18,-78);
   noStroke();fill('#eadfff');circle(-8,-84,14);circle(19,-80,13);
   stroke(205,180,236,120);strokeWeight(1.4);
   for(let i=0;i<5;i++)line(-28+i*13,4,-31+i*13,31);
 }
 pop();
}
function drawAnimeActor(p,t,ghost=false){
 push();translate(p.x,p.y);scale(CC(p.cid).size);rotate(p.r||0);scale(p.f,1);
 if(ghost)drawingContext.globalAlpha*=.43;
 else if(p.dg>0||(p.remote?p.ivf:p.inv>0)&&t%6<3)drawingContext.globalAlpha=.4;
 if(!ghost)animeAura(p,t);
 const mv=p.mv,atk=p.a>0&&mv,active=atk&&p.a>=mv.act0&&p.a<=mv.act1;
 if(p.cid==='jotaro'&&!ghost)drawStarPlatinum(p,t,mv,active);
 const {base,skin}=animeBody(p,t,ghost);
 let hx=16,hy=-37,bx=-17,by=-32;
 if(atk){const wind=p.a<mv.act0,q=p.a>mv.act1?Math.max(0,1-(p.a-mv.act1)/(mv.end-mv.act1)):1;hx=wind?-17:16+(Math.min(mv.reach,30)-16)*q;hy=-mv.yo;if(['gupper','trise','nkick'].includes(mv.kind)){hx=8;hy=-66;}if(mv.kind==='gdragon'){hx=15;hy=-91;bx=-8;by=-52;}if(['gojopunch','gblackflash'].includes(mv.kind)){hx=mv.kind==='gblackflash'?50:40;hy=-38;bx=-12;by=-46;}if(mv.kind==='purplecast'){hx=20;hy=-41;bx=16;by=-34;}if(mv.kind==='beamcast'){hx=32;hy=-34;bx=28;by=-31;}}
 if(p.sph>0){if(p.cid==='goku'&&p.castStyle==='charge'){hx=19;hy=-16;bx=-19;by=-16;}else{hx=p.cid==='gojo'?18:-14;hy=-38;bx=p.cid==='gojo'?14:-20;by=-32;}}
 if(p.ch>0){hx=-18;hy=-36;bx=-12;by=-29;}
 if(p.ct>0||p.cs>0){hx=13;hy=-52;bx=14;by=-37;}
 if(p.kb>0){hx=-19;hy=-58;bx=18;by=-54;}
 if(p.fatigue>0){hx=14;hy=-24;bx=-14;by=-24;}
 if(p.cid==='jotaro'&&atk&&mv.kind==='ora'){hx=16;hy=-40;bx=-13;by=-39;}
 if(p.cid==='jotaro'&&atk&&mv.kind==='starfinger'){hx=12;hy=-40;bx=-10;by=-38;}
 animeArm(-8,-45,bx,by,p.cid==='goku'?skin:base);luffyFist(bx,by,4.5,1);
 animeArm(9,-45,hx,hy,p.cid==='goku'?skin:base);luffyFist(hx,hy,5,1);
 if(p.ch>0){const q=Math.min(1,p.ch/CH_FULL),full=p.ch>=CH_FULL,warn=p.ch>=CH_WARN;noStroke();fill(warn&&t%6<3?'#ef4747':full?'#ffd166':'#ffe078');circle(-18,-36,9+q*24+(full?Math.sin(t*.6)*2:0));noFill();stroke(full?'#fff0ad':'#ffe078');strokeWeight(1.5);arc(-18,-36,18+q*34,18+q*34,-PI/2,-PI/2+TWO_PI*q);}
 if(p.cid==='goku'){stroke('#265b94');strokeWeight(5);line(hx-5,hy-2,hx-3,hy);if(active&&!mv.noHit){noFill();stroke('#fff2bd');strokeWeight(2);arc(hx-5,hy,25,35,-PI*.4,PI*.4);}}
 if(p.cid==='tanjiro'){
  const q=atk?Math.max(0,Math.min(1,(p.a-mv.act0+2)/Math.max(1,mv.act1-mv.act0+3))):0;
  const angle=atk?-2.4+q*4.6:-.65;
  push();translate(hx,hy);rotate(angle);stroke('#cdb98f');strokeWeight(4);line(-6,0,4,0);stroke('#111b25');strokeWeight(5);line(4,0,41,0);stroke('#d8eee9');strokeWeight(1.4);line(4,-2,44,-2);stroke('#bc9370');strokeWeight(2);line(3,-6,3,6);pop();
  if(active){const fire=p.modeT>0,rr=mv.kind==='tflow'?100:mv.kind==='ttide'?73:mv.kind.includes('cut')?56:48;
   noFill();stroke(fire?'#ed5634':'#297eb4');strokeWeight(9);arc(6,-37,rr*2,rr*1.3,-2.1+q*.7,1.6+q*.7);stroke(fire?'#ffce73':'#bcefff');strokeWeight(3);arc(6,-37,rr*2+4,rr*1.3+4,-2+q*.7,1.5+q*.7);
   for(let i=0;i<6;i++){const a=-2+q*.7+i*.55,x=6+Math.cos(a)*rr,y=-37+Math.sin(a)*rr*.65;noStroke();fill(fire?'#ffe3a4':'#e4fcff');if(fire)triangle(x,y,x-8,y-10-i%3*4,x+2,y-5);else ellipse(x,y,4,2);}
  }
 }
 if(p.cid==='goku'&&p.sph>0&&p.castStyle==='ki'){const r=6+Math.min(1,p.sph/90)*23;animeGlow(-19,-34,r,'#69dfff');noFill();stroke(188,244,255,140);strokeWeight(1.2);for(let i=0;i<3;i++){const a=t*.12+i*2.1;arc(-19,-34,r*2.5,r*2.5,a,a+.8);}}
 if(p.cid==='goku'&&atk&&mv.kind==='gdragon'&&active){noFill();stroke('#fff4a8');strokeWeight(5);line(10,-67,22,-103);stroke('#ffb42f');strokeWeight(12);line(8,-62,18,-94);animeGlow(19,-101,18,'#ffd45e');}
 if(p.cid==='gojo'){
  if(p.sph>0){const oc=p.sph>=GOJO_PURPLE_HOLD?'#b98cff':p.sph>=GOJO_RED_HOLD?'#ff5b6b':'#59bcff';animeGlow(hx+4,hy,8+Math.min(p.sph/70,1)*12,oc);}
  if(atk&&['gojopunch','gblackflash'].includes(mv.kind)){
   // 最大溜め黒閃はヒット前から黒赤の重い圧を出す。通常打撃は淡い青。
   const x=hx+8,y=hy,chargeFlash=mv.maxChargeBF||mv.kind==='gblackflash'&&p.ch>=CH_FULL;
   if(active){
     noFill();
     if(mv.kind==='gblackflash'){
       stroke(chargeFlash?'#ff3f53':'#a8e4ff');strokeWeight(chargeFlash?5:4);arc(x-8,y,60,48,-PI*.7,PI*.4);
       if(chargeFlash){stroke('#17040a');strokeWeight(8);line(x-18,y+12,x+24,y-16);stroke('#ff9e9b');strokeWeight(1.6);line(x-16,y+12,x+21,y-15);} 
     }else{
       stroke('#a8e4ff');strokeWeight(4);arc(x-8,y,60,48,-PI*.7,PI*.4);
     }
   }
   noStroke();fill(mv.kind==='gblackflash'?(chargeFlash?'#7f0916':'#1a1017'):'#bceaff');circle(x,y,mv.kind==='gblackflash'?(chargeFlash?26:22):22);
   if(mv.kind==='gblackflash'){fill(chargeFlash?'#ff3d4d':'#ff6c84');circle(x+4,y-2,10);}
  }
  if(atk&&mv.kind==='purplecast'&&p.a<32){const q=p.a/32;animeGlow(24,-44-16*(1-q),13,'#5abfff');animeGlow(24,-28+16*(1-q),13,'#ff4c70');if(q>.55)animeGlow(26,-36,(q-.55)*52,'#bb87ff');}
  if(p.ct>0||p.infinityCd>7){noFill();stroke('#a6d6ff');strokeWeight(1.5);ellipse(23,-37,11,54);}
 }
 if(p.cid==='naruto'&&(p.sph>=15||atk&&mv.kind==='rasengan')){
  const r=p.modeT>0?33:23;animeGlow(hx+7,hy,r,'#68d6ff');push();translate(hx+7,hy);rotate(t*.3);noFill();stroke('#efffff');strokeWeight(1.5);for(let i=0;i<3;i++){rotate(PI/3);ellipse(0,0,r*.95,r*.34);}pop();
 }
 if(p.w)drawWeapon(p.w,hx,hy,1,atk?'swing':'hold',false);
 if(p.stn>0){noStroke();fill('#ffe49f');textSize(12);textAlign(CENTER,CENTER);text('✦',-8,-83);text('✦',12,-79);}pop();
}

function drawAttackChargeBar(p,x,y,w=66){
  if(!p||p.ch<=0)return;
  const q=Math.max(0,Math.min(1,p.ch/CH_FULL)),h=6;
  push();noStroke();fill('#07101bcc');rect(x-w/2,y,w,h,2);
  fill(p.ch>=CH_WARN?'#ef4747':p.ch>=CH_FULL?'#ffd166':'#ffe078');rect(x-w/2,y,w*q,h,2);
  stroke('#ffffff99');strokeWeight(.7);noFill();rect(x-w/2,y,w,h,2);pop();
}

function drawAnimeFighter(p){
 const t=visualFrame;
 if(p.cid==='naruto'&&(p.cloneT>0||p.sph>=15)&&!animeFx.some(e=>e.kind==='echo'&&e.id===p.id))drawAnimeActor({...p,x:p.x-p.f*35,y:p.y+2,a:0,mv:null,sph:p.sph>=15?p.sph:0},t-7,true);
 drawAnimeActor(p,t);
 push();textAlign(CENTER,CENTER);textStyle(BOLD);textSize(12);stroke('#0b1423');strokeWeight(3);fill(battleTeamMode?teamColor(p.team):p.c);const y=p.y-103*CC(p.cid).size;text((battleTeamMode?teamName(p.team)+' ':'')+p.label,p.x,y);
 if(p.id===myId){noStroke();triangle(p.x-5,y+10,p.x+5,y+10,p.x,y+16);drawCool(p.x+38,y,p.ctc,CT_COOL*CC(p.cid).ctc,'#75baff','C');}
 if(p.cid==='goku'&&p.castStyle==='charge'&&p.sph>6){
   push();noStroke();fill('#fff1bf');textAlign(CENTER,CENTER);textStyle(BOLD);textSize(12);
   text('気を溜め中',p.x,y-16);pop();
 }
 drawAttackChargeBar(p,p.x,y+21,66);
 pop();paintSpecialDetails(p);
}
function drawAnimeProjectile(q){
 const c=q.kind==='purple'?'#ac74ff':q.kind==='red'?'#ff4e62':q.kind==='blue'?'#58bfff':q.kind==='ki'?'#ffd979':'#69dfff';
 push();translate(q.x,q.y);scale(q.dir||1,1);
 if(q.beam){const ramp=Math.min(1,(21-q.life)/3),fade=Math.min(1,q.life/5),r=q.r*ramp;
  for(const [w,a]of[[r*3,24],[r*2,90],[r*1.2,230]]){const cc=color(c);cc.setAlpha(a*fade);stroke(cc);strokeWeight(w);line(0,0,q.range,0);}stroke(250,255,255,240*fade);strokeWeight(r*.5);line(0,0,q.range,0);
  for(let i=0;i<5;i++){const x=(visualFrame*18+i*93)%q.range;stroke(215,255,255,130*fade);strokeWeight(1.2);ellipse(x,0,8,r*2.3);}animeGlow(0,0,r*2,c,fade);
 }else{
  const tail=q.kind==='purple'?90:q.kind==='red'?48:32;
  if(q.kind==='red'){
   // 赫：飛翔中の弾そのものを明確な赤にする。青系の共通リングは使わない。
   for(let i=4;i>0;i--){const a=.08+i*.035;animeGlow(-tail*i/4,Math.sin(q.rot+i)*2.2,q.r*(.55+i*.07),'#ff1f36',a);}
   noStroke();fill(110,0,12,110);circle(0,0,q.r*2.9);
   fill(255,35,55,235);circle(0,0,q.r*2.15);
   fill(255,120,125,245);circle(0,0,q.r*1.45);
   fill(255,232,228,250);circle(0,0,q.r*.62);
   noFill();stroke(255,45,62,225);strokeWeight(2.4);ellipse(0,0,q.r*3.05,q.r*3.05);
   stroke(255,120,130,160);strokeWeight(1.2);ellipse(0,0,q.r*3.55,q.r*2.2);
  }else{
   for(let i=3;i>0;i--)animeGlow(-tail*i/3,Math.sin(q.rot+i)*3,q.r*(1-i*.18),c,.12);animeGlow(0,0,q.r*2,c);
   noFill();stroke(q.kind==='purple'?'#eadcff':'#dff5ff');strokeWeight(1.5);for(let i=0;i<3;i++){push();rotate(q.rot+i*PI/3);ellipse(0,0,q.r*2.2,q.r*.8);pop();}
   if(q.kind==='purple')animeLightning(0,0,q.r*2,q.r*2,q.rot*10,'#d0b1ff');
  }
 }pop();
}
function activeTimeStopFx(){return animeFx.find(e=>e.kind==='timestop'&&e.life>0);}

function classicAnimeBackdrop(){
 const ts=activeTimeStopFx();
 if(ts){
  const elapsed=ts.max-ts.life;
  const intro=Math.max(0,1-elapsed/12);
  const settled=Math.min(1,elapsed/14);
  const outro=Math.max(0,1-ts.life/12);
  const hold=Math.max(0,Math.min(settled,1-outro*.6));
  const cx=ts.x,cy=ts.y;
  push();

  // 発動：白→青緑→紫へ一瞬で世界の位相が切り替わる
  noStroke();
  if(intro>0){
   fill(235,255,243,105*intro);rect(0,0,stage.w,stage.h);
   fill(76,227,207,55*intro);rect(0,0,stage.w,stage.h);
  }

  // 停止世界の特色
  fill(12,15,39,176*hold);rect(0,0,stage.w,stage.h);
  blendMode(SCREEN);
  fill(54,183,164,25*hold);rect(0,0,stage.w,stage.h);
  fill(132,71,170,18*hold);rect(0,0,stage.w,stage.h);
  blendMode(BLEND);

  // 承太郎を中心に「空間の層」が固定される
  noFill();
  for(let i=0;i<10;i++){
   const r=58+i*52;
   stroke(i%2?color(104,240,214,33*hold):color(211,177,242,40*hold));
   strokeWeight(i%3===0?1.8:.9);
   push();translate(cx,cy);rotate((i-5)*.018);
   ellipse(0,0,r*2.05,r*.68);
   pop();
  }

  // 世界に固定された放射状の時間亀裂
  for(let i=0;i<20;i++){
   const a=i*TWO_PI/20;
   const r0=74+(i%4)*12,r1=360+(i%5)*24;
   stroke(i%3===0?color(220,202,250,42*hold):color(100,231,211,26*hold));
   strokeWeight(i%5===0?1.6:.8);
   line(cx+cos(a)*r0,cy+sin(a)*r0*.72,cx+cos(a)*r1,cy+sin(a)*r1*.72);
  }

  // 凍りついた微粒子
  noStroke();
  for(let i=0;i<22;i++){
   const x=(i*137+51)%stage.w,y=(i*i*43+37)%stage.h;
   fill(i%2?color(207,177,239,28*hold):color(112,231,213,25*hold));
   circle(x,y,2+(i%3));
  }
  pop();return;
 }

 const d=animeFx.find(e=>e.kind==='domain');if(!d)return;const a=Math.min(1,d.life/20,(d.max-d.life)/15);
 push();noStroke();fill(5,7,24,190*a);rect(0,0,stage.w,stage.h);for(let i=0;i<38;i++){const x=(i*173.3)%stage.w,y=(i*i*47.7)%stage.h;fill(157,171,255,(60+Math.sin(visualFrame*.06+i)*45)*a);circle(x,y,1+(i%3));}
 noFill();stroke(146,156,244,90*a);strokeWeight(1);for(let i=0;i<5;i++)ellipse(d.x,d.y,120+i*95+Math.sin(visualFrame*.03)*12,100+i*76);pop();
}

function legacy_paintTimeStopPostFx(){
 if(freezeT>0&&fzType==='timestopcin')return;
 const ts=activeTimeStopFx();if(!ts)return;
 const elapsed=ts.max-ts.life;
 const intro=Math.max(0,1-elapsed/12);
 const outro=Math.max(0,1-ts.life/12);
 const settled=Math.min(1,elapsed/14);
 const a=Math.max(0,Math.min(settled,1-outro*.45));
 const cx=ts.x,cy=ts.y;
 push();

 // 周辺の圧迫感
 noStroke();
 fill(3,5,18,45*a);rect(0,0,stage.w,34);
 rect(0,stage.h-34,stage.w,34);

 // 発動・解除だけ強く歪む
 const warp=Math.max(intro,outro);
 if(warp>0){
  noFill();
  for(let i=0;i<8;i++){
   const q=i/8;
   const r=28+q*520*(1-warp*.12);
   stroke(i%2?color(104,248,219,125*warp):color(229,198,255,140*warp));
   strokeWeight(1.3+(1-q)*2.3);
   push();translate(cx,cy);rotate((i%2?1:-1)*warp*.08);
   ellipse(0,0,r*1.72,r*.52);pop();
  }
 }

 // 停止した時計輪郭。針は動かさない。
 if(a>.15){
  const ccx=stage.w*.5,ccy=stage.h*.47,cr=Math.min(stage.w,stage.h)*.29;
  noFill();stroke(225,214,255,38*a);strokeWeight(1);ellipse(ccx,ccy,cr*2,cr*2);
  for(let i=0;i<12;i++){
   const ang=i*TWO_PI/12,l=i%3===0?13:7;
   line(ccx+cos(ang)*(cr-l),ccy+sin(ang)*(cr-l),ccx+cos(ang)*cr,ccy+sin(ang)*cr);
  }
  stroke(112,237,215,50*a);strokeWeight(1.5);
  line(ccx,ccy,ccx+cr*.14,ccy-cr*.57);
  line(ccx,ccy,ccx-cr*.34,ccy-cr*.08);
 }

 // 解除直前の復帰フラッシュ
 if(outro>0){
  noStroke();fill(220,250,255,42*outro);rect(0,0,stage.w,stage.h);
  noFill();stroke(255,255,255,105*outro);strokeWeight(2);
  for(let i=0;i<6;i++){
   const ang=i*TWO_PI/6+.2;
   line(cx+cos(ang)*35,cy+sin(ang)*35,cx+cos(ang)*(150+260*outro),cy+sin(ang)*(150+260*outro));
  }
 }
 pop();
}

function paintAnimeFx(){
 for(const e of animeFx){if(e.kind==='timestop')continue;const q=1-e.life/e.max,a=Math.min(1,q*8,e.life/8),p=byId(e.id);push();translate(e.x,e.y);scale(e.f||1,1);
  if(e.kind==='echo'&&p){pop();drawAnimeActor({...p,x:e.x,y:e.y,a:8,mv:{...mkMv('normal'),reach:e.reach},sph:0,cloneT:0},visualFrame,true);continue;}
  if(e.kind==='stepclone'&&p){pop();drawAnimeActor({...p,x:e.x,y:e.y,a:0,mv:null,sph:0,cloneT:0,modeT:0},visualFrame,true);continue;}
  if(e.kind==='impact'){
    const c=e.cid==='goku'?'#ffdd88':e.cid==='gojo'?'#b49bff':e.cid==='tanjiro'?(e.boost?'#ff9e60':'#83e4ff'):e.cid==='jotaro'?'#b891e6':'#8fe4ff';
    noFill();stroke(c);strokeWeight(2*a);
    for(let i=0;i<8;i++){const angle=i*TWO_PI/8+.3,inner=8+q*22,outer=inner+(1-q)*22;line(Math.cos(angle)*inner,Math.sin(angle)*inner,Math.cos(angle)*outer,Math.sin(angle)*outer);}
    if(e.cid==='naruto'){rotate(q*PI);for(let i=0;i<3;i++){rotate(PI/3);ellipse(0,0,20+q*62,8+q*18);}}
    else if(e.cid==='tanjiro'){strokeWeight(3*a);line(-24-q*15,25+q*10,24+q*15,-25-q*10);}
    else ellipse(0,0,15+q*75,15+q*60);
  }else if(e.kind==='dragon'){
   // 龍の頭・胴体・曲線は描かない。上昇する閃光と拳の衝撃だけ。
   noFill();strokeCap(ROUND);
   for(let i=0;i<12;i++){
    const x=(i-5.5)*11+(i%3)*8,y=65-(q*240+i*23)%270;
    stroke(i%3===0?color(255,251,218,230*a):color(255,179,45,170*a));
    strokeWeight(i%3===0?4.0:2.2);
    line(x-16,y+44,x+12,y-55);
   }
   const gl=220*(1-q)*a;
   stroke(255,236,142,gl);strokeWeight(10);line(-14,90,23,-132);
   stroke(255,253,231,gl);strokeWeight(3);line(-14,90,23,-132);
  
  }else if(['gojopunch','blackflash'].includes(e.kind)){
   // 黒閃の予備エフェクトが来ても黒球は描かない。
   // 通常の横特殊は手元の小さな呪力のみ。
   const black=e.kind==='blackflash';
   const r=18+q*(black?100:55);
   noFill();stroke(black?color(255,50,70,185*a):color(173,225,255,150*a));strokeWeight(black?3:2);
   for(let i=0;i<(black?9:4);i++){
    const t=i*TWO_PI/(black?9:4),x=Math.cos(t),y=Math.sin(t);
    line(x*r,y*r*.6,x*(r+26),y*(r+26)*.6);
   }
   if(black){
    stroke(21,6,14,210*a);strokeWeight(7);
    for(let i=0;i<5;i++){
     const xx=10+i*22;
     line(xx,-26+(i%2)*18,xx+9,-44+(i%2)*13);
    }
   }
  }else if(['blue','red'].includes(e.kind)){const blue=e.kind==='blue',x=blue?72:36,c=blue?'#69caff':'#ff5979';animeGlow(x,0,(blue?24:35)*(1-q*.4),c,a);noFill();
   for(let i=0;i<5;i++){const r=blue?150*(1-(q+i*.17)%1):15+((q+i*.17)%1)*185;stroke(blue?color(110,194,255,130*a):color(255,105,143,130*a));strokeWeight(2);ellipse(x,0,r,r*.65);}
  }else if(e.kind==='timestop'){
   noFill();
   // 発動点から時空が裂けるような非対称リング。
   for(let i=0;i<5;i++){
    const rr=28+q*(150+i*38);
    stroke(i%2?color(106,238,215,180*a):color(224,194,255,210*a));
    strokeWeight(2.2-i*.22);
    push();rotate((i-2)*.045*(1-q));ellipse(0,0,rr*1.35,rr*.72);pop();
   }
   stroke('#f2e3ff');strokeWeight(1.3);
   for(let i=0;i<16;i++){
    const ang=i*TWO_PI/16+q*.15;
    const inner=34+q*25,outer=52+q*100;
    line(Math.cos(ang)*inner,Math.sin(ang)*inner*.72,
         Math.cos(ang)*outer,Math.sin(ang)*outer*.72);
   }
   // 中心に一瞬だけ「圧縮された時」の芯。
   if(q<.22){noStroke();fill(230,255,242,120*a);ellipse(0,0,52*(1-q/.22),18*(1-q/.22));}
  }
  else if(e.kind==='ora'){noStroke();for(let i=0;i<12;i++){const xx=e.f*(12+q*(35+i*7)),yy=-15+Math.sin(i*2.1+q*12)*35;fill(150,108,205,90*a);ellipse(xx,yy,18*(1-q*.45),11*(1-q*.45));}}
  else if(e.kind==='starfinger'){noFill();stroke(154,112,210,170*a);strokeWeight(3);line(10,0,40+q*160,0);stroke('#f0e5ff');strokeWeight(1);line(10,0,40+q*160,0);}
  else if(e.kind==='infinity'){noFill();stroke(176,220,255,220*a);strokeWeight(2);ellipse(0,0,58+q*12,81);for(let i=0;i<4;i++){strokeWeight(1);arc(0,0,66+i*6,89+i*6,-1.5+q,1.5+q);}}
  else if(e.kind==='transform'){
   const c=e.cid==='tanjiro'?'#ff6a3d':e.cid==='naruto'?(e.form===2?'#ffd84f':'#ff9f43'):(e.form===3?'#fff0a0':'#ffdd65');
   const strong=e.cid==='goku'&&e.form===3;
   noFill();stroke(c);strokeWeight((strong?3.2:2.2)*a);
   for(let i=0;i<(strong?5:3);i++)ellipse(0,30,28+q*(165+i*34),7+q*(28+i*6));
   for(let i=0;i<(strong?14:9);i++){
    const x=(i-(strong?6.5:4))*9;
    const h=55+(i%4)*15+q*(strong?95:58);
    stroke(i%3===0?color(255,255,255,180*a):color(c));
    strokeWeight(i%4===0?2.5:1.4);
    line(x,28,x+Math.sin(i*1.7+q*8)*6,28-h);
   }
   if(e.cid==='goku'&&e.form>=2){
    stroke('#cbefff');strokeWeight((e.form===3?2.1:1.4)*a);
    for(let j=0;j<(e.form===3?5:3);j++){
     const x=-36+j*18;
     line(x,8,x+8,-18);line(x+8,-18,x-1,-39);line(x-1,-39,x+7,-61);
    }
   }
   if(e.cid==='tanjiro'){
    stroke('#ff5a38');strokeWeight(5*a);arc(0,-18,106+q*48,72+q*30,-2.7,.35);
    stroke('#ffd27a');strokeWeight(2*a);arc(0,-18,120+q*55,82+q*34,-2.75,.4);
   }
   if(e.cid==='naruto'&&e.form===2){
    stroke('#ffd95a');strokeWeight(4*a);
    for(let j=0;j<4;j++)arc(-8+j*5,8,52+j*14,76+j*10,-2.15,-.25);
   }
  }
  else if(['clone','blink'].includes(e.kind)){noStroke();for(let i=0;i<7;i++){fill(201,213,226,100*a);circle(Math.cos(i*2.4)*q*28,Math.sin(i*2.4)*q*28,(1-q)*22);}}
  else if(e.kind==='instant'){
   const fade=(e.phase==='out'?1-q:q)*a;
   noFill();stroke(255,232,145,210*a);strokeWeight(2);ellipse(0,0,22+q*80,42+q*105);
   stroke(118,212,255,170*a);strokeWeight(1.2);for(let i=0;i<7;i++){const yy=-45+i*15,xx=(e.phase==='out'?q:1-q)*95;line(-8-xx,yy,12-xx,yy);}
   if(p){push();scale(.72);drawingContext.globalAlpha*=Math.max(.12,fade);animeBody({...p,form:p.form||0},visualFrame,true);const skin='#e2b496';animeArm(-8,-45,-3,-60,skin,5);animeArm(9,-45,8,-64,skin,5);fill(skin);noStroke();circle(8,-65,5);stroke('#26384d');strokeWeight(1.4);line(8,-66,1,-67);line(8,-64,2,-62);pop();}
  }
  else if(e.kind==='starjump'){
   noFill();stroke(184,150,229,170*a);strokeWeight(2.2);
   ellipse(0,8,35+q*75,12+q*25);
   for(let i=0;i<6;i++)line(-28+i*11,28,-31+i*12,73+q*28);
  }
  else if(e.kind==='rise'){stroke(155,218,255,140*a);strokeWeight(2);for(let i=0;i<4;i++)line(-17+i*10,30,-17+i*10,60+q*30);}
  pop();
 }
}
function paintAnimeCutin(){
 const e=[...animeFx].reverse().find(x=>x.kind==='transform'&&x.life>0);
 if(!e)return;
 const q=1-e.life/e.max,enter=Math.min(1,q/.18),leave=Math.min(1,e.life/10),a=Math.min(enter,leave);
 const c=e.cid==='tanjiro'?'#ff653b':e.cid==='naruto'?(e.form===2?'#ffd84f':'#ff9b42'):(e.form===3?'#fff0a0':'#ffda57');
 const title=e.title||'TRANSFORM';
 push();
 noStroke();fill(4,9,18,125*a);rect(0,WH*.64,W,WH*.24);
 fill(c);quad(-80+(1-enter)*-260,WH*.68,W*.76+(1-enter)*-260,WH*.64,W*.71+(1-enter)*-260,WH*.81,-80,WH*.86);
 textAlign(LEFT,CENTER);textStyle(BOLDITALIC);textSize(e.cid==='goku'&&e.form===3?50:43);
 fill('#0d1725');text(title,24-(1-enter)*240,WH*.745);
 textStyle(BOLD);textSize(10);fill('#eef4fb');
 const sub=e.cid==='goku'?(e.form===3?'MAXIMUM POWER':e.form===2?'POWER TYPE':'AWAKENING'):e.cid==='naruto'?(e.form===2?'NINE-TAILS CHAKRA':'SAGE MODE'):'HINOKAMI KAGURA';
 text(sub,27,WH*.835);
 pop();
}
function animePortrait(id,form=0,mode=false){
 const c=ANIME_COLORS[id],skin='#e3b99a',base=id==='goku'?'#eb7e36':id==='gojo'?'#26314b':id==='tanjiro'?'#204e43':id==='jotaro'?'#171d2b':mode?'#f9cb64':'#ec933f';
 let extra='',hair='',head='';
 if(id==='goku'){hair=`<path d="M39 22l-14-9 14 2-8-14 15 10 3-12 6 13 14-10-7 17 15-3-14 13-9-9-4 10-5-8z" fill="${form?'#ffde71':'#182335'}" stroke="${form?'#b58439':'#152031'}"/>`;extra='<path d="M37 35l13 15 13-15" fill="#254e82"/><path d="M33 62h34" stroke="#244b80" stroke-width="6"/><circle cx="61" cy="47" r="6" fill="#f4ead3"/><text x="61" y="50" text-anchor="middle" font-size="8" fill="#1b2c41">悟</text>';if(form===3)hair='<path d="M41 17Q16 18 20 43Q9 57 25 79l7-15 5 14 5-19 6 13 3-52z" fill="#f1c553" stroke="#b58439"/><path d="M34 19Q20 36 28 69M40 18Q28 39 35 73M47 19Q38 42 42 67" fill="none" stroke="#fff0a0" stroke-width="1.2"/>'+hair;}
 if(id==='gojo'){hair='<path d="M39 23l-9-11 8 1-2-12 10 7 5-11 5 11 11-6-1 11 10-1-12 15-12-8z" fill="#e6ecf6"/>';head='<path d="M38 24h25v7H38z" fill="#10192d"/><path d="M40 26h21" stroke="#53627a"/>';extra='<path d="M34 34h32v10H34z" fill="#1a233a"/><path d="M59 43v20" stroke="#667791"/><circle cx="57" cy="46" r="1.5" fill="#a6b5c9"/>';
 }
 if(id==='tanjiro'){hair='<path d="M38 25l-7-12 8 2-2-13 8 7 7-12 4 13 12-8-3 13 9 1-12 13-1-11-15 1z" fill="#48252f"/>';head='<path d="M57 20l5 2-2 7-4-3z" fill="#9e4748"/><path d="M38 30v12m25-12v12" stroke="#e1d9c7" stroke-width="3"/>';extra='<path d="M32 34h14l-5 35H24zM54 34h14l8 35H59z" fill="#5aaf90"/><g fill="#152c2d"><path d="M32 35h7v7h-7zM39 42h7v7h-7zM28 49h9v8h-9zM35 58h8v8h-8zM55 35h8v7h-8zM64 42h8v8h-8zM59 51h8v8h-8zM68 59h7v8h-7z"/></g><path d="M76 60l18-39" stroke="#d9eeeb" stroke-width="3"/><path d="M73 58l7 4" stroke="#c3a277" stroke-width="3"/>';}
 if(id==='naruto'){hair='<path d="M39 22L30 13l9 1-3-12 11 8 5-12 5 12 13-7-5 13 10-2-10 14z" fill="#eec255"/>';head='<path d="M37 23h27v7H37z" fill="#293c55"/><path d="M42 24h18v5H42z" fill="#b7c7d2"/><path d="M48 27q6-5 6 0l-6 1" fill="none" stroke="#314758"/>';extra=`<path d="M33 34h35v15H33z" fill="${mode?'#4c3936':'#263b50'}"/><path d="M51 35v29" stroke="#d8cfab" stroke-width="2"/><path d="M39 23l-21 6 5 4" fill="none" stroke="#293c55" stroke-width="4"/>`;}
 if(id==='jotaro'){hair='<path d="M37 24l-5-11 7 2 2-13 8 9 8-8 3 11 10-3-5 13z" fill="#111724"/>';head='<path d="M34 18h34v8H34z" fill="#101621"/><path d="M57 19h11v4H57z" fill="#c8a94d"/><path d="M68 20l14 4-14 3z" fill="#111724"/>';extra='<path d="M31 34h39l7 31H25z" fill="#171d2b"/><path d="M58 37l10 7-5 15" fill="none" stroke="#d7b85b" stroke-width="3"/><circle cx="68" cy="44" r="3" fill="#d7b85b"/><path d="M38 35l12 13 11-13" fill="#7550a4"/><path d="M22 48q-12 2-14 17" fill="none" stroke="#7351a2" stroke-width="8" opacity=".5"/><circle cx="11" cy="65" r="7" fill="#8b69c7" opacity=".55"/>';}
 return `<svg viewBox="0 0 100 82" aria-hidden="true"><circle cx="50" cy="40" r="35" fill="${c}" opacity=".12"/><ellipse cx="50" cy="78" rx="30" ry="3" fill="#050b1680"/><path d="M42 60l-8 17m24-17 9 17" stroke="${base}" stroke-width="10"/><path d="M31 77h9m23 0h9" stroke="#23364c" stroke-width="5"/><path d="M35 35h30l5 29H30z" fill="${base}" stroke="#19283a"/><path d="M35 40L22 51M65 40l13 9" fill="none" stroke="${id==='goku'?skin:base}" stroke-width="8" stroke-linecap="round"/><circle cx="20" cy="51" r="5" fill="${skin}"/><circle cx="80" cy="49" r="5" fill="${skin}"/>${extra}<circle cx="51" cy="24" r="12" fill="${skin}"/>${hair}${head}</svg>`;
}
function animeHud(p){
 if(!isAnime(p))return null;
 const m=p.modeT>0&&p.cid==='tanjiro'?p.modeT/10.8:p.cid==='naruto'&&p.form===2?p.modeT/9:p.energy||0;
 let label=p.cid==='goku'?['気：通常','気：超1','気：超2','気：超3'][p.form||0]:p.cid==='gojo'?'無下限 / 術式':p.cid==='tanjiro'?(p.modeT>0?'ヒノカミ神楽':'呼吸'):p.cid==='jotaro'?'スタープラチナ / 時止め':(['チャクラ','仙人モード','九尾モード'][p.form||0]);
 if(p.cid==='naruto')label+=' / 分身 '+shadowClonesAlive(p.id).length+'/'+NARUTO_CLONE_MAX;
 if(p.fatigue>0)label='スタミナ回復中';else if(p.energy>=100&&!(p.cid==='naruto'&&p.form===2))label+=' MAX';return{m,label};
}
function animeControl(p){
 const h=document.getElementById('combat-hint');
 const instructions={goku:'特殊：気弾／長押しかめはめ波　↓特殊：気を溜める・MAXで変身　→特殊：瞬間移動　超3↑特殊：龍拳',gojo:'特殊：即離し＝蒼／少し溜め＝赫／長時間溜め＝茈　→特殊：踏み込み強打（約1/6で黒閃）　↓特殊：無量空処　↑特殊：大ジャンプ',tanjiro:'特殊：水面斬り　→特殊：流流舞い　↑特殊：水車　↓特殊：神楽変身／幻日虹',naruto:'特殊短押し：螺旋手裏剣／長押し：影分身（チャクラ60）　→特殊：螺旋丸　↑特殊：瞬身　↓特殊：仙人→九尾',jotaro:'特殊：オラオラ連打→最後にオラァ！　→特殊：スターフィンガー　↑特殊：大ジャンプ　↓特殊：ゲージMAXで時止め'};
 if(isAnime(p)){
  const cloneCount=p.cid==='naruto'?shadowClonesAlive(p.id).length:0;
  const activeClone=cloneCount>=NARUTO_CLONE_MAX;
  const narutoHint=p.cid!=='naruto'?null:activeClone?'影分身が戦闘中！ 2/2体 ― 敵の攻撃を受けると消滅'
    :p.castStyle==='shadow-charge'&&p.sph>0?(p.energy>=NARUTO_CLONE_COST?'影分身の術 '+Math.min(100,Math.round(p.sph/NARUTO_CLONE_HOLD*100))+'% ― そのまま長押し':'影分身にはチャクラ60必要（現在 '+Math.floor(p.energy||0)+'）')
    :(p.energy>=NARUTO_CLONE_COST?'チャクラ十分！ 特殊を約0.5秒長押しで影分身':'チャクラ '+Math.floor(p.energy||0)+'/60 ― たまったら特殊長押しで影分身');
  setTxt(h,netIssue||narutoHint||instructions[p.cid]);const b=document.getElementById('btn-g');b.classList.toggle('ready',p.energy>=100);
  setTxt(b.querySelector('small'),p.cid==='gojo'?'無量空処':p.cid==='tanjiro'?(p.modeT>0?'幻日虹':'神楽'):p.cid==='goku'?'気溜め／変身':p.cid==='jotaro'?'時止め':'仙人／九尾');
  setTxt(document.querySelector('#btn-s small'),p.cid==='goku'?'気弾／かめはめ波':p.cid==='gojo'?'蒼→赫→長溜め茈':p.cid==='tanjiro'?'水面斬り／碧羅の天':p.cid==='jotaro'?'オラオラ':activeClone?'分身 2/2体':p.castStyle==='shadow-charge'&&p.sph>0?'印 '+Math.min(100,Math.round(p.sph/NARUTO_CLONE_HOLD*100))+'%':p.energy>=NARUTO_CLONE_COST?'長押し：分身 '+cloneCount+'/2体':'短：手裏剣／長：分身');
 }
}
function rosterSections(container,choose){
 container.innerHTML='';container.classList.add('roster-sections');

 // 表示順を固定。承太郎が確実に選択画面へ出るよう、SECRET欄の先頭側に配置する。
 const standardOrder=['karate','bomber','ninja','sumo','boxer','yankee','swordsman','lancer','gunman','archer','berserker'];
 const secretOrder=['rubber','jotaro','goku','gojo','tanjiro','naruto','eren','kaneki'];

 for(const secret of [false,true]){
  const section=document.createElement('section');
  section.className=secret?'roster-group secret-roster':'roster-group';
  section.innerHTML=`<header><b>${secret?'SPECIAL FIGHTERS':'STANDARD FIGHTERS'}</b><span>${secret?'ルフィ・承太郎・悟空・五条・炭治郎・ナルト・エレン・金木':'通常キャラクター'}</span></header><div class="roster-cards"></div>`;
  const grid=section.lastElementChild;
  const ids=(secret?secretOrder:standardOrder).filter(id=>CHARS[id]);

  for(const id of ids){
   const C=CC(id),b=document.createElement('button');
   b.className='ci'+(settings.cid===id?' sel':'');
   b.dataset.cid=id;
   b.style.setProperty('--fighter-color',ANIME_COLORS[id]||fighterPalette[Object.keys(CHARS).indexOf(id)]||'#c7ad81');
   b.setAttribute('aria-label',C.name);
   b.setAttribute('aria-pressed',String(settings.cid===id));
   b.innerHTML=`<span class="fighter-number">${secret?'SPECIAL / ':''}${C.mark}</span>${portrait(id)}<small>${C.name}</small>`;
   b.onclick=()=>choose(id);
   grid.appendChild(b);
  }
  container.appendChild(section);
 }
}

const CC = id => CHARS[id] || CHARS.karate;
function clampInt(v, lo, hi, fallback) { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fallback; }
function cleanName(v) {
  const x = String(v || '').replace(/[<>&"'`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 12);
  return x || 'PLAYER';
}
function esc(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function lowestPlatformIndex() {
  let idx = 0, best = -Infinity;
  stage.plats.forEach((pl, i) => { if (pl.y > best) { best = pl.y; idx = i; } });
  return idx;
}
const TEAM_COLORS = { 1: '#ff4d5a', 2: '#3a86ff' };
const TEAM_NAMES = { 1: 'RED', 2: 'BLUE' };
function normTeam(v) { return Number(v) === 2 ? 2 : 1; }
function teamColor(v) { return TEAM_COLORS[normTeam(v)]; }
function teamName(v) { return TEAM_NAMES[normTeam(v)]; }
function sameTeam(a, b) {
 if(!a||!b||a.id===b.id)return false;
 if(a.shadowOwner===b.id||b.shadowOwner===a.id)return true;
 if(a.shadowOwner&&b.shadowOwner&&a.shadowOwner===b.shadowOwner)return true;
 return !!battleTeamMode&&normTeam(a.team)===normTeam(b.team);
}
function enemyOf(a, b) { return !sameTeam(a, b); }
function aliveTeams() {
  return [...new Set(fighters.filter(f => !f.out&&!f.shadowClone).map(f => normTeam(f.team)))];
}
function clearNetTimers() { while (netTimers.length) clearInterval(netTimers.pop()); }


const MAPS = {
  small: { name: 'せまい闘技場', w: 800, h: 450, bg: '#d6e6f0', wpn: false,
    plats: [ { x: 220, y: 380, w: 360, h: 22 }, { x: 330, y: 270, w: 140, h: 14 } ] },
  std: { name: 'スタンダード', w: 800, h: 450, bg: '#cfe3ee', wpn: true,
    plats: [ { x: 110, y: 390, w: 580, h: 22 }, { x: 170, y: 280, w: 150, h: 14 },
             { x: 480, y: 280, w: 150, h: 14 }, { x: 325, y: 175, w: 150, h: 14 } ] },
  wide: { name: 'ひろびろ平原', w: 1200, h: 675, bg: '#dcebd2', wpn: true,
    plats: [ { x: 140, y: 570, w: 920, h: 24 }, { x: 200, y: 450, w: 190, h: 14 },
             { x: 810, y: 450, w: 190, h: 14 }, { x: 505, y: 350, w: 190, h: 14 },
             { x: 280, y: 240, w: 150, h: 14 }, { x: 770, y: 240, w: 150, h: 14 } ] }
};

Object.assign(MAPS,{"shrine": {"name": "月夜の社", "w": 800, "h": 450, "bg": "#392b49", "wpn": true, "plats": [{"x": 125, "y": 390, "w": 550, "h": 22}, {"x": 150, "y": 265, "w": 135, "h": 14}, {"x": 515, "y": 265, "w": 135, "h": 14}]}, "harbor": {"name": "雨の港湾", "w": 960, "h": 540, "bg": "#28475a", "wpn": true, "plats": [{"x": 110, "y": 465, "w": 740, "h": 24}, {"x": 160, "y": 330, "w": 180, "h": 16}, {"x": 410, "y": 245, "w": 150, "h": 16}, {"x": 650, "y": 345, "w": 150, "h": 16}]}, "reactor": {"name": "動力炉", "w": 800, "h": 450, "bg": "#273c32", "wpn": false, "plats": [{"x": 130, "y": 390, "w": 540, "h": 22}, {"x": 230, "y": 285, "w": 340, "h": 14}, {"x": 340, "y": 180, "w": 120, "h": 14}]}, "aurora": {"name": "極光の氷原", "w": 1040, "h": 585, "bg": "#345368", "wpn": true, "plats": [{"x": 125, "y": 505, "w": 790, "h": 24}, {"x": 195, "y": 375, "w": 180, "h": 16}, {"x": 665, "y": 375, "w": 180, "h": 16}, {"x": 430, "y": 275, "w": 180, "h": 16}]}});

// 大型マップ：すべて16:9比率。中央だけに戦場が偏らないよう複数の拠点足場を配置。
Object.assign(MAPS,{
 sunset:{name:'夕焼け大峡谷',w:1400,h:788,bg:'#c77664',wpn:true,plats:[
  {x:100,y:678,w:480,h:26},{x:815,y:678,w:485,h:26},
  {x:570,y:586,w:264,h:18},{x:192,y:466,w:240,h:16},{x:964,y:466,w:242,h:16},
  {x:550,y:354,w:310,h:17},{x:350,y:241,w:155,h:14},{x:905,y:241,w:155,h:14}]},
 metro:{name:'超巨大都市',w:1600,h:900,bg:'#283b5b',wpn:true,plats:[
  {x:95,y:786,w:1410,h:28},{x:170,y:617,w:280,h:18},{x:1140,y:617,w:280,h:18},
  {x:600,y:667,w:400,h:18},{x:490,y:464,w:235,h:16},{x:875,y:464,w:235,h:16},
  {x:230,y:332,w:210,h:16},{x:1160,y:332,w:210,h:16},{x:665,y:255,w:270,h:16}]},
 orbit:{name:'天空の浮遊遺跡',w:1500,h:844,bg:'#344c70',wpn:true,plats:[
  {x:165,y:715,w:400,h:24},{x:935,y:715,w:400,h:24},
  {x:600,y:634,w:300,h:20},{x:85,y:495,w:300,h:16},{x:1120,y:495,w:300,h:16},
  {x:520,y:428,w:460,h:16},{x:270,y:274,w:245,h:16},{x:985,y:274,w:245,h:16},
  {x:645,y:181,w:210,h:16}]}
});

// Width is the world-space map width, not the size of a browser preview.
const ARENA_RANDOM={random:'全ステージからランダム','random-small':'狭いステージからランダム','random-wide':'広いステージからランダム'};
function arenaCandidates(choice){return Object.keys(MAPS).filter(id=>choice==='random-small'?MAPS[id].w<=800:choice==='random-wide'?MAPS[id].w>800:true);}
function arenaChoiceName(choice){return ARENA_RANDOM[choice]||MAPS[choice]?.name||MAPS.std.name;}
function resolveArena(choice){if(Object.hasOwn(MAPS,choice))return choice;const ids=arenaCandidates(choice);return ids[Math.floor(Math.random()*ids.length)]||'std';}

const AI_LV = [
  { think: 16, read: 0.25, spec: 0.12, err: 0.25 },
  { think: 9,  read: 0.55, spec: 0.2,  err: 0.12 },
  { think: 4,  read: 0.85, spec: 0.28, err: 0.04 },
  { think: 2, read: 0.98, spec: 0.41, err: 0.005 }
];
const LV_NAME = ['かんたん', 'ふつう', 'つよい', '最強'];
const AI_STYLE = {
  karate: { counter: 1.25, special: 1.00, retreat: 0.20, aggression: 1.00 },
  bomber: { counter: 0.85, special: 1.45, retreat: 1.30, aggression: 0.65 },
  ninja:  { counter: 0.90, special: 1.20, retreat: 0.45, aggression: 1.35 },
  sumo:   { counter: 0.90, special: 1.25, retreat: 0.10, aggression: 0.95 },
  boxer:  { counter: 1.35, special: 1.10, retreat: 0.35, aggression: 1.15 },
  yankee: { counter: 0.95, special: 1.35, retreat: 0.15, aggression: 1.35 },
  swordsman: { counter: 1.00, special: 1.35, retreat: 0.45, aggression: 0.95 },
  lancer: { counter: 0.95, special: 1.25, retreat: 0.55, aggression: 0.85 },
  gunman: { counter: 1.05, special: 1.45, retreat: 1.25, aggression: 0.60 },
  rubber: { counter: 1.00, special: 1.30, retreat: 0.40, aggression: 1.10 }
};


const MOVE_DEF = {
  axeheavy:{type:'heavy',act0:24,act1:28,end:88,reach:48,R:39,yo:35,cd:12,glow:23},
  axeup:{type:'heavy',act0:20,act1:24,end:80,reach:0,R:49,yo:79,cd:12,glow:19},
  normal: { type: 'normal', act0: 4, act1: 8,  end: 14, reach: 28, R: 24, yo: 34, cd: 3 },
  charge: { type: 'heavy',  act0: 4, act1: 9,  end: 18, reach: 34, R: 32, yo: 34, cd: 5 },
  harite: { type: 'heavy',  act0: 9, act1: 14, end: 24, reach: 40, R: 34, yo: 36, cd: 6, glow: 8 },
  upper:  { type: 'heavy',  act0: 7, act1: 12, end: 28, reach: 22, R: 34, yo: 52, cd: 8, glow: 6 },
  // 上必殺技
  shoryu: { type: 'normal', act0: 1, act1: 14, end: 20, reach: 12, R: 28, yo: 52, cd: 4 },
  jupper: { type: 'normal', act0: 2, act1: 12, end: 18, reach: 14, R: 28, yo: 54, cd: 4 },
  tsuki:  { type: 'heavy',  act0: 4, act1: 14, end: 20, reach: 4,  R: 32, yo: 66, cd: 6 },
  blastj: { type: 'normal', act0: 1, act1: 4,  end: 10, reach: 0,  R: 50, yo: 0,  cd: 4 },
  gutsj:  { type: 'normal', act0: 1, act1: 1,  end: 14, reach: 0,  R: 0,  yo: 0,  cd: 4 },
  swordup:{ type: 'normal', act0: 2, act1: 13, end: 20, reach: 2,  R: 36, yo: 68, cd: 5 },
  lanceup:{ type: 'heavy',  act0: 5, act1: 14, end: 22, reach: 2,  R: 42, yo: 72, cd: 7 },
  shotgunup:{ type: 'special', act0: 5, act1: 9, end: 20, reach: 0, R: 52, yo: 76, cd: 8, blockOnly: true },
  gunjump:{ type: 'normal', act0: 1, act1: 5, end: 14, reach: 0, R: 48, yo: 2, cd: 4 },
  rpistol:{ type: 'normal', act0: 7, act1: 13, end: 26, reach: 128, R: 20, yo: 34, cd: 6 },
  rflurry:{ type: 'normal', act0: 4, act1: 26, end: 34, reach: 96, R: 20, yo: 34, cd: 6, multi: 5 },
  rrocket:{ type: 'normal', act0: 2, act1: 16, end: 24, reach: 20, R: 26, yo: 32, cd: 6, rush: 1 },
  rtwin:  { type: 'heavy', act0: 10, act1: 16, end: 32, reach: 108, R: 26, yo: 34, cd: 8, glow: 9 },
  rjump:  { type: 'normal', act0: 2, act1: 12, end: 18, reach: 0, R: 30, yo: 62, cd: 4 },
  lancerush:{ type: 'heavy', act0: 7, act1: 18, end: 27, reach: 58, R: 26, yo: 34, cd: 8, glow: 6 }
};
Object.assign(MOVE_DEF,ANIME_MOVES);
const RISE_KINDS = ['shoryu', 'jupper', 'tsuki', 'blastj', 'gutsj', 'swordup', 'lanceup', 'shotgunup', 'gunjump', 'rjump','gupper','trise','nkick'];
function mkMv(kind, w) {
  if (!kind || !MOVE_DEF[kind]) return null;
  const m = { ...MOVE_DEF[kind], kind };
  if (w === 'sword' && (kind === 'normal' || kind === 'charge')) { m.reach += 16; m.R += 6; m.sword = true; }
  return m;
}

const myId = Math.random().toString(36).slice(2, 10);
const urlRoom = new URLSearchParams(location.search).get('room');
let settings = { cid: 'karate', cpuN: 1, cpuLv: 1, cpuPool: 'all', cpuCids: [], trainingCpuCid: '', map: 'std', wpn: false, stocks: DEFAULT_STOCK, name: 'PLAYER', teamMode: false, team: 1 };
let scene = 'title', howtoFrom = 'sc-mode', charMode = 'cpu';
let offlineMode='normal',requestedOnlineMode='normal',trainingAiMode=0,kumiteCount=0,kumiteOpponentSeed=0,offlineTour=null;
let online = false, isHost = false, roomId = null, roomRef = null;
let memCache = {}, gmCache = null, curRound = 0, skipRound = -1, gmFirst = true;
let nextSpawn = 0, battleStartAt = 0, aiLv = 1, battleWpn = true, battleStocks = DEFAULT_STOCK, battleTeamMode = false;
let stage = MAPS.std, fighters = [], bt = { phase: 'none', t: 0 }, elim = [];
let projs = [], bombs = [], mines = [], items = {}, itemSeq = 0, itemTimer = 0, objSeq = 0;
let particles = [], popups = [], trails = {}, flash = {}, shake = 0;
let freezeT = 0, freezeMax = FREEZE, fzType = 'counter', fz = null, pending = null;
let simAcc = 0;
const netTimers = [];
const predicted = {};
const blankInput = () => ({ gd: false, l: false, r: false, u: false, d: false, a: false, s: false, jc: 0, ac: 0, rc: 0, cc: 0, sc: 0, xc: 0, dc: 0 });
let hin = blankInput();
let raw = { j: false, a: false, c: false, s: false, x: false, d: false };

