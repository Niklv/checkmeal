var _ = require("underscore");
var util = require("util");
var http = require("http");
var errors = require("../config/errors.json");
var log = require("./log")(module);


/**
 * ServerError constructor.
 *
 * @constructor
 * @this {ServerError}
 * @param message Message.
 * @param error_code Error code.
 * @param additional_data Additional data.
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

    /*this.http_code = typeof http_code !== 'undefined' ? http_code : 500;
     this.error_code = "" + typeof error_code !== 'undefined' ? error_code : 0;
     this.message = typeof message !== 'undefined' ? message : "Unknown error";
     Error.captureStackTrace(this, ServerError);*/

}

util.inherits(ServerError, Error);
ServerError.prototype.name = "ServerError";
ServerError.prototype.getJsonMessage = function () {
    return {
        err: {
            num: this.error_code,
            msg: this.message
        }
    };
};


function PageNotFound(req, res, next) {
    next(404);
}

function ErrorHandler(err, req, res, next) {
    if (err) {
        if (typeof err === 'number')
            return res.json(err, {err: {num: "" + err, msg: "HTTP" + err + " error"}});
        else if (err.name == "serverError")
            return res.json(err.http_code, err.getJsonMessage());
        else {
            log.error(err.stack);
            return res.json(500, {err: {num: "500", msg: "Unknown error: " + err.message}})
        }
    } else
        next();
}

module.exports.ErrorHandler = ErrorHandler;
module.exports.PageNotFound = PageNotFound;
module.exports.ServerError = ServerError;
