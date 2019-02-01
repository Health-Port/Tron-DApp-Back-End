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
//Cron Job Every Night at 11:50 PM
var task = cron.schedule('0 0,6,12,18 * * *', async () => {
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
        var response = await rp(options);

        //Getting reward data from db
        [err, rewardData] = await utils.to(db.models.voter_rewards.findAll({}));

        for (let i = 0; i < response.data.length; i++) {
            let cycleNo = getCycleNoByTime(response.data[i].timestamp);
            let matchedData = rewardData.filter(x => x.voter_address == response.data[i].voterAddress);
            if (matchedData.length > 0) {
                let sum = _.sumBy(matchedData, function (o) { return o.votes; });
                if (!(sum == response.data[i].votes)) {
                    if (sum < response.data[i].votes) {
                        [err, update] = await utils.to(db.models.voter_rewards.create({
                            candidate_address: response.data[i].candidateAddress,
                            voter_address: response.data[i].voterAddress,
                            votes: response.data[i].votes - sum,
                            time_stamp: response.data[i].timestamp,
                            cycle_no: cycleNo
                        }));
                    } else {
                        [err, deleteData] = await utils.to(db.models.voter_rewards.destroy({
                            where: { voter_address: response.data[i].voterAddress }
                        }));
                        [err, newData] = await utils.to(db.models.voter_rewards.create({
                            candidate_address: response.data[i].candidateAddress,
                            voter_address: response.data[i].voterAddress,
                            votes: response.data[i].votes,
                            time_stamp: response.data[i].timestamp,
                            cycle_no: cycleNo
                        }));
                    }
                }
            } else {
                [err, added] = await utils.to(db.models.voter_rewards.create({
                    candidate_address: response.data[i].candidateAddress,
                    voter_address: response.data[i].voterAddress,
                    votes: response.data[i].votes,
                    time_stamp: response.data[i].timestamp,
                    cycle_no: cycleNo
                }));
            }
        };
        [err, rewardData] = await utils.to(db.models.voter_rewards.findAll({}));
        [err, dbcycle] = await utils.to(db.query('select cycle_no, sum(votes) as totalCycleVotes from voter_rewards group by cycle_no', {
            type: db.QueryTypes.SELECT,
        }));

        let cycleNoArray = rearrangeCycleArray(dbcycle);
        let currentCycle = getCycleNoByTime(new Date());
        for (let i = 0; i < rewardData.length; i++) {
            if (currentCycle == rewardData[i].cycle_no) {
                totalNumberOfVotes = cycleNoArray[currentCycle];
                let votePercentageOfAUser = ((rewardData[i].votes / (totalNumberOfVotes)) * 100);
                //let numberOfRewardAmount = Math.ceil((votePercentageOfAUser * (rewardObj[0].max_amount)/4) / 100);
                let numberOfRewardAmount = Math.ceil((votePercentageOfAUser * (1000) / 4) / 100);
                await sendEHRTokensToAirVoterUsers(rewardData[i].voter_address, numberOfRewardAmount);
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
function rearrangeCycleArray(dbcycle) {
    dt = []
    for (let i = 0; i <= 4; i++) {
        if (dbcycle[i]) {
            if (dbcycle[i].cycle_no == 1)
                dt[1] = dbcycle[i].totalCycleVotes;
            if (dbcycle[i].cycle_no == 2)
                dt[2] = dbcycle[i].totalCycleVotes;
            if (dbcycle[i].cycle_no == 3)
                dt[3] = dbcycle[i].totalCycleVotes;
            if (dbcycle[i].cycle_no == 4)
                dt[4] = dbcycle[i].totalCycleVotes;
        }
    }
    return dt;
}
function getCycleNoByTime(datetime) {
    var hours = new Date(datetime).getUTCHours();
    if (hours >= 0 && hours < 6) return 1;
    if (hours >= 6 && hours < 12) return 2;
    if (hours >= 12 && hours < 18) return 3;
    if (hours >= 18 && hours < 24) return 4;
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