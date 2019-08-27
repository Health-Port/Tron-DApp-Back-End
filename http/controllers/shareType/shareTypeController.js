const utils = require('../../../etc/utils')
const response = require('../../../etc/response')
const resCode = require('../../../enum/responseCodesEnum')
const resMessage = require('../../../enum/responseMessagesEnum')

const db = global.healthportDb

async function getShareTypes(req, res) {
    try {
        const { user_id } = req.auth

        let err = {}, shareTypes = {}, user = {};

        //Verifying user authenticity  
        [err, user] = await utils.to(db.models.users.findOne({ where: { id: user_id } }))
        if (err) return response.errReturned(res, err)
        if (user == null)
            return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

        //Getting all providers from db
        [err, shareTypes] = await utils.to(db.models.share_types.findAll(
            {
				attributes: ['id', 'name'],
                order: [['name', 'asc']]
            }))
        if (err) return response.errReturned(res, err)
        if (!shareTypes || shareTypes == null || shareTypes.length == 0)
            return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)
        
        //Returing successful response with data
        return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, shareTypes)

    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

module.exports = {
    getShareTypes
}