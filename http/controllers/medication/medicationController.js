const utils = require('../../../etc/utils');
const response = require('../../../etc/response');
const resCode = require('../../../enum/responseCodesEnum');
const resMessage = require('../../../enum/responseMessagesEnum');
const rewardDisperser = require('../../../etc/rewardCheck');

const rewardEnum = require('../../../enum/rewardEnum');
var cutCommission = require('./../../../etc/commission');

const db = global.healthportDb;

async function saveMedicationByUser(req, res) {
    try {
        let medication_form = req.body.medicationForm;
        let no_known_medications = req.body.noKnownMedications;
        let user_id = req.body.userId;
        let err,
            medications;

        [err, user] = await utils.to(db.models.users.findOne({
            where: {
                id: user_id
            }
        }));
        if (user == null) 
            return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);
        
        //Appending user_id to each object
        for (var i = 0; i < medication_form.length; i++) {
            medication_form[i]['user_id'] = user_id;
            medication_form[i]['no_known_medications'] = no_known_medications;
        }
        [err, rewardDisperserResult] = await utils.to(rewardDisperser(
            rewardEnum.MEDICATIONDOCUMENTREWARD,
            user_id,
            user.tron_wallet_public_key
        ));
        if(err){
            return response.sendResponse(
                res,
                resCode.BAD_REQUEST,
                resMessage.BANDWIDTH_IS_LOW
            );
        }
        
        [err, medications] = await utils.to(
            db.models.medications.bulkCreate(medication_form)
        );

        //Returing successful response with data
        return response.sendResponse(
            res,
            resCode.SUCCESS,
            resMessage.DOCUMENT_SAVED,
            medications
        );

    } catch (error) {
        console.log(error);
        return response.errReturned(res, error);
    }
}

async function getMedicationListByUser(req, res) {
    try {
        let user_id = req.body.userId;
        let err,
            medications,
            result;

        //Finding medications from db by userId
        [err, medications] = await utils.to(db.models.medications.findAll({
            where: {
                user_id: user_id
            }
        }));
        if (medications == null) 
            return response.sendResponse(
                res,
                resCode.NOT_FOUND,
                resMessage.NO_RECORD_FOUND
            );
        [err, user] = await utils.to(db.models.users.findOne({
            where: {
                id: user_id
            }
        }));
        [err, result] = await utils.to(
            cutCommission(user.tron_wallet_public_key, 'Health Port Network Fee')
        );
        if (err) {
            if(err == 'Bandwidth is low'){
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
            medications
        );

    } catch (error) {
        console.log(error);
        return response.errReturned(res, error);
    }
}

module.exports = {
    saveMedicationByUser,
    getMedicationListByUser
}