var _ = require('lodash');
var nconf = require('nconf');
var express = require('express');
var file = require('../controllers/file');
var db = require('../controllers/db');
var JobInfo = require('../models').JobInfo;
var log = require('../controllers/log')(module);
var recognize = require('../controllers/recognize_process');

var api = express.Router();

api.use(function (req, res, next) {
    if (db.isReady())
        next();
    else
        next(901);
});

api.get('/job/:id', function (req, res, next) {
        var jobId = req.params.id;
        if (!jobId || !_.isString(jobId) || !jobId.length)
            next(1101);
        JobInfo.findOne({_id: jobId}, {status: 1, rawJob: 1}, function (err, jobInfo) {
            if (err)
                return next(err);
            if (!jobInfo)
                return next(1102);
            var json_response = {
                status: "Ok!",
                job: {
                    id: jobInfo._id,
                    status: jobInfo.status
                }
            };
            if (jobInfo.rawJob) {
                json_response.job.result = jobInfo.rawJob.result;
                json_response.job.error = jobInfo.rawJob.error;
            }
            res.json(json_response);
        });
    }
);

api.post('/recognize', file.upload, file.process);


module.exports.router = api;