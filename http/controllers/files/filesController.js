const utils = require('../../../etc/utils')
const resMessage = require('../../../enum/responseMessagesEnum')
const resCode = require('../../../enum/responseCodesEnum')
const response = require('../../../etc/response')
const actionEnum = require('../../../enum/fileActionEnum')
// const roleEnum = require('../../../enum/roleEnum')
const rewardDisperser = require('../../../etc/rewardCheck')
const rewardEnum = require('../../../enum/rewardEnum')
const cutCommission = require('./../../../etc/commission')
const tronUtils = require('../../../etc/tronUtils')
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

async function getFilesByUser(req, res) {
	const user_id = req.body.userId
	let result = {}, error
	console.log(req.body)
	try {
		[error, result] = await utils.to(db.models.user_files.findAll({
			where: {
				user_id
			}
		}))
		console.log('A', result)
		if (result == null)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND)

		if (!error) {
			console.log('success')
		}
		return response.sendResponse(
			res,
			resCode.SUCCESS,
			resMessage.DOCUMENT_RETRIEVED,
			result
		)


	}
	catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

async function filesCallHandaling(req, res) {
	// const user = {}
	try {
		const { action } = req.params
		const { user_id } = req.auth
		const { id } = req.body

		console.log(req.body)

		
		let err = {},
			result = {},
			user = {},
			commissionObj = {},
			record = {};
			// obj = {};

			//Verifying user authenticity
		[err, user] = await utils.to(db.models.users.findOne({ where: { id: user_id } }))
		if (err) return response.errReturned(res, err)
		if (!user || user.length == 0 || user == null)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND)

		if (action.toLocaleLowerCase() == actionEnum.ADDFILE.toLocaleLowerCase()) {
			[err, record] = await utils.to(db.models.user_files.findOne({
				where: { user_id: id }
			}))
			console.log(record)
			//First time uploading case
			if (record === null) {
				console.log('inside record');
				//Gettting template name
				[err, record] = await utils.to(db.query(`
						SELECT name as user_name 
							FROM users
							WHERE 
								id `,
					{
						replacements: { id },
						type: db.QueryTypes.SELECT,
					}))
				if (err) return response.errReturned(res, err)
				console.log(record);

				//Giving reward for 1st time upload a document
				[err, result] = await utils.to(rewardDisperser(
					`${rewardEnum.MEDICALRECORDDOCUMENTREWARD};${record[0].user_name}`,
					user_id,
					user.tron_wallet_public_key)
				)
				console.log(record[0].user_name)
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


module.exports = {
	saveFilesByUser,
	getFilesByUser,
	filesCallHandaling
}