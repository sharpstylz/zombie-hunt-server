/* ZOMBIE HUNT — BATTLE ENGINE
   Deterministic rule functions shared by computer/online layers. */
(function(global){
  const P=global.ZHPlayer;
  const {SUITS}=P;
  function total(cards,suit){return (cards||[]).reduce((n,c)=>n+(c.type==='number'&&c.suit===suit?Number(c.value)||0:0),0);}
  function hasSpecial(cards,s){return (cards||[]).some(c=>c.type==='special'&&c.special===s);}
  function applySpecial(attacker,target,special){
    if(!special||!attacker||!target||attacker.eliminated||target.eliminated)return {used:false};
    if(special==='shotgun'){
      if(!attacker.specialCards.shotgun)return {used:false};
      attacker.specialCards.shotgun=false;
      if(target.isZombie){P.eliminate(target,'SHOTGUN');return {used:true,eliminated:true};}
      return {used:true,wasted:true};
    }
    if(special==='vaccine'){
      if(!attacker.specialCards.vaccine)return {used:false};
      attacker.specialCards.vaccine=false;
      if(target.isZombie){target.isZombie=false;target.specialCards.zombie=false;return {used:true,cured:true};}
      return {used:true,wasted:true};
    }
    if(special==='zombie'){
      if(!attacker.specialCards.zombie)return {used:false};
      if(!target.isZombie){target.isZombie=true;target.specialCards.zombie=true;return {used:true,converted:true};}
      return {used:true,noEffect:true};
    }
    return {used:false};
  }
  function resolve({a,b,aCards=[],bCards=[],suit}){
    const aWasZombie=!!a.isZombie,bWasZombie=!!b.isZombie;
    const aZombie=hasSpecial(aCards,'zombie'),aVaccine=hasSpecial(aCards,'vaccine'),aShotgun=hasSpecial(aCards,'shotgun');
    const bZombie=hasSpecial(bCards,'zombie'),bVaccine=hasSpecial(bCards,'vaccine'),bShotgun=hasSpecial(bCards,'shotgun');
    const log=[]; let winner=null;
    const ar=applySpecial(a,b,aZombie?'zombie':aShotgun?'shotgun':aVaccine?'vaccine':null); if(ar.used)log.push({side:'a',...ar});
    const br=(!a.eliminated&&!b.eliminated)?applySpecial(b,a,bZombie?'zombie':bShotgun?'shotgun':bVaccine?'vaccine':null):{used:false}; if(br.used)log.push({side:'b',...br});
    if(a.eliminated&&!b.eliminated) winner=b;
    else if(b.eliminated&&!a.eliminated) winner=a;
    else if(ar.converted&&!aWasZombie&&!bWasZombie) winner=a;
    else if(br.converted&&!aWasZombie&&!bWasZombie) winner=b;
    else {
      const ta=total(aCards,suit),tb=total(bCards,suit);
      if(ta>tb)winner=a; else if(tb>ta)winner=b;
    }
    return {winner,loser:winner?(winner===a?b:a):null,aTotal:total(aCards,suit),bTotal:total(bCards,suit),log};
  }
  function transferOne(winner,loser,cardId){
    if(!winner||!loser||!cardId)return null;
    const i=(loser.numberCards||[]).findIndex(c=>c.id===cardId);
    if(i<0)return null; const [c]=loser.numberCards.splice(i,1);winner.numberCards.push(c);winner.claimedCards.push(c);if(!loser.numberCards.length)P.eliminate(loser,'NO CARDS');return c;
  }
  global.ZHGameEngine={total,hasSpecial,applySpecial,resolve,transferOne};
})(window);
