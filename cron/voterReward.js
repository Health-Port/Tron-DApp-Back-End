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

//Cron Job Every 6 hours
var task = cron.schedule('0 0,6,12,18 * * *', async () => {
    try {
        let err, rewardData, rewardObj, dbcycle, pageSize = 50, start = 0, combineReward;
        console.log('Cron job started for reward distribution');
        //DB Queries
        [err, rewardObj] = await utils.to(db.models.reward_conf.findAll({
            where: {
                reward_type: rewardEnum.SUPERREPRESENTATIVEREWARD
            }
        }));
        //checking cron job status
        if (!rewardObj || rewardObj.length == 0 || !rewardObj[0].cron_job_status) {
            return;
        }

        //Getting Transactions which are on TRON Network
        options.uri = `${apiUrlForVotersList}?limit=${pageSize}&candidate=${process.env.COMMISSION_ACCOUNT_ADDRESS_KEY}`;
        var response = await rp(options);
        let totalNumberOfVotes = response.totalVotes;

        let totalPages = Math.ceil(response.total / pageSize);
        let data = response.data;
        for (let i = 1; i < totalPages; i++) {
            start = parseInt(i * pageSize);
            options.uri = `${apiUrlForVotersList}?limit=${pageSize}&start=${start}&candidate=${process.env.COMMISSION_ACCOUNT_ADDRESS_KEY}`;
            let response = await rp(options);
            data = data.concat(response.data);
        }

        response.data = data;

        //Getting reward data from db
        [err, rewardData] = await utils.to(db.models.voter_rewards.findAll({}));

        for (let i = 0; i < response.data.length; i++) {
            let cycleNo = getCycleNoByTime(response.data[i].timestamp);
            let matchedData = rewardData.filter(x => x.voter_address == response.data[i].voterAddress);

            //To avoid self voting and getting reward
            if (response.data[i].voterAddress != response.data[i].candidateAddress) {
                if (matchedData.length > 0) {
                    let sum = _.sumBy(matchedData, function (o) { return o.votes; });

                    //To check weather votes has been changed are same as privious
                    if (!(sum == response.data[i].votes)) {

                        //In case of vote increased
                        if (sum < response.data[i].votes) {
                            [err, newEntry] = await utils.to(db.models.voter_rewards.create({
                                candidate_address: response.data[i].candidateAddress,
                                voter_address: response.data[i].voterAddress,
                                votes: response.data[i].votes - sum,
                                time_stamp: response.data[i].timestamp,
                                cycle_no: cycleNo
                            }));
                        } else { //In case vote was decreased
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
                } else { //Total new voter case
                    [err, added] = await utils.to(db.models.voter_rewards.create({
                        candidate_address: response.data[i].candidateAddress,
                        voter_address: response.data[i].voterAddress,
                        votes: response.data[i].votes,
                        time_stamp: response.data[i].timestamp,
                        cycle_no: cycleNo
                    }));
                }
            }
        };
        //Getting updated data from db
        [err, rewardData] = await utils.to(db.models.voter_rewards.findAll({}));

        //Filtering data to give reward only for those who are currently voters.
        let unMachedData = rewardData.filter(({ voter_address }) => !response.data.some(o => o.voterAddress == voter_address));
        //To handle to case if voter is no loger a voter.
        if (unMachedData.length > 0) {
            for (let i = 0; i < unMachedData.length; i++) {
                [err, delData] = await utils.to(db.models.voter_rewards.destroy({
                    where: { id: unMachedData[i].id }
                }));
            }
            //Getting updated data from db
            [err, rewardData] = await utils.to(db.models.voter_rewards.findAll({}));
        }

        //Calculating cycle wise sum of each cycle.
        [err, dbcycle] = await utils.to(db.query('select cycle_no, sum(votes) as totalCycleVotes from voter_rewards group by cycle_no', {
            type: db.QueryTypes.SELECT,
        }));

        let cycleNoArray = rearrangeCycleArray(dbcycle);
        let currentCycle = getCycleNoByTime(new Date());

        for (let i = 0; i < rewardData.length; i++) {
            if (currentCycle == rewardData[i].cycle_no) {
                let votePercentageOfAUser = ((rewardData[i].votes / cycleNoArray[currentCycle]) * 100);
                let ehrMaxCount = rewardObj[0].reward_per_vote > 0 ? totalNumberOfVotes * rewardObj[0].reward_per_vote : totalNumberOfVotes;
                ehrMaxCount = ehrMaxCount < rewardObj[0].max_amount ? ehrMaxCount : rewardObj[0].max_amount;
                let numberOfRewardAmount = Math.ceil((votePercentageOfAUser * (ehrMaxCount / 4)) / 100);
                if (rewardData[i].total_reward != numberOfRewardAmount) {
                    [err, update] = await utils.to(db.models.voter_rewards.update(
                        { total_reward: numberOfRewardAmount },
                        { where: { id: rewardData[i].id } }
                    ))
                }
            }
        }

        //Distributing reward once a day
        if (currentCycle == 1) {
            [err, combineReward] = await utils.to(db.query('SELECT voter_address, sum(total_reward) as total_reward FROM voter_rewards group by voter_address order by total_reward desc',
                {
                    type: db.QueryTypes.SELECT,
                }));
            for (let i = 0; i < combineReward.length; i++) {
                if (combineReward[i].total_reward > 0) {
                    await sendEHRTokensToAirVoterUsers(combineReward[i].voter_address, combineReward[i].total_reward);
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