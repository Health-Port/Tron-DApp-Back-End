const cron = require('node-cron');
var rp = require('request-promise');
var _ = require('lodash');

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

//Cron Job every day @ 12:00am
var task = cron.schedule('0 12 * * *', async () => {
    try {
        let err, rewardObj, pageSize = 50, start = 0;
        console.log('Cron job started for reward distribution');
        //DB Queries
        [err, rewardObj] = await utils.to(db.models.reward_conf.findAll({
            where: {
                reward_type: rewardEnum.SUPERREPRESENTATIVEREWARD
            }
        }));
        //checking cron job status
        if (!rewardObj || rewardObj.length == 0 || !rewardObj[0].cron_job_status || rewardObj[0].reward_per_vote == 0) {
            return;
        }
        //Getting Transactions which are on TRON Network
        options.uri = `${apiUrlForVotersList}?limit=${pageSize}&candidate=${process.env.VOTER_ACCOUNT}`;
        var response = await rp(options);

        let totalPages = Math.ceil(response.total / pageSize);
        let data = response.data;
        for (let i = 1; i < totalPages; i++) {
            start = parseInt(i * pageSize);
            options.uri = `${apiUrlForVotersList}?limit=${pageSize}&start=${start}&candidate=${process.env.VOTER_ACCOUNT}`;
            let response = await rp(options);
            data = data.concat(response.data);
        }
        response.data = data;
        let flag = false;
        let rewardPerVote = rewardObj[0].reward_per_vote
        if (!(response.totalVotes * rewardPerVote <= rewardObj[0].max_amount)) {
            flag = true
        }
        for (let i = 0; i < response.data.length; i++) {
            if (response.data[i].voterAddress != response.data[i].candidateAddress) {
                if (response.data[i].voterAddress != process.env.MAIN_ACCOUNT_ADDRESS_KEY) {
                    if (flag) {
                        let percentage = response.data[i].votes / response.totalVotes
                        let reward = Math.ceil(percentage * rewardObj[0].max_amount)
                        await sendEHRTokensToAirVoterUsers(response.data[i].voterAddress, reward);
                    } else {
                        await sendEHRTokensToAirVoterUsers(response.data[i].voterAddress, response.data[i].votes * rewardPerVote);
                    }
                }
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