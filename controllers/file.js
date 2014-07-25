var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var nconf = require('nconf');
var multer = require('multer');
var ServerError = require('./error').ServerError;
var log = require('./log')(module);

module.exports.upload = multer({
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
});


module.exports.check = function (req, res, next) {
    var incoming_files = null,
        good_files = [],
        errors = [];
    if (!req.files)
        return next(1001);
    if (_.isArray(req.files.files))
        incoming_files = req.files.files;
    else
        incoming_files = [req.files.files];
    log.debug(incoming_files);
    incoming_files.forEach(function (file) {
        if (!file) {
        } else if (!file.mimetype || file.mimetype.split('/')[0] != "image") {
            errors.push({file: file.originalname, msg: "Not an image"});
            deleteFile(file, "wrong mimetype");
        } else if (file.truncated) {
            errors.push({file: file.originalname, msg: "Too big or error while saving."});
            deleteFile(file, "truncated");
        } else {
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

    if (errors.length)
        return next(new ServerError(1002, {data: errors}));

    if (!good_files.length)
        return next(1003);

    /*recognize(good_files, function (err, data) {
        if (err)
            return next(err);
        res.json(200, {status: "Ok!", ticket: data});
    });*/
    next();
};


function deleteFile(file, cause) {
    if (file && file.path) {
        var p = path.resolve(nconf.get("NODE_DIR") + "/" + file.path);
        fs.unlink(p, function (err, data) {
            if (err) {
                log.error(err.stack);
                log.error("All files:");
                log.error(files);
                log.error("Problem file:");
                log.error(file);
            } else
                log.info(file.path + " - deleted for " + cause + "!");
        })
    } else {
        log.error("No filepath! Can't delete.");
        log.error("All files:");
        log.error(files);
        log.error("Problem file:");
        log.error(file);
    }
}
