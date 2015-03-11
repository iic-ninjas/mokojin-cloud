var Elo = {
  startRank: 1200,
  K: 20,
  expected: function(rankA, rankB){
    return 1/(1 + Math.pow(10, (rankB-rankA)/400));
  },
  adjusted: function(rankA, rankB, didWin){
    var sValue = didWin ? 1 : 0;
    return rankA + Elo.K * (sValue - Elo.expected(rankA, rankB));
  },
  expectedMatch: function(match){
    return Elo.expected(match.get('playerA').get('person').get('rank'),
                        match.get('playerB').get('person').get('rank'));
  },
  adjustMatchResults: function(match){
    if (!match) return null;
    var personA = match.get('playerA').get('person');
    var rankA = personA.get('rank');
    var personB = match.get('playerB').get('person');
    var rankB = personB.get('rank');
    var playerADidWin = match.get('winner') == 'playerA';

    var adjustedRankA = Elo.adjusted(rankA, rankB, playerADidWin);
    var adjustedRankB = Elo.adjusted(rankB, rankA, !playerADidWin);

    return Parse.Promise.when([
        personA.save({rank: adjustedRankA}),
        personB.save({rank: adjustedRankB}),
    ]).then(function(){
      return match;
    });
  },
};

module.exports = Elo;
