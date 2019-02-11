const jwt = require('jsonwebtoken');
const response = require('../etc/response');
const resCode = require('../enum/responseCodesEnum');
const resMessage = require('../enum/responseMessagesEnum');

async function authenticateToken(req, res, next) {
    let token = req.headers.authorization;
    if (!token) return response.sendResponse(res, resCode.UNAUTHORIZED, resMessage.ACCESS_DENIED);

    try {
        let verifiedTotken = jwt.verify(token, process.env.SECRET);
        req.auth = verifiedTotken;
        next();
    } catch (error) {
        console.log(error);
        return response.sendResponse(res, resCode.UNAUTHORIZED, resMessage.INVALID_TOKEN);
    }
}

module.exports = {
    authenticateToken
}