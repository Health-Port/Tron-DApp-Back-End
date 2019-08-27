const utils = require('../../../etc/utils')
const response = require('../../../etc/response')
const resCode = require('../../../enum/responseCodesEnum')
const resMessage = require('../../../enum/responseMessagesEnum')

const db = global.healthportDb

async function addShareHistory(req, res) {
	try {
		const { user_id } = req.auth
		const { medicalRecordId, providers, rights } = req.body

		let err = {}, user = {}, result = {}, obj = {}, record = {}

		if (!medicalRecordId)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.REQUIRED_FIELDS_EMPTY)

		if (!providers || providers.length == 0)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.PROVIDER_IS_REQUIRED)

		if (!rights || rights.length == 0)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.ACCESS_RIGHTS_REQUIRED)

		if (rights.length > 2)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.ACCESS_RIGHTS_LENGHT_ERROR);

		//Verifying user authenticity  
		[err, user] = await utils.to(db.models.users.findOne({ where: { id: user_id } }))
		if (err) return response.errReturned(res, err)
		if (user == null)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

		//Checking if record already exists
		[err, record] = await utils.to(db.models.share_histories.findAll(
			{ where: { medical_record_id: medicalRecordId, share_from_user_id: user_id } }))
		if (err) return response.errReturned(res, err)

		let flag = false
		for (let i = 0; i < record.length; i++) {
			for (let j = 0; j < providers.length; j++) {
				if (record[i].share_with_user_id == providers[j].providerId){
					flag = true
					break
				}
			}
		}
		if (flag)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.RECORD_ALREADY_SHRED)

		//Mapping data for share_historis table
		const data = providers.map(elem => (
			{
				medical_record_id: medicalRecordId,
				share_from_user_id: user_id,
				share_with_user_id: elem.providerId,
				access_token: elem.accessToken
			}
		));

		//Saving history in db
		[err, obj] = await utils.to(db.models.share_histories.bulkCreate(data))
		if (err) return response.errReturned(res, err)
		if (obj == null || !obj)
			return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)

		//Adding share rights
		for (let i = 0; i < obj.length; i++) {
			for (let j = 0; j < rights.length; j++) {
				[err, result] = await utils.to(db.models.share_rights.create(
					{
						share_type_id: rights[j].id,
						share_history_id: obj[i].id
					}))
				if (!result || result == null)
					return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)
			}
		}

		//Returing successful response with data
		return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

module.exports = {
	addShareHistory
}