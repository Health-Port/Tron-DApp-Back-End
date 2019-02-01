const statusCode = require('../enum/responseCodesEnum');

function sendResponse(res, code, message, data, token) {
    return res.status(code).json({
        code: code,
        message: message,
        data: data,
        token: token,
    });
}
/**
 * call this function to send response to user when error occuered at any level
 * @param {*} res response obj to return api
 * @param {*} err Error occured
 */
function errReturned(res, err) {
    res
        .status(statusCode.BAD_REQUEST)
        .json({
            code: statusCode.BAD_REQUEST,
            message: err.message ? err.message : err
        });
}
module.exports = {
    sendResponse,
    errReturned
};