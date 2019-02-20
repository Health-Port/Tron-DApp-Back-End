const rewardEnum = require('./../enum/rewardEnum');
const tronUtils = require('./tronUtils');
const utils = require('./utils');
const resMessage = require('./../enum/responseMessagesEnum');

var cutCommission = require('./commission');

const db = global.healthportDb;

async function disperseDocumentsReward(source, user_id, tron_wallet_public_key) {
    try {
        var rewardsObject = {};
        if (source == rewardEnum.ALLERGYDOCUMENTREWARD) {
            [err, allergyDocs] = await utils.to(db.models.allergies.findAll({
                where: {
                    user_id: parseInt(user_id)
                }
            }));
            if (allergyDocs && allergyDocs.length == 0) {
                [err, rewardsObj] = await utils.to(db.models.reward_conf.findAll({
                    where: {
                        reward_type: rewardEnum.ALLERGYDOCUMENTREWARD
                    }
                }));
                rewardsObject = rewardsObj;
                sendDocumentReward(rewardsObject, user_id, tron_wallet_public_key, source);
            } else {
                [err, result] =  await utils.to(cutCommission(
                    tron_wallet_public_key,
                    rewardEnum.COMMISSIONDOCUMENTSUBMISSION
                ));
                if (err) {
                    if (err == 'Bandwidth is low') {
                        return Promise.reject(resMessage.BANDWIDTH_IS_LOW);
                    }
                    else {
                        return Promise.reject(err);
                    }
                }
            }
        } else if (source == rewardEnum.MEDICATIONDOCUMENTREWARD) {
            [err, medicationsDocs] = await utils.to(db.models.medications.findAll({
                where: {
                    user_id: parseInt(user_id)
                }
            }));
            if (medicationsDocs && medicationsDocs.length == 0) {
                [err, rewardsObj] = await utils.to(db.models.reward_conf.findAll({
                    where: {
                        reward_type: rewardEnum.MEDICATIONDOCUMENTREWARD
                    }
                }));
                rewardsObject = rewardsObj;
                sendDocumentReward(rewardsObject, user_id, tron_wallet_public_key, source);
            } else {
                [err, result] =  await utils.to(cutCommission(
                    tron_wallet_public_key,
                    rewardEnum.COMMISSIONDOCUMENTSUBMISSION
                ));
                if (err) {
                    if (err == 'Bandwidth is low') {
                        return Promise.reject(resMessage.BANDWIDTH_IS_LOW);
                    }
                    else {
                        return Promise.reject(err);
                    }
                }
            }
        } else if (source == rewardEnum.PROCEDUREDOCUMENTREWARD) {
            [err, proceduresDocs] = await utils.to(db.models.procedures.findAll({
                where: {
                    user_id: parseInt(user_id)
                }
            }));
            if (proceduresDocs && proceduresDocs.length == 0) {
                [err, rewardsObj] = await utils.to(db.models.reward_conf.findAll({
                    where: {
                        reward_type: rewardEnum.PROCEDUREDOCUMENTREWARD
                    }
                }));
                rewardsObject = rewardsObj;
                sendDocumentReward(rewardsObject, user_id, tron_wallet_public_key, source);
            } else {
                [err, result] =  await utils.to(cutCommission(
                    tron_wallet_public_key,
                    rewardEnum.COMMISSIONDOCUMENTSUBMISSION
                ));
                if (err) {
                    if (err == 'Bandwidth is low') {
                        return Promise.reject(resMessage.BANDWIDTH_IS_LOW);
                    }
                    else {
                        return Promise.reject(err);
                    }
                }
            }
        } else {
            console.log('NO Source');
        }
    }
    catch (ex) {
        console.log(ex);
    }
}

async function sendDocumentReward(
    rewardsObject,
    user_id,
    tron_wallet_public_key,
    source
) {
    try {
        if (rewardsObject) {
            let amount = parseFloat(rewardsObject[0].reward_amount);
            let refRewardTrxId = await tronUtils.sendTRC10Token(
                utils.decrypt(tron_wallet_public_key),
                amount,
                process.env.MAIN_ACCOUNT_PRIVATE_KEY
            );
            //Saving transection history into db
            if (refRewardTrxId) {
                [err, obj] = await utils.to(db.models.transections.bulkCreate([
                    {
                        user_id: user_id,
                        address: utils.encrypt(process.env.MAIN_ACCOUNT_ADDRESS_KEY),
                        number_of_token: amount,
                        trx_hash: refRewardTrxId,
                        type: source
                    }, {
                        user_id: user_id,
                        address: tron_wallet_public_key,
                        number_of_token: amount,
                        trx_hash: refRewardTrxId,
                        type: source
                    }
                ]));
                [err, result] =  await utils.to(cutCommission(
                    tron_wallet_public_key,
                    rewardEnum.COMMISSIONDOCUMENTSUBMISSION
                ));
                if (err) {
                    if (err == 'Bandwidth is low') {
                        return Promise.reject(resMessage.BANDWIDTH_IS_LOW);
                    }
                    else {
                        return Promise.reject(err);
                    }
                }
                checkAllDocumentsReward(user_id, tron_wallet_public_key);
            }
        }
    }
    catch (ex) {
        console.log(ex);
    }
}

async function checkAllDocumentsReward(user_id, tron_wallet_public_key) {
    try {
        let amount = 0;
        [err, allergyDocs] = await utils.to(db.models.allergies.findAll({
            where: {
                user_id: parseInt(user_id)
            }
        }));
        [err, medicationsDocs] = await utils.to(db.models.medications.findAll({
            where: {
                user_id: parseInt(user_id)
            }
        }));
        [err, proceduresDocs] = await utils.to(db.models.procedures.findAll({
            where: {
                user_id: parseInt(user_id)
            }
        }));
        if (allergyDocs && allergyDocs.length >= 1 && medicationsDocs && medicationsDocs.length >= 1 && proceduresDocs && proceduresDocs.length >= 1) {
            [err, allDocumentsRewardObj] = await utils.to(db.models.reward_conf.findAll({
                where: {
                    reward_type: rewardEnum.ALLDOCUMENTSREWARD
                }
            }));
            if (allDocumentsRewardObj && allDocumentsRewardObj.length > 0) {
                [err, usersCountResult] = await utils.to(
                    db.models.transections.findAndCountAll({
                        where: {
                            type: rewardEnum.SIGNUPREWARD
                        }
                    })
                );
                if (usersCountResult.count <= allDocumentsRewardObj[0].max_users) {
                    amount = parseFloat(allDocumentsRewardObj[0].reward_amount);
                } else {
                    amount = parseFloat(allDocumentsRewardObj[1].reward_amount);
                }
                let refRewardTrxId = await tronUtils.sendTRC10Token(
                    utils.decrypt(tron_wallet_public_key),
                    amount,
                    process.env.MAIN_ACCOUNT_PRIVATE_KEY
                );
                [err, obj] = await utils.to(db.models.transections.bulkCreate([
                    {
                        user_id: user_id,
                        address: utils.encrypt(process.env.MAIN_ACCOUNT_ADDRESS_KEY),
                        number_of_token: amount,
                        trx_hash: refRewardTrxId,
                        type: rewardEnum.ALLDOCUMENTSREWARD
                    }, {
                        user_id: user_id,
                        address: tron_wallet_public_key,
                        number_of_token: amount,
                        trx_hash: refRewardTrxId,
                        type: rewardEnum.ALLDOCUMENTSREWARD
                    }
                ]));
            }

        }
    }
    catch (ex) {
        console.log(ex);
    }
}

module.exports = disperseDocumentsReward;