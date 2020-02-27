const utils = require('../../../etc/utils');
const tronUtils = require('../../../etc/tronUtils');
const response = require('../../../etc/response');
const resCode = require('../../../enum/responseCodesEnum');
const resMessage = require('../../../enum/responseMessagesEnum');
const rewardDisperser = require('../../../etc/rewardCheck');

const rewardEnum = require('../../../enum/rewardEnum');
var cutCommission = require('./../../../etc/commission');

const db = global.healthportDb;

async function saveProcedureByUser(req, res) {
    try {
        let user_id = req.body.userId;
        let procedure_form = req.body.procedureForm;
        let no_known_procedures = req.body.noKnownProcedures;
        let err,
            procedures;

        [err, user] = await utils.to(db.models.users.findOne({
            where: {
                id: user_id
            }
        }));
        if (user == null) 
            return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);
        
        //Appending user_id to each object
        for (var i = 0; i < procedure_form.length; i++) {
            procedure_form[i]['user_id'] = user_id;
            procedure_form[i]['no_known_procedures'] = no_known_procedures;
        }

         //Checking user's balance before uploading document.
         let balance = await tronUtils.getTRC10TokenBalance(utils.decrypt(user.tron_wallet_private_key), utils.decrypt(user.tron_wallet_public_key));
         [err, commissionObj] = await utils.to(db.models.commission_conf.findOne({
             where: { commission_type: 'Upload' }
         }));
         if (err) return response.errReturned(res, err);
         if (balance < commissionObj.commission_amount)
             return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INSUFFICIENT_BALANCE);
             
        [err, rewardDisperserResult] = await utils.to(rewardDisperser(
            rewardEnum.PROCEDUREDOCUMENTREWARD,
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
        
        [err, procedures] = await utils.to(
            db.models.procedures.bulkCreate(procedure_form)
        );

        //Returing successful response with data
        return response.sendResponse(
            res,
            resCode.SUCCESS,
            resMessage.DOCUMENT_SAVED,
            procedures
        );

    } catch (error) {
        console.log(error);
        return response.errReturned(res, error);
    }
}

async function getProcedureListByUser(req, res) {
    try {
        let user_id = req.body.userId;
        let err,
            procedures,
            result,
            latestTransaction = {}; // check for transaction pending 

        //Finding procedures from db by userId
        [err, procedures] = await utils.to(db.models.procedures.findAll({
            where: {
                user_id: user_id
            }
        }));
        if (procedures == null) 
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

        // check for transaction pending 
        [err, latestTransaction] = await utils.to(db.models.transections.findOne({
            where: [{ user_id }],
            order: [['createdAt', 'DESC']],
        }))

        if (Object.keys(latestTransaction).length != 0) {
            //get transaction using hash
            const transactionInfo = await tronUtils.getTransactionByHash(latestTransaction.trx_hash)
            //check transaction is confirmed or not
            if (!transactionInfo.id) {
                return response.sendResponse(res, resCode.NOT_FOUND, resMessage.WAIT_FOR_PENDING_TRANSACTION)
            }
        }

        //End check for transaction pending

        [err, result] = await utils.to(
            cutCommission(user.tron_wallet_public_key, 'Health Port Network Fee', 'Download')
        )
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
            procedures
        );

    } catch (error) {
        console.log(error);
        return response.errReturned(res, error);
    }
}

module.exports = {
    saveProcedureByUser,
    getProcedureListByUser
}