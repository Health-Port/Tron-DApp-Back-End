const rp = require('request-promise'),
	utils = require('./etc/utils'),
	tronUtils = require('./etc/tronUtils'),

	db = global.healthportDb,
	apiUrlForVotersList = `${process.env.TRON_SCAN_URL}api/vote`,
	options = {
	uri: '',
	headers: {
		'User-Agent': 'Request-Promise'
	},
	json: true // Automatically parses the JSON string in the response
}

//if (process.env.NODE_ENV == 'production') {
	sendNewEHRToVoters()
//}

async function sendNewEHRToVoters() {
	try {
		//Getting voter data
		options.uri = `${apiUrlForVotersList}?limit=50&candidate=${process.env.VOTER_ACCOUNT}`
		const response = await rp(options)

		for (let i = 0; i < response.data.length; i++) {
			const oldTokenBalance = await tronUtils.getHealthportOldTokenBalance(response.data[i].voterAddress)
			const newTokenBalance = await tronUtils.getTRC10TokenBalance('', response.data[i].voterAddress)
			if (newTokenBalance == 0 && oldTokenBalance > 0 && (newTokenBalance != oldTokenBalance)) {
				//Excluding potential hacker
				const hackerAddress = 'TB5ZDGoqiL89HiNMWo26b6ciZUUv6QsfWQ'
				if (response.data[i].voterAddress.toLocaleLowerCase() != hackerAddress.toLocaleLowerCase()) {
					//Token will be send here
					await sendEHRTokensToAirVoterUsers(response.data[i].voterAddress, oldTokenBalance)
					console.log('New EHR Sent:', response.data[i].voterAddress)
				}
			}
		}
		console.log('Tokens sent to all voters')
	} catch (exp) {
		console.log(exp)
	}
}

async function sendEHRTokensToAirVoterUsers(to, amount) {
	const balance = await tronUtils.getTRC10TokenBalance(process.env.MAIN_ACCOUNT_PRIVATE_KEY, process.env.MAIN_ACCOUNT_ADDRESS_KEY)
	if (balance == 0) console.log('Zero Balance on Main Account')
	if (balance < amount) console.log('Low Balance on Main Account')
	const bandwidth = await tronUtils.getBandwidth(process.env.MAIN_ACCOUNT_ADDRESS_KEY)
	if (bandwidth < 275) console.log('Low Bandwidth of Main Account')
	//Sending token
	try {
		const trxId = await tronUtils.sendTRC10Token(to, amount, process.env.MAIN_ACCOUNT_PRIVATE_KEY)
		
		//Saving transaction history into db
		await utils.to(db.models.transections.create(
			{ user_id: -1, address: utils.encrypt(process.env.MAIN_ACCOUNT_ADDRESS_KEY), number_of_token: amount, trx_hash: trxId, type: 'Sent', note: 'Voter Reward Transaction' },
		))

		await utils.to(db.models.voters_users.create(
			{ tron_user_address: to, reward_amount: amount, trx_hash: trxId },
		))
	} catch (error) {
		console.log(error)
	}
}