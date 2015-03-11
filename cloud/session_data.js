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
  }
};

module.exports = SessionData;
