var Player = Parse.Object.extend("Player", {

}, {
  find: function(id){
    var q = new Parse.Query(Player);
    return q.get(id);
  },
});

module.export = Player;
