_ = require('underscore');
var Character = Parse.Object.extend("Character", {

}, {
  find: function(id){
    var q = new Parse.Query(Character);
    return q.get(id);
  },
  safeFind: function(id){
    return this.find(id).fail(function(err){
      return Parse.Promise.as(null);
    });
  }
});

var Player = Parse.Object.extend("Player", {

}, {
  find: function(id){
    var q = new Parse.Query(Player);
    return q.get(id);
  },
});


MatchEnums = ['playerA', 'playerB', 'tie'];
var Match = Parse.Object.extend("Match", {
  isCurrent: function(){
    return this.get('endedAt') == null;
  },
  endMatch: function(winner){
    this.set('winner', winner);
    this.set('endedAt', Date.now());
    return this.save();
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
    return query.first();
  },
  find: function(id){
    var q = new Parse.Query(Match);
    q.include('playerA');
    q.include('playerB');
    return q.get(id);
  },
  findPlayerInCurrentMatch: function(person){
    var promise = new Parse.Promise();
    Match.currentMatch().then(
      function(match){
        if (!match){
          promise.resolve(null)
        } else {
          if (match.get('playerA').get('person') == person){
            promise.resolve(match.get('playerA'))
          } else if (match.get('playerB').get('person') == person){
            promise.resolve(match.get('playerB'))
          } else {
            promise.resolve(null);
          }
        }
      }
    );
    return promise;
  }
});

var Queue = Parse.Object.extend("QueueItem", {
  dequeue: function(){
    var player = this.get('player');
    return this.destroy().then(function(){
      return player;
    })
  }
}, {
  findPlayerInQueue: function(person){
    var innerQuery = new Parse.Query(Player);
    innerQuery.equalTo("person", person);
    var query = new Parse.Query(Queue);
    query.matchesQuery('player', innerQuery);
    return query.first();
  },
  enqueuePerson: function(person){
    var player = new Player()
    player.set('person', person);
    var queue = new Queue()
    queue.set('player', player);
    //TODO: might need to trigger match
    return queue.save().then(function(queueItem){
      return player;
    });
  },
  peek: function(skip){
    if (!skip) skip = 0
    var query = new Parse.Query(Queue);
    query.include('player');
    query.include('player.person');
    query.include('player.characterA');
    query.include('player.characterB');
    query.ascending("createdAt");
    query.skip(skip);
    return query.first();
  }
});

var Person = Parse.Object.extend("Person", {
  // Instance methods
  joinQueue: function() {
    var person = this;
    return Parse.Promise.when([
      Queue.findPlayerInQueue(person),
      Match.findPlayerInCurrentMatch(person)
    ]).then(
      function(playerFromQueue, playerFromMatch){
        if (playerFromQueue) return Parse.Promise.as(playerFromQueue)
        if (playerFromMatch) return Parse.Promise.as(playerFromMatch)
        return Queue.enqueuePerson(person);
      }
    )
  }
}, {
  // Class methods
  find: function(id){
    var q = new Parse.Query(Person);
    return q.get(id);
  },
  findOrCreate: function(name) {
    var q = new Parse.Query(Person);
    q.equalTo("name", name);
    var promise = q.first().then(
      function(user){
        if (!user){
          u = new Person();
          u.set('name', name);
          return u.save()
        }
      }
    )
    return promise;
  }
});

// Expects to receive params.name
// Returns person
Parse.Cloud.define("createPerson", function(request, response) {
  var username = request.params.name;
  if (!username) {
    response.error("name is required")
    return;
  }
  Person.findOrCreate(username.trim()).done(
    function(person){
      response.success(person);
    }
  ).fail(
    function (person, err){
      response.error(err);
    }
  )
});

// Expects to receive params.person [id]
// Returns player
Parse.Cloud.define("joinQueue", function(request, response) {
  var personId = request.params.person;
  if (!personId) {
    response.error("person (id) is required");
    return;
  }
  Person.find(personId).then(
    function(person){
      if (!person){
        response.error("No person matching that id")
      } else {
        person.joinQueue().done(
          function(player){
            if (player){
              Match.currentMatch().then(
                function(match){
                  if (match) {
                    return null;
                  } else {
                    return Match.startMatch()
                  }
                }
              ).then( function(){
                response.success(player);
              });
            } else {
              response.error('No player :(');
            }
          }
        ).fail(
          function(err){
            response.error(err);
          }
        )
      }
    }
  )
});

// Expects to receive params.player     [id]
//                    params.characterA [id]
//                    params.characterB [id]
// Returns player
Parse.Cloud.define("setCharacter", function(request, response) {
  var playerId = request.params.player;
  if (!playerId) {
    response.error("player (id) is required");
    return;
  }
  var characterA = request.params.characterA;
  var characterB = request.params.characterB;
  if (!characterA) {
    response.error("characterA (id) is required");
    return;
  }

  Parse.Promise.when([
    Player.find(playerId),
    Character.find(characterA),
    Character.safeFind(characterB),
  ]).then(
    function(player, charA, charB){
      player.set("characterA", charA);
      player.set("characterB", charB);
      return player.save();
    }
  ).done(
    function(player){
      response.success(player);
    }
  ).fail(
    function(err){
      response.error(err);
    }
  )
});


// Expects to receive params.match      [id]
//                    params.winner     [enum]
// Returns match
Parse.Cloud.define("endMatch", function(request, response) {
  var matchId = request.params.match;
  if (!matchId) {
    response.error("match (id) is required");
    return;
  }

  var winner = request.params.winner;
  if (!winner || Match.validWinnerValue(winner)) {
    response.error("valid winner value required");
    return;
  }

  Match.find(matchId).then(
    function(match){
      if (!match){
        response.error("No match found");
      } else if (!match.isCurrent()){
        response.error("Can't change match after it's done");
      }
      return match.endMatch(winner);
    }
  ).then(
    function(match){
      var winner = match.winner();
      var loser = match.loser();
      loser.get('person').joinQueue().then(function(){
        Match.startMatch(winner).then(
          function(newMatch){
            if (newMatch){
              response.success(newMatch);
            } else {
              response.error();
            }
          }
        );
      })
    }
  )
});
