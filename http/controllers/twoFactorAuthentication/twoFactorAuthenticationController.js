const response = require('../../../etc/response');
const authenticator = require('authenticator');

const utils = require('../../../etc/utils');
const tokenGenerator = require('../../../etc/generateToken');
const resCode = require('../../../enum/responseCodesEnum');
const resMessage = require('../../../enum/responseMessagesEnum');

const db = global.healthportDb;

async function requestTwoFactorAuthentication(req, res) {
	try {
		let adminId = req.auth.id;

		let err, admin;

		//Checking required fileds 
		if (!adminId) return response.sendResponse(res, resCode.NOT_FOUND, 'Params Cannot be Empty');

		[err, admin] = await utils.to(db.models.admins.findOne({ where: { id: adminId } }));
		if (admin == null) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

		let twoFAFormattedKey = authenticator.generateKey();

		let toTpURI = authenticator.generateTotpUri(
			twoFAFormattedKey,
			admin.email,
			process.env.PROJECT_NAME,
			process.env.AUTHENTICATOR_ALGO, 6, 30
		);
		console.log(toTpURI);

		//Updating admin model in db
		[err, admin] = await utils.to(db.models.admins.update(
			{ twofa_formatted_key: twoFAFormattedKey },
			{ where: { id: adminId } }
		));

		return response.sendResponse(
			res,
			resCode.SUCCESS,
			'Two Factor Authentication Enabled',
			{ toTpUri: toTpURI, id: admin.id }
		);

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

async function enableDisableTwoFactorAuthentication(req, res) {
	try {
		let adminId = req.auth.id;
		let toTpUri = req.body.toTpUri;
		let state = req.body.state; // Boolean
		let code = req.body.authenticationCode;

		let err, admin, token;

		//Checking required fileds 
		if (!(adminId && state !== undefined && code))
			return response.sendResponse(res, resCode.NOT_FOUND, 'Params Cannot be Empty');

		[err, admin] = await utils.to(db.models.admins.findOne({ where: { id: adminId } }));
		if (admin == null) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

		let formattedToken = authenticator.verifyToken(admin.twofa_formatted_key, code);

		if (state == 1) {
			if (formattedToken) {
				//Updating admin model in db
				[err, update] = await utils.to(db.models.admins.update(
					{ is_twofa_enable: true, is_twofa_verified: true },
					{ where: { id: adminId } }
				));
				let data = {
					id: admin.id,
					name: admin.name,
					email: admin.email,
					is_admin: admin.is_admin,
					twofa_enable: true,
					is_twofa_verified: true
				};
				[err, token] = await utils.to(tokenGenerator.createToken(data));
				return response.sendResponse(res, resCode.SUCCESS, 'Two Factor Authentication Enabled', data, token);
			} else {
				return response.sendResponse(res, resCode.NOT_FOUND, 'Code Not Verified');
			}
		} else {
			if (formattedToken) {
				//Updating admin model in db
				[err, update] = await utils.to(db.models.admins.update(
					{ is_twofa_enable: false, is_twofa_verified: false, twofa_formatted_key: null },
					{ where: { id: adminId } }
				));
				let data = {
					id: admin.id,
					name: admin.name,
					email: admin.email,
					is_admin: admin.is_admin,
					twofa_enable: false,
					is_twofa_verified: false
				};
				[err, token] = await utils.to(tokenGenerator.createToken(data));
				return response.sendResponse(res, resCode.SUCCESS, 'Two Factor Authentication Disabled', data, token);
			} else {
				return response.sendResponse(res, resCode.NOT_FOUND, 'Code Not Verified');
			}
		}
	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

async function verifyTwoFactorAuthentication(req, res) {
	try {
		let email = req.auth.email;
		let code = req.body.authenticationCode;

		let err, admin, token;

		if (!(email && code))
			return response.sendResponse(res, resCode.NOT_FOUND, 'Params Cannot be Empty');

		[err, admin] = await utils.to(db.models.admins.findOne({ where: { email: email } }));
		if (admin == null) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);
		if (!admin.is_twofa_enable) return response.sendResponse(res, resCode.NOT_FOUND, '2FA is not enabled for this Admin');

		let formattedToken = authenticator.verifyToken(admin.twofa_formatted_key, code);
		if (!formattedToken)
			return response.sendResponse(res, resCode.BAD_REQUEST, 'The code is invalid');

		let data = {
			id: admin.id,
			name: admin.name,
			email: admin.email,
			is_admin: admin.is_admin,
			twofa_enable: admin.twofa_enable,
			is_twofa_verified: admin.is_twofa_verified
		};
		[err, token] = await utils.to(tokenGenerator.createToken(data));
		return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESSFULLY_LOGGEDIN, data, token);

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