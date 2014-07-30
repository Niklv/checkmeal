var _ = require('lodash');
var util = require('util');
var http = require('http');
var errors = require('../config/errors.json');
var log = require('./log')(module);


/**
 * ServerError constructor.
 *
 * @constructor
 * @this {ServerError}
 * @param message Message.
 * @param error_code Error code.
 * @param additional_data Additional data, must be object.
 * @param http_code Http code for server response.
 */
function ServerError(error_code, message, additional_data, http_code) {
    if (_.isNumber(error_code)) {
        this.error_code = error_code;
        if (_.has(http.STATUS_CODES, error_code)) {
            this.http_code = error_code;
            this.message = http.STATUS_CODES[error_code];
        } else {
            var err = _.has(errors, error_code) ? errors[error_code] : errors[0];
            this.http_code = err.http;
            this.message = err.msg;
        }
    } else {
        this.http_code = errors[0].http;
        this.message = errors[0].msg;
    }

    if (!message || typeof message !== 'string') {
        http_code = additional_data;
        additional_data = message;
    } else
        this.message = message;


    if (!additional_data || !_.isObject(additional_data)) {
        http_code = additional_data;
    } else
        this.data = additional_data;

    if (http_code && _.isNumber(http_code))
        this.http_code = http_code;
    Error.captureStackTrace(this, ServerError);
}
util.inherits(ServerError, Error);
ServerError.prototype.name = 'ServerError';
ServerError.prototype.toJSON = function () {
    var result = {err: {
        num: this.error_code,
        msg: this.message
    }};
    if (this.data && _.isObject(this.data))
        result.err = _.extend(result.err, this.data);
    return result;
};


function PageNotFound(req, res, next) {
    next(404);
}

function ErrorHandler(err, req, res, next) {
    if (err) {
        if (typeof err === 'Error')
            log.error(err.stack);

        if (typeof err === 'MongoError')
            err = new ServerError(901);
        else if (typeof err === 'number')
            err = new ServerError(err);

        if (err.name == 'ServerError')
            return res.status(err.http_code).json(err.toJSON());
        else {
            log.error(err.stack);
            return res.status(500).json({err: {num: '500', msg: 'Unknown error: ' + err.message}})
        }
    } else
        next();
}

module.exports.ErrorHandler = ErrorHandler;
module.exports.PageNotFound = PageNotFound;
module.exports.ServerError = ServerError;
