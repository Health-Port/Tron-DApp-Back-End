const utils = require('../../../etc/utils')
const response = require('../../../etc/response')
const resCode = require('../../../enum/responseCodesEnum')
const resMessage = require('../../../enum/responseMessagesEnum')

const db = global.healthportDb

async function addMedicalRecord(req, res) {
	try {
		const { user_id } = req.auth
		const { templateId, accessToken } = req.body

		let err = {}, user = {}, record = {}

		//Checking empty required fields 
		if (!(templateId && accessToken))
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.REQUIRED_FIELDS_EMPTY);

		//Verifying user authenticity
		[err, user] = await utils.to(db.models.users.findOne({ where: { id: user_id } }))
		if (err) return response.errReturned(res, err)
		if (!user || user.length == 0 || user == null)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

		//Checking weather record already exists
		[err, record] = await utils.to(db.models.medical_records.findOne(
			{ where: { template_id: templateId, user_id } 
		}))
		if (err) return response.errReturned(res, err)
		if (record)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.MEDICAL_RECORD_ALREADY_EXISTS);

		//Saving medical record in db
		[err, record] = await utils.to(db.models.medical_records.create(
			{
				template_id: templateId,
				user_id,
				access_token: accessToken
			}))
		if (err) return response.errReturned(res, err)
		if (!record)
			return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)

		//Returing successful response
		return response.sendResponse(res, resCode.SUCCESS, 'Medical record added.')

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

module.exports = {
	addMedicalRecord
}