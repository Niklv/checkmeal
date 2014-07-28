var _ = require('lodash');
var async = require('async');
var exec = require("exec");
var nconf = require("nconf");
var fs = require('fs');
var path = require('path');
var log = require('./log')(module);
var jobs = require('./recognize_kue').jobs;


function RecognizeProcess() {

}


RecognizeProcess.prototype.start = function () {
};


RecognizeProcess.prototype.pause = function () {
};

RecognizeProcess.prototype.stop = function () {
};


module.exports = RecognizeProcess;




