var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var file = new Schema({
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
    }
});

module.exports = mongoose.model('file', file);

