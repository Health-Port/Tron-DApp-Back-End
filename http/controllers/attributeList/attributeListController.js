const utils = require('../../../etc/utils')
const response = require('../../../etc/response')
const resCode = require('../../../enum/responseCodesEnum')
const resMessage = require('../../../enum/responseMessagesEnum')
const Sequelize = require('sequelize')

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
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.CHARACTER_COUNT_ERROR)

		//Checking duplicate items in attribute list
		const input = listAttributes.map(x => x.label)
		const duplicates = input.reduce((acc, el, i, arr) => {
			if (arr.indexOf(el) !== i && acc.indexOf(el) < 0) acc.push(el); return acc
		}, [])
		if (duplicates.length > 0)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.DUPLICATE_ITEMS, duplicates)

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
			return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)

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
		let { searchValue } = req.body

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

		if (searchValue == undefined)
			searchValue = '';

		[err, dbData] = await utils.to(db.models.attribute_lists.findAndCountAll(
			{
				where: { name: { [Sequelize.Op.like]: `%${searchValue}%` } },
				order: [['createdAt', 'DESC']],
				limit: pageSize,
				offset: start
			}))
		if (err) return response.errReturned(res, err)

		//Returing successful response
		return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, dbData)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

async function getAllAttributeLists(req, res) {
	try {
		const { id } = req.auth

		let err = {}, dbData = {}, admin = {};

		//Verifying user authenticity
		[err, admin] = await utils.to(db.models.admins.findOne({ where: { id } }))
		if (err) return response.errReturned(res, err)
		if (!admin || admin.length == 0)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

		[err, dbData] = await utils.to(db.models.attribute_lists.findAll(
			{
				order: [['createdAt', 'DESC']]
			}))
		if (err) return response.errReturned(res, err)

		//Returing successful response
		return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, dbData)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

async function getAttributeListById(req, res) {
	try {
		const { id } = req.auth
		const { attrId } = req.params

		let err = {}, admin = {}, list = {};

		//Verifying user authenticity
		[err, admin] = await utils.to(db.models.admins.findOne({ where: { id } }))
		if (err) return response.errReturned(res, err)
		if (!admin || admin.length == 0)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

		//Querying db for list records
		[err, list] = await utils.to(db.query(`
			Select l.id as listId, v.id as attrId, l.name, v.label, v.value, v.createdAt 
				From attribute_lists l
				Inner join attribute_list_values v ON l.id = v.list_id
				Where l.id = :id
				Order by l.createdAt DESC;`,
			{
				replacements: { id: attrId },
				type: db.QueryTypes.SELECT,
			}))
		if (err) return response.errReturned(res, err)
		if (!list || list.length == 0)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)

		//maping data and columns
		const data = {
			listId: list[0].listId,
			listName: list[0].name,
			attributeList: list.map(elem => (
				{
					attrId: elem.attrId,
					label: elem.label,
					value: elem.value
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

async function updateAttributeListById(req, res) {
	try {
		const { id } = req.auth
		const { listId } = req.params
		const { listName } = req.body
		let { listAttributes } = req.body

		let err = {}, listValue = {}, admin = {}, obj = {}, temp = {}, objs = {}

		//Name validations
		if (!listName)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.LIST_NAME_REQUIRED)
		if (listName.length >= 30)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.CHARACTER_COUNT_ERROR)

		//Checking duplicate items in attribute list
		const input = listAttributes.map(x => x.label)
		const duplicates = input.reduce((acc, el, i, arr) => {
			if (arr.indexOf(el) !== i && acc.indexOf(el) < 0) acc.push(el); return acc
		}, [])
		if (duplicates.length > 0)
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.DUPLICATE_ITEMS, duplicates)

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

		//Getting list from db by id
		[err, temp] = await utils.to(db.models.attribute_lists.findOne({ where: { id: listId } }))
		if (err) return response.errReturned(res, err)
		if (!temp || temp.length == 0)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND);

		//Getting list from db by name
		[err, obj] = await utils.to(db.models.attribute_lists.findOne({ where: { name: listName } }))
		if (err) return response.errReturned(res, err)

		//Checking if name already exists or not
		if (obj) {
			if (temp.id == obj.id) {
				[err, obj] = await utils.to(db.models.attribute_lists.update(
					{ name: listName },
					{ where: { id: temp.id } }
				))
				if (err) return response.errReturned(res, err)
				if (obj[0] == 0)
					return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)
			} else {
				return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.NAME_ALREADY_EXISTS)
			}
		} else {
			[err, obj] = await utils.to(db.models.attribute_lists.update(
				{ name: listName },
				{ where: { id: temp.id } }
			))
			if (err) return response.errReturned(res, err)
			if (obj[0] == 0)
				return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)
		}

		//Mapping object
		listAttributes = listAttributes.map(elem => (
			{
				id: elem.attrId ? elem.attrId : '',
				label: elem.label,
				value: elem.value,
				list_id: parseInt(listId),
			}
		));
			
		//attribute id of another list was updated - only the attribute id of spacific list is now updated
		//HP-554 - Zaigham javed
		//Getting list from db by list id
		[err, objs] = await utils.to(db.models.attribute_list_values.findAll({ where: { list_id: listId } }))
		if (err) return response.errReturned(res, err)
		for (let i = 0; i < listAttributes.length; i++) {
			if (listAttributes[i].id != '') {
				flag=false
				for (let j = 0; j < objs.length; j++) {
					if (listAttributes[i].id == objs[j].id) {
						flag=true
						break
					}
				}
				if(!flag){
					break
				}
			}
			
		}

		if (!flag) {
			return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.WRONG_ID_FOR_THIS_LIST)
		}


		//Saving or updating attributes
		[err, listValue] = await utils.to(db.models.attribute_list_values.bulkCreate(
			listAttributes, { updateOnDuplicate: ['label', 'value'] }
		))
		if (err) return response.errReturned(res, err)
		if (listValue == null || !listValue)
			return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)

		//Returing successful response
		return response.sendResponse(res, resCode.SUCCESS, resMessage.LIST_UPDATED_SUCCESSFULLY)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

module.exports = {
	addAttributeList,
	getAttributeLists,
	getAttributeListById,
	updateAttributeListById,
	getAllAttributeLists
}