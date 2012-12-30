var user = require('./user');
var event = require('./event');

var mapping = {
  '/user/list': user.list,
  '/user/heartbeat': user.heartbeat,
  '/event/send' : event.send,
  '/event/fetch' : event.fetch,
}

exports.map_url = function(app, config) {
  for (var key in mapping) {
    app = app.use(config.server.base + key, mapping[key]);
  }
  return app;
}


