var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var async = require('async');
var nconf = require('nconf');
var multer = require('multer');
var express = require('express');
var log = require('../controllers/log')(module);
var File = require('../models').File;

var api = express.Router();


api.use(multer({
    dest: nconf.get("upload_dir"),
    limits: nconf.get("file_limits"),
    onFileUploadStart: function (file) {
        log.info(file.fieldname + ' is starting ...')
    },
    onFileUploadComplete: function (file) {
        log.debug(file.fieldname + ' uploaded to  ' + file.path)
    },
    onError: function (error, next) {
        log.error(error);
        next(error);
    },
    onFilesLimit: function () {
        log.error('onFilesLimit: Crossed file limit!');
    },
    onFieldsLimit: function () {
        log.error('onFieldsLimit: Crossed fields limit!');
    },
    onPartsLimit: function () {
        log.error('onPartsLimit: Crossed parts limit!');
    }
}));

api.post('/file', function (req, res) {
    var files = null,
        files_to_db = [];
    if (!req.files)
        return res.json(200, {err: {msg: "No files provided!"}});
    if (_.isArray(req.files.files))
        files = req.files.files;
    else
        files = [req.files.files];
    log.debug(files);
    files.forEach(
        function (file) {
            if (!file.mimetype || file.mimetype.split('/')[0] != "image") {
                if (file.path) {
                    var p = path.resolve(nconf.get("NODE_DIR") + "/" + file.path);
                    fs.unlink(p, function (err, data) {
                        if (err) {
                            log.error(err.stack);
                            log_files_error(files, file);
                        } else
                            log.info(file.path + " - deleted for wrong mimetype!");
                    })
                } else {
                    log.error("No filepath! Can't delete.");
                    log_files_error(files, file);
                }
            } else {
                files_to_db.push({
                    originalname: file.originalname,
                    name: file.name,
                    encoding: file.encoding,
                    mimetype: file.mimetype,
                    extension: file.extension,
                    size: file.size,
                    truncated: file.truncated,
                    creator: null,
                    createdAt: new Date()
                });
            }
        }
    );
    File.create(files_to_db, function (err) {
        if (err)
            return res.json(200, {err: {msg: err.stack}});
        res.json(200, {status: "Ok!", uploaded: files_to_db});
    });
});


function log_files_error(files, file) {
    log.error("All files:");
    log.error(files);
    log.error("Problem file:");
    log.error(file);
}
module.exports.router = api;
