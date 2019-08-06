const utils = require('../../../etc/utils')
const response = require('../../../etc/response')
const resCode = require('../../../enum/responseCodesEnum')
const resMessage = require('../../../enum/responseMessagesEnum')

const db = global.healthportDb

async function addMedicalRecord(req, res) {
	try {
		const { user_id } = req.auth
		const { templateId, accessToken } = req.body

		let err = {}, user = {}, record = {}, obj = {}

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
			{
				where: { template_id: templateId, user_id }
			}))
		if (err) return response.errReturned(res, err)
		if (record) {
			//Updating existing medical record
			[err, obj] = await utils.to(db.models.medical_records.update(
				{ access_token: accessToken },
				{ where: { template_id: templateId, user_id } }
			))
			if (err) return response.errReturned(res, err)
			if (obj[0] == 0)
				return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)
		} else {
			//Saving new medical record in db
			[err, record] = await utils.to(db.models.medical_records.create(
				{
					template_id: templateId,
					user_id,
					access_token: accessToken
				}))
			if (err) return response.errReturned(res, err)
			if (!record)
				return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)
		}

		//Returing successful response
		if (obj)
			return response.sendResponse(res, resCode.SUCCESS, resMessage.MEDICAL_RECORD_UPDATED)

		return response.sendResponse(res, resCode.SUCCESS, resMessage.MEDICAL_RECORD_ADDED)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

async function getMedicalRecordsByUserId(req, res) {
	try {
		const { user_id } = req.auth
		let { pageNumber, pageSize } = req.body

		let err = {}, user = {}, records = {}, count = {}

		//Paging
		pageSize = parseInt(pageSize)
		pageNumber = parseInt(pageNumber)
		if (!pageNumber) pageNumber = 0
		if (!pageSize) pageSize = 10
		const start = parseInt(pageNumber * pageSize);

		//Verifying user authenticity
		[err, user] = await utils.to(db.models.users.findOne({ where: { id: user_id } }))
		if (err) return response.errReturned(res, err)
		if (!user || user.length == 0 || user == null)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

		//Getting medical records from db with paging
		[err, records] = await utils.to(db.query(`
			SELECT m.id as medicalRecordId, t.id as templateId, t.name as templateName, 
				m.access_token as accessToken, m.createdAt	  
				FROM medical_records m
				INNER JOIN templates t ON m.template_id = t.id
				WHERE m.user_id = :user_id
				ORDER by m.createdAt DESC
				LIMIT ${start}, ${pageSize}`,
			{
				replacements: { user_id },
				type: db.QueryTypes.SELECT,
			}))
		if (err) return response.errReturned(res, err)
		if (records == null || records.count == 0 || records == undefined)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND);

		//Getting total count
		[err, count] = await await utils.to(db.models.medical_records.count({
			where: { user_id }
		}))

		//Returing successful response
		return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, { count, rows: records })

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

async function getMedicalRecordByTemplateId(req, res) {
	try {
		const { user_id } = req.auth
		const { tempId } = req.params

		let err = {}, user = {}, record = {}

		//Checking empty required fields 
		if (!tempId)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.REQUIRED_FIELDS_EMPTY);

		//Verifying user authenticity
		[err, user] = await utils.to(db.models.users.findOne({ where: { id: user_id } }))
		if (err) return response.errReturned(res, err)
		if (!user || user.length == 0 || user == null)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

		[err, record] = await utils.to(db.models.medical_records.findOne(
			{
				where: { template_id: tempId, user_id }
			}))
		if (err) return response.errReturned(res, err)
		if (record == null || record.count == 0 || record == undefined)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)

		//Returing successful response
		return response.sendResponse(
			res,
			resCode.SUCCESS,
			resMessage.SUCCESS,
			{ accessToken: record.access_token }
		)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

module.exports = {
	addMedicalRecord,
	getMedicalRecordsByUserId,
	getMedicalRecordByTemplateId
}