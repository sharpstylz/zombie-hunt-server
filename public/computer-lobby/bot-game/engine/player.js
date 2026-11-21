/* ZOMBIE HUNT — PLAYER MODEL
   Shared model for computer/online engines. */
(function (global) {
  const TEAMS = ['TEAM A','TEAM B','TEAM C','TEAM D'];
  const SUITS = [
    { key:'hearts', name:'HEARTS', symbol:'♥', color:'red' },
    { key:'diamonds', name:'DIAMONDS', symbol:'♦', color:'red' },
    { key:'clubs', name:'CLUBS', symbol:'♣', color:'black' },
    { key:'spades', name:'SPADES', symbol:'♠', color:'black' }
  ];
  const VALUES = [2,3,4,5,6,7,8,9,10];
  let seq = 0;
  const id = (prefix='id') => `${prefix}-${Date.now().toString(36)}-${(++seq).toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  const pick = a => a[Math.floor(Math.random()*a.length)];
  const shuffle = a => { const x=[...a]; for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]];} return x; };
  function card(value, suitKey){ const s=SUITS.find(x=>x.key===suitKey)||pick(SUITS); return {id:id('card'),type:'number',number:value,value,suit:s.key,suitName:s.name,symbol:s.symbol,color:s.color}; }
  function createHand(count=7, preferredSuit=null){
    const hand=[];
    if(preferredSuit) hand.push(card(pick(VALUES), preferredSuit));
    while(hand.length<count) hand.push(card(pick(VALUES), pick(SUITS).key));
    return shuffle(hand);
  }
  function createPlayer({id:playerId,name,avatar,team,isHuman=false,isZombie=false,numberCards=7}={}){
    return { id:playerId||id('player'), name:name||'SURVIVOR', avatar:avatar||'char1.jpg', team:team||TEAMS[0], isHuman:!!isHuman, alive:true, eliminated:false, isZombie:!!isZombie,
      specialCards:{ zombie:!!isZombie, vaccine:true, shotgun:true }, numberCards:Array.isArray(numberCards)?numberCards:createHand(numberCards), claimedCards:[], stats:{matches:0,wins:0,losses:0,eliminations:0,points:0} };
  }
  function visibleHiddenCount(p){ return (p?.numberCards?.length||0)+(p?.specialCards?.vaccine?1:0)+(p?.specialCards?.shotgun?1:0); }
  function active(p){ return !!p && p.alive && !p.eliminated && (p.numberCards?.length||0)>0; }
  function eliminate(p,reason='NO CARDS'){ if(!p||p.eliminated)return false; p.alive=false;p.eliminated=true;p.eliminationReason=reason;p.isZombie=false;if(p.specialCards)p.specialCards.zombie=false;return true; }
  global.ZHPlayer = {TEAMS,SUITS,VALUES,id,pick,shuffle,card,createHand,createPlayer,visibleHiddenCount,active,eliminate};
})(window);
