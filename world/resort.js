'use strict';
/* Decorative resort art; coordinates stay compatible with saved profiles. */
const WorldResort=(()=>{
const NS='http://www.w3.org/2000/svg';
const themes={lobby:{accent:'#e6c68a',floor:'#41484b',wall:'#28383c',title:'GRAND LOBBY',jp:'グランドロビー',desc:'受付・メダルバンク・ボーナスデスク',icon:'◆'},arena:{accent:'#68c9ee',floor:'#243b51',wall:'#192c40',title:'GAME ARENA',jp:'ゲームアリーナ',desc:'既存の対戦ゲーム・共通テーブル',icon:'✦'},medal:{accent:'#c19aff',floor:'#39324d',wall:'#25223a',title:'MEDAL PARK',jp:'メダルパーク',desc:'メダル落とし・バンク',icon:'◉'},casino:{accent:'#e8c581',floor:'#24493d',wall:'#142f29',title:'ROYAL CASINO',jp:'ロイヤルカジノ',desc:'共通ルーレット・チップバンク',icon:'♠'}};
function node(tag,attrs={},parent){const a=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))a.setAttribute(k,String(v));if(parent)parent.append(a);return a;}
function art(floor){const t=themes[floor],s=node('svg',{viewBox:'0 0 1000 600',preserveAspectRatio:'none','aria-hidden':'true',class:'resort-art'}),g=node('g',{},s);
const rect=(x,y,w,h,fill,stroke='none',r=0)=>node('rect',{x,y,width:w,height:h,fill,stroke,'stroke-width':2,rx:r},g);
const ellipse=(cx,cy,rx,ry,fill,stroke='none')=>node('ellipse',{cx,cy,rx,ry,fill,stroke,'stroke-width':2},g);
const line=(x1,y1,x2,y2,stroke,width=2)=>node('line',{x1,y1,x2,y2,stroke,'stroke-width':width},g);
const label=(x,y,txt,size=13,fill=t.accent)=>{let n=node('text',{x,y,fill,'font-size':size,'font-weight':700,'text-anchor':'middle','letter-spacing':2},g);n.textContent=txt;return n;};
rect(0,0,1000,600,t.floor);for(let i=0;i<=1000;i+=50)line(i,0,i,600,'#ffffff0c');for(let i=0;i<=600;i+=50)line(0,i,1000,i,'#ffffff0c');
rect(0,0,1000,58,t.wall);rect(0,0,25,600,t.wall);rect(975,0,25,600,t.wall);rect(0,573,1000,27,t.wall);
line(26,58,974,58,t.accent,2);line(26,573,974,573,t.accent,2);
for(let x of [65,935]){rect(x-13,78,26,40,'#16232d',t.accent,4);ellipse(x,90,7,7,t.accent);rect(x-12,506,24,40,'#16232d',t.accent,4);ellipse(x,517,6,6,t.accent);}
rect(390,66,220,505,'#00000024',t.accent,12);rect(405,70,190,499,'#ffffff09');line(420,70,420,563,'#ffffff20');line(580,70,580,563,'#ffffff20');
rect(435,0,130,58,'#101c25',t.accent,3);label(500,33,'STICK WORLD',14);
rect(435,563,130,24,'#101c25',t.accent,3);label(500,579,'ENTRANCE',10);
function plant(x,y){ellipse(x,y+10,20,9,'#0005');rect(x-13,y,26,22,'#977f64','#c4aa81',5);for(let k=0;k<5;k++)ellipse(x+(k-2)*8,y-8+Math.abs(k-2)*3,8,15,k%2?'#497a60':'#609b72');}
function bench(x,y,w){rect(x,y,w,34,'#0004','none',8);rect(x,y-6,w,29,'#6a5148',t.accent,7);line(x+12,y+7,x+w-12,y+7,'#98796c',2);}
function table(x,y){ellipse(x,y+8,43,18,'#0005');ellipse(x,y,42,23,'#6d6149',t.accent);ellipse(x,y,28,13,'#87785a');}
function cabinet(x,y,color){rect(x,y+5,48,74,'#0005','none',5);rect(x,y,48,70,'#152335',color,5);rect(x+6,y+8,36,30,'#233e59',color,3);rect(x+11,y+14,26,18,color);rect(x+7,y+43,34,13,'#506070','none',2);ellipse(x+17,y+49,4,4,'#e4bc77');}
function casinoTable(x,y){ellipse(x,y+7,59,35,'#0006');ellipse(x,y,58,33,'#946a3f',t.accent);ellipse(x,y,48,24,'#2f7657','#7baf92');for(let k of [-1,0,1])rect(x+k*18-5,y-9,10,13,'#e5dec9','#595959',2);}
if(floor==='lobby'){for(let x of [115,885]){plant(x,135);plant(x,475);}bench(92,380,125);bench(783,380,125);table(154,437);table(846,437);for(let x of [240,750]){rect(x-134,94,268,116,'#0003',t.accent,12);rect(x-120,100,240,36,'#9b8260','#b8a47c',4);}}
if(floor==='arena'){for(let x of [100,171,780,851])cabinet(x,370,'#68c9ee');for(let x of [240,750]){rect(x-140,100,280,113,'#173044',t.accent,10);line(x-110,110,x+110,110,'#5ba6d2',4);}plant(70,480);plant(930,480);}
if(floor==='medal'){for(let x of [95,162,230,725,793,860])cabinet(x,385,x<400?'#c19aff':'#f3cc77');for(let k=0;k<10;k++)ellipse(100+k*26,139+(k%2)*13,10,7,'#d9b76a','#fae4a5');rect(102,98,285,110,'#222c4c',t.accent,8);rect(615,98,280,110,'#292340',t.accent,8);}
if(floor==='casino'){for(let x of [150,290,710,850])casinoTable(x,420);for(let x of [95,905])plant(x,145);rect(102,99,285,114,'#203e31',t.accent,14);rect(615,99,280,114,'#263f35',t.accent,14);for(let x of [70,930])bench(x-35,500,70);}
rect(430,285,140,115,'#1a2831',t.accent,8);rect(450,302,100,82,'#344451','#71808a',3);line(500,303,500,383,'#b3a99a',3);label(500,293,'LIFT',10);
for(let x of [354,646]){line(x,80,x,548,'#ffffff15',2);}
label(500,530,t.title,20);return s;}
return {themes,art};
})();
