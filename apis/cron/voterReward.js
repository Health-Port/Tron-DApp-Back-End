const cron = require('node-cron');
var rp = require('request-promise');

const apiUrlForVotersList = `${process.env.TRON_SCAN_URL}api/vote`;

const db = global.healthportDb;
const tronUtils = require('./../etc/tronUtils');
const utils = require('./../etc/utils');
const rewardEnum = require('./../enum/rewardEnum');

var options = {
    uri: '',
    headers: {
        'User-Agent': 'Request-Promise'
    },
    json: true // Automatically parses the JSON string in the response
};
//Cron Job Every Night at 11:50 PM
var task = cron.schedule('50 23 * * *', async () => {
    try {
        //DB Queries
        [err, rewardObj] = await utils.to(db.models.reward_conf.findAll({
            where: {
                reward_type: rewardEnum.SUPERREPRESENTATIVEREWARD
            }
        }));
        if (!rewardObj || rewardObj.length == 0) {
            return;
        }
        //Getting Transactions which are on TRON Network
        options.uri = `${apiUrlForVotersList}?limit=999999&candidate=${process.env.COMMISSION_ACCOUNT_ADDRESS_KEY}`;
        var response = await rp(options)
        let totalNumberOfVotes = response.totalVotes;
        let voters = response.data.filter((item) => {
            return new Date(item.timestamp).getDate() == new Date().getDate();
        });
        var totalNumberOfRewardTokensdispersed = 0;
        for (let i = 0; i < voters.length; i++) {
            let votePercentageOfAUser = ((voters[i].votes / totalNumberOfVotes) * 100);
            let numberOfRewardAmount = Math.ceil((votePercentageOfAUser * rewardObj[0].max_amount) / 100);
            totalNumberOfRewardTokensdispersed += numberOfRewardAmount;
            if (totalNumberOfRewardTokensdispersed < rewardObj[0].max_amount) {
                await sendEHRTokensToAirVoterUsers(voters[i].voterAddress, numberOfRewardAmount);
            }
            else {
                console.log(`${new Date()} Quota Complete`);
                break;
            }
        }
    }
    catch (exp) {
        console.log(exp);
    }
}, {
        scheduled: false
    });

async function sendEHRTokensToAirVoterUsers(to, amount) {
    let balance = await tronUtils.getTRC10TokenBalance(process.env.MAIN_ACCOUNT_PRIVATE_KEY, process.env.MAIN_ACCOUNT_ADDRESS_KEY);
    if (balance == 0) console.log('Zero Balance on Main Account');
    if (balance < amount) console.log('Low Balance on Main Account');
    let bandwidth = await tronUtils.getBandwidth(process.env.MAIN_ACCOUNT_ADDRESS_KEY);
    if (bandwidth < 275) console.log('Low Bandwidth of Main Account');
    //Sending token
    try {
        let trxId = await tronUtils.sendTRC10Token(to, amount, process.env.MAIN_ACCOUNT_PRIVATE_KEY);
        //Saving transaction history into db
        [err, obj] = await utils.to(db.models.transections.create(
            { user_id: -1, address: utils.encrypt(process.env.MAIN_ACCOUNT_ADDRESS_KEY), number_of_token: amount, trx_hash: trxId, type: 'Sent', note: 'Voter Reward Transaction' },
        ));
        [err, obj] = await utils.to(db.models.voters_users.create(
            { tron_user_address: to, reward_amount: amount, trx_hash: trxId },
        ));
    } catch (error) {
        console.log(error);
    }
}

function startTask() {
    task.start();
}

function endTask() {
    task.stop();
}

module.exports = {
    startTask,
    endTask
}