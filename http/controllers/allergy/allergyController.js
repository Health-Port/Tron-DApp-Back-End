const utils = require('../../../etc/utils');
const tronUtils = require('../../../etc/tronUtils');
const response = require('../../../etc/response');
const resCode = require('../../../enum/responseCodesEnum');
const resMessage = require('../../../enum/responseMessagesEnum');
const rewardDisperser = require('../../../etc/rewardCheck');
const rewardEnum = require('../../../enum/rewardEnum');
const cutCommission = require('./../../../etc/commission');

const db = global.healthportDb;

async function saveAllergyListByUser(req, res) {
    try {
        let allergy_form = req.body.allergyForm;
        let user_id = req.body.userId;
        let no_known_allergies = req.body.noKnownAllergies;
        let err,
            user,
            allergies;

        //Finding record from db
        [err, user] = await utils.to(db.models.users.findOne({
            where: {
                id: user_id
            }
        }));
        if (user == null)
            return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

        //Appending user_id to each object
        for (var i = 0; i < allergy_form.length; i++) {
            allergy_form[i]['user_id'] = user_id;
            allergy_form[i]['no_known_allergies'] = no_known_allergies
        }

        //Checking user's balance before uploading document.
        let balance = await tronUtils.getTRC10TokenBalance(utils.decrypt(user.tron_wallet_private_key), utils.decrypt(user.tron_wallet_public_key));
        [err, commissionObj] = await utils.to(db.models.commission_conf.findOne({
            where: { commission_type: 'Upload' }
        }));
        if (err) return response.errReturned(res, err);
        if (balance < commissionObj.commission_amount)
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INSUFFICIENT_BALANCE);

        [err, rewardDisperserResult] = await utils.to(rewardDisperser(rewardEnum.ALLERGYDOCUMENTREWARD, user_id, user.tron_wallet_public_key));
        if (err) {
            return response.sendResponse(
                res,
                resCode.BAD_REQUEST,
                resMessage.BANDWIDTH_IS_LOW
            );
        }

        [err, allergies] = await utils.to(db.models.allergies.bulkCreate(allergy_form));

        return response.sendResponse(
            res,
            resCode.SUCCESS,
            resMessage.DOCUMENT_SAVED,
            allergies
        );

    } catch (error) {
        console.log(error);
        return response.errReturned(res, error);
    }
}

async function getAllergyListByUser(req, res) {
    try {
        let user_id = req.body.userId;
        let err,
            allergies,
            result;

        //Finding allergies from db by userId
        [err, allergies] = await utils.to(db.models.allergies.findAll({
            where: {
                user_id: user_id
            }
        }));
        if (allergies == null)
            return response.sendResponse(
                res,
                resCode.NOT_FOUND,
                resMessage.NO_RECORD_FOUND
            );

        //Finding record from db
        [err, user] = await utils.to(db.models.users.findOne({
            where: {
                id: user_id
            }
        }));
        if (user == null)
            return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

        // Getting allergies data from blockchain let allergyList = await
        // tronUtils.getAllergyForm(utils.decrypt(user.tron_wallet_public_key));

        [err, result] = await utils.to(
            cutCommission(user.tron_wallet_public_key, 'Health Port Network Fee', 'Download')
        )
        if (err) {
            if (err == 'Bandwidth is low') {
                return response.sendResponse(
                    res,
                    resCode.BAD_REQUEST,
                    resMessage.BANDWIDTH_IS_LOW
                );
            }
            else {
                return response.sendResponse(
                    res,
                    resCode.BAD_REQUEST,
                    resMessage.INSUFFICIENT_BALANCE
                );
            }

        }


        //Returing successful response with data
        return response.sendResponse(
            res,
            resCode.SUCCESS,
            resMessage.DOCUMENT_RETRIEVED,
            allergies
        );

    } catch (error) {
        console.log(error);
        return response.errReturned(res, error);
    }
}

module.exports = {
    saveAllergyListByUser,
    getAllergyListByUser
}