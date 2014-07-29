var _ = require('lodash');
var Job = require('kue').Job;
var JobInfo = require('./../models').JobInfo;
var log = require('./log')(module);
var util = require('util');

Job.prototype.old_log = Job.prototype.log;
Job.prototype.log = function () {
    var oldVal = arguments[0];
    arguments[0] = '[Job' + this.id + '] ' + arguments[0];
    log.info.apply(this, arguments);
    arguments[0] = oldVal;
    Job.prototype.old_log.apply(this, arguments);
};
Job.prototype.debug = function () {
    var oldVal = arguments[0];
    arguments[0] = '[Job' + this.id + '] ' + arguments[0];
    log.debug.apply(this, arguments);
    arguments[0] = oldVal;
    Job.prototype.old_log.apply(this, arguments);
};


Job.prototype.old_state = Job.prototype.state;
Job.prototype.state = function () {
    var self = this, args = arguments;
    self.debug(args[0]);
    JobInfo.findByIdAndUpdate(this.data.mongo_id, {$set: {'rawJob.status': args[0]}}, function (err) {
        if (err)
            self.log('Error update state in mongo', err.stack);
        Job.prototype.old_state.apply(self, args);
    });
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
