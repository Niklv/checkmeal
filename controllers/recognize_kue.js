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


var jobs = kue.createQueue({
        redis: nconf.get('redis')
    }),
    app = kue.app;
log.info(nconf.get('redis'));

jobs.on('error', function (err) {
    //log.error(err);
    //TODO: try reconnect
});

jobs.process('recognize', function (job, done, ctx) {
    //TODO: start processing
    //log.info(ctx);
    /*ctx.shutdown(function (err) {
     log.info('shutdown signal');
     }, 5000);*/
    log.info('START PROCESSING');
    JobInfo.findOneAndUpdate({_id: job.data.mongo_id}, {$set: {status: "active"}}, function (err) {
        if (err)
            log.error(err);
        setTimeout(function () {
            log.info('END PROCESSING');
            done(null, {will_be: 'in json format'});
        }, 5000);
    });
});

jobs.on('job complete', onJobEnd).on('job failed', onJobEnd);

function onJobEnd(jobInCacheId) {
    async.auto({
        jobInCache: function findJobInCache(done) {
            kue.Job.get(jobInCacheId, function (err, jobInCache) {
                if (err)
                    done(err);
                else if (!jobInCache)
                    done(new Error('JobInCache with id=' + jobInCacheId + ' not found'));
                else
                    done(null, jobInCache)
            });
        },
        jobInDb: ['jobInCache', function findJobInDb(done, ctx) {
            if (!ctx.jobInCache.data || !ctx.jobInCache.data.mongo_id)
                return done(new Error('No mongo_id in jobInCache.data jobInCacheId=' + jobInCacheId));
            JobInfo.findOne({_id: ctx.jobInCache.data.mongo_id}, function (err, jobInDb) {
                if (err)
                    done(err);
                else if (!jobInDb)
                    done(new Error('JobInDb with id=' + ctx.jobInCache.data.mongo_id + ' not found'));
                else
                    done(null, jobInDb);
            });
        }],
        fileGridFsId: ['jobInCache', 'jobInDb', function uploadImageToGridFs(done, ctx) {
            var imageFilePath = path.resolve(nconf.get('NODE_DIR') + '/' + nconf.get('upload_dir') + '/' + ctx.jobInDb.name),
                mimetype = ctx.jobInDb.mimetype,
                metadata = {
                    originalname: ctx.jobInDb.originalname,
                    name: ctx.jobInDb.name,
                    encoding: ctx.jobInDb.encoding,
                    extension: ctx.jobInDb.extension
                };
            fs.exists(imageFilePath, function (exists) {
                if (exists)
                    GridFs.upload(imageFilePath, mimetype, metadata, function (err, fileGridFsId) {
                        //if err don't delete file
                        if (err) {
                            log.error('[Job' + jobInCacheId + '] Error while upload file to gridFs (' + imageFilePath + '): ' + err.stack);
                            ctx.jobInCache.log('Error while upload file to gridFs (' + imageFilePath + '): ' + err.stack);
                        } else
                            fs.unlink(imageFilePath, function (err) {
                                if (err) {
                                    log.error('[Job' + jobInCacheId + '] Error while removing file(' + imageFilePath + '): ' + err.stack);
                                    ctx.jobInCache.log('Error while removing file(' + imageFilePath + '): ' + err.stack);
                                } else
                                    ctx.jobInCache.debug('image file delete success');
                            });
                        done(null, err ? null : fileGridFsId);
                    });
                else {
                    ctx.jobInCache.debug('DEBUG_INFO_START');
                    ctx.jobInCache.debug('jobInDb : ', ctx.jobInDb.toString());
                    ctx.jobInCache.debug('jobInCache.id : ' + ctx.jobInCache.id);
                    ctx.jobInCache.debug('jobInCacheId : ' + jobInCacheId);
                    ctx.jobInCache.debug('jobInCache : ' + JSON.stringify(ctx.jobInCache.data));
                    ctx.jobInCache.debug('imageFilePath : ' + imageFilePath);
                    ctx.jobInCache.debug('imageFilePath : ' + ctx.jobInDb.name);
                    ctx.jobInCache.debug('DEBUG_INFO_END');
                    log.error('IMAGE FILE NOT EXIST! ' + imageFilePath);
                    done(null, null);
                }
            });
        }],
        jobInCacheLogs: ['jobInDb', 'fileGridFsId', function getJobInCacheLogs(done, ctx) {
            kue.Job.log(jobInCacheId, function (err, logs) {
                if (err)
                    log.error(err);
                done(null, (logs && logs.length) ? logs : null);
            });
        }],
        savedJob: ['jobInCache', 'jobInDb', 'fileGridFsId', 'jobInCacheLogs', function saveJobDataFromCacheToDb(done, ctx) {
            ctx.jobInDb.file = ctx.fileGridFsId;
            ctx.jobInDb.status = ctx.jobInCache._state;
            ctx.jobInDb.rawJob = {
                id: ctx.jobInCache.id,
                priority: ctx.jobInCache._priority,
                delay: ctx.jobInCache._delay,
                attempts: ctx.jobInCache._attempts,
                max_attempts: ctx.jobInCache._max_attempts,
                state: ctx.jobInCache._state,
                created_at: ctx.jobInCache.created_at,
                updated_at: ctx.jobInCache.updated_at,
                failed_at: ctx.jobInCache.failed_at,
                duration: ctx.jobInCache.duration,
                error: ctx.jobInCache._error,
                result: ctx.jobInCache.result,
                log: ctx.jobInCacheLogs
            };
            ctx.jobInDb.save(function (err, jobInfo) {
                done(err, jobInfo);
                // if err don't delete job in cache
                if (!err || !ctx.jobInCacheLogs)
                    ctx.jobInCache.remove(function (err) {
                        if (err)
                            log.error('[Job' + jobInCacheId + '] Error while removing job: ' + err.stack);
                        else
                            log.debug('[Job' + jobInCacheId + '] job removed');
                    });
            });
        }]
    }, function (err, data) {
        if (err)
            log.error(err.stack);
    })
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

function restartFailedAtShutdownJobs() {
    log.info("Restart failed at shutdown jobs");
    jobs.failed(function (err, data) {
        if (err) {
            log.error("Error find failed job");
            log.error(err.stack);
            return;
        }
        async.map(data, function (id, done) {
            kue.Job.get(id, done);
        }, function (err, data) {
            if (err) {
                log.error("Error find failed job");
                log.error(err.stack);
                return;
            }
            data.forEach(function (item) {
                /*if(item._error == "Shutdown")
                 item.promote();*/
            });
        });

    });

}


function shutdownKue(cb) {
    log.info('Stop jobs');
    jobs.shutdown(function (err) {
        log.info('Kue is shut down.', err || '');
        cb && cb();
    }, 1000);

}

module.exports.jobs = jobs;
module.exports.app = app;
module.exports.startRecognizeJob = startRecognizeJob;
module.exports.restartFailedAtShutdownJobs = restartFailedAtShutdownJobs;
module.exports.shutdown = shutdownKue;
