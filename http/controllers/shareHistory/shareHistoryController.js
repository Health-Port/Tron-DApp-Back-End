const utils = require('../../../etc/utils')
const response = require('../../../etc/response')
const resCode = require('../../../enum/responseCodesEnum')
const resMessage = require('../../../enum/responseMessagesEnum')

const db = global.healthportDb

async function addShareHistory(req, res) {
	try {
		const { user_id } = req.auth
		const { medicalRecordId, providers, rights } = req.body

		let err = {}, user = {}

		if (!medicalRecordId)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.REQUIRED_FIELDS_EMPTY)

		if (!providers || providers.length == 0)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.PROVIDER_IS_REQUIRED)

		if (!rights || rights.length == 0)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.ACCESS_RIGHTS_REQUIRED);

		//Verifying user authenticity  
		[err, user] = await utils.to(db.models.users.findOne({ where: { id: user_id } }))
		if (err) return response.errReturned(res, err)
		if (user == null)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND)

		//Returing successful response with data
		return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, user)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

module.exports = {
	addShareHistory
}