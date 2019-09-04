const utils = require('../../../etc/utils')
const response = require('../../../etc/response')
const roleEnum = require('../../../enum/roleEnum')
const resCode = require('../../../enum/responseCodesEnum')
const resMessage = require('../../../enum/responseMessagesEnum')

const db = global.healthportDb

async function addShareHistory(req, res) {
	try {
		const { user_id } = req.auth
		const { medicalRecordId, providers, rights } = req.body

		let err = {}, user = {}, result = {}, shareHistory = {}, record = {}

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
				if (record[i].share_with_user_id == providers[j].providerId) {
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
		[err, shareHistory] = await utils.to(db.models.share_histories.bulkCreate(data))
		if (err) return response.errReturned(res, err)
		if (shareHistory == null || !shareHistory)
			return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)

		//Adding share rights
		for (let i = 0; i < shareHistory.length; i++) {
			for (let j = 0; j < rights.length; j++) {
				[err, result] = await utils.to(db.models.share_rights.create(
					{
						share_type_id: rights[j].id,
						share_history_id: shareHistory[i].id
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

async function shareAllMedialRecrods(req, res) {
	try {
		const { user_id } = req.auth
		const { providers, rights } = req.body

		let err = {}, user = {}, result = {}, shareHistory = {}, records = {}, history = {}

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
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND)
		if (user.role != roleEnum.PATIENT)
			return response.sendResponse(res, resCode.UNAUTHORIZED, resMessage.NOT_ALLOWED);

		//Getting all medical records
		[err, records] = await utils.to(db.models.medical_records.findAll({ where: { user_id } }))
		if (err) return response.errReturned(res, err)
		if (records == null || !records)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND);

		//Getting all share histories
		[err, history] = await utils.to(db.models.share_histories.findAll(
			{ where: { share_from_user_id: user_id } }))
		if (err) return response.errReturned(res, err)

		for (let i = 0; i < records.length; i++) {
			//Checking if record already shared, then skip
			const filterdArray = history.filter(x => x.medical_record_id == records[i].id)
			if (filterdArray.length == 0) {
				console.log('go work')
				//Mapping data for share_historis table
				const data = providers.map(elem => (
					{
						medical_record_id: records[i].id,
						share_from_user_id: user_id,
						share_with_user_id: elem.providerId,
						access_token: elem.accessToken
					}
				));

				//Saving history in db
				[err, shareHistory] = await utils.to(db.models.share_histories.bulkCreate(data))
				if (err) return response.errReturned(res, err)
				if (shareHistory == null || !shareHistory)
					return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)

				//Adding share rights
				for (let i = 0; i < shareHistory.length; i++) {
					for (let j = 0; j < rights.length; j++) {
						[err, result] = await utils.to(db.models.share_rights.create(
							{
								share_type_id: rights[j].id,
								share_history_id: shareHistory[i].id
							}))
						if (!result || result == null)
							return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)
					}
				}
			}
		}

		//Returing successful response with data
		return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

async function updateRights(req, res) {
	try {
		const { user_id } = req.auth
		const { medicalRecordId, rights, providerId } = req.body

		let err = {}, user = {}, result = {}, record = {}, shareRights = {}

		if (!(medicalRecordId && providerId))
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.REQUIRED_FIELDS_EMPTY)

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
			{
				where: {
					medical_record_id: medicalRecordId,
					share_from_user_id: user_id,
					share_with_user_id: providerId
				}
			}))
		if (err) return response.errReturned(res, err)

		//Deleting existing rights
		let flag = false
		for (let i = 0; i < record.length; i++) {
			[err, shareRights] = await utils.to(db.models.share_rights.destroy(
				{
					where: { share_history_id: record[i].id }
				}))
			if (!shareRights) flag = true
		}
		if (flag)
			return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)

		//Adding share rights
		for (let i = 0; i < record.length; i++) {
			for (let j = 0; j < rights.length; j++) {
				[err, result] = await utils.to(db.models.share_rights.create(
					{
						share_type_id: rights[j].id,
						share_history_id: record[i].id
					}))
				if (!result || result == null)
					return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)
			}
		}

		//Returing successful response
		return response.sendResponse(res, resCode.SUCCESS, resMessage.ACCESS_RIGHTS_UPDATED)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

async function getMedicalRecordHisotry(req, res) {
	try {
		const { user_id } = req.auth
		const { medicalRecordId } = req.body
		let { pageNumber, pageSize } = req.body

		let err = {}, user = {}, shareHistory = {}

		//Paging
		pageSize = parseInt(pageSize)
		pageNumber = parseInt(pageNumber)
		if (!pageNumber) pageNumber = 0
		if (!pageSize) pageSize = 10
		const start = parseInt(pageNumber * pageSize)
		const end = parseInt(start + pageSize)

		if (!medicalRecordId)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.REQUIRED_FIELDS_EMPTY);

		//Verifying user authenticity  
		[err, user] = await utils.to(db.models.users.findOne({ where: { id: user_id } }))
		if (err) return response.errReturned(res, err)
		if (user == null)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

		//Querying db for list records
		[err, shareHistory] = await utils.to(db.query(`
		Select sh.id as shareHistoryId, u.id as providerId, u.name, u.email, st.name as permission, 
			sh.createdAt 
			From share_histories sh
			Inner join users u ON sh.share_with_user_id = u.id
			Inner join share_rights sr ON sr.share_history_id = sh.id
			Inner join share_types st ON st.id = sr.share_type_id
			Where sh.medical_record_id = :mId and sh.share_from_user_id = :uId
			ORDER BY sh.id DESC 
			`,
			//LIMIT ${start}, ${pageSize}
			{
				replacements: { mId: medicalRecordId, uId: user_id },
				type: db.QueryTypes.SELECT,
			}))
		if (err) return response.errReturned(res, err)
		if (!shareHistory || shareHistory.length == 0)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)

		let data = []
		const returnableData = {}
		for (let i = 0; i < shareHistory.length; i++) {
			const filterArry = shareHistory.filter(x => x.shareHistoryId == shareHistory[i].shareHistoryId)
			if (filterArry.length > 1) {
				data[i] = {
					id: shareHistory[i].shareHistoryId,
					providerId: shareHistory[i].providerId,
					sharedWith: `${shareHistory[i].name}, ${shareHistory[i].email}`,
					permission: filterArry.map(x => x.permission),
					createdAt: shareHistory[i].createdAt
				}
				i++
			} else {
				data[i] = {
					id: shareHistory[i].shareHistoryId,
					providerId: shareHistory[i].providerId,
					sharedWith: `${shareHistory[i].name}, ${shareHistory[i].email}`,
					permission: [shareHistory[i].permission],
					createdAt: shareHistory[i].createdAt
				}
			}
		}
		data = data.filter((el) => { return el != null })
		returnableData['count'] = data.length
		const slicedData = data.slice(start, end)
		returnableData['rows'] = slicedData

		//Returing successful response
		return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, returnableData)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

async function removeAccessRightByProviderId(req, res) {
	try {
		const { user_id } = req.auth
		const { medicalRecordId, providerId } = req.body

		let err = {}, user = {}, shareHistory = {}, shareRights = {}

		//Checking empty required fields 
		if (!(medicalRecordId && providerId))
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.REQUIRED_FIELDS_EMPTY);

		//Verifying user authenticity  
		[err, user] = await utils.to(db.models.users.findOne({ where: { id: user_id } }))
		if (err) return response.errReturned(res, err)
		if (user == null)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

		//Checking weather record exists  
		[err, shareHistory] = await utils.to(db.models.share_histories.findOne(
			{
				where: {
					share_with_user_id: providerId,
					medical_record_id: medicalRecordId,
					share_from_user_id: user_id
				}
			}))
		if (err) return response.errReturned(res, err)
		if (shareHistory == null || !shareHistory)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND);

		//Deleting access rights
		[err, shareRights] = await utils.to(db.models.share_rights.destroy(
			{
				where: { share_history_id: shareHistory.id }
			}))
		if (err) return response.errReturned(res, err)
		if (shareRights == 0)
			return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR);

		//Deleting share histroy
		[err, shareRights] = await utils.to(db.models.share_histories.destroy(
			{
				where: { id: shareHistory.id }
			}))
		if (err) return response.errReturned(res, err)
		if (shareRights == 0)
			return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)

		//Returing successful response
		return response.sendResponse(res, resCode.SUCCESS, resMessage.ACCESS_RIGHTS_REMOVED)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

async function getPendingshareHistories(req, res) {
	try {
		const { user_id } = req.auth

		let err = {}, user = {}, records = {}, data = {}
		const allRecords = [];

		//Verifying user authenticity
		[err, user] = await utils.to(db.models.users.findOne({ where: { id: user_id } }))
		if (err) return response.errReturned(res, err)
		if (!user || user.length == 0 || user == null)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

		//Checking weather record already exists
		[err, records] = await utils.to(db.query(`
			SELECT * from share_histories 
				where status = 'PENDING'
				AND
				share_from_user_id = :uId
				GROUP BY medical_record_id`,
			{
				replacements: { uId: user_id },
				type: db.QueryTypes.SELECT,
			}))
		if (err) return response.errReturned(res, err)
		if (!records || records.length == 0 || records == null)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)

		for (let i = 0; i < records.length; i++) {
			[err, data] = await utils.to(db.query(`
				SELECT 
					sh.id as shareHistoryId, 
					u.tron_wallet_public_key_hex as publicKeyHex, 
					sh.access_token as accessToken 
					FROM share_histories sh
					INNER JOIN users u ON sh.share_with_user_id = u.id
					WHERE sh.medical_record_id = :mId 
					AND
					share_from_user_id = :uId`,
				{
					replacements: { mId: records[i].medical_record_id, uId: user_id },
					type: db.QueryTypes.SELECT,
				}))
			if (err) return response.errReturned(res, err)
			allRecords.push(data)
		}
		
		//Decrypting public key hex
		for (let i = 0; i < allRecords.length; i++) {
			for (let j = 0; j < allRecords[i].length; j++) {
				allRecords[i][j].publicKeyHex = utils.decrypt(allRecords[i][j].publicKeyHex)
			}
		}

		//Returing successful response
		return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, allRecords)
	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

async function recomputeAccessTokens(req, res) {
	try {
		const { user_id } = req.auth
		const { shareHistories } = req.body

		let err = {}, user = {}, records = {};

		//Verifying user authenticity
		[err, user] = await utils.to(db.models.users.findOne({ where: { id: user_id } }))
		if (err) return response.errReturned(res, err)
		if (!user || user.length == 0 || user == null)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND)

		if (!shareHistories || shareHistories.length == 0)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.REQUIRED_FIELDS_EMPTY)

		const mappedData = shareHistories.map(elem => (
			{
				id: elem.shareHistoryId,
				access_token: elem.accessToken,
				status: 'SUCCESS'
			}
		));

		//Updating access tokens
		[err, records] = await utils.to(db.models.share_histories.bulkCreate(
			mappedData, { updateOnDuplicate: ['id', 'access_token', 'status'] }))
		if (err) return response.errReturned(res, err)
		if (records == null || !records)
			return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)

		//Returing successful response
		return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

module.exports = {
	addShareHistory,
	updateRights,
	getMedicalRecordHisotry,
	removeAccessRightByProviderId,
	shareAllMedialRecrods,
	getPendingshareHistories,
	recomputeAccessTokens
}