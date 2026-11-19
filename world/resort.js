'use strict';
/* Decorative resort art; coordinates stay compatible with saved profiles. */
const WorldResort=(()=>{
const NS='http://www.w3.org/2000/svg';
const themes={lobby:{accent:'#d9b56a',floor:'#1b1714',wall:'#0e0c0b',title:'ENTRANCE',jp:'エントランス',desc:'キャッシャー・ボーナスデスク・出口',icon:'◆'},arena:{accent:'#d9b56a',floor:'#1a1420',wall:'#0e0b12',title:'SLOTS & POKER',jp:'スロット＆ポーカー',desc:'ビデオスロット・ビデオポーカー',icon:'7'},medal:{accent:'#d9b56a',floor:'#0f1a24',wall:'#080f16',title:'MEDAL CORNER',jp:'メダルコーナー',desc:'コインプッシャー・ラッキーホイール・メダル落とし',icon:'●'},casino:{accent:'#d9b56a',floor:'#21121a',wall:'#120a0e',title:'TABLE GAMES',jp:'テーブルゲーム',desc:'ブラックジャック・バカラ・ルーレット',icon:'♠'}};
function node(tag,attrs={},parent){const a=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))a.setAttribute(k,String(v));if(parent)parent.append(a);return a;}
function art(floor){const t=themes[floor],s=node('svg',{viewBox:'0 0 1000 600',preserveAspectRatio:'none','aria-hidden':'true',class:'resort-art'}),g=node('g',{},s);
const rect=(x,y,w,h,fill,stroke='none',r=0)=>node('rect',{x,y,width:w,height:h,fill,stroke,'stroke-width':2,rx:r},g);
const ellipse=(cx,cy,rx,ry,fill,stroke='none')=>node('ellipse',{cx,cy,rx,ry,fill,stroke,'stroke-width':2},g);
const line=(x1,y1,x2,y2,stroke,width=2)=>node('line',{x1,y1,x2,y2,stroke,'stroke-width':width},g);
const label=(x,y,txt,size=13,fill=t.accent)=>{let n=node('text',{x,y,fill,'font-size':size,'font-weight':700,'text-anchor':'middle','letter-spacing':2},g);n.textContent=txt;return n;};
rect(0,0,1000,600,t.floor);for(let i=0;i<=1000;i+=50)line(i,0,i,600,'#ffffff07');for(let i=0;i<=600;i+=50)line(0,i,1000,i,'#ffffff07');
rect(0,0,1000,58,t.wall);rect(0,0,25,600,t.wall);rect(975,0,25,600,t.wall);rect(0,573,1000,27,t.wall);
line(26,58,974,58,t.accent,2);line(26,573,974,573,t.accent,2);
for(let x of [65,935]){rect(x-13,78,26,40,'#16232d',t.accent,4);ellipse(x,90,7,7,t.accent);rect(x-12,506,24,40,'#16232d',t.accent,4);ellipse(x,517,6,6,t.accent);}
rect(390,66,220,505,'#00000024',t.accent,12);rect(405,70,190,499,'#ffffff09');line(420,70,420,563,'#ffffff20');line(580,70,580,563,'#ffffff20');
rect(435,0,130,58,'#101c25',t.accent,3);label(500,33,'STICK ROYALE',14);
rect(435,563,130,24,'#101c25',t.accent,3);label(500,579,'ENTRANCE',10);
function plant(x,y){ellipse(x,y+10,20,9,'#0005');rect(x-13,y,26,22,'#977f64','#c4aa81',5);for(let k=0;k<5;k++)ellipse(x+(k-2)*8,y-8+Math.abs(k-2)*3,8,15,k%2?'#497a60':'#609b72');}
function bench(x,y,w){rect(x,y,w,34,'#0004','none',8);rect(x,y-6,w,29,'#6a5148',t.accent,7);line(x+12,y+7,x+w-12,y+7,'#98796c',2);}
function table(x,y){ellipse(x,y+8,43,18,'#0005');ellipse(x,y,42,23,'#6d6149',t.accent);ellipse(x,y,28,13,'#87785a');}
function cabinet(x,y,color){rect(x,y+5,48,74,'#0005','none',5);rect(x,y,48,70,'#152335',color,5);rect(x+6,y+8,36,30,'#1c1626',color,3);rect(x+11,y+14,26,18,'#2a2234');node('text',{x:x+24,y:y+29,'font-size':13,'font-weight':900,'text-anchor':'middle',fill:color},g).textContent='777';rect(x+7,y+43,34,13,'#506070','none',2);ellipse(x+17,y+49,4,4,'#e4bc77');}
function casinoTable(x,y){ellipse(x,y+7,59,35,'#0006');ellipse(x,y,58,33,'#946a3f',t.accent);ellipse(x,y,48,24,'#2f7657','#7baf92');for(let k of [-1,0,1])rect(x+k*18-5,y-9,10,13,'#e5dec9','#595959',2);}
if(floor==='lobby'){for(let x of [115,885]){plant(x,135);plant(x,475);}bench(92,380,125);bench(783,380,125);table(154,437);table(846,437);for(let x of [240,750]){rect(x-134,94,268,116,'#0003',t.accent,12);rect(x-120,100,240,36,'#9b8260','#b8a47c',4);}}
if(floor==='arena'){for(let x of [92,158,224,724,790,856])cabinet(x,372,'#d9b56a');for(let x of [92,158,224,724,790,856])cabinet(x,150,'#b58cff');plant(70,520);plant(930,520);}
if(floor==='medal'){function pusher(x,y){rect(x-46,y-70,92,110,'#0b1a28',t.accent,10);rect(x-36,y-60,72,18,'#10263c','#5a7a90',4);node('path',{d:`M${x-34} ${y-30}H${x+34}L${x+40} ${y+22}H${x-40}Z`,fill:'#1f4c6c'},g);for(let k=0;k<9;k++)ellipse(x-30+(k%5)*15+(k>4?7:0),y-8+(k>4?16:0),7,3.5,'#f5c43a','#8a5a0c');rect(x-40,y+24,80,10,'#1a1208','none',3);}for(let x of [120,250,750,880])pusher(x,440);plant(60,145);plant(940,145);}
if(floor==='casino'){function bj(x,y){ellipse(x,y+8,78,30,'#0006');node('path',{d:`M${x-76} ${y-6}A76 46 0 0 0 ${x+76} ${y-6}L${x+60} ${y-18}H${x-60}Z`,fill:'#1d5a3e',stroke:t.accent,'stroke-width':2},g);rect(x-62,y-22,124,8,'#5a3a22','none',3);for(let k=-1;k<=1;k++)rect(x+k*26-8,y+2,16,22,'#efe9dc','#555',2);}for(let x of [150,290])bj(x,410);for(let x of [710,850])casinoTable(x,420);for(let x of [95,905])plant(x,145);for(let x of [70,930])bench(x-35,500,70);}
rect(430,285,140,115,'#1a2831',t.accent,8);rect(450,302,100,82,'#344451','#71808a',3);line(500,303,500,383,'#b3a99a',3);label(500,293,'LIFT',10);
for(let x of [354,646]){line(x,80,x,548,'#ffffff15',2);}
label(500,530,t.title,20);return s;}
return {themes,art};
})();
