var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var jobInfo = new Schema({
    file: {
        type: Schema.Types.ObjectId,
        ref: 'fs.files'
    },
    originalname: {
        type: String,
        require: true,
        index: true
    },
    name: {
        type: String,
        require: true,
        index: { unique: true }
    },
    encoding: {
        type: String
    },
    mimetype: {
        type: String
    },
    extension: {
        type: String,
        require: true,
        index: true
    },
    size: {
        type: Number,
        require: true,
        index: true
    },
    truncated: {
        type: Boolean,
        require: true,
        index: true
    },
    creator: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        require: true,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String
    },
    rawJob: {
        type: Object
    }
});

module.exports = mongoose.model('job_info', jobInfo);


