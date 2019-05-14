const response = require('../../../etc/response')

async function addFeature(req, res){
	try{
		const features = JSON.parse(req.body.features)
		
		console.log(features)

	}catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

module.exports = {
    addFeature,
}