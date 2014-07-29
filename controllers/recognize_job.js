var _ = require('lodash');
var Job = require('kue').Job;
var JobInfo = require('./../models').JobInfo;
var log = require('./log')(module);
var util = require('util');

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

RecognizeJob.prototype.log = function () {
    log.info('log called');
    log.info.apply(this, _.union(['[Job' + this.id + ']'], arguments));
    RecognizeJob.super_.prototype.log.apply(this, arguments);
};

RecognizeJob.prototype.state = function () {
    var self = this;
    self.log('new state =', arguments[0]);
    self.log('mongo_id =', this.data.mongo_id);
    JobInfo.findByIdAndUpdate(this.data.mongo_id, {$set: {state: arguments[0]}}, function (err) {
        if (err)
            self.log('Error update state in mongo', err.stack);
    });
    RecognizeJob.super_.prototype.state.apply(self, arguments);
};


module.exports = RecognizeJob;
