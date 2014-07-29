var fs = require('fs');
var path = require('path');
var mongoose = require('mongoose');
var Grid = require('gridfs-stream');
var log = require('./log')(module);

var gfs = null;

function upload(path, mime, meta, cb) {
    if (!gfs)
        try {
            gfs = Grid(mongoose.connection.db, mongoose.mongo);
        } catch (err) {
            gfs = null;
            return cb(err);
        }
    var writestream = gfs.createWriteStream({
        content_type: mime || 'binary/octet-stream',
        mode: 'w',
        metadata: meta || {}
    });

    fs.createReadStream(path).pipe(writestream);

    writestream
        .on('close', function (grid_file) {
            cb(null, grid_file);
        })
        .on('error', function (err) {
            cb(err, null);
        });
}

function remove(file_id, cb) {
    if (!gfs)
        try {
            gfs = Grid(mongoose.connection.db, mongoose.mongo);
        } catch (err) {
            gfs = null;
            return cb(err);
        }
    gfs.remove(file_id, cb);
}


module.exports.upload = upload;