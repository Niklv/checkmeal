var _ = require('lodash');
var Job = require('kue').Job;
var JobInfo = require('./../models').JobInfo;
var log = require('./log')(module);
var util = require('util');

Job.prototype.old_log = Job.prototype.log;
Job.prototype.log = function () {
    var args = arguments;
    args[0] = '[Job' + this.id + '] ' + args[0];
    log.info.apply(this, args);
    Job.prototype.old_log.apply(this, args);
};

Job.prototype.old_state = Job.prototype.state;
Job.prototype.state = function () {
    var self = this, args = arguments;
    self.log(args[0]);
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
