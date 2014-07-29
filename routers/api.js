var kue = require('kue');
var nconf = require('nconf');
var express = require('express');
var file = require('../controllers/file');
var log = require('../controllers/log')(module);
var recognize = require('../controllers/recognize_process');


var api = express.Router();

/*api.get('/job/:id', function (req, res) {
 var id = req.params.id;
 kue.Job.get(id, function (err, job) {
 if (err) {
 log.error(err);
 res.json(404, {err: {code: 404, msg: 'Not found'}});
 } else
 res.json(200, {status: 'Ok!', job: job.state});
 console.log(job.state())
 });
 });*/

api.post('/recognize', file.upload, file.process);


module.exports.router = api;