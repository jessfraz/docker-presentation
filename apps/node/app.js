var express = require('express'),
  exphbs = require('express-handlebars'),
  http = require('http'),
  path = require('path');

var app = express();

app.set('port', process.env.PORT || 3000);

app.set('views', __dirname + '/views');

app.set('view engine', 'html');
app.engine('html', exphbs({
  defaultLayout: 'main',
  extname: '.html'
}));
app.enable('view cache');

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res) {
  res.render("index");
});

var server = http.createServer(app);

server.listen(app.get('port'), function() {
  console.log("Express server listening on port " + app.get('port'));
});