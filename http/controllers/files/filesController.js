const utils = require('../../../etc/utils')
const resMessage = require('../../../enum/responseMessagesEnum')
const resCode = require('../../../enum/responseCodesEnum')
const response = require('../../../etc/response')
const actionEnum = require('../../../enum/fileActionEnum')
const rewardDisperser = require('../../../etc/rewardCheck')
const rewardEnum = require('../../../enum/rewardEnum')
const cutCommission = require('./../../../etc/commission')
const tronUtils = require('../../../etc/tronUtils')
const db = global.healthportDb

async function saveFileByUserId(req, res) {
	const { user_id } = req.auth
	let result = {}, error
	try {
		[error, result] = await utils.to(db.models.users.findOne({
			where: {
				id: user_id
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
		if (error) return response.errReturned(res, error)

		return response.sendResponse(
			res,
			resCode.SUCCESS,
			resMessage.DOCUMENT_SAVED
		)
	}
	catch (error) {
		return response.errReturned(res, error)
	}
}

async function getFileByUserId(req, res) {
	const { user_id } = req.auth
	let { pageNumber, pageSize } = req.body
	const { searchValue } = req.body
	const newRecords = {}
	let user = {}, error, records = {}
	try {
		//Paging
		pageSize = parseInt(pageSize)
		pageNumber = parseInt(pageNumber)

		if (!pageNumber) pageNumber = 0
		if (!pageSize) pageSize = 3
		const start = pageNumber * pageSize
		const end = parseInt(start + pageSize);

		//Verifying user authenticity
		[error, user] = await utils.to(db.models.users.findOne({ where: { id: user_id } }))
		if (error) return response.errReturned(res, error)
		if (!user || user.length == 0 || user == null)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

		[error, records] = await utils.to(db.models.user_files.findAll({ where: { user_id } }))

		if (error) return response.errReturned(res, error)

		if (records == null || records.count == 0 || records == undefined)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)

		//getting records from db with pagination and search value
		if (records) {
			if (searchValue) {
				records = records.filter(x =>
					x.file_name.toLowerCase().includes(searchValue.toLowerCase())
				)
			}
			newRecords['count'] = records.length
			const slicedData = records.slice(start, end)
			newRecords['rows'] = slicedData


			if (error) return response.errReturned(res, error)
			return response.sendResponse(
				res,
				resCode.SUCCESS,
				resMessage.DOCUMENT_RETRIEVED,
				newRecords
			)
		}
	}
	catch (error) {
		return response.errReturned(res, error)
	}
}

async function filesCallHandaling(req, res) {
	try {
		const { action } = req.params
		const { user_id } = req.auth
		const msg = 'file'

		let err = {},
			result = {},
			user = {},
			commissionObj = {},
			record = {},
			latestTransaction = {}; // check for transaction pending 

		//Verifying user authenticity
		[err, user] = await utils.to(db.models.users.findOne({ where: { id: user_id } }))
		if (err) return response.errReturned(res, err)
		if (!user || user.length == 0 || user == null)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);
		
		// check for transaction pending 
        [err, latestTransaction] = await utils.to(db.models.transections.findOne({
            where: [{ user_id }],
            order: [['createdAt', 'DESC']],
        }))

        if (Object.keys(latestTransaction).length != 0) {
            //get transaction using hash
            const transactionInfo = await tronUtils.getTransactionByHash(latestTransaction.trx_hash )
            //check transaction is confirmed or not
            if (!transactionInfo.id) {
                return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.WAIT_FOR_PENDING_TRANSACTION)
            }
        }

        //End check for transaction pending

		if (action.toLocaleLowerCase() == actionEnum.ADDFILE.toLocaleLowerCase()) {

			[err, record] = await utils.to(db.models.user_files.findOne({
				where: { user_id }
			}))

			//First time uploading case
			if (record === null) {
				const balance = await tronUtils.getTRC10TokenBalance(
					utils.decrypt(user.tron_wallet_private_key),
					utils.decrypt(user.tron_wallet_public_key));
				[err, commissionObj] = await utils.to(db.models.commission_conf.findOne({
					where: { commission_type: 'Upload' }
				}))
				if (err) return response.errReturned(res, err)
				if (balance < commissionObj.commission_amount)
					return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INSUFFICIENT_BALANCE);
				//Gettting user id
				[err, record] = await utils.to(db.models.users.findOne({
					where: { id: user_id }
				}))

				if (err) return response.errReturned(res, err);

				//Giving reward for 1st time upload a document
				[err, result] = await utils.to(rewardDisperser(
					`${rewardEnum.FILEUPLOAD};${msg}`,
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
		else if (action.toLocaleLowerCase() == actionEnum.VIEWFILE.toLocaleLowerCase()) {
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
		else if (action.toLocaleLowerCase() == actionEnum.SHAREFILE.toLocaleLowerCase()) {
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
	}
	catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

async function getFileHistoryById(req, res) {
	try {
		const { user_id } = req.auth
		const { fId } = req.params

		let err = {}, user = {}, record = {};

		//Verifying user authenticity
		[err, user] = await utils.to(db.models.users.findOne({ where: { id: user_id } }))
		if (err) return response.errReturned(res, err)
		if (!user || user.length == 0 || user == null)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND)

		if (!fId)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.REQUIRED_FIELDS_EMPTY);

		[err, record] = await utils.to(db.models.user_files.findOne(
			{
				where: { id: fId }
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
	saveFileByUserId,
	getFileByUserId,
	filesCallHandaling,
	getFileHistoryById
}