const utils = require('../../../etc/utils')
const response = require('../../../etc/response')
const resCode = require('../../../enum/responseCodesEnum')
const resMessage = require('../../../enum/responseMessagesEnum')
const actionEnum = require('../../../enum/actionEnum')
const roleEnum = require('../../../enum/roleEnum')
const rewardDisperser = require('../../../etc/rewardCheck')
const rewardEnum = require('../../../enum/rewardEnum')
const cutCommission = require('./../../../etc/commission')
const tronUtils = require('../../../etc/tronUtils')

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

			//Returing successful response with update message
			return response.sendResponse(res, resCode.SUCCESS, resMessage.MEDICAL_RECORD_UPDATED)
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
				m.access_token as accessToken, m.createdAt, m.updatedAt	  
				FROM medical_records m
				INNER JOIN templates t ON m.template_id = t.id
				WHERE m.user_id = :user_id and t.status = true
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
		[err, count] = await utils.to(db.query(`
			SELECT m.id as medicalRecordId, t.id as templateId, t.name as templateName, 
				m.access_token as accessToken, m.createdAt, m.updatedAt	  
				FROM medical_records m
				INNER JOIN templates t ON m.template_id = t.id
				WHERE m.user_id = :user_id and t.status = true
				ORDER by m.createdAt DESC`,
			{
				replacements: { user_id },
				type: db.QueryTypes.SELECT,
			}))

		//Returing successful response
		return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, { count, rows: records })

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

async function getAllMedicalRecordsByUserId(req, res) {
	try {
		const { user_id } = req.auth

		let err = {}, user = {}, records = {};

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
				ORDER by m.createdAt DESC`,
			{
				replacements: { user_id },
				type: db.QueryTypes.SELECT,
			}))
		if (err) return response.errReturned(res, err)
		if (records == null || records.count == 0 || records == undefined)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)

		//Returing successful response
		return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, records)

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
			return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, record)

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

async function getMedicalRecordByTemplateIdWithAttributes(req, res) {
	try {
		const { user_id } = req.auth
		const { tempId } = req.params

		let err = {}, user = {}, record = {}, temp = {}, data = {}

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
		if (record) {
			[err, temp] = await utils.to(db.query(`
			SELECT t.id, t.name, t.description, t.status, tf.id as tfId, tf.type, 
				tf.label, tf.placeholder, tf.required, tf.attribute_list_id, 
				al.name as attributeListName 
				FROM templates t 
				INNER JOIN template_fields tf ON t.id = tf.template_id
				LEFT JOIN attribute_lists al ON al.id = tf.attribute_list_id
				WHERE t.id = :id`,
				{
					replacements: { id: tempId },
					type: db.QueryTypes.SELECT,
				}))
			if (err) return response.errReturned(res, err)
			if (!temp || temp.length == 0)
				return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)

			//maping data and columns
			data = {
				id: temp[0].id,
				name: temp[0].name,
				description: temp[0].description,
				fields: temp.map(elem => (
					{
						id: elem.tfId.toString(),
						type: elem.type,
						label: elem.label,
						placeholder: elem.placeholder,
						required: elem.required,
						attributeListId: elem.attribute_list_id ?
							elem.attribute_list_id
							: '',
						attributeListName: elem.attribute_list_id ?
							elem.attributeListName
							: ''
					}
				))
			}
		}

		//Returing successful response
		return response.sendResponse(
			res,
			resCode.SUCCESS,
			resMessage.SUCCESS,
			{ accessToken: record.access_token, templateFields: data.fields }
		)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

async function ipfsCallHandeling(req, res) {
	try {
		const { action } = req.params
		const { user_id } = req.auth
		const { templateId, shareHistoryId } = req.body

		let err = {},
			result = {},
			user = {},
			commissionObj = {},
			record = {},
			obj = {},
			latestTransaction = {}; // check for transaction pending 
		//Verifying user authenticity
		[err, user] = await utils.to(db.models.users.findOne({ where: { id: user_id } }))
		if (err) return response.errReturned(res, err)
		if (!user || user.length == 0 || user == null)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

		// check for transaction pending 
		[err, latestTransaction] = await utils.to(db.models.transections.findOne({ where: [{ user_id }],
			order: [['createdAt', 'DESC']], }))
			
		if (Object.keys(latestTransaction).length != 0) {
			//get transaction using hash
			const transactionInfo = await tronUtils.getTransactionByHash(latestTransaction.trx_hash )
			//check transaction is confirmed or not
			if (!transactionInfo.id) {
				return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.WAIT_FOR_PENDING_TRANSACTION)
			}
		}

		//End check for transaction pending

		//Add or Update Case
		if (action.toLocaleLowerCase() == actionEnum.ADD.toLocaleLowerCase()) {
			//Checking user's balance before uploading document.
			
			//Paitent Case
			if (user.role == roleEnum.PATIENT) {
				[err, record] = await utils.to(db.query(`
				SELECT t.id as templateId, t.name as templateName, 
					mr.id as medicalRecordId 
					FROM medical_records mr
					INNER JOIN templates t ON mr.template_id = t.id
					WHERE 
						t.id = :templateId
					AND 
						mr.user_id = :user_id`,
					{
						replacements: { user_id, templateId },
						type: db.QueryTypes.SELECT,
					}))
				if (err) return response.errReturned(res, err)
			}
			//Provider Case
			else if (user.role == roleEnum.PROVIDER) {
				if (!shareHistoryId)
					return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.REQUIRED_FIELDS_EMPTY);

				[err, record] = await utils.to(db.models.share_histories.findOne({
					where: { id: shareHistoryId }
				}))
				if (record && !record.provider_reward) {
					//Updating reward given field to true
					[err, obj] = await utils.to(db.models.share_histories.update(
						{ provider_reward: true },
						{ where: { id: shareHistoryId } }
					))
					if (err) return response.errReturned(res, err)
					if (obj[0] == 0)
						return response.sendResponse(res,
							resCode.INTERNAL_SERVER_ERROR,
							resMessage.API_ERROR)
				}
			}
			//First time uploading case
			if (record.length == 0 || record.provider_reward == false) {
				
				const balance = await tronUtils.getTRC10TokenBalance(
					utils.decrypt(user.tron_wallet_private_key),
					utils.decrypt(user.tron_wallet_public_key));
				[err, commissionObj] = await utils.to(db.models.commission_conf.findOne({
					where: { commission_type: 'Upload' }
				}))
				if (err) return response.errReturned(res, err)
				if (balance < commissionObj.commission_amount)
					return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INSUFFICIENT_BALANCE);
					
				//Gettting template name
				[err, record] = await utils.to(db.query(`
					SELECT name as templateName 
						FROM templates 
						WHERE 
							id = :templateId`,
					{
						replacements: { templateId },
						type: db.QueryTypes.SELECT,
					}))
				if (err) return response.errReturned(res, err);

				//Giving reward for 1st time upload a document
				[err, result] = await utils.to(rewardDisperser(
					`${rewardEnum.MEDICALRECORDDOCUMENTREWARD};${record[0].templateName}`,
					user_id,
					user.tron_wallet_public_key)
				)
				if (err)
					return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.BANDWIDTH_IS_LOW)

			}
			//Already uploaded case 
			else {
				//Checking user's balance before uploading document.
				const balance = await tronUtils.getTRC10TokenBalance(
					utils.decrypt(user.tron_wallet_private_key),
					utils.decrypt(user.tron_wallet_public_key));
				[err, commissionObj] = await utils.to(db.models.commission_conf.findOne({
					where: { commission_type: 'Upload' }
				}))
				if (err) return response.errReturned(res, err)
				if (balance < commissionObj.commission_amount)
					return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INSUFFICIENT_BALANCE);
				[err, result] = await utils.to(
					cutCommission(user.tron_wallet_public_key, 'Health Port Network Fee', 'Download')
				)
				if (err) {
					if (err == 'Bandwidth is low') {
						return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.BANDWIDTH_IS_LOW)
					}
					else {
						return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INSUFFICIENT_BALANCE)
					}
				}
			}
		}
		//View Case
		else if (action.toLocaleLowerCase() == actionEnum.VIEW.toLocaleLowerCase()) {
			[err, result] = await utils.to(
				cutCommission(user.tron_wallet_public_key, 'Health Port Network Fee', 'Download')
			)
			if (err) {
				if (err == 'Bandwidth is low') {
					return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.BANDWIDTH_IS_LOW)
				}
				else {
					return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INSUFFICIENT_BALANCE)
				}
			}
		}
		// Share Case 
		else if (action.toLocaleLowerCase() == actionEnum.SHARE.toLocaleLowerCase()) {
			[err, result] = await utils.to(
				cutCommission(user.tron_wallet_public_key, 'Health Port Network Fee', 'Share')
			)
			if (err) {
				if (err == 'Bandwidth is low') {
					return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.BANDWIDTH_IS_LOW)
				}
				else {
					return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INSUFFICIENT_BALANCE)
				}
			}
			console.log(result)
		} else {
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INVALID_ACTION)
		}
		return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS)
	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

module.exports = {
	addMedicalRecord,
	ipfsCallHandeling,
	getMedicalRecordsByUserId,
	getAllMedicalRecordsByUserId,
	getMedicalRecordByTemplateId,
	getMedicalRecordByTemplateIdWithAttributes
}