_ = require('underscore');
var Match = require('cloud/models/match.js');
var Queue = require('cloud/models/queue.js');

var SessionData = {
  get: function(){
    return Parse.Promise.when([
      Match.currentMatch(),
      Queue.getQueue()
    ]).then(function(currentMatch, queue){
        return Parse.Promise.as({
          match: currentMatch,
          queue: queue
        });
    });
  },
  goodnight: function(){
    return SessionData.get().then(function(sessionData){
      var promises = [];
      if (sessionData.match){
        promises.push(sessionData.match.forfeit());
      }
      if (sessionData.queue){
        promises.concat(
          _.map(sessionData.queue, function(queueItem){
            return queueItem.destroy();
          })
        );
      }
      return Parse.Promise.when(promises);
    });
  }
};

module.exports = SessionData;
