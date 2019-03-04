const utils = require('../../../etc/utils')
const response = require('../../../etc/response')
const tronUtils = require('../../../etc/tronUtils')
const resCode = require('../../../enum/responseCodesEnum')
const resMessage = require('../../../enum/responseMessagesEnum')

const db = global.healthportDb

async function getTrxEHRBalance(req, res) {
	try {
		const privateKey = process.env.MAIN_ACCOUNT_PRIVATE_KEY
		const publicAddress = process.env.MAIN_ACCOUNT_ADDRESS_KEY

		const trx = await tronUtils.getTrxBalance(privateKey, publicAddress)
		const ehr = await tronUtils.getTRC10TokenBalance(privateKey, publicAddress)

		const data = {
			'address': publicAddress,
			'trxBalance': trx,
			'ehrBalance': ehr
		}

		//Returing successful response
		return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, data)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

async function getTotalUsersCount(req, res) {
	try {
		let err = {}, count = {};
		[err, count] = await utils.to(db.models.users.count())
		if (err) return response.errReturned(res, err)

		//Returing successful response
		return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, count)
	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

async function getTokensRisedByCommission(req, res) {
	try {
		let err = {}, tokens = {}
		const commissionAcount = utils.encrypt(process.env.COMMISSION_ACCOUNT_ADDRESS_KEY);

		[err, tokens] = await utils.to(db.query(`
			select sum(number_of_token) as sum from transections where address = :cAcount`,
			{
				replacements: { cAcount: commissionAcount },
				type: db.QueryTypes.SELECT,
			}))
		if (err) return response.errReturned(res, err)

		//Returing successful response
		return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, tokens[0].sum)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

async function getTokenDistributed(req, res) {
	try {
		let err = {}, tokens = {}
		const mainAddress = utils.encrypt(process.env.MAIN_ACCOUNT_ADDRESS_KEY);

		[err, tokens] = await utils.to(db.query(`
			select sum(number_of_token) as sum from transections where address = :mAddress`,
			{
				replacements: { mAddress: mainAddress },
				type: db.QueryTypes.SELECT,
			}))
		if (err) return response.errReturned(res, err)

		//Returing successful response
		return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, tokens[0].sum)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

async function getTransactionGraphData(req, res) {
	try {
		const { startDate, endDate } = req.body
		let err = {}, data = {}

		if (!startDate || !endDate)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.REQUIRED_FIELDS_EMPTY);

		[err, data] = await utils.to(db.query(`
				select CAST(createdAt AS DATE) as date, count(*) as count from transections 
				where createdAt >= :sDate and createdAt <= :eDate
				and user_id > 0
				Group by CAST(createdAt AS DATE)
				order by createdAt desc`,
			{
				replacements: { sDate: startDate, eDate: endDate },
			}))
		if (err) return response.errReturned(res, err)
		if (!data || data == null || data.length == 0)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)

		//Returing successful response
		return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, data)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

async function getUserGraphData(req, res) {
	try {
		const { startDate, endDate } = req.body
		let err = {}, data = {}

		if (!startDate || !endDate)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.REQUIRED_FIELDS_EMPTY);

		[err, data] = await utils.to(db.query(`
				select CAST(createdAt AS DATE) as date, count(*) as count from users 
				where createdAt >= :sDate and createdAt <= :eDate
				Group by CAST(createdAt AS DATE)
				order by createdAt desc`,
			{
				replacements: { sDate: startDate, eDate: endDate },
			}))
		if (err) return response.errReturned(res, err)
		if (!data || data == null || data.length == 0)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)

		//Returing successful response
		return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, data)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

module.exports = {
	getTrxEHRBalance,
	getTotalUsersCount,
	getTokensRisedByCommission,
	getTokenDistributed,
	getTransactionGraphData,
	getUserGraphData
}