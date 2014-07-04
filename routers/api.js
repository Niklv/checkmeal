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

api.post('/recognize', function (req, res) {
    console.log(req.headers);

    var files = null,
        files_to_db = [];
    if (!req.files)
        return res.json(400, {err: {code: 1001, msg: "No files provided!"}});
    if (_.isArray(req.files.files))
        files = req.files.files;
    else
        files = [req.files.files];

    log.debug(files);

    var errors = [];
    files.forEach(function (file) {
        if (!file.mimetype || file.mimetype.split('/')[0] != "image") {
            errors.push({file: file.originalname, msg: "Not an image"});
            delete_file(file, "wrong mimetype");
        } else if (file.truncated) {
            errors.push({file: file.originalname, msg: "Too big or error while saving."});
            delete_file(file, "truncated");
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
    });

    if (errors.length)
        return res.json(400, {err: {code: 1002, msg: "Error while saving files", data: errors}});

    File.create(files_to_db, function (err) {
        if (err)
            return res.json(400, {err: {code: 0, msg: err.stack}});
        res.json(200, {status: "Ok!", ticket: _.rest(arguments, 1).map(function (item) {
            return item._id;
        })});
    });
});

function delete_file(file, cause) {
    if (file && file.path) {
        var p = path.resolve(nconf.get("NODE_DIR") + "/" + file.path);
        fs.unlink(p, function (err, data) {
            if (err) {
                log.error(err.stack);
                log_files_error(files, file);
            } else
                log.info(file.path + " - deleted for " + cause + "!");
        })
    } else {
        log.error("No filepath! Can't delete.");
        log_files_error(files, file);
    }
}

function log_files_error(files, file) {
    log.error("All files:");
    log.error(files);
    log.error("Problem file:");
    log.error(file);
}
module.exports.router = api;
