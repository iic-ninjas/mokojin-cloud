var SESSION_DATA_CHANGED = "sessionDataChanged";
var INVITE_PLAYERS_TITLE = "IT'S TEKKEN TIME!";
var INVITE_PLAYERS_ALERT = "Go to the living room now!";

module.exports = {
  notifySessionDataChanged: function() {

    var everyoneQuery = new Parse.Query(Parse.Installation);
    return Parse.Push.send({
      where: everyoneQuery,
      data: {
        type: SESSION_DATA_CHANGED
      }
    }).fail(function(err) {
      console.log("error sending notification: " + err.message);
    });
  },

  notifyInvitation: function() {
    var everyoneQuery = new Parse.Query(Parse.Installation);

    return Parse.Push.send({
      where: new Parse.Query(Parse.Installation),
      data: {
        title: INVITE_PLAYERS_TITLE,
        alert: INVITE_PLAYERS_ALERT
      }
    });
  }
}
