const utils = require('../../../etc/utils')
const response = require('../../../etc/response')
const resCode = require('../../../enum/responseCodesEnum')
const resMessage = require('../../../enum/responseMessagesEnum')

const db = global.healthportDb

async function addTemplate(req, res) {
	try {
		const { id } = req.auth
		const { name, description } = req.body
		let { templateFields, accessRights } = req.body

		let err = {}, template = {}, tempFields = {}, admin = {}, rights = {}

		//Name validations
		if (!name)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.NAME_IS_REQUIRED)
		if (name.length >= 30)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.CHARACTER_COUNT_ERROR)

		if (!templateFields || templateFields.length == 0)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.ATTRIBUTE_IS_REQUIRED)

		if (!accessRights || accessRights.length == 0)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.ACCESS_RIGHTS_REQUIRED)

		//required must be boolean, not allowed any other value - HP-548 - Zaigham javed
		let statusFlag = false
		let flag = false
		templateFields.forEach(element => {
			if (!(element.hasOwnProperty('label') && element.hasOwnProperty('type'))) {
				flag = true
			} else if (!(element.label && element.type)) {
				flag = true
			}
			// else if(!utils.isBoolean(element.required)){
			// 	statusFlag = true
			// }
		})
		if (flag)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.BOTH_LABEL_TYPE_REQUIRED)

		//accessRights' Boolean fields must be boolean, not allowed any other value - HP-548 - Zaigham javed
		flag = false
		statusFlag = false
		accessRights.forEach(element => {
			if (!(element.hasOwnProperty('systemRoleId'))) {
				flag = true
			} else if (!(element.systemRoleId)) {
				flag = true
			} else if (!(utils.isBoolean(element.view) && utils.isBoolean(element.edit) && utils.isBoolean(element.update) && utils.isBoolean(element.share_via_email) && utils.isBoolean(element.share))) {
				statusFlag = true
			}
		})
		if (flag)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.BOTH_LABEL_TYPE_REQUIRED)
		if (statusFlag)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.BOOLEAN_VALUE_REQUIRED);

		//Verifying user authenticity
		[err, admin] = await utils.to(db.models.admins.findOne({ where: { id } }))
		if (err) return response.errReturned(res, err)
		if (!admin || admin.length == 0)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

		//Checking uniqueness of template name
		[err, template] = await utils.to(db.models.templates.findOne({ where: { name } }))
		if (err) return response.errReturned(res, err)
		if (template)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.TEMPLATE_ALREADY_EXIST);

		//Saving template in db
		[err, template] = await utils.to(db.models.templates.create({ name, description }))
		if (err) return response.errReturned(res, err)
		if (!template)
			return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)

		//Maping template field columns
		templateFields = templateFields.map(elem => (
			{
				type: elem.type,
				label: elem.label,
				placeholder: elem.placeholder,
				required: elem.required ? elem.required : false,
				attribute_list_id: elem.dropdown ? parseInt(elem.dropdown) : '',
				template_id: template.id
			}
		));

		//Saving attributes
		[err, tempFields] = await utils.to(db.models.template_fields.bulkCreate(templateFields))
		if (err) return response.errReturned(res, err)
		if (tempFields == null || !tempFields)
			return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)

		//Mapping access rights
		accessRights = accessRights.map(elem => (
			{
				view: elem.view,
				edit: elem.edit,
				update: elem.update,
				share_via_email: elem.share_via_email,
				share: elem.share,
				template_id: template.id,
				system_role_id: elem.systemRoleId
			}
		));

		//Saving rights
		[err, rights] = await utils.to(db.models.system_role_rights.bulkCreate(accessRights))
		if (err) return response.errReturned(res, err)
		if (rights == null || !rights)
			return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)

		//Returing successful response
		return response.sendResponse(res, resCode.SUCCESS, resMessage.TEMPLATE_ADDED_SUCCESSFULLY)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

async function updateTemplateStatusById(req, res) {
	try {
		const { id } = req.auth
		const { status } = req.body
		const { tempId } = req.params

		let err = {}, template = {}, obj = {}, admin = {}

		const flag = typeof status === 'boolean' ? true : false
		if (!flag)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.STATUS_IS_NOT_BOOLEAN);

		//Verifying user authenticity
		[err, admin] = await utils.to(db.models.admins.findOne({ where: { id } }))
		if (err) return response.errReturned(res, err)
		if (!admin || admin.length == 0)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

		//Checking if template exists
		[err, template] = await utils.to(db.models.templates.findOne({ where: { id: tempId } }))
		if (err) return response.errReturned(res, err)
		if (!template)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.NO_RECORD_FOUND);

		//Updating status
		[err, obj] = await utils.to(db.models.templates.update(
			{ status },
			{ where: { id: template.id } }
		))
		if (err) return response.errReturned(res, err)
		if (obj[0] == 0)
			return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)

		//Returing successful response
		return response.sendResponse(res, resCode.SUCCESS, resMessage.STATUS_UPDATED_SUCCESSFULLY)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

async function getTemplates(req, res) {
	try {
		let { id } = req.auth
		const { user_id } = req.auth
		let table
		if (req.baseUrl === '/admin') {
			table = 'admins'
		} else {
			id = user_id
			table = 'users'
		}
		const { searchValue, status } = req.body
		let { pageNumber, pageSize } = req.body

		let err = {}, dbData = {}, admin = {}
		const returnableData = {}

		//Paging
		pageSize = parseInt(pageSize)
		pageNumber = parseInt(pageNumber)
		if (!pageNumber) pageNumber = 0
		if (!pageSize) pageSize = 10
		const start = parseInt(pageNumber * pageSize)
		const end = parseInt(start + pageSize);

		//Verifying user authenticity
		[err, admin] = await utils.to(db.query(
			`Select id
					From ${table} 
					where id = :id 
					Order by id desc limit 1`,
			{
				replacements: { id },
				type: db.QueryTypes.SELECT,
			}))
		if (err) return response.errReturned(res, err)
		if (admin == null || admin.length == 0 || !admin)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

		//Quering db for data
		[err, dbData] = await utils.to(db.query(`
			Select id, name, status, description, createdAt 
				From templates
				Order by createdAt DESC`,
			{
				type: db.QueryTypes.SELECT
			}))
		if (err) return response.errReturned(res, err)

		const filter = typeof status === 'boolean' ? 'filter' : ''

		if (dbData) {
			if (searchValue)
				dbData = dbData.filter(x => x.name.toLowerCase().includes(searchValue.toLowerCase()))
			if (filter)
				dbData = dbData.filter(x => x.status == status)

			//Filtring active templates only for user's call
			if (req.baseUrl === '/user')
				dbData = dbData.filter(x => x.status == true)

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

async function getTemplateById(req, res) {
	try {
		let { id } = req.auth
		const { user_id } = req.auth
		let table
		if (req.baseUrl === '/admin') {
			table = 'admins'
		} else {
			id = user_id
			table = 'users'
		}
		const { tempId } = req.params

		let err = {}, admin = {}, temp = {};

		//Verifying user authenticity
		[err, admin] = await utils.to(db.query(
			`Select id
					From ${table} 
					where id = :id 
					Order by id desc limit 1`,
			{
				replacements: { id },
				type: db.QueryTypes.SELECT,
			}))
		if (err) return response.errReturned(res, err)
		if (admin == null || admin.length == 0 || !admin)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

		//Querying db for list records
		[err, temp] = await utils.to(db.query(`
			Select t.id, t.name, t.description, t.status, tf.id as tfId, tf.type, 
				tf.label, tf.placeholder, tf.required, tf.attribute_list_id, 
				al.name as attributeListName 
				From templates t 
				Inner join template_fields tf ON t.id = tf.template_id
				left join attribute_lists al ON al.id = tf.attribute_list_id
				Where t.id = :id`,
			{
				replacements: { id: tempId },
				type: db.QueryTypes.SELECT,
			}))
		if (err) return response.errReturned(res, err)
		if (!temp || temp.length == 0)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)

		//maping data and columns
		const data = {
			id: temp[0].id,
			name: temp[0].name,
			description: temp[0].description,
			fields: temp.map(elem => (
				{
					id: elem.tfId.toString(),
					type: elem.type,
					label: elem.label,
					placeholder: elem.placeholder,
					required: elem.required,
					attributeListId: elem.attribute_list_id ?
						elem.attribute_list_id
						: '',
					attributeListName: elem.attribute_list_id ?
						elem.attributeListName
						: ''
				}
			))
		}

		//Getting dropdown values for user side call
		if (req.baseUrl === '/user') {
			const filterd = data.fields.filter(x => x.attributeListId)
			for (let i = 0; i < filterd.length; i++) {
				[err, temp] = await utils.to(db.models.attribute_list_values.findAll(
					{ where: { list_id: filterd[i].attributeListId } }))
				if (err) return response.errReturned(res, err)
				const index = data.fields.indexOf(filterd[i])
				data.fields[index].attributeListValues = temp
			}
		}

		// Getting access rights against template id
		if (req.baseUrl === '/admin') {
			[err, temp] = await utils.to(db.query(`
				Select s.id as systemRoleId, s.view, s.edit, s.update, s.share_via_email, s.share, 
					r.name as roleName
					From system_role_rights s 
					Inner join templates t ON s.template_id = t.id
					Inner join system_roles r ON r.id = s.system_role_id
					Where t.id = :id`,
				{
					replacements: { id: tempId },
					type: db.QueryTypes.SELECT,
				}))
			if (err) return response.errReturned(res, err)
			if (!temp || temp.length == 0)
				return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_ACCESS_RIGHTS_FOUND)
			data.accessRights = temp
		}

		//Returing successful response
		return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, data)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

async function updateTemplateById(req, res) {
	try {
		const { id } = req.auth
		const { name, description } = req.body
		let { templateFields, accessRights } = req.body
		const { tempId } = req.params

		let err = {}, admin = {}, temp = {}, obj = {}, tempFields = {}

		//Name validations
		if (!name)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.NAME_IS_REQUIRED)
		if (name.length >= 30)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.CHARACTER_COUNT_ERROR)

		if (!templateFields || templateFields.length == 0)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.ATTRIBUTE_IS_REQUIRED)

		//required must be boolean, not allowed any other value - HP-548 - Zaigham javed
		let flag = false
		templateFields.forEach(element => {
			if (!(element.hasOwnProperty('label') && element.hasOwnProperty('type'))) {
				flag = true
			} else if (!(element.label && element.type)) {
				flag = true
			}
		})
		if (flag)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.BOTH_LABEL_TYPE_REQUIRED)

		flag = false
		accessRights.forEach(element => {
			if (!(element.hasOwnProperty('systemRoleId'))) {
				flag = true
			} else if (!(element.systemRoleId)) {
				flag = true
			}
		})
		if (flag)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.BOTH_LABEL_TYPE_REQUIRED);

		//Verifying user authenticity
		[err, admin] = await utils.to(db.models.admins.findOne({ where: { id } }))
		if (err) return response.errReturned(res, err)
		if (!admin || admin.length == 0)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

		//Getting template from db by id
		[err, temp] = await utils.to(db.models.templates.findOne({ where: { id: tempId } }))
		if (err) return response.errReturned(res, err)
		if (!temp || temp.length == 0)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND);

		//Getting template from db by name
		[err, obj] = await utils.to(db.models.templates.findOne({ where: { name } }))
		if (err) return response.errReturned(res, err)

		if (obj) {
			if (temp.id == obj.id) {
				[err, obj] = await utils.to(db.models.templates.update(
					{ name, description },
					{ where: { id: temp.id } }
				))
				if (err) return response.errReturned(res, err)
				if (obj[0] == 0)
					return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)
			} else {
				return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.NAME_ALREADY_EXISTS)
			}
		} else {
			[err, obj] = await utils.to(db.models.templates.update(
				{ name, description },
				{ where: { id: temp.id } }
			))
			if (err) return response.errReturned(res, err)
			if (obj[0] == 0)
				return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)
		}

		templateFields = templateFields.map(elem => (
			{
				id: elem.id ? parseInt(elem.id) : '',
				type: elem.type,
				label: elem.label.replace(/&nbsp;/g, ''),
				placeholder: elem.placeholder,
				required: elem.required ? elem.required : false,
				attribute_list_id: elem.dropdown ? parseInt(elem.dropdown) : '',
				template_id: tempId
			}
		));

		//Saving/updating attributes
		[err, tempFields] = await utils.to(db.models.template_fields.bulkCreate(
			templateFields, {
				updateOnDuplicate: [
					'type', 'label', 'placeholder', 'required', 'attribute_list_id', 'template_id'
				]
			}))
		if (err) return response.errReturned(res, err)
		if (tempFields == null || !tempFields)
			return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)

		//Mapping access rights
		accessRights = accessRights.map(elem => (
			{
				id: elem.systemRoleId,
				view: elem.view,
				edit: elem.edit,
				update: elem.update,
				share_via_email: elem.share_via_email,
				share: elem.share,
				template_id: parseInt(tempId),
				//system_role_id: elem.systemRoleId
			}
		));

		//Updating rights access
		[err, tempFields] = await utils.to(db.models.system_role_rights.bulkCreate(
			accessRights, {
				updateOnDuplicate: [
					'view', 'edit', 'update', 'share_via_email', 'share', 'template_id'
				]
			}))
		if (err) return response.errReturned(res, err)
		if (tempFields == null || !tempFields)
			return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)

		//Returing successful response
		//response message changed from temp-added-successfully to temp-updated-successful"
		//HP-540 - Zaigham Javed - 03/july/2019
		return response.sendResponse(res, resCode.SUCCESS, resMessage.TEMPLATE_UPDATED_SUCCESSFULLY)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

module.exports = {
	addTemplate,
	getTemplates,
	getTemplateById,
	updateTemplateById,
	updateTemplateStatusById
}