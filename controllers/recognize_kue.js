var _ = require('lodash');
var fs = require('fs');
var kue = require('kue');
var path = require('path');
var nconf = require('nconf');
var async = require('async');
var log = require('./log')(module);
var JobInfo = require('./../models').JobInfo;
var RecognizeJob = require('./recognize_job');
var GridFs = require('./gridfs');

var app = kue.app;
var jobs = kue.createQueue({
    db: nconf.get('redis:db')
});

jobs.process('recognize', function (job, done, ctx) {
    //TODO: start processing


    setTimeout(function () {
        //done(new Error('WOAH'), 'RESULT FUCK YEAH');
        done(new Error("JOB ERRROR!!!!!"), {result: 'can it be json?'});
    }, 5000);

});

jobs.on('job complete', onJobEnd).on('job failed', onJobEnd);

function onJobEnd(jobInCacheId) {
    async.waterfall([
            function findJobInCache(done) {
                kue.Job.get(jobInCacheId, function (err, jobInCache) {
                    if (err)
                        done(err);
                    else if (!jobInCache)
                        done(new Error('JobInCache with id=' + jobInCacheId + ' not found'));
                    else
                        done(null, jobInCache)
                });
            },
            function findJobInDb(jobInCache, done) {
                if (!jobInCache.data || !jobInCache.data.mongo_id)
                    return done(new Error('No mongo_id in jobInCache.data jobInCacheId=' + jobInCacheId));
                JobInfo.findOne({_id: jobInCache.data.mongo_id}, function (err, jobInDb) {
                    if (err)
                        done(err);
                    else if (!jobInDb)
                        done(new Error('JobInDb with id=' + jobInCache.data.mongo_id + ' not found'));
                    else
                        done(null, jobInCache, jobInDb);
                });
            },
            function uploadImageToGridFs(jobInCache, jobInDb, done) {
                var imageFilePath = path.resolve(nconf.get('NODE_DIR') + '/' + nconf.get('upload_dir') + '/' + jobInDb.name),
                    mimetype = jobInDb.mimetype,
                    metadata = {
                        originalname: jobInDb.originalname,
                        name: jobInDb.name,
                        encoding: jobInDb.encoding,
                        extension: jobInDb.extension
                    };
                fs.exists(imageFilePath, function (exists) {
                    if (!exists)
                        GridFs.upload(imageFilePath, mimetype, metadata, function (err, fileGridFsId) {
                            //if err don't delete file
                            if (err)
                                log.error(err);
                            else
                                fs.unlink(imageFilePath, function (err) {
                                    if (err)
                                        log.error('[Job' + jobInCacheId + '] Error while removing file(' + imageFilePath + '): ' + err.stack);
                                    else
                                        log.debug('[Job' + jobInCacheId + '] image file delete success');
                                });
                            done(null, jobInCache, jobInDb, err ? null : fileGridFsId);
                        });
                    else {
                        jobInCache.debug('DEBUG_INFO_START');
                        jobInCache.debug('jobInDb : ', jobInDb.toString());
                        jobInCache.debug('jobInCache.id : ' + jobInCache.id);
                        jobInCache.debug('jobInCacheId : ' + jobInCacheId);
                        jobInCache.debug('jobInCache : ' + JSON.stringify(jobInCache.data));
                        jobInCache.debug('imageFilePath : ' + imageFilePath);
                        jobInCache.debug('imageFilePath : ' + jobInDb.name);
                        jobInCache.debug('DEBUG_INFO_END');
                        log.error("IMAGE FILE NOT EXIST! " + imageFilePath);
                        done(null, jobInCache, jobInDb, null);
                    }
                });
            },
            function getCacheJobLogs(jobInCache, jobInDb, fileGridFsId, done) {
                //kue.Jobs.logs();
                done(null, jobInCache, jobInDb, fileGridFsId);
            },
            function saveJobDataFromCacheToDb(jobInCache, jobInDb, fileGridFsId, jobInCacheLog, done) {
                jobInDb.file = fileGridFsId;
                jobInDb.status = jobInCache._state;
                jobInDb.rawJob = {
                    id: jobInCache.id,
                    priority: jobInCache._priority,
                    delay: jobInCache._delay,
                    attempts: jobInCache._attempts,
                    max_attempts: jobInCache._max_attempts,
                    state: jobInCache._state,
                    created_at: jobInCache.created_at,
                    updated_at: jobInCache.updated_at,
                    failed_at: jobInCache.failed_at,
                    duration: jobInCache.duration,
                    error: jobInCache._error,
                    result: jobInCache.result,
                    log: jobInCacheLog
                };
                jobInDb.save(function (err, jobInfo) {
                    done(err, jobInfo);
                    // if err don't delete job in cache
                    if (!err)
                        jobInCache.remove(function (err) {
                            if (err)
                                log.error('[Job' + jobInCacheId + '] Error while removing job: ' + err.stack);
                            else
                                log.debug('[Job' + jobInCacheId + '] job removed');
                        });
                });
            },
            function notificateUser(jobInfo, done) {
                //TODO: send notification to user
                done();
            }
        ],
        function (err, data) {
            if (err)
                log.error(err.stack);
        }
    );
}


function startRecognizeJob(fileInfo, cb) {
    if (!fileInfo || !_.isObject(fileInfo))
        return cb(new Error('No file provided'), null);
    var job = new RecognizeJob(fileInfo).save(function (err) {
        if (err)
            job.log('Error saving to redis ' + err.stack);
        else
            job.debug('saved to redis');
        cb(err);
    });
}


function shutdownKue(cb) {
    log.info('Stop jobs');
    jobs.shutdown(function (err) {
        log.info('Kue is shut down.', err || '');
        cb && cb();
    }, 2000);

}

module.exports.jobs = jobs;
module.exports.app = app;
module.exports.startRecognizeJob = startRecognizeJob;
module.exports.shutdown = shutdownKue;
