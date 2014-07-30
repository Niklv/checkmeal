var _ = require('lodash');
var Job = require('kue').Job;
var JobInfo = require('./../models').JobInfo;
var log = require('./log')(module);
var util = require('util');

Job.prototype.old_log = Job.prototype.log;
Job.prototype.log = function () {
    arguments[0] = this.getStrTimestamp() + ' - INFO: ' + arguments[0];
    Job.prototype.old_log.apply(this, arguments);
};
Job.prototype.debug = function () {
    arguments[0] = this.getStrTimestamp() + ' - DEBUG: ' + arguments[0];
    Job.prototype.old_log.apply(this, arguments);
};


Job.prototype.old_state = Job.prototype.state;
Job.prototype.state = function () {
    this.debug("State changed to " + arguments[0]);
    Job.prototype.old_state.apply(this, arguments);
};

Job.prototype.getStrTimestamp = function () {
    return new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
};


/**
 * @constructor
 */
function RecognizeJob(fileInfo) {
    RecognizeJob.super_.call(this, 'recognize', {title: 'Recognize ' + fileInfo._id + ' ' + fileInfo.originalname,
        filename: fileInfo.name,
        mongo_id: fileInfo._id.toString()
    });
}
util.inherits(RecognizeJob, Job);

module.exports = RecognizeJob;
