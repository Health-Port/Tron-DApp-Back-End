const response = require('../../../etc/response')
const authenticator = require('authenticator')

const utils = require('../../../etc/utils')
const tokenGenerator = require('../../../etc/generateToken')
const resCode = require('../../../enum/responseCodesEnum')
const resMessage = require('../../../enum/responseMessagesEnum')

const db = global.healthportDb

async function requestTwoFactorAuthentication(req, res) {
	try {
		const adminId = req.auth.id

		let err, admin

		//Checking required fileds 
		if (!adminId) return response.sendResponse(res, resCode.NOT_FOUND, 'Params Cannot be Empty');

		[err, admin] = await utils.to(db.models.admins.findOne({ where: { id: adminId } }))
		if (err) return response.errReturned(res, err)
		if (admin == null) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND)

		const twoFAFormattedKey = authenticator.generateKey()

		const toTpURI = authenticator.generateTotpUri(
			twoFAFormattedKey,
			admin.email,
			process.env.PROJECT_NAME,
			process.env.AUTHENTICATOR_ALGO, 6, 30
		);

		//Updating admin model in db
		[err, admin] = await utils.to(db.models.admins.update(
			{ twofa_formatted_key: twoFAFormattedKey },
			{ where: { id: adminId } }
		))

		return response.sendResponse(
			res,
			resCode.SUCCESS,
			'Two Factor Authentication Enabled',
			{ toTpUri: toTpURI, id: admin.id }
		)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

async function enableDisableTwoFactorAuthentication(req, res) {
	try {
		const obj = {
			'adminId': req.auth.id,
			'state': req.body.state,
			'code': req.body.authenticationCode
		}

		let err, admin = {}, token, update = {}

		//Checking required fileds 
		if (!(obj.adminId && obj.state !== undefined && obj.code))
			return response.sendResponse(res, resCode.NOT_FOUND, 'Params Cannot be Empty');

		[err, admin] = await utils.to(db.models.admins.findOne({ where: { id: obj.adminId } }))
		if (err) return response.errReturned(res, err)
		if (admin == null) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND)

		const formattedToken = authenticator.verifyToken(admin.twofa_formatted_key, obj.code)
		if (!formattedToken) return response.sendResponse(res, resCode.NOT_FOUND, 'Code Not Verified')

		if (obj.state == 1) {
			//Updating admin model in db
			[err, update] = await utils.to(db.models.admins.update(
				{ is_twofa_enable: true, is_twofa_verified: true },
				{ where: { id: obj.adminId } }
			))
			if(!update) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.API_ERROR)
			const data = {
				id: admin.id,
				name: admin.name,
				email: admin.email,
				is_admin: admin.is_admin,
				twofa_enable: true,
				is_twofa_verified: true
			};
			[err, token] = await utils.to(tokenGenerator.createToken(data))
			return response.sendResponse(res, resCode.SUCCESS, 'Two Factor Authentication Enabled', data, token)

		} else {
			//Updating admin model in db
			[err, update] = await utils.to(db.models.admins.update(
				{ is_twofa_enable: false, is_twofa_verified: false, twofa_formatted_key: null },
				{ where: { id: obj.adminId } }
			))
			if(!update) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.API_ERROR)
			const data = {
				id: admin.id,
				name: admin.name,
				email: admin.email,
				is_admin: admin.is_admin,
				twofa_enable: false,
				is_twofa_verified: false
			};
			[err, token] = await utils.to(tokenGenerator.createToken(data))
			return response.sendResponse(res, resCode.SUCCESS, 'Two Factor Authentication Disabled', data, token)
		}
	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

async function verifyTwoFactorAuthentication(req, res) {
	try {
		const obj = {
			'email' : req.auth.email,
			'code' : req.body.authenticationCode	
		}
		
		let err, admin = {}, token = {}

		if (!(obj.email && obj.code))
			return response.sendResponse(res, resCode.NOT_FOUND, 'Params Cannot be Empty');

		[err, admin] = await utils.to(db.models.admins.findOne({ where: { email: obj.email } }))
		if (admin == null) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND)
		if(err) return response.errReturned(res, err)
		if (!admin.is_twofa_enable) return response.sendResponse(res, resCode.NOT_FOUND, '2FA is not enabled for this Admin')

		const formattedToken = authenticator.verifyToken(admin.twofa_formatted_key, obj.code)
		if (!formattedToken)
			return response.sendResponse(res, resCode.BAD_REQUEST, 'The code is invalid')

		const data = {
			id: admin.id,
			name: admin.name,
			email: admin.email,
			is_admin: admin.is_admin,
			twofa_enable: admin.twofa_enable,
			is_twofa_verified: admin.is_twofa_verified
		};
		[err, token] = await utils.to(tokenGenerator.createToken(data))
		return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESSFULLY_LOGGEDIN, data, token)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}
module.exports = {
	requestTwoFactorAuthentication,
	enableDisableTwoFactorAuthentication,
	verifyTwoFactorAuthentication,

}