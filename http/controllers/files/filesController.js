const utils = require('../../../etc/utils')
const resMessage = require('../../../enum/responseMessagesEnum')
const resCode = require('../../../enum/responseCodesEnum')
const response = require('../../../etc/response')
const db = global.healthportDb


async function saveFilesByUser(req, res) {
    const id = req.body.userId
    let result = {}, error
    console.log(req.body)
    try {
        [error, result] = await utils.to(db.models.users.findOne({
            where: {
                id
            }
        }))
        if (result == null)
            return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);
        [error, result] = await utils.to(db.models.user_files.create(
            {
                user_id: result.id,
                file_name: req.body.fileName,
                access_token: req.body.accessToken
            }
        ))
        if (!error) {
            console.log('success')
        }

        return response.sendResponse(
            res,
            resCode.SUCCESS,
            resMessage.DOCUMENT_SAVED

        )


    }
    catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }

}

module.exports = {
    saveFilesByUser
}