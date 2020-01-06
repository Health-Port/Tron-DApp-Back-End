const utils = require('../../../etc/utils')
const response = require('../../../etc/response')
const resCode = require('../../../enum/responseCodesEnum')
const resMessage = require('../../../enum/responseMessagesEnum')
const roleEnum = require('../../../enum/roleEnum')

const db = global.healthportDb
let globalArray = []

async function getAllRoles(req, res) {
	try {
		const { id } = req.auth
		const { searchValue, status } = req.body
		let { pageNumber, pageSize } = req.body
		let err = {}, dbData = {}, admin = {}
		const returnableData = {};

		//Verifying user authenticity
		[err, admin] = await utils.to(db.models.admins.findOne({ where: { id } }))
		if (err) return response.errReturned(res, err)
		if (!admin || admin.length == 0)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND)

		//Paging
		pageSize = parseInt(pageSize)
		pageNumber = parseInt(pageNumber)
		if (!pageNumber) pageNumber = 0
		if (!pageSize) pageSize = 10
		const start = parseInt(pageNumber * pageSize)
		const end = parseInt(start + pageSize);

		//db query
		[err, dbData] = await utils.to(db.query(`
			Select id, name, description, status, 
				createdAt as dateCreated 
				from roles
				where name != 'Super Admin'
				order by createdAt DESC`,
			{
				type: db.QueryTypes.SELECT,
			}))
		if (err) return response.errReturned(res, err)
		if (!dbData || dbData.length == 0)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)

		const filter = typeof status === 'boolean' ? 'filter' : ''

		if (dbData) {
			if (filter && searchValue) {
				dbData = dbData.filter(x => x.status == status)
				dbData = dbData.filter(x => x.name.toLowerCase().includes(searchValue.toLowerCase()))
			} else if (filter) {
				dbData = dbData.filter(x => x.status == status)
			} else if (searchValue) {
				dbData = dbData.filter(x => x.name.toLowerCase().includes(searchValue.toLowerCase()))
			}

			//Paging implementation
			returnableData['count'] = dbData.length
			const slicedData = dbData.slice(start, end)
			returnableData['rows'] = slicedData
		}

		//Returing successful response
		return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, returnableData)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

async function getRoleByID(req, res) {
	try {
		const { id } = req.auth
		const { roleId } = req.params

		let err = {}, admin = {}, role = {};

		//Verifying user authenticity
		[err, admin] = await utils.to(db.models.admins.findOne({ where: { id } }))
		if (err) return response.errReturned(res, err)
		if (!admin || admin.length == 0)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

		[err, role] = await utils.to(db.query(`
        Select r.name roleName, f.name as featureName, r.id as roleId, r.name as roleName, f.id as featureId,
			r.description as roleDescription, f.parent_id as parentId, f.is_feature as isFeature, 
			f.sequence as sequence 
            From permissions p 
            Inner join features f ON p.feature_id = f.id
            Inner join roles r ON r.id = p.role_id
            Where p.role_id = :roleId`,
			{
				replacements: { roleId: parseInt(roleId) },
				type: db.QueryTypes.SELECT,
			}))
		if (err) return response.errReturned(res, err)
		if (!role || role.length == 0)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)

		let features = []
		features = role.map(elem => (
			{
				isFeature: elem.isFeature,
				featureId: elem.featureId,
				parentId: elem.parentId
			}
		))

		//Returing successful response with data
		const data = {
			id: role[0].roleId,
			name: role[0].roleName,
			description: role[0].roleDescription,
			listFeatures: features
		}
		return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, data)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

async function addNewRole(req, res) {
	try {
		const { id } = req.auth
		const { name, description, features, status } = req.body

		let err = {}, admin = {}, role = {}, permissions = {}, mappedFeatures = []

		if (features.length == 0)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.FEATURE_IS_REQUIRED)

		let flag = false
		features.forEach(element => {
			if (!(element.hasOwnProperty('id') && element.hasOwnProperty('parentId'))) {
				flag = true
			} else if (!(element.id && element.parentId)) {
				flag = true
			}
		})
		if (flag)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.BOTH_ID_PARENTID_REQUIRED)

		//Checking if feature id and parent id is same.
		for (let i = 0; i < features.length; i++) {
			if (features[i].id == features[i].parentId) {
				flag = true
				break
			}
		}
		if (flag)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.BOTH_ID_PARENTID_REQUIRED)

		let allFeatures = {};
		//Quering db to get list of featuress
		[err, allFeatures] = await utils.to(db.query(`
				Select id, name, parent_id as parentId, is_feature as isFeature, 
					sequence, createdAt 
					from features`,
			{
				type: db.QueryTypes.SELECT,
			}))
		if (err) return response.errReturned(res, err)
		for (let i = 0; i < features.length; i++) {
			recursive(features[i].id, allFeatures)
		}

		if (!name)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.ROLE_NAEME_REQUIRED);

		//Verifying user authenticity
		[err, admin] = await utils.to(db.models.admins.findOne({ where: { id } }))
		if (err) return response.errReturned(res, err)
		if (!admin || admin.length == 0)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

		//Checking if role already exists
		[err, role] = await utils.to(db.models.roles.findOne({ where: { name } }))
		if (err) return response.errReturned(res, err)
		if (role != null)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.ROLE_ALREADY_EXIST);

		//Saving role in db
		[err, role] = await utils.to(db.models.roles.create({ name, description, status }))
		if (err) return response.errReturned(res, err)
		if (!role)
			return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)

		//Mapping properties name required for permission table
		mappedFeatures = globalArray.map(elem => (
			{
				feature_id: elem,
				role_id: role.id
			}
		))
		globalArray = [];
		//Saving permssion against newly created role
		[err, permissions] = await utils.to(db.models.permissions.bulkCreate(mappedFeatures))
		if (err) return response.errReturned(res, err)
		if (!permissions)
			return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)

		//Returing successful response
		return response.sendResponse(res, resCode.SUCCESS, resMessage.ROLE_ADDED)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

async function getAllActiveRoles(req, res) {
	try {
		const { id } = req.auth

		let err = {}, admin = {}, roles = {};

		//Verifying user authenticity
		[err, admin] = await utils.to(db.models.admins.findOne({ where: { id } }))
		if (err) return response.errReturned(res, err)
		if (!admin || admin.length == 0)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

		[err, roles] = await utils.to(db.models.roles.findAll(
			{
				attributes: ['id', 'name'],
				where: [{ status: true }],
				order: [['name', 'ASC']]
			}))
		if (err) return response.errReturned(res, err)
		if (roles == null || roles.count == 0 || roles.length == 0)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)

		//excluding super admin from role list
		roles = roles.filter(x => x.name != roleEnum.SUPERADMIN)
		//Returing successful response
		return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, roles)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

async function updateRoleById(req, res) {
	try {
		const { roleId } = req.params
		const { id } = req.auth
		const { name, description, features, status } = req.body

		let err = {}, admin = {}, role = {}, obj = {}, permissions = {}, mappedFeatures = []

		if (features.length == 0)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.FEATURE_IS_REQUIRED)

		let flag = false
		features.forEach(element => {
			if (!(element.hasOwnProperty('id') && element.hasOwnProperty('parentId'))) {
				flag = true
			} else if (!(element.id && element.parentId)) {
				flag = true
			}
		})
		if (flag)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.BOTH_ID_PARENTID_REQUIRED)

		let allFeatures = {};
		//Quering db to get list of featuress
		[err, allFeatures] = await utils.to(db.query(`
				Select id, name, parent_id as parentId, is_feature as isFeature, 
					sequence, createdAt 
					from features`,
			{
				type: db.QueryTypes.SELECT,
			}))
		if (err) return response.errReturned(res, err)
		for (let i = 0; i < features.length; i++) {
			recursive(features[i].id, allFeatures)
		}

		if (!name)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.ROLE_NAEME_REQUIRED)

		if (name.toLowerCase() == roleEnum.SUPERADMIN.toLowerCase())
			return response.sendResponse(res, resCode.UNAUTHORIZED, resMessage.ROLE_NAEME_NOT_ALLOWED);

		//Verifying user authenticity
		[err, admin] = await utils.to(db.models.admins.findOne({ where: { id } }))
		if (err) return response.errReturned(res, err)
		if (!admin || admin.length == 0)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

		//Checking if role already exists
		[err, role] = await utils.to(db.models.roles.findOne({ where: { id: roleId } }))
		if (err) return response.errReturned(res, err)
		if (!role || role == null || role.length == 0)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.ROLE_NOT_FOUND)

		if (name != role.name) {
			//Checking if role name already exists
			[err, obj] = await utils.to(db.models.roles.findOne({ where: { name } }))
			if (err) return response.errReturned(res, err)
			if (obj != null)
				return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.ROLE_ALREADY_EXIST)
		}

		//Updating role
		[err, obj] = await utils.to(db.models.roles.update(
			{ name, description, status },
			{ where: { id: role.id } }
		))
		if (err) return response.errReturned(res, err)
		if (obj[0] == 0)
			return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR);

		//Deleting existing permissions
		[err, obj] = await utils.to(db.models.permissions.destroy({ where: { role_id: role.id } }))
		if (err) return response.errReturned(res, err)

		//Mapping properties name required for permission table
		mappedFeatures = globalArray.map(elem => (
			{
				feature_id: elem,
				role_id: role.id
			}
		))
		globalArray = [];
		//Saving permssion against newly created role
		[err, permissions] = await utils.to(db.models.permissions.bulkCreate(mappedFeatures))
		if (err) return response.errReturned(res, err)
		if (!permissions)
			return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)

		//Returing successful response
		return response.sendResponse(res, resCode.SUCCESS, resMessage.ROLE_UPDATED)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

function recursive(id, allFeatures) {
	if (id != 0) {
		const v = allFeatures.filter(x => x.id == id)
		if (!globalArray.includes(v[0].id)) {
			globalArray.push(v[0].id)
			recursive(v[0].parentId, allFeatures)
		}
	}
}

async function updateRoleStatusById(req, res) {
	try {
		const { id } = req.auth
		const { roleId } = req.params
		const { status } = req.body

		let err = {}, admin = {}, obj = {}, role = {};

		//Verifying user authenticity
		[err, admin] = await utils.to(db.models.admins.findOne({ where: { id } }))
		if (err) return response.errReturned(res, err)
		if (!admin || admin.length == 0)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

		//Checking if role already exists
		[err, role] = await utils.to(db.models.roles.findOne({ where: { id: roleId } }))
		if (err) return response.errReturned(res, err)
		if (!role || role == null || role.length == 0)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.ROLE_NOT_FOUND);

		//Updating role
		[err, obj] = await utils.to(db.models.roles.update(
			{ status },
			{ where: { id: role.id } }
		))
		if (err) return response.errReturned(res, err)
		if (obj[0] == 0)
			return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)

		//Returing successful response
		if (status)
			return response.sendResponse(res, resCode.SUCCESS, resMessage.ROLE_ACTIVATED)
		else
			return response.sendResponse(res, resCode.SUCCESS, resMessage.ROLE_BLOCKED)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

async function getAllRolesList(req, res) {
	try {
		const { id } = req.auth

		let err = {}, admin = {}, roles = {};

		//Verifying user authenticity
		[err, admin] = await utils.to(db.models.admins.findOne({ where: { id } }))
		if (err) return response.errReturned(res, err)
		if (!admin || admin.length == 0)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

		[err, roles] = await utils.to(db.models.roles.findAll(
			{
				attributes: ['id', 'name'],
				order: [['name', 'ASC']]
			}))
		if (err) return response.errReturned(res, err)
		if (roles == null || roles.count == 0 || roles.length == 0)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)

		//excluding super admin from role list
		roles = roles.filter(x => x.name != roleEnum.SUPERADMIN)
		//Returing successful response
		return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, roles)
	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}
module.exports = {
	getAllRoles,
	getRoleByID,
	addNewRole,
	getAllActiveRoles,
	updateRoleById,
	updateRoleStatusById,
	getAllRolesList
}