//Config
var nconf = require('nconf');
nconf.use('memory').argv().env();
if (nconf.get('NODE_ENV') != 'production') nconf.set('NODE_ENV', 'development');
nconf.add('defaults', {type: 'file', file: './config/default.json'});
nconf.set('NODE_DIR', __dirname);

//libs
var _ = require('underscore');
var fs = require('fs');
var express = require('express');
var morgan = require('morgan');
var https = require('https');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var compression = require('compression');
var models = require('./models');
var api = require('./routers/api');
var log = require('./controllers/log')(module);
var db = require('./controllers/db');


log.info("Start in " + nconf.get("NODE_ENV"));

var app = express();
db.connect();

//app.disable('etag');
app.disable('x-powered-by');
if (nconf.get('NODE_ENV') != 'production')
    app.use(morgan({
        format: 'dev',
        stream: { write: function (message, encoding) {
            log.debug(message.replace(/(\r\n|\n|\r)/gm, ""));
        }}
    }));
app.use('/', express.static(__dirname + '/static_files'));
app.use(methodOverride());
app.use(bodyParser.json());
app.use(compression());
app.use('/api', api.router);
app.get('/', function (req, res) {
    res.send(' <form method="post" action="/api/recognize" enctype="multipart/form-data"><input type="file" name="files" multiple/>' +
        '<br>' +
        '<input type="submit" value="Upload" /></form>');
});
log.info("Server config complete!");

var httpsServer = https.createServer({
    cert: fs.readFileSync(nconf.get("security:server:cert"), 'utf8'),
    key: fs.readFileSync(nconf.get("security:server:key"), 'utf8')
}, app).listen(nconf.get("https_port"), function () {
    log.info("HTTPS Express server listening on port " + nconf.get("https_port"));
});