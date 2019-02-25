var _ = require('lodash');

const utils = require('../../../etc/utils');
const response = require('../../../etc/response');
const roleEnum = require('./../../../enum/roleEnum');
const resCode = require('../../../enum/responseCodesEnum');
const resMessage = require('../../../enum/responseMessagesEnum');
var cutCommission = require('./../../../etc/commission');

const db = global.healthportDb;

async function getAllProviders(req, res) {
    try {
        let type = req.body.type;
        let user_id = req.body.userId;

        let err, providers, finalData = [], data = {}, obj = {};

        //Getting all providers from db
        [err, providers] = await utils.to(db.models.users.findAll({ where: { role: roleEnum.PROVIDER } }));

        for (let i = 0; i < providers.length; i++) {
            data[i] = {
                'share_with_id': providers[i].id,
                'share_with_name': providers[i].name
            }
        }
        data = _.orderBy(data, ['share_with_name'], ['asc']);

        [err, obj] = await utils.to(db.models.patient_provider_records.findAll({ where: { type: type, user_id: user_id } }));

        finalData.push(obj);
        finalData.push(data);

        //Returing successful response with data
        return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, finalData);

    } catch (error) {
        console.log(error);
        return response.errReturned(res, error);
    }
}

async function shareListWithProviders(req, res) {
    try {
        let user_id = req.body.userId;
        let share_with = req.body.shareWith;
        let type = req.body.type;

        let err, providers;

        //Deleting existing records
        [err, providers] = await utils.to(db.models.patient_provider_records.destroy(
            {
                where: { user_id: user_id, type: type }
            }));

        //Inserting updated records.
        for (let i = 0; i < share_with.length; i++) {
            [err, providers] = await utils.to(db.models.patient_provider_records.create(
                {
                    user_id: user_id,
                    type: type,
                    share_with_id: share_with[i].share_with_id,
                    share_with_name: share_with[i].share_with_name
                }));
        }

        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS);

    } catch (error) {
        console.log(error);
        return response.errReturned(res, error);
    }
}

async function getProviderSharedData(req, res) {
    try {
        let provider_id = req.body.providerId;
        let searchValue = req.body.searchValue;
        let filter = req.body.filter;

        let err, data, filterData;;

        //Paging
        let pageSize = parseInt(req.body.pageSize);
        let pageNumber = parseInt(req.body.pageNumber);
        if (!pageNumber) pageNumber = 0;
        if (pageNumber) pageNumber = pageNumber - 1;
        if (!pageSize) pageSize = 5;
        let start = parseInt(pageNumber * pageSize);
        let end = parseInt(start + pageSize);

        //Getting provider data and total count
        
        let returnableData = {};
        [err, dbData] = await utils.to(db.query('select p.user_id, u.name, u.email, p.type from users u ' +
            'inner join patient_provider_records p on u.id = user_id where p.share_with_id = :share_with_id order by u.id desc',
            {
                replacements: { share_with_id: provider_id.toString() },
                type: db.QueryTypes.SELECT,
            }));
        if (dbData) {
            if (filter && searchValue) {
                dbData = dbData.filter(x => x.type == filter);
                dbData = dbData.filter(x => x.name.toLowerCase().includes(searchValue.toLowerCase()) || x.email.toLowerCase().includes(searchValue.toLowerCase()));
            } else if (filter) {
                dbData = dbData.filter(x => x.type == filter);
            } else if (searchValue) {
                dbData = dbData.filter(x => x.name.toLowerCase().includes(searchValue.toLowerCase()) || x.email.toLowerCase().includes(searchValue.toLowerCase()));
            }
            
            returnableData['count'] = dbData.length;
            let slicedData = dbData.slice(start, end)
            returnableData['rows'] = slicedData;

        }
        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, returnableData);

    } catch (error) {
        console.log(error);
        return response.errReturned(res, error);
    }
}

async function getProviderSharedDocument(req, res) {
    try {
        let user_id = req.body.userId
        let type = req.body.type;
        let provider_id = req.body.providerId;

        let err, data, providerData;
        [err, data] = await utils.to(db.query('select * from ' + type + ' where user_id = :user_id order by id desc',
            {
                replacements: { user_id: user_id },
                type: db.QueryTypes.SELECT,
            }));

        //Getting provider's data from db
        [err, providerData] = await utils.to(db.models.users.findOne({ where: { id: provider_id } }));
        [err, result] = await utils.to(
            cutCommission(providerData.tron_wallet_public_key, 'Health Port Network Fee')
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

        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.DOCUMENT_RETRIEVED, data);

    } catch (error) {
        console.log(error);
        return response.errReturned(res, error);
    }
}
module.exports = {
    getAllProviders,
    shareListWithProviders,
    getProviderSharedData,
    getProviderSharedDocument
}