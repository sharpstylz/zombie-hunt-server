/* ZOMBIE HUNT — TOURNAMENT / MATCHMAKING ENGINE
   Fixed 16-player roster, 4 teams, cross-team fair priority. */
(function(global){
  const P=global.ZHPlayer,E=global.ZHGameEngine;
  const KEY='zh_tournament_state_v2';
  function createRoster(human={name:'Survivor',avatar:'char1.jpg'}){
    const names=['BLAKE','MASON','LUNA','RYAN','ALEX','NOAH','RILEY','JORDAN','KAI','ZANE','MIA','LEO','AVERY','ETHAN','NOVA'];
    const avatars=names.map((_,i)=>`char${i+2}.jpg`);
    const players=[]; let ni=0;
    P.TEAMS.forEach(team=>{for(let slot=0;slot<4;slot++){
      if(team==='TEAM B'&&slot===0) players.push(P.createPlayer({name:human.name||'SURVIVOR',avatar:human.avatar||'char1.jpg',team,isHuman:true}));
      else players.push(P.createPlayer({name:names[ni],avatar:avatars[ni],team,isHuman:false})),ni++;
    }});
    /* Exactly one hidden Zombie per team, chosen once and never rerolled. */
    P.TEAMS.forEach(team=>{const m=players.filter(x=>x.team===team);const z=m[Math.floor(Math.random()*m.length)];z.isZombie=true;z.specialCards.zombie=true;});
    return players;
  }
  function makeState(players){return {round:1,players,history:{},pairHistory:{},eliminated:{'TEAM A':[],'TEAM B':[],'TEAM C':[],'TEAM D':[]}};}
  function activePlayers(s){return s.players.filter(P.active);}
  function eligible(s,me){return activePlayers(s).filter(p=>p.id!==me.id&&p.team!==me.team);}
  function count(s,a,b){const k=[a,b].sort().join('|');return Number(s.pairHistory[k]||0);}
  function note(s,a,b){const k=[a,b].sort().join('|');s.pairHistory[k]=(s.pairHistory[k]||0)+1;}
  function chooseOpponent(s,me){const pool=eligible(s,me);if(!pool.length)return null;let min=Math.min(...pool.map(p=>Number(s.history[p.id]||0)));let x=pool.filter(p=>Number(s.history[p.id]||0)===min);const last=s.lastOpponentId;if(x.length>1&&last){const y=x.filter(p=>p.id!==last);if(y.length)x=y;}const chosen=x[Math.floor(Math.random()*x.length)];s.history[chosen.id]=(s.history[chosen.id]||0)+1;s.lastOpponentId=chosen.id;note(s,me.id,chosen.id);return chosen;}
  function chooseBotPair(s){const bots=activePlayers(s).filter(p=>!p.isHuman);const pairs=[];for(let i=0;i<bots.length;i++)for(let j=i+1;j<bots.length;j++)if(bots[i].team!==bots[j].team)pairs.push({a:bots[i],b:bots[j],n:count(s,bots[i].id,bots[j].id)});if(!pairs.length)return null;const min=Math.min(...pairs.map(x=>x.n));const pool=pairs.filter(x=>x.n===min);return pool[Math.floor(Math.random()*pool.length)];}
  function simulateBotMatch(s,a,b){if(!P.active(a)||!P.active(b))return null;const common=P.SUITS.filter(x=>a.numberCards.some(c=>c.suit===x.key)&&b.numberCards.some(c=>c.suit===x.key));const suit=(common.length?common:P.SUITS)[Math.floor(Math.random()*(common.length?common:P.SUITS).length)].key;const pick=(p,op)=>{const n=[...p.numberCards].filter(c=>c.suit===suit).sort((x,y)=>y.value-x.value);const pool=n.length?n:[...p.numberCards].sort((x,y)=>y.value-x.value);const amount=Math.min(pool.length,1+Math.floor(Math.random()*3));const cards=pool.slice(0,amount);let special=null;if(p.specialCards.shotgun&&op.isZombie)special='shotgun';else if(p.specialCards.vaccine&&op.isZombie&&Math.random()<.65)special='vaccine';else if(p.specialCards.zombie&&!op.isZombie&&Math.random()<.25)special='zombie';return {cards,special};};const ap=pick(a,b),bp=pick(b,a);const r=E.resolve({a,b,aCards:ap.cards.concat(ap.special?[{type:'special',special:ap.special}]:[]),bCards:bp.cards.concat(bp.special?[{type:'special',special:bp.special}]:[]),suit});note(s,a.id,b.id);if(r.winner&&r.loser){const visible=r.loser===b?ap.cards:bp.cards;if(visible.length){const c=[...visible].sort((x,y)=>y.value-x.value)[0];E.transferOne(r.winner,r.loser,c.id);}}return r;}
  function simulateBetweenRounds(s,count=4){for(let i=0;i<count;i++){const pair=chooseBotPair(s);if(!pair)break;simulateBotMatch(s,pair.a,pair.b);}s.round++;return s;}
  function save(s){localStorage.setItem(KEY,JSON.stringify(s));}
  function load(){try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}}
  function clear(){localStorage.removeItem(KEY)}
  global.ZHTournament={KEY,createRoster,makeState,activePlayers,chooseOpponent,chooseBotPair,simulateBotMatch,simulateBetweenRounds,save,load,clear};
})(window);
