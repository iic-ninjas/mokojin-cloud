var Player = require('cloud/models/player.js');

var Queue = Parse.Object.extend("QueueItem", {
  dequeue: function(){
    var player = this.get('player');
    return this.destroy().then(function(){
      return player;
    })
  }
}, {
  getQueue: function(){
    return this._queueQuery().find();
  },
  _queueQuery: function(){
    var query = new Parse.Query(Queue);
    query.include('player');
    query.include('player.person');
    query.include('player.characterA');
    query.include('player.characterB');
    query.ascending("createdAt");
    return query
  },
  find: function(id){
    var q = new Parse.Query(Queue);
    return q.get(id);
  },
  findPlayerInQueue: function(person){
    var innerQuery = new Parse.Query(Player);
    innerQuery.equalTo("person", person);
    var query = new Parse.Query(Queue);
    query.matchesQuery('player', innerQuery);
    query.include('player');
    return query.first().then(function(queueItem){
      if (queueItem){
        return queueItem.get('player');
      } else {
        return null;
      }
    });
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
    var query = this._queueQuery();
    query.skip(skip);
    return query.first();
  }
});

module.exports = Queue;
