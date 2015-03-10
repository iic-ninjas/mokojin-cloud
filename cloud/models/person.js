var Match = require('cloud/models/match.js');
var Queue = require('cloud/models/queue.js');

var Person = Parse.Object.extend("Person", {
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
  all: function(){
    var query = new Parse.Query(Person);
    query.ascending("name");
    return query.find()
  },
  find: function(id){
    var q = new Parse.Query(Person);
    return q.get(id);
  },
  findOrCreate: function(name) {
    var q = new Parse.Query(Person);
    q.equalTo("name", name);
    return q.first().then(
      function(user){
        if (!user){
          u = new Person();
          u.set('name', name);
          return u.save();
        }
      }
    );
  }
});

module.exports = Person;
