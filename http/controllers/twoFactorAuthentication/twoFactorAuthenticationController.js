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
		let entityId
		let table
		if (req.baseUrl === '/admin') {
			entityId = req.auth.id
			table = 'admins'
		} else {
			entityId = req.auth.user_id
			table = 'users'
		}
		let err, data = {}, obj = {}

		//Checking required fileds 
		if (!entityId)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.REQUIRED_FIELDS_EMPTY);

		[err, data] = await utils.to(db.query(
			`Select id, email, twofa_formatted_key 
				From ${table} 
				where id = :id 
				Order by id desc limit 1`,
			{
				replacements: { id: entityId },
				type: db.QueryTypes.SELECT,
			}))
		if (err) return response.errReturned(res, err)
		if (data == null || data.length == 0 || !data)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND)
		if (data[0].twofa_formatted_key)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.TWO_FACTOR_IS_ALREADY_ENABLED)

		const twoFAFormattedKey = authenticator.generateKey()

		const toTpURI = authenticator.generateTotpUri(
			twoFAFormattedKey,
			data[0].email,
			`${process.env.PROJECT_NAME}-User`,
			process.env.AUTHENTICATOR_ALGO, 6, 30
		);

		//Updating admin model in db
		[err, obj] = await utils.to(db.query(
			`Update ${table} 
				SET twofa_formatted_key = :key 
				Where id = :id`,
			{
				replacements: { id: entityId, key: twoFAFormattedKey }
			}))
		if (err) return response.errReturned(res, err)
		if (obj[0].fieldCount != 0)
			return utils.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)

		return response.sendResponse(
			res,
			resCode.SUCCESS,
			resMessage.TWO_FACTOR_IS_ENABLED,
			{ toTpUri: toTpURI }
		)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

async function enableDisableTwoFactorAuthentication(req, res) {
	try {
		const { state, authenticationCode } = req.body
		let entityId
		let table
		if (req.baseUrl === '/admin') {
			entityId = req.auth.id
			table = 'admins'
		} else {
			entityId = req.auth.user_id
			table = 'users'
		}
		let err, admin = {}, token, update = {}, permissions = {}, data = {}

		//Checking required fileds 
		if (!(entityId && state !== undefined && authenticationCode))
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.REQUIRED_FIELDS_EMPTY)

		//Checking state fileds 
		if (!(state == 1 || state == 0))
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.STATE_IS_INVALID);

		[err, admin] = await utils.to(db.query(
			`Select *
					From ${table} 
					where id = :id 
					Order by id desc limit 1`,
			{
				replacements: { id: entityId },
				type: db.QueryTypes.SELECT,
			}))
		if (err) return response.errReturned(res, err)
		if (admin == null || admin.length == 0 || !admin)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND)
		if (!admin[0].twofa_formatted_key)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.TWO_FACTOR_IS_DISABLED)

		const formattedToken = authenticator.verifyToken(admin[0].twofa_formatted_key == null
			? '' : admin[0].twofa_formatted_key, authenticationCode)
		if (!formattedToken)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.CODE_NOT_VARIFIED)

		const menuItems = []
		if (req.baseUrl === '/admin') {
			//Getting permissions by role id
			[err, permissions] = await utils.to(db.query(`
        	Select r.name roleName, f.name as featureName, r.id as roleId, f.id as featureId,
            	f.parent_id as parentId, f.is_feature as isFeature, f.sequence as sequence, r.status,
            	f.route as route, f.isSubTab as isSubTab 
            	From permissions p 
            	Inner join features f ON p.feature_id = f.id
            	Inner join roles r ON r.id = p.role_id
            	Where p.role_id = :roleId`,
				{
					replacements: { roleId: parseInt(admin[0].role_id) },
					type: db.QueryTypes.SELECT,
				}))
			if (err) return response.errReturned(res, err)
			if (!permissions || permissions.length == 0)
				return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)
			if (!permissions[0].status)
				return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.ROLE_IS_BLOCKED)

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
		}

		if (state == 1) {
			//Updating admin model in db
			[err, update] = await utils.to(db.query(
				`Update ${table} 
				SET is_twofa_enable = :isTwofaEnable, is_twofa_verified = :isTwofaVerified 
				Where id = :id`,
				{
					replacements: { id: entityId, isTwofaEnable: true, isTwofaVerified: true }
				}))
			if (err) return response.errReturned(res, err)
			if (update[0].fieldCount != 0)
				return utils.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)

			if (req.baseUrl === '/admin') {
				data = {
					id: admin[0].id,
					name: admin[0].name,
					email: admin[0].email,
					is_admin: admin[0].is_admin,
					twofa_enable: true,
					is_twofa_verified: true,
					roleId: permissions[0].roleId,
					permissions: permissions.map(a => a.route)
				};
				[err, token] = await utils.to(tokenGenerator.createToken(data))
				data.menuItems = _.sortBy(menuItems, ['sequence', ['asc']])
				data.permissions = permissions.filter(x => x.parentId)
			} else {
				data = {
					id: admin[0].id,
					name: admin[0].name,
					email: admin[0].email,
					is_admin: admin[0].is_admin,
					twofa_enable: true,
					is_twofa_verified: true,
				};
				[err, token] = await utils.to(tokenGenerator.createToken(data))
			}
			return response.sendResponse(res, resCode.SUCCESS, resMessage.TWO_FACTOR_IS_ENABLED, data, token)
		} else {
			//Updating admin model in db
			[err, update] = await utils.to(db.query(
				`Update ${table} 
				SET is_twofa_enable = :isTwofaEnable, is_twofa_verified = :isTwofaVerified,
				twofa_formatted_key = :twofa_formatted_key
				Where id = :id`,
				{
					replacements:
					{
						id: entityId, isTwofaEnable: false, isTwofaVerified: false,
						twofa_formatted_key: null
					}
				}))
			if (err) return response.errReturned(res, err)
			if (update[0].fieldCount != 0)
				return utils.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)

			if (req.baseUrl === '/admin') {
				data = {
					id: admin[0].id,
					name: admin[0].name,
					email: admin[0].email,
					is_admin: admin[0].is_admin,
					twofa_enable: false,
					is_twofa_verified: false,
					roleId: permissions[0].roleId,
					permissions: permissions.map(a => a.route)
				};
				[err, token] = await utils.to(tokenGenerator.createToken(data))
				data.menuItems = _.sortBy(menuItems, ['sequence', ['asc']])
				data.permissions = permissions.filter(x => x.parentId)
			} else {
				data = {
					id: admin[0].id,
					name: admin[0].name,
					email: admin[0].email,
					is_admin: admin[0].is_admin,
					twofa_enable: false,
					is_twofa_verified: false,
				};
				[err, token] = await utils.to(tokenGenerator.createToken(data))
			}
			return response.sendResponse(res, resCode.SUCCESS, resMessage.TWO_FACTOR_IS_DISABLED, data, token)
		}
	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

async function verifyTwoFactorAuthentication(req, res) {
	try {
		const { authenticationCode } = req.body
		const { email } = req.auth

		let table
		if (req.baseUrl === '/admin') {
			table = 'admins'
		} else {
			table = 'users'
		}
		let err, admin = {}, token = {}, permissions = {}, data = {}

		if (!(email && authenticationCode))
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.REQUIRED_FIELDS_EMPTY);

		[err, admin] = await utils.to(db.query(
			`Select *
					From ${table} 
					where email = :em 
					Order by id desc limit 1`,
			{
				replacements: { em: email },
				type: db.QueryTypes.SELECT,
			}))
		if (err) return response.errReturned(res, err)
		if (admin == null || admin.length == 0 || !admin)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND)
		if (!admin[0].is_twofa_enable)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.TWO_FACTOR_IS_DISABLED)

		const formattedToken = authenticator.verifyToken(admin[0].twofa_formatted_key, authenticationCode)
		if (!formattedToken)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.CODE_NOT_VARIFIED)

		if (req.baseUrl === '/admin') {
			//Getting permissions by role id
			[err, permissions] = await utils.to(db.query(`
			Select r.name roleName, f.name as featureName, r.id as roleId, f.id as featureId,
				f.parent_id as parentId, f.is_feature as isFeature, f.sequence as sequence, r.status,
				f.route as route, f.isSubTab as isSubTab 
				From permissions p 
				Inner join features f ON p.feature_id = f.id
				Inner join roles r ON r.id = p.role_id
				Where p.role_id = :roleId`,
				{
					replacements: { roleId: parseInt(admin[0].role_id) },
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
			data = {
				id: admin[0].id,
				name: admin[0].name,
				email: admin[0].email,
				is_admin: admin[0].is_admin,
				twofa_enable: admin[0].is_twofa_enable,
				is_twofa_verified: admin[0].is_twofa_verified,
				roleId: permissions[0].roleId,
				permissions: permissions.map(a => a.route)
			};
			[err, token] = await utils.to(tokenGenerator.createToken(data))
			data.menuItems = _.sortBy(menuItems, ['sequence', ['asc']])
			data.permissions = permissions.filter(x => x.parentId)
		} else {
			data = {
				id: admin[0].id,
				name: admin[0].name,
				email: admin[0].email,
				is_admin: admin[0].is_admin,
				twofa_enable: admin[0].is_twofa_enable,
				is_twofa_verified: admin[0].is_twofa_verified,
			};
			[err, token] = await utils.to(tokenGenerator.createToken(data))
		}
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