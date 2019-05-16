const response = require('../../../etc/response')


async function getLoginHistorybyID(req, res){
	try{
		console.log('will be develop')
	} catch (error) {
		console.log(error)
		return response.errReturned(res, error)
	}
}

module.exports = {
	getLoginHistorybyID
}