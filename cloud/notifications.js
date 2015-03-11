var SESSION_DATA_CHANGED = "sessionDataChanged";

module.exports = {
  sendDataChangedNotification: function() {

    var everyoneQuery = new Parse.Query(Parse.Installation);
    return Parse.Push.send({
      where: everyoneQuery,
      data: {
        type: SESSION_DATA_CHANGED
      }
    }).fail(function(err) {
      console.log("error sending notification: " + err.message);
    });
  }
}
