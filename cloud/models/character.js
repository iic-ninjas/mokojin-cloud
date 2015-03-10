var Character = Parse.Object.extend("Character", {

}, {
  all: function(){
    var q = new Parse.Query(Character);
    return q.find()
  },
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

module.exports = Character;
