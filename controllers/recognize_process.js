var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var nconf = require('nconf');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var exec = require('child_process').exec;
var log = require('./log')(module);


var executionProperties = {
    cwd: path.resolve(nconf.get('NODE_DIR') + '/' + nconf.get('upload_dir')),
    timeout: nconf.get("reco:timeout")
};
var recognitionCommand = nconf.get("reco:command");

/**
 @constructor
 */
function RecognizeProcess(fileName) {
    this.fileName = fileName;
    this.child_process = null;
}
util.inherits(RecognizeProcess, EventEmitter);

RecognizeProcess.prototype.start = function () {
    var self = this;
    if (!self.fileName)
        self.emit('error', new Error('No image file path'));
    self.child_process = exec(recognitionCommand + " " + self.fileName, executionProperties, function (execErr, stdout, stderr) {
        if (execErr !== null) {
            log.error('stderr: ' + stderr);
            log.error(execErr.stack);
            return self.emit('error', execErr);
        }
        try {
            var result = JSON.parse(stdout);
        } catch (parseErr) {
            console.error("Parsing error:");
            log.error(parseErr.stack);
            return self.emit('error', parseErr);
        }
        self.emit('done', result);
    });
};

RecognizeProcess.prototype.kill = function () {
    if (this.child_process)
        this.child_process.kill();
};


module.exports = RecognizeProcess;




