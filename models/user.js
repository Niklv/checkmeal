var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var user = new Schema({
    email: {
        type: String,
        require: true,
        index: { unique: true }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('user', user);
