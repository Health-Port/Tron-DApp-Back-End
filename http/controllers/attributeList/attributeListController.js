const utils = require('../../../etc/utils')
const response = require('../../../etc/response')
const resCode = require('../../../enum/responseCodesEnum')
const resMessage = require('../../../enum/responseMessagesEnum')

const db = global.healthportDb

async function addAttributeList(req, res) {
	try {
		const { id } = req.auth
		const { listName } = req.body
		let { listAttributes } = req.body

		let err = {}, list = {}, listValue = {}, admin = {}

		//Name validations
		if (!listName)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.LIST_NAME_REQUIRED)
		if (listName.length >= 30)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.LIST_CHARACTER_COUNT_ERROR)

		//Checking duplicate items in attribute list
		const input = listAttributes.map(x => x.label)
		const duplicates = input.reduce((acc, el, i, arr) => {
			if (arr.indexOf(el) !== i && acc.indexOf(el) < 0) acc.push(el); return acc
		}, [])
		if (duplicates.length > 0)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.duplicates, duplicates)

		if (!listAttributes || listAttributes.length == 0)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.ATTRIBUTE_IS_REQUIRED)

		let flag = false
		listAttributes.forEach(element => {
			if (!(element.hasOwnProperty('label') && element.hasOwnProperty('value'))) {
				flag = true
			} else if (!(element.label && element.value)) {
				flag = true
			}
		})
		if (flag)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.BOTH_LABEL_VALUE_REQUIRED);

		//Verifying user authenticity
		[err, admin] = await utils.to(db.models.admins.findOne({ where: { id } }))
		if (err) return response.errReturned(res, err)
		if (!admin || admin.length == 0)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

		//Checking uniqueness of list name
		[err, list] = await utils.to(db.models.attribute_lists.findOne({ where: { name: listName } }))
		if (err) return response.errReturned(res, err)
		if (list)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.LIST_ALREADY_EXIST);

		//Saving list name in db
		[err, list] = await utils.to(db.models.attribute_lists.create({ name: listName }))
		if (err) return response.errReturned(res, err)
		if (!list) response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)

		listAttributes = listAttributes.map(elem => (
			{
				list_id: list.id,
				label: elem.label,
				value: elem.value
			}
		));

		//Saving attributes
		[err, listValue] = await utils.to(db.models.attribute_list_values.bulkCreate(listAttributes))
		if (err) return response.errReturned(res, err)
		if (listValue == null || !listValue)
			return utils.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)

		//Returing successful response
		return response.sendResponse(res, resCode.SUCCESS, resMessage.LIST_ADDED_SUCCESSFULLY)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

async function getAttributeLists(req, res) {
	try {
		const { id } = req.auth
		let { pageNumber, pageSize } = req.body
		const { searchValue } = req.body

		let err = {}, dbData = {}, admin = {}

		//Paging
		pageSize = parseInt(pageSize)
		pageNumber = parseInt(pageNumber)
		if (!pageNumber) pageNumber = 0
		if (!pageSize) pageSize = 10
		const start = parseInt(pageNumber * pageSize);

		//Verifying user authenticity
		[err, admin] = await utils.to(db.models.admins.findOne({ where: { id } }))
		if (err) return response.errReturned(res, err)
		if (!admin || admin.length == 0)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND)

		const searchObj = {}
		if (searchValue)
			searchObj.name = searchValue;
		[err, dbData] = await utils.to(db.models.attribute_lists.findAndCountAll(
			{
				where: searchObj,
				order: [['createdAt', 'DESC']],
				limit: pageSize,
				offset: start
			}))
		if (err) return response.errReturned(res, err)
		if (dbData == null || dbData.count == 0 || dbData == undefined)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)

		//Returing successful response
		return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, dbData)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}
module.exports = {
	addAttributeList,
	getAttributeLists
}