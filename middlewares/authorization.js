const jwt = require('jsonwebtoken')
const response = require('../etc/response')
const resCode = require('../enum/responseCodesEnum')
const resMessage = require('../enum/responseMessagesEnum')

async function authenticateToken(req, res, next) {
    const token = req.headers.authorization
    if (!token) return response.sendResponse(res, resCode.UNAUTHORIZED, resMessage.ACCESS_DENIED)

    try {
        const verifiedTotken = jwt.verify(token, process.env.SECRET)
        req.auth = verifiedTotken
        next()
    } catch (error) {
        console.log(error)
        return response.sendResponse(res, resCode.UNAUTHORIZED, resMessage.INVALID_TOKEN)
    }
}

async function authenticateRole(req, res, next) {
    const token = req.headers.authorization
    if (!token) return response.sendResponse(res, resCode.UNAUTHORIZED, resMessage.ACCESS_DENIED)

    try {
        const verifiedTotken = jwt.verify(token, process.env.SECRET)
        if (verifiedTotken.permissions)
            if ((verifiedTotken.permissions.includes(req.route.path)))
                return response.sendResponse(res, resCode.NOT_FOUND, 'No permision found.')
            else
                return response.sendResponse(res, resCode.BAD_REQUEST, `Access denied for api ${req.route.path}`)

        next()
    } catch (error) {
        console.log(error)
        return response.sendResponse(res, resCode.UNAUTHORIZED, resMessage.INVALID_TOKEN)
    }
}

module.exports = {
    authenticateToken,
    authenticateRole
}