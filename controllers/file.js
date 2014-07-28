var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var async = require('async');
var nconf = require('nconf');
var multer = require('multer');
var ServerError = require('./error').ServerError;
var log = require('./log')(module);
var startRecognizeJob = require('./recognize_kue').startRecognizeJob;

module.exports.upload = multer({
    dest: nconf.get("upload_dir"),
    limits: nconf.get("file_limits"),
    onFileUploadStart: function (file) {
        log.debug(file.fieldname + ' is starting ...')
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
});

module.exports.process = function (req, res, next) {
    var incoming_files, good_files = [], errors = [];
    if (!req.files)
        return next(1001);

    incoming_files = _.isArray(req.files.files) ? req.files.files : [req.files.files];
    log.debug(incoming_files);

    incoming_files.forEach(function (file) {
        if (!file) {
        } else if (!file.mimetype || file.mimetype.split('/')[0] != "image")
            errors.push({file: file.originalname, msg: "Not an image"});
        else if (file.truncated)
            errors.push({file: file.originalname, msg: "File is too big or error while saving."});
        else {
            good_files.push({
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

    if (errors.length) {
        next(new ServerError(1002, {data: errors}));
        return deleteFilesFromFs(incoming_files);
    }

    if (!good_files.length) {
        next(1003);
        return deleteFilesFromFs(incoming_files);
    }

    async.map(good_files, startRecognizeJob, function (err, data) {
        if (err)
            log.error(err.stack);
        if (_.isArray(data))
            res.json(200, {status: "Ok!", tickets: data}); //end
        else
            next(0);
    });


    /*startRecognizeJob(good_files, function (err, data) {
     if (err)
     return next(err);
     res.json(200, {status: "Ok!", ticket: data});
     });*/
};

function deleteFilesFromFs(files, cb) {
    async.filter(files, deleteFileFs, function (errors) {
        cb && cb(errors.length ? errors : null);
    });
}

function deleteFileFs(file, cb) {
    log.debug("Delete from fs", file.name);
    fs.unlink(path.resolve(nconf.get("NODE_DIR") + "/" + file.path), function (err) {
        if (err) {
            log.error("Error deleting file!");
            log.error(err.stack);
            log.error("Problem file:");
            log.error(file);
            cb && cb(null, {file: file, err: err});
        } else {
            log.debug("success delete from fs", file.name);
            cb && cb();
        }
    });
}

