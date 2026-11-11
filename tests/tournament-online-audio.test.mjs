import test from 'node:test';
import assert from 'node:assert/strict';
import {game} from './helpers/game.mjs';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Firebase-stripped first-round tournament arrays are restored before pushing the winner',()=>{
 const g=game();
 g.run("const tour={active:1,entrants:[{id:'a'},{id:'b'},{id:'c'},{id:'d'}],matches:[['a','b'],['c','d']],round:1,index:0};");
 assert.equal(g.run("progressTournament(tour,'a',{method:'test'})"),true);
 assert.deepEqual(Array.from(g.run('tour.winners')),['a']);
 assert.equal(g.run('tour.index'),1);
 assert.equal(g.run('tour.details[0].method'),'test');
 g.run('delete tour.history;delete tour.details;');
 assert.equal(g.run("progressTournament(tour,'c')"),true);
 assert.equal(g.run('tour.round'),2);
 assert.equal(g.run('tour.index'),0);
 assert.deepEqual(Array.from(g.run('tour.matches[0]')),['a','c']);
 assert.equal(g.run('tour.history.length'),1);
 g.run('delete tour.winners;delete tour.details;');
 assert.equal(g.run("progressTournament(tour,'c')"),true);
 assert.equal(g.run('tour.champion'),'c');
 assert.equal(g.run('tour.history.length'),2);
});

test('host NEXT advances from first online match through final and champion after Firebase roundtrips',async()=>{
 const g=game();
 g.run(\`online=true;isHost=true;scene='sc-result';gmCache={mode:'tournament',ph:'end',round:1,w:'a',map:'std',stocks:3,
   tour:{active:1,entrants:[{id:'a'},{id:'b'},{id:'c'},{id:'d'}],
    round:1,index:0,matches:[['a','b'],['c','d']],map:'std',stocks:3}};
 let tourWrite=null,patchCount=0;
 roomRef={update:async patch=>{patchCount++},child:path=>({
  set:async value=>{if(path==='gm')tourWrite=JSON.parse(JSON.stringify(value))},
 })};
 \`);
 await g.run('hostStartTournament()');
 assert.equal(g.run('tourWrite.ph'),'play');
 assert.equal(g.run('tourWrite.round'),2);
 assert.equal(g.run('tourWrite.tour.index'),1);
 assert.deepEqual(Array.from(g.run('tourWrite.players.map(x=>x.id)')),['c','d']);
 g.run("gmCache={...tourWrite,ph:'end',w:'c'}");
 await g.run('hostStartTournament()');
 assert.equal(g.run('tourWrite.ph'),'play');
 assert.equal(g.run('tourWrite.tour.round'),2);
 assert.deepEqual(Array.from(g.run('tourWrite.players.map(x=>x.id)')),['a','c']);
 // Firebase removes empty winners when new round starts.
 g.run("gmCache={...tourWrite,ph:'end',w:'a'};delete gmCache.tour.winners;");
 await g.run('hostStartTournament()');
 assert.equal(g.run('tourWrite.ph'),'champion');
 assert.equal(g.run('tourWrite.tour.champion'),'a');
 assert.equal(g.run('tourWrite.tour.history.length'),2);
 assert.equal(g.run('tournamentAdvancePending'),false);
 assert.equal(g.get('res-again').disabled,false);
});

test('host NEXT refuses invalid winner and exposes retry instead of losing the entire tournament',async()=>{
 const g=game();
 g.run(\`online=true;isHost=true;gmCache={mode:'tournament',ph:'end',round:1,w:'invalid',map:'std',
 tour:{active:1,round:1,index:0,matches:[['a','b'],['c','d']],
   entrants:[{id:'a'},{id:'b'},{id:'c'},{id:'d'}]}};
 let writes=0,notices=[];alert=message=>{notices.push(message)};
 roomRef={update:async()=>{writes++},child:()=>({set:async()=>{writes++}})};
 \`);
 await g.run('hostStartTournament()');
 assert.equal(g.run('tournamentAdvancePending'),false);
 assert.equal(g.run('writes'),2); // one cleanup and a replay of the same match (draw)
 assert.equal(g.run('notices.length'),1);
});

test('time-stop audio starts on remote opponent only once even if FX and cinematic both arrive',()=>{
 const g=game();
 g.run(\`online=true;scene='battle';curRound=2;bt={phase:'play'};
 fighters=[makeFighter({id:myId,cid:'karate',owner:myId},0),
  makeFighter({id:'remote',cid:'jotaro',owner:'remote'},1)];
 let remoteAudioPlays=0;
 playJotaroTimeStopBgm=()=>{remoteAudioPlays++};
 animeVisual({kind:'timestop',cid:'jotaro',id:'remote',x:200,y:120,life:210});
 cinDispatching=true;
 beginJotaroTimeStopCutin({id:'remote',x:200,y:120});
 cinDispatching=false;
 \`);
 assert.equal(g.run('remoteAudioPlays'),1);
 assert.equal(g.run('remoteJotaroSoundKey'),'remote:2');
 g.run('remoteJotaroSoundStarted=Date.now()-1600;animeFx=[];animeWorldTick()');
 assert.equal(g.run('remoteJotaroSoundKey'),'');
});

test('remote time-stop MP3 does not play twice for local caster or change other characters',()=>{
 const g=game();
 g.run(\`online=true;scene='battle';curRound=1;bt={phase:'play'};
 fighters=[makeFighter({id:myId,cid:'jotaro',owner:myId},0),
  makeFighter({id:'guest',cid:'karate',owner:'guest'},1)];
 let plays=0;playJotaroTimeStopBgm=()=>{plays++};
 animeVisual({kind:'timestop',cid:'jotaro',id:myId,x:0,y:0,life:210});
 animeVisual({kind:'charge',cid:'jotaro',id:'guest',x:0,y:0,life:20});
 \`);
 assert.equal(g.run('plays'),0);
 assert.equal(g.run('remoteJotaroSoundKey'),'');
});

test('new tournament UI handles empty Firebase result arrays and exposes clear next-match controls',()=>{
 const html=read('src/index.template.html'),modes=read('src/game/06-game-modes.js');
 const bracket=read('src/game/06b-tournament-bracket.js');
 const network=read('src/game/04-network-lobby.js');
 assert.match(html,/id="res-again"/);
 assert.match(network,/tournamentAdvancePending/);
 assert.match(network,/nextButton\.disabled=true/);
 assert.match(network,/catch\(err\)/);
 assert.match(modes,/if\(!Array\.isArray\(t\.winners\)\)t\.winners=\[\]/);
 assert.match(bracket,/bracket-spotlight/);
 assert.match(bracket,/bracket-rounds/);
});
