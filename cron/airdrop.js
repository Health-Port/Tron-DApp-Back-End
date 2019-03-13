let cron = require('node-cron')
let rp = require('request-promise')

let apiUrlForTransfers = `${process.env.TRON_SCAN_URL}api/transfer?limit=20`
let apiUrlForAddressDetails = `${process.env.TRON_SCAN_URL}api/account?address=`

let db = global.healthportDb
let tronUtils = require('./../etc/tronUtils')
let utils = require('./../etc/utils')
let rewardEnum = require('./../enum/rewardEnum')

let options = {
    uri: '',
    headers: {
        'User-Agent': 'Request-Promise'
    },
    json: true // Automatically parses the JSON string in the response
}

let task = cron.schedule('*/15 * * * *', async () => {
    try {
        console.log('Airdrop cron started')
        let promisesArray = [], err, rewardObj;
        
        //DB Queries
        [err, rewardObj] = await utils.to(db.models.reward_conf.findAll({
            where: {
                reward_type: rewardEnum.AIRDROPREWARD
            }
        }))
        if (err) {
            console.log(err)
            return
        }
       
        if (!rewardObj[0].cron_job_status) {
            return;
        }

        //Getting Transactions which are on TRON Network
        options.uri = apiUrlForTransfers
        let response = await rp(options)

        // Filtering Transactions whose Transaction amount is greater or equal to 100 TRX
        let filteredTransactions = response.data.filter(x => x.amount >= rewardObj[0].max_users * Math.pow(10, process.env.DECIMALS))

        for (let i = 0; i < filteredTransactions.length; i++) { // Loop For Filtered Transactions
            let balance = await tronUtils.getTRC10TokenBalance('', filteredTransactions[i].transferToAddress)
            if (balance == 0) {
                await sendEHRTokensToAirDropUsers(filteredTransactions[i].transferToAddress, rewardObj[0].reward_amount)
            } else {
                console.log('Found EHR in ', filteredTransactions[i].transferToAddress)
            }
        }// End of FOR
    }
    catch (exp) {
        console.log(exp)
    }
}, {
        scheduled: false
    })

function filterBalances(Resources, BalanceName) {
    return Resources.filter(function (resource) {
        if (resource.address != "" && resource.balances) {
            return resource
                .balances
                .some(function (balance) { return balance.name != BalanceName; })
        }
    })
}

async function sendEHRTokensToAirDropUsers(to, amount) {
    let balance = await tronUtils.getTRC10TokenBalance(process.env.MAIN_ACCOUNT_PRIVATE_KEY, process.env.MAIN_ACCOUNT_ADDRESS_KEY)
    if (balance == 0) console.log('Zero Balance on Main Account')
    if (balance < amount) console.log('Low Balance on Main Account')
    let bandwidth = await tronUtils.getBandwidth(process.env.MAIN_ACCOUNT_ADDRESS_KEY)
    if (bandwidth < 275) console.log('Low Bandwidth of Main Account')
    //Sending token
    try {
        let trxId = await tronUtils.sendTRC10Token(to, amount, process.env.MAIN_ACCOUNT_PRIVATE_KEY);
        //Saving transaction history into db
        [err, obj] = await utils.to(db.models.transections.create(
            { user_id: -1, address: utils.encrypt(process.env.MAIN_ACCOUNT_ADDRESS_KEY), number_of_token: amount, trx_hash: trxId, type: 'Sent', note: 'Airdrop Transaction' },
        ));

        [err, obj] = await utils.to(db.models.air_drop_users.create(
            { tron_user_address: to, reward_amount: amount, trx_hash: trxId },
        ))
    } catch (error) {
        console.log(error)
    }
}

function startTask() {
    task.start()
}

function endTask() {
    task.stop()
}

module.exports = {
    startTask,
    endTask
}