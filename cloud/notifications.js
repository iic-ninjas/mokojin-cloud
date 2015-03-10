module.exports = {
  sendDataChangedNotification: function() {
    var everyoneQuery = new Parse.Query(Parse.Installation);
    return Parse.Push.send({
      where: everyoneQuery,
      data: {
        type: "dataChanged"
      }
    });
  }
}
