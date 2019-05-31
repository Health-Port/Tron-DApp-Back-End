const jwt = require('jsonwebtoken')
const response = require('../etc/response')
const resCode = require('../enum/responseCodesEnum')
const resMessage = require('../enum/responseMessagesEnum')
const utils = require('../etc/utils')

const db = global.healthportDb

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
    let err = {}, permisions = {}
    const token = req.headers.authorization
    if (!token) return response.sendResponse(res, resCode.UNAUTHORIZED, resMessage.ACCESS_DENIED)

    try {
        const verifiedTotken = jwt.verify(token, process.env.SECRET);

        [err, permisions] = await utils.to(db.query(`
            Select f.route from permissions p
            Inner join features f ON p.feature_id = f.id
            Where p.role_id = :roleId`,
            {
                replacements: { roleId: verifiedTotken.roleId },
                type: db.QueryTypes.SELECT,
            }))
        if (err) return response.errReturned(res, err)
        if (!permisions || permisions == null || permisions.length == 0)
            return response.sendResponse(res, resCode.NOT_FOUND, 'No permision found.')

        if (permisions) {
            const filterArray = permisions.filter(x => x.route == req.route.path)
            if (!(filterArray.length > 0))
                return response.sendResponse(
                    res, 
                    resCode.BAD_REQUEST, 
                    'Access Denied.')
        }
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