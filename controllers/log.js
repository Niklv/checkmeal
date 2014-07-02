var winston = require('winston');
var nconf = require('nconf');

function getLogger(module) {
    var path = module.filename.replace(/\\/g, '/').split('/').slice(-2).join('/');
    return new winston.Logger({
        transports: [
            new winston.transports.Console({
                colorize: true,
                prettyPrint: true,
                timestamp: function () {
                    return new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
                },
                /*json: true,
                 stringify: function (obj) {
                 return JSON.stringify(obj, null, 2);
                 },*/
                level: (nconf.get('NODE_ENV') == 'production') ? 'info' : 'debug',
                label: path
            })
        ]
    });
}

module.exports = getLogger;