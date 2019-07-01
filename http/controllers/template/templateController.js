const utils = require('../../../etc/utils')
const response = require('../../../etc/response')
const resCode = require('../../../enum/responseCodesEnum')
const resMessage = require('../../../enum/responseMessagesEnum')

const db = global.healthportDb

async function addTemplate(req, res) {
	try {
		const { id } = req.auth
		const { name, description } = req.body
		let { templateFields } = req.body

		let err = {}, template = {}, tempFields = {}, admin = {}

		//Name validations
		if (!name)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.NAME_IS_REQUIRED)
		if (name.length >= 30)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.CHARACTER_COUNT_ERROR)

		if (!templateFields || templateFields.length == 0)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.ATTRIBUTE_IS_REQUIRED)

		let flag = false
		templateFields.forEach(element => {
			if (!(element.hasOwnProperty('label') && element.hasOwnProperty('type'))) {
				flag = true
			} else if (!(element.label && element.type)) {
				flag = true
			}
		})
		if (flag)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.BOTH_LABEL_TYPE_REQUIRED);

		//Checking duplicate items in attribute list
		// const filterArray = templateFields.filter(x => x.attribute_list_id != '')
		// const input = filterArray.map(x => x.attribute_list_id)
		// const duplicates = input.reduce((acc, el, i, arr) => {
		// 	if (arr.indexOf(el) !== i && acc.indexOf(el) < 0) acc.push(el); return acc
		// }, [])
		// if (duplicates.length > 0)
		// 	return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.DUPLICATE_ITEMS, duplicates);

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
		if (!template) response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)

		templateFields = templateFields.map(elem => (
			{
				type: elem.type,
				label: elem.label,
				placeholder: elem.placeholder,
				required: elem.required ? elem.required : false,
				attribute_list_id: elem.attribute_list_id,
				template_id: template.id
			}
		));

		//Saving attributes
		[err, tempFields] = await utils.to(db.models.template_fields.bulkCreate(templateFields))
		if (err) return response.errReturned(res, err)
		if (tempFields == null || !tempFields)
			return utils.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)

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
			return utils.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)

		//Returing successful response
		return response.sendResponse(res, resCode.SUCCESS, resMessage.STATUS_UPDATED_SUCCESSFULLY)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

async function getTemplates(req, res) {
	try {
		const { id } = req.auth
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
		[err, admin] = await utils.to(db.models.admins.findOne({ where: { id } }))
		if (err) return response.errReturned(res, err)
		if (!admin || admin.length == 0)
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
		const { id } = req.auth
		const { tempId } = req.params

		let err = {}, admin = {}, temp = {};

		//Verifying user authenticity
		[err, admin] = await utils.to(db.models.admins.findOne({ where: { id } }))
		if (err) return response.errReturned(res, err)
		if (!admin || admin.length == 0)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

		//Querying db for list records
		[err, temp] = await utils.to(db.query(`
		Select t.id, t.name, t.description, t.status, tf.type, 
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
		let { templateFields } = req.body
		const { tempId } = req.params

		let err = {}, admin = {}, temp = {}, obj = {}, tempFields = {}

		//Name validations
		if (!name)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.NAME_IS_REQUIRED)
		if (name.length >= 30)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.CHARACTER_COUNT_ERROR)

		if (!templateFields || templateFields.length == 0)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.ATTRIBUTE_IS_REQUIRED)

		let flag = false
		templateFields.forEach(element => {
			if (!(element.hasOwnProperty('label') && element.hasOwnProperty('type'))) {
				flag = true
			} else if (!(element.label && element.type)) {
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

		//Getting template from db
		[err, temp] = await utils.to(db.models.templates.findOne({ where: { id: tempId } }))
		if (err) return response.errReturned(res, err)
		if (!temp || temp.length == 0)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

		//Getting template from db
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

		//Deleting existing records
		[err, obj] = await utils.to(db.models.template_fields.destroy({ where: { template_id: tempId } }))
		if (err) return response.errReturned(res, err)

		templateFields = templateFields.map(elem => (
			{
				type: elem.type,
				label: elem.label,
				placeholder: elem.placeholder,
				required: elem.required ? elem.required : false,
				attribute_list_id: elem.attribute_list_id,
				template_id: tempId
			}
		));

		//Saving attributes
		[err, tempFields] = await utils.to(db.models.template_fields.bulkCreate(templateFields))
		if (err) return response.errReturned(res, err)
		if (tempFields == null || !tempFields)
			return utils.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)

		//Returing successful response
		return response.sendResponse(res, resCode.SUCCESS, resMessage.TEMPLATE_ADDED_SUCCESSFULLY)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

module.exports = {
	addTemplate,
	updateTemplateStatusById,
	getTemplates,
	getTemplateById,
	updateTemplateById
}