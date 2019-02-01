const utils = require('../../../etc/utils');
const response = require('../../../etc/response');
const tronUtils = require('../../../etc/tronUtils');
const resCode = require('../../../enum/responseCodesEnum');
const resMessage = require('../../../enum/responseMessagesEnum');
const rewardEnum = require('./../../../enum/rewardEnum');

const db = global.healthportDb;

async function sendToken(req, res) {
    try {
        let to = req.body.to;
        let amount = parseFloat(req.body.amount);
        let from = utils.encrypt(req.body.from);
        let note = req.body.note;
        let err, user, trxId, privateKey, obj;

        //Check ammount is positive integer or not
        if (!Number.isInteger(amount) || amount < 0)
            return response.sendResponse(res, resCode.NOT_FOUND, resMessage.AMOUNT_IS_NOT_INTEGER);

        //Finding record from db    
        [err, user] = await utils.to(db.models.users.findOne({ where: { tron_wallet_public_key: from } }));
        if (user == null) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

        let isValid = await tronUtils.isAddress(to);
        if (!isValid) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.INVALID_TO_ADDRESS);

        //Getting token balance and checking bandwidth.
        privateKey = utils.decrypt(user.tron_wallet_private_key);
        let balance = await tronUtils.getTRC10TokenBalance(privateKey, utils.decrypt(from));
        if (balance == 0) return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.BALANCE_IS_ZERO);
        if (balance < amount) return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INSUFFICIENT_BALANCE);

        let bandwidth = await tronUtils.getBandwidth(utils.decrypt(from));
        if (bandwidth < 275) return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.BANDWIDTH_IS_LOW);

        //Checking weather receiver account is active or not.
        let bandwidthTo = await tronUtils.getBandwidth(to);
        if (bandwidthTo == 0) return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.ACCOUNT_IS_NOT_ACTIVE)

        //Sending token
        try {
            if (utils.checkaddresses(to, utils.decrypt(from)))
                return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.TO_FROM_ADDRESS_ARE_SAME)

            trxId = await tronUtils.sendTRC10Token(to, amount, privateKey);
        } catch (error) {
            console.log(error);
            return response.errReturned(res, error);
        }

        //Saving transection history into db
        [err, obj] = await utils.to(db.models.transections.bulkCreate([
            { user_id: user.id, address: from, number_of_token: amount, trx_hash: trxId, type: 'Sent', note: note },
            { user_id: user.id, address: utils.encrypt(to), number_of_token: amount, trx_hash: trxId, type: 'Received', note: note }
        ]));
        console.log(err);
        //Returing successful response with trxId
        return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, trxId);

    } catch (error) {
        console.log(error);
        return response.errReturned(res, error);
    }
    //#region  old code
    //try {
    //     let to = req.body.to;
    //     let amount = req.body.amount;
    //     let from = utils.encrypt(req.body.from);

    //     let err, user, transection;
    //     //Finding record from db    
    //     [err, user] = await utils.to(db.models.users.findOne(
    //         {
    //             where:
    //             {
    //                 tron_wallet_public_key: from
    //             }
    //         }));
    //     if (err) return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.ERROR_IN_FINDING_RECORD);
    //     if (user == null) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

    //     //Initializing tronweb object and validating address.
    //     let privateKey = utils.decrypt(user.tron_wallet_private_key);

    //     let isValid = await tronUtils.isAddress(to);
    //     if (!isValid) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.INVALID_TO_ADDRESS);

    //     //Getting values from smart contract
    //     let balance = await tronUtils.getBalanceToken(privateKey, utils.decrypt(from));
    //     if (balance == 0) return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.BALANCE_IS_ZERO);
    //     if (balance < amount) return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INSUFFICIENT_BALANCE);

    //     //Checking Tron Balance before making transection
    //     let tronBalance = await tronUtils.getBalanceTrx(utils.decrypt(from))
    //     if (tronBalance < parseFloat(process.env.MINIMUM_TRON_BALACE_REQUIRED))
    //         return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.TRON_BALANCE_IS_ZERO)

    //     //Sending token
    //     try {
    //         transection = await tronUtils.sendToken(to, amount, privateKey);
    //     } catch (error) {
    //         console.log(error);
    //         return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, error);
    //     }

    //     //Saving transection history into db
    //     [err, obj] = await utils.to(db.models.transections.create(
    //         {
    //             user_id: user.id,
    //             from: from,
    //             to: utils.encrypt(to),
    //             number_of_token: amount,
    //             trx_hash: transection
    //         }));
    //     if (err) return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.ERROR_IN_SAVING_TRANSECTION);

    //     return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, transection);

    // } catch (error) {
    //     console.log(error);
    //     return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR);
    // }
    //#endregion
}

async function getBalance(req, res) {
    try {
        let address = utils.encrypt(req.body.address);
        let err, user, balance, bandwidth;

        //Finding record from db    
        [err, user] = await utils.to(db.models.users.findOne({ where: { tron_wallet_public_key: address } }));
        if (user == null) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

        //Getting balance from blockchain
        let privateKey = utils.decrypt(user.tron_wallet_private_key);
        let publickKey = utils.decrypt(user.tron_wallet_public_key);
        balance = await tronUtils.getTRC10TokenBalance(privateKey, publickKey);
        bandwidth = await tronUtils.getBandwidth(utils.decrypt(user.tron_wallet_public_key));
        //Returing successful response with balance
        return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, { balance: balance, bandwidth: bandwidth });

    } catch (error) {
        console.log(error);
        return response.errReturned(res, error);
    }
}

async function getTransectionsByAddress(req, res) {
    try {
        let address = utils.encrypt(req.body.address);
        let pageSize = parseInt(req.body.pageSize);
        let pageNumber = parseInt(req.body.pageNumber);
        let err, user, transections;

        //Paging
        if (!pageNumber) pageNumber = 0;
        if (!pageSize) pageSize = 5;
        let start = parseInt(pageNumber * pageSize);
        let end = parseInt(start + pageSize);

        //Finding record from db    
        [err, user] = await utils.to(db.models.users.findOne({ where: { tron_wallet_public_key: address } }));
        if (user == null) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

        //Getting transection history data and total count
        [err, transections] = await utils.to(db.models.transections.findAndCountAll({
            where: [{ address: address }],
            order: [['createdAt', 'DESC']],
            limit: pageSize,
            offset: start
        }));

        let data = [];
        for (let i = 0; i < transections.rows.length; i++) {
            data[i] = {
                'trx_id': transections.rows[i].trx_hash,
                'date_time': transections.rows[i].createdAt,
                'type': transections.rows[i].type,
                'note': transections.rows[i].note
            }
        }

        //Returing successful response with transections
        return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, { count: transections.count, data: data });

    } catch (error) {
        console.log(error);
        return response.errReturned(res, error);
    }
}

async function getFormSubmissionDates(req, res) {
    try {
        let user_id = req.body.userId;
        let err, allergies, medications, procedures;

        //Need to optimize this query with one call
        [err, allergies] = await utils.to(db.models.allergies.findOne(
            { where: { user_id: user_id }, order: [['createdAt', 'DESC']] }));
        [err, medications] = await utils.to(db.models.medications.findOne(
            { where: { user_id: user_id }, order: [['createdAt', 'DESC']] }));
        [err, procedures] = await utils.to(db.models.procedures.findOne(
            { where: { user_id: user_id }, order: [['createdAt', 'DESC']] }));

        let data = {
            'allergy_date': allergies ? allergies.createdAt : null,
            'medication_date': medications ? medications.createdAt : null,
            'procedure_date': procedures ? procedures.createdAt : null
        }

        //Returing successful response with transections
        return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, data);

    } catch (error) {
        console.log(error);
        return response.errReturned(res, error);
    }
}

async function getReferralsByUser(req, res) {
    try {
        let user_id = req.body.userId;
        let referal_coupon = req.body.referalCoupon;
        let pageSize = parseInt(req.body.pageSize);
        let pageNumber = parseInt(req.body.pageNumber);
        let err, users;

        //Paging
        if (!pageNumber) pageNumber = 0;
        if (!pageSize) pageSize = 5;
        let start = parseInt(pageNumber * pageSize);
        let end = parseInt(start + pageSize);

        //Fetching records from db w.r.t referal code    
        [err, users] = await utils.to(db.models.users.findAndCountAll({
            where: { refer_by_coupon: referal_coupon, email_confirmed: true },
            order: [['createdAt', 'DESC']],
            limit: pageSize,
            offset: start
        }));
        [err, rewardObj] = await utils.to(db.models.reward_conf.findOne({ where: { reward_type: rewardEnum.REFERRALREWARD } }));
        let data = [];
        for (let i = 0; i < users.rows.length; i++) {
            data[i] = {
                'email': users.rows[i].email,
                'channel': users.rows[i].refer_destination,
                'referal_reward': parseInt(rewardObj.reward_amount)
            }
        }

        //Returing successful response with transections
        return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, { count: users.count, data: data });

    } catch (error) {
        console.log(error);
        return response.errReturned(res, error);
    }
}

var rp = require('request-promise');
var _ = require('lodash');
var options = {
    uri: '',
    headers: {
        'User-Agent': 'Request-Promise'
    },
    json: true // Automatically parses the JSON string in the response
};
const apiUrlForVotersList = `${process.env.TRON_SCAN_URL}api/vote`;
//This route is for server testing purpose only
async function getEnv(req, res) {
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

    //let transection = await tronUtils.createSmartContract();
    //return response.sendResponse(res, resCode.SUCCESS, transection);
}
function getCycleNoByTime(datetime) {
    var hours = new Date(datetime).getUTCHours();
    if (hours >= 0 && hours < 6) return 1;
    if (hours >= 6 && hours < 12) return 2;
    if (hours >= 12 && hours < 18) return 3;
    if (hours >= 18 && hours < 24) return 4;
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
module.exports = {
    sendToken,
    getBalance,
    getReferralsByUser,
    getFormSubmissionDates,
    getTransectionsByAddress,
    getEnv
}