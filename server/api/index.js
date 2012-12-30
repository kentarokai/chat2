var user = require('./user');
var event = require('./event');
var image = require('./image');

var mapping = {
  '/user/list': user.list,
  '/user/heartbeat': user.heartbeat,
  '/event/send' : event.send,
  '/event/fetch' : event.fetch,
  '/image/upload' : image.upload,
  '/image/convert' : image.convert,
}

exports.map_url = function(app, config) {
  for (var key in mapping) {
    app = app.use(config.server.base + key, mapping[key]);
  }
  return app;
}


