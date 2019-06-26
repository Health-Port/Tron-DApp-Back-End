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
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.LIST_CHARACTER_COUNT_ERROR)

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
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.BOTH_LABEL_TYPE_REQUIRED)

		//Checking duplicate items in attribute list
		const filterArray = templateFields.filter(x=>x.attribute_list_id != '')
		const input = filterArray.map(x => x.attribute_list_id)
		const duplicates = input.reduce((acc, el, i, arr) => {
			if (arr.indexOf(el) !== i && acc.indexOf(el) < 0) acc.push(el); return acc
		}, [])
		if (duplicates.length > 0)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.DUPLICATE_ITEMS, duplicates);

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
				required: elem.required,
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

module.exports = {
	addTemplate
}