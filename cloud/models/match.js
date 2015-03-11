var Queue = require('cloud/models/queue.js');
var Elo = require('cloud/elo.js');

MatchEnums = ['playerA', 'playerB'];
var Match = Parse.Object.extend("Match", {
  isCurrent: function(){
    return this.get('endedAt') == null;
  },
  forfeit: function(){
    return this.save({
      winner: 'none',
      endedAt: new Date()
    });
  },
  endMatch: function(winner){
    return this.save({
      winner: winner,
      endedAt: new Date()
    }).then(function(match){
      return Elo.adjustMatchResults(match);
    });
  },
  winner: function(){
    var winner = this.get('winner');
    if (winner == 'playerA'){
      return this.get('playerA');
    } else if (winner == 'playerB'){
      return this.get('playerB');
    } else {
      return null;
    }
  },
  loser: function(){
    var winner = this.get('winner');
    if (winner == 'playerA'){
      return this.get('playerB');
    } else if (winner == 'playerB'){
      return this.get('playerA');
    } else {
      return null;
    }
  }
}, {
  startMatch: function(seededPlayer){
    return Parse.Promise.when( // Get the first two QueueItems
      [Queue.peek(0), Queue.peek(1)]
    ).then(function(queueItem0, queueItem1){ // Make sure we have 2 players, dequeue the ones that we need from the queue
      if (!queueItem0) return Parse.Promise.error("can't start a match - not enough players")
      if (!queueItem1 && !seededPlayer) return Parse.Promise.error("can't start a match - not enough players")
      return Parse.Promise.when([
        queueItem0.dequeue(),
        seededPlayer ? Parse.Promise.as(seededPlayer) : queueItem1.dequeue()
      ]);
    }).then(function(player0, player1){ // Create the new match obj
      var match = new Match();
      match.set('playerA', player0);
      match.set('playerB', player1);
      return match.save();
    })
  },
  validWinnerValue: function(winner){
    return MatchEnums.indexOf(winner) > -1
  },
  currentMatch: function(){
    var query = new Parse.Query(Match);
    query.doesNotExist('endedAt');
    query.include('playerA');
    query.include('playerB');
    query.include('playerA.person');
    query.include('playerA.characterA');
    query.include('playerA.characterB');
    query.include('playerB.person');
    query.include('playerB.characterA');
    query.include('playerB.characterB');
    return query.first().then(function(match){
      if (!match) return null;
      match.attributes.expected = Elo.expectedMatch(match);
      return match;
    });
  },
  find: function(id){
    var query = new Parse.Query(Match);
    query.include('playerA');
    query.include('playerB');
    query.include('playerA.person');
    query.include('playerA.characterA');
    query.include('playerA.characterB');
    query.include('playerB.person');
    query.include('playerB.characterA');
    query.include('playerB.characterB');
    return query.get(id);
  },
  findPlayerInCurrentMatch: function(person){
    return Match.currentMatch().then(function(match){
      if (!match) return null;
      if (match.get('playerA').get('person').id == person.id){
        return match.get('playerA');
      } else if (match.get('playerB').get('person').id == person.id){
        return match.get('playerB');
      }
      return null;
    });
  }
});
module.exports = Match;
