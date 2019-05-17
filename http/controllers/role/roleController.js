const utils = require('../../../etc/utils')
const response = require('../../../etc/response')
const resCode = require('../../../enum/responseCodesEnum')
const resMessage = require('../../../enum/responseMessagesEnum')

const db = global.healthportDb

async function getAllRoles(req, res) {
	try {
		const obj = {
			'searchValue': req.body.searchValue,
			'filter': req.body.status,
		}
		let err = {}, dbData = {}
		const returnableData = {}

		//Paging
		let pageSize = parseInt(req.body.pageSize)
		let pageNumber = parseInt(req.body.pageNumber)
		if (!pageNumber) pageNumber = 0
		if (pageNumber) pageNumber = pageNumber - 1
		if (!pageSize) pageSize = 10
		const start = parseInt(pageNumber * pageSize)
		const end = parseInt(start + pageSize);

		//db query
		[err, dbData] = await utils.to(db.query(`
			Select id, name, description, status, 
				createdAt as dateCreated 
				from roles
				order by createdAt DESC`,
			{
				type: db.QueryTypes.SELECT,
			}))
		if (err) return response.errReturned(res, err)
		if (!dbData || dbData.length == 0)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)

		if (dbData) {
			if (obj.filter && obj.searchValue) {
				dbData = dbData.filter(x => x.status == obj.filter)
				dbData = dbData.filter(x => x.name.toLowerCase().includes(obj.searchValue.toLowerCase()))
			} else if (obj.filter) {
				dbData = dbData.filter(x => x.status == obj.filter)
			} else if (obj.searchValue) {
				dbData = dbData.filter(x => x.name.toLowerCase().includes(obj.searchValue.toLowerCase()))
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

module.exports = {
	getAllRoles
}