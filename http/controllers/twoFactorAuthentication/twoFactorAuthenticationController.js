const response = require('../../../etc/response')
const authenticator = require('authenticator')

const utils = require('../../../etc/utils')
const tokenGenerator = require('../../../etc/generateToken')
const resCode = require('../../../enum/responseCodesEnum')
const resMessage = require('../../../enum/responseMessagesEnum')
const _ = require('lodash')
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

		let err, admin = {}, token, update = {}, permissions = {}

		//Checking required fileds 
		if (!(obj.adminId && obj.state !== undefined && obj.code))
			return response.sendResponse(res, resCode.NOT_FOUND, 'Params Cannot be Empty');

		[err, admin] = await utils.to(db.models.admins.findOne({ where: { id: obj.adminId } }))
		if (err) return response.errReturned(res, err)
		if (admin == null) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND)

		const formattedToken = authenticator.verifyToken(admin.twofa_formatted_key == null ? '' : admin.twofa_formatted_key, obj.code)
		if (!formattedToken) return response.sendResponse(res, resCode.NOT_FOUND, 'Code Not Verified');

		//Getting permissions by role id
		[err, permissions] = await utils.to(db.query(`
        select r.name roleName, f.name as featureName, r.id as roleId, f.id as featureId,
            f.parent_id as parentId, f.is_feature as isFeature, f.sequence as sequence, r.status,
            f.route as route, f.isSubTab as isSubTab 
            from permissions p 
            inner join features f ON p.feature_id = f.id
            inner join roles r ON r.id = p.role_id
            where p.role_id = :roleId`,
			{
				replacements: { roleId: parseInt(admin.role_id) },
				type: db.QueryTypes.SELECT,
			}))
		if (err) return response.errReturned(res, err)
		if (!permissions || permissions.length == 0)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)
		if (!permissions[0].status)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.ROLE_IS_BLOCKED)

		const menuItems = []
		for (let i = 0; i < permissions.length; i++) {
			const children = []
			if (permissions[i].parentId == 0) {
				menuItems.push(permissions[i])
				const filterd = (permissions.filter(x => x.parentId == menuItems[menuItems.length - 1].featureId))
				for (let j = 0; j < filterd.length; j++) {
					if (filterd[j].isSubTab) {
						children[j] = filterd[j]
					}
				}
				if (children.length > 0)
					menuItems[menuItems.length - 1].children = children
			}
		}

		if (obj.state == 1) {
			//Updating admin model in db
			[err, update] = await utils.to(db.models.admins.update(
				{ is_twofa_enable: true, is_twofa_verified: true },
				{ where: { id: obj.adminId } }
			))
			if (!update) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.API_ERROR)
			const data = {
				id: admin.id,
				name: admin.name,
				email: admin.email,
				is_admin: admin.is_admin,
				twofa_enable: true,
				is_twofa_verified: true,
				roleId: permissions[0].roleId,
				permissions: permissions.map(a => a.route)
			};
			[err, token] = await utils.to(tokenGenerator.createToken(data))
			data.menuItems = _.sortBy(menuItems, ['sequence', ['asc']])
			data.permissions = permissions.filter(x => x.parentId)
			return response.sendResponse(res, resCode.SUCCESS, 'Two Factor Authentication Enabled', data, token)

		} else {
			//Updating admin model in db
			[err, update] = await utils.to(db.models.admins.update(
				{ is_twofa_enable: false, is_twofa_verified: false, twofa_formatted_key: null },
				{ where: { id: obj.adminId } }
			))
			if (!update) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.API_ERROR)
			const data = {
				id: admin.id,
				name: admin.name,
				email: admin.email,
				is_admin: admin.is_admin,
				twofa_enable: false,
				is_twofa_verified: false,
				roleId: permissions[0].roleId,
				permissions: permissions.map(a => a.route)
			};
			[err, token] = await utils.to(tokenGenerator.createToken(data))
			data.menuItems = _.sortBy(menuItems, ['sequence', ['asc']])
			data.permissions = permissions.filter(x => x.parentId)
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
			'email': req.auth.email,
			'code': req.body.authenticationCode
		}

		let err, admin = {}, token = {}, permissions = {}

		if (!(obj.email && obj.code))
			return response.sendResponse(res, resCode.NOT_FOUND, 'Params Cannot be Empty');

		[err, admin] = await utils.to(db.models.admins.findOne({ where: { email: obj.email } }))
		if (admin == null) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND)
		if (err) return response.errReturned(res, err)
		if (!admin.is_twofa_enable) return response.sendResponse(res, resCode.NOT_FOUND, '2FA is not enabled for this Admin')

		const formattedToken = authenticator.verifyToken(admin.twofa_formatted_key, obj.code)
		if (!formattedToken)
			return response.sendResponse(res, resCode.BAD_REQUEST, 'The code is invalid');

		//Getting permissions by role id
		[err, permissions] = await utils.to(db.query(`
        select r.name roleName, f.name as featureName, r.id as roleId, f.id as featureId,
            f.parent_id as parentId, f.is_feature as isFeature, f.sequence as sequence, r.status,
            f.route as route, f.isSubTab as isSubTab 
            from permissions p 
            inner join features f ON p.feature_id = f.id
            inner join roles r ON r.id = p.role_id
            where p.role_id = :roleId`,
			{
				replacements: { roleId: parseInt(admin.role_id) },
				type: db.QueryTypes.SELECT,
			}))
		if (err) return response.errReturned(res, err)
		if (!permissions || permissions.length == 0)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)
		if (!permissions[0].status)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.ROLE_IS_BLOCKED)

		const menuItems = []
		for (let i = 0; i < permissions.length; i++) {
			const children = []
			if (permissions[i].parentId == 0) {
				menuItems.push(permissions[i])
				const filterd = (permissions.filter(x => x.parentId == menuItems[menuItems.length - 1].featureId))
				for (let j = 0; j < filterd.length; j++) {
					if (filterd[j].isSubTab) {
						children[j] = filterd[j]
					}
				}
				if (children.length > 0)
					menuItems[menuItems.length - 1].children = children
			}
		}

		//Returing successful response with data
		const data = {
			id: admin.id,
			name: admin.name,
			email: admin.email,
			is_admin: admin.is_admin,
			twofa_enable: admin.twofa_enable,
			is_twofa_verified: admin.is_twofa_verified,
			roleId: permissions[0].roleId,
			permissions: permissions.map(a => a.route)
		};
		[err, token] = await utils.to(tokenGenerator.createToken(data))
		data.menuItems = _.sortBy(menuItems, ['sequence', ['asc']])
		data.permissions = permissions.filter(x => x.parentId)
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