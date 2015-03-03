var Player = Parse.Object.extend("Player", {

}, {
});


var Match = Parse.Object.extend("Match", {

}, {
  currentMatch: function(){
    var query = new Parse.Query(Match);
    query.doesNotExist('endedAt');
    query.include('playerA');
    query.include('playerB');
    return query.first();
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
      return Parse.Promise.as(player);
    });
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
              response.success(player);
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
