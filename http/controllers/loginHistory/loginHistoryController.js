const utils = require('../../../etc/utils')
const response = require('../../../etc/response')
const resCode = require('../../../enum/responseCodesEnum')
const resMessage = require('../../../enum/responseMessagesEnum')

const db = global.healthportDb

async function getLoginHistorybyAdminID(req, res) {
	try {
		const { adminId } = req.params
		const { id } = req.auth

		let err = {}, history = {}, admin = {};

		//Verifying user authenticity
		[err, admin] = await utils.to(db.models.admins.findOne({ where: { id } }))
		if (err) return response.errReturned(res, err)
		if (!admin || admin.length == 0)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

		[err, history] = await utils.to(db.models.admin_sessions.findAll({
			where: { admin_id: parseInt(adminId) },
			order: [['createdAt', 'DESC']],
		}))
		if (err) return response.errReturned(res, err)
		if (!history || history.length == 0)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)

		const data = history.map(elem => (
			{
				id: elem.id,
				adminId: elem.admin_id,
				ipAddress: elem.ip_address,
				createdAt: elem.createdAt,
				updatedAt: elem.updatedAt
			}
		))

		//Returing successful response
		return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, data)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

module.exports = {
	getLoginHistorybyAdminID
}