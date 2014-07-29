var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var async = require('async');
var nconf = require('nconf');
var multer = require('multer');
var mongoose = require('mongoose');
var Grid = require('gridfs-stream');
var ServerError = require('./error').ServerError;
var log = require('./log')(module);
var startRecognizeJob = require('./recognize_kue').startRecognizeJob;
var JobInfo = require('./../models').JobInfo;

module.exports.upload = multer({
    dest: nconf.get('upload_dir'),
    limits: nconf.get('file_limits'),
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
    if (!req.files)
        return next(1001);
    var uploadedFiles = _.isArray(req.files.files) ? req.files.files : [req.files.files],
        validFiles = [], fileErrors = [], currentDate = new Date();

    log.debug(uploadedFiles);
    //filter files for mime type
    uploadedFiles.forEach(function (file) {
        if (!file) {
            //TODO: ???????
        } else if (!file.mimetype || file.mimetype.split('/')[0] != 'image')
            fileErrors.push({file: file.originalname, msg: 'Not an image'});
        else if (file.truncated)
            fileErrors.push({file: file.originalname, msg: 'File is too big or error while saving.'});
        else {
            validFiles.push(_.chain(file).omit(['fieldname', 'path']).extend({creator: null, createdAt: currentDate}).valueOf());
        }
    });

    if (fileErrors.length) {
        next(new ServerError(1002, {data: fileErrors}));
        return deleteFilesFromFs(uploadedFiles);
    }

    if (!validFiles.length) {
        next(1003);
        return deleteFilesFromFs(uploadedFiles);
    }

    JobInfo.create(validFiles, function (err) {
        if (err) {
            log.error(err.stack);
            return next(new ServerError(1005, {data: err.stack}));
        }
        var jobInfos = _.rest(arguments);
        res.json({status: 'Ok!', tickets: _.map(jobInfos, '_id')}); //send _ids to client
        setImmediate(startKueJobs, jobInfos);
    });


};

function startKueJobs(jobInfos) {
    async.map(jobInfos, startRecognizeJob, function (err, data) {
        if (err)
            log.error(err.stack);
/*        if (_.isArray(data))
            res.json({status: 'Ok!', tickets: data}); //end
        else
            next(0);*/
    });
}

function writeFilesToGridFs(files, cb) {
    async.map(files, writeFileToGridFs, cb);
}

function writeFileToGridFs(file, cb) {
    var gfs = Grid(mongoose.connection.db);
    var writestream = gfs.createWriteStream({
        content_type: file.mimetype,
        mode: 'w',
        filename: file.name,
        metadata: {
            originalname: file.originalname,
            encoding: file.encoding,
            extension: file.extension,
            creator: null
        }
    }), fp = path.resolve(nconf.get('NODE_DIR') + '/' + nconf.get('upload_dir') + '/' + file.name);

    fs.createReadStream(fp).pipe(writestream);

    writestream
        .on('close', function (grid_file) {
            cb(null, grid_file);
        })
        .on('error', function (err) {
            err.file = file;
            cb(err, null);
        });
}

function deleteFilesFromGridFs(files, cb) {
    async.filter(files, deleteFileGridFs, function (errors) {
        cb && cb(errors.length ? errors : null);
    });
}

function deleteFileGridFs(file, cb) {
    log.debug('Delete from gridfs', file._id);
    var gfs = Grid(mongoose.connection.db);
    gfs.remove({_id: file._id}, function (err) {
        if (err) {
            log.error('Error deleting file!');
            log.error(err.stack);
            log.error('Problem file:');
            log.error(file);
            cb && cb(null, {file: file, err: err});
        } else {
            log.debug('success delete from gridfs', file._id);
            cb && cb();
        }
    });
}

function deleteFilesFromFs(files, cb) {
    async.filter(files, deleteFileFs, function (errors) {
        cb && cb(errors.length ? errors : null);
    });
}

function deleteFileFs(file, cb) {
    log.debug('Delete from fs', file.name);
    fs.unlink(path.resolve(nconf.get('NODE_DIR') + '/' + nconf.get('upload_dir') + '/' + file.name), function (err) {
        if (err) {
            log.error('Error deleting file!');
            log.error(err.stack);
            log.error('Problem file:');
            log.error(file);
            cb && cb(null, {file: file, err: err});
        } else {
            log.debug('success delete from fs', file.name);
            cb && cb();
        }
    });
}

