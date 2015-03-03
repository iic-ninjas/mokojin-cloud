var Person = Parse.Object.extend("Person", {
  // Instance methods
}, {
  // Class methods
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
Parse.Cloud.define("createPerson", function(request, response) {
  var username = request.params.name;
  if (!username) {
    response.error("name is required")
    return;
  }
  Person.findOrCreate(username.trim()).done(
    function(user){
      response.success(user);
    }
  ).fail(
    function (user, err){
      response.error(err);
    }
  )
});
