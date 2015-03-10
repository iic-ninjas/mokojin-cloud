_ = require('underscore');

var Character = require('cloud/models/character.js');
var Player = require('cloud/models/player.js');
var Match = require('cloud/models/match.js');
var Queue = require('cloud/models/queue.js');
var Person = require('cloud/models/person.js');

var Elo = require('cloud/elo.js');
var SessionData = require('cloud/session_data.js');

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////                    CLOUD FUNCTIONS                     ////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

// Returns sessionData
Parse.Cloud.define("getSessionData", function(request, response){
  SessionData.get().then(function(sessionData){
    response.success(sessionData);
  });
});

// Returns a list of characters
Parse.Cloud.define("getCharacters", function(request, response){
  Character.all().then(function(characters){
    response.success(characters);
  });
});

// Returns a list of all the people
Parse.Cloud.define("getPeople", function(request, response){
  Person.all().then(function(people){
    response.success(people);
  });
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


// Expects to receive params.queueItem [id]
// Returns nil
Parse.Cloud.define("leaveQueue", function(request, response) {
  var queueItemId = request.params.queueItem;
  if (!queueItemId) {
    response.error("queueItem (id) is required");
    return;
  }
  Queue.find(queueItemId).then(
    function(queueItem){
      if (!queueItem){
        response.error("No queue item matching that id");
      } else {
        queueItem.dequeue().done(
          function(player){
            response.success();
          }
        ).fail(
          function(err){
            response.error(err);
          }
        );
      }
    }
  );
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
  if (!winner || !Match.validWinnerValue(winner)) {
    response.error("valid winner value required");
    return;
  }

  Match.find(matchId).then(
    function(match){
      if (!match){
        response.error("No match found");
        return null;
      } else if (!match.isCurrent()){
        response.error("Can't change match after it's done");
        return null;
      }
      return match.endMatch(winner);
    }
  ).then(
    function(match){
      if (!match) return null;
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

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////                         HOOKS                          ////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

Parse.Cloud.beforeSave("Person", function(request, response) {
  var person = request.object;
  if (person.existed()) {
    response.success();
  } else {
    person.set('rank', Elo.startRank);
    response.success();
  }
});
