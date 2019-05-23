const utils = require('../../../etc/utils')
const response = require('../../../etc/response')
const resCode = require('../../../enum/responseCodesEnum')
const resMessage = require('../../../enum/responseMessagesEnum')

const db = global.healthportDb

async function addFeature(req, res) {
	try {
		const features = JSON.parse(req.body.features)

		console.log(features)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

async function getAllFeatures(req, res) {
	try {
		const { id } = req.auth
		let err = {}, admin = {}, features = {};

		//Verifying user authenticity
		[err, admin] = await utils.to(db.models.admins.findOne({ where: { id } }))
		if (err) return response.errReturned(res, err)
		if (!admin || admin.length == 0)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

		//Quering db to get list of featuress
		[err, features] = await utils.to(db.query(`
			Select id, name, parent_id as parentId, is_feature as isFeature, 
			sequence, createdAt 
			from features`,
			{
				type: db.QueryTypes.SELECT,
			}))
		if (err) return response.errReturned(res, err)
		if (!features || features.length == 0)
			return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)

		//Making custom json
		const featuresArray = []
		let subChilds = []
		let index
		for (let i = 0; i < features.length; i++) {
			if (features[i].parentId == 0) {
				featuresArray.push(features[i])
				featuresArray[featuresArray.length - 1].children =
					(features.filter(x => x.parentId == featuresArray[featuresArray.length - 1].id))
				const mainChilds = features.filter(x => x.parentId ==
					featuresArray[featuresArray.length - 1].id)

				for (let j = 0; j < mainChilds.length; j++) {
					subChilds = features.filter(x => x.parentId == mainChilds[j].id)
					if (subChilds.length > 0) {
						featuresArray[featuresArray.length - 1].children.forEach((element, i) => {
							if (element.id == subChilds[0].parentId) {
								index = i
							}
						})
						featuresArray[featuresArray.length - 1].children[index].children = subChilds
					}
				}
			}
		}

		//Returing successful response with data
		return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, featuresArray)

	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

module.exports = {
	addFeature,
	getAllFeatures
}