const _ = require('lodash')
const regex = require('../../../etc/regex')
const utils = require('../../../etc/utils')
const response = require('../../../etc/response')
const tronUtils = require('../../../etc/tronUtils')
const roleEnum = require('./../../../enum/roleEnum')
const passcodeGenerator = require('generate-password')
const cutCommission = require('./../../../etc/commission')
const resCode = require('../../../enum/responseCodesEnum')
const mailChimpUtil = require('../../../etc/mailChimpUtil')
const tokenGenerator = require('../../../etc/generateToken')
const emailTemplates = require('../../../etc/emailTemplates')
const resMessage = require('../../../enum/responseMessagesEnum')

const db = global.healthportDb;
const Sequelize = require('sequelize')

async function getAllProviders(req, res) {
    try {
        const { user_id } = req.auth;
        const { mId } = req.params
        let err = {}, providers = {}, data = {}, ids = [];

        //Verifying user authenticity  
        [err, user] = await utils.to(db.models.users.findOne({ where: { id: user_id } }))
        if (err) return response.errReturned(res, err)
        if (user == null)
            return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

        if (mId) {
            //Getting ids with already shared
            [err, ids] = await utils.to(db.query(`
                SELECT share_with_user_id
                    FROM share_histories
                    WHERE share_from_user_id = :user_id
                    AND medical_record_id = :mId`,
                {
                    replacements: { user_id, mId },
                    type: db.QueryTypes.SELECT,
                }));
        }

        //Getting all providers from db
        [err, providers] = await utils.to(db.models.users.findAll(
            {
                where:
                {
                    role: roleEnum.PROVIDER, status: true,
                    id: { [Sequelize.Op.notIn]: ids.map(x => x.share_with_user_id) }
                },
                order: [['name', 'asc']]
            }))
        if (err) return response.errReturned(res, err)
        if (!providers || providers == null || providers.length == 0)
            return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)

        //Mapping data
        data = providers.map(elem => (
            {
                id: elem.id,
                name: elem.name,
                email: elem.email,
                wallet_address: utils.decrypt(elem.tron_wallet_public_key),
                public_key_hex: utils.decrypt(elem.tron_wallet_public_key_hex)
            }
        ))

        //Returing successful response with data
        return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, data);

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
            cutCommission(providerData.tron_wallet_public_key, 'Health Port Network Fee', 'Download')
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

async function shareListWithProviders(req, res) {
    try {
        let user_id = req.body.userId;
        let share_with = req.body.shareWith;
        let type = req.body.type;

        let err, providers;
        if (type != 'all') {
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
        } else {
            //Deleting existing records
            [err, providers] = await utils.to(db.models.patient_provider_records.destroy(
                {
                    where: { user_id: user_id }
                }));

            //Inserting updated records.
            for (let i = 0; i < share_with.length; i++) {
                [err, providers] = await utils.to(db.models.patient_provider_records.bulkCreate(
                    [
                        { user_id: user_id, type: 'medications', share_with_id: share_with[i].share_with_id, share_with_name: share_with[i].share_with_name },
                        { user_id: user_id, type: 'procedures', share_with_id: share_with[i].share_with_id, share_with_name: share_with[i].share_with_name },
                        { user_id: user_id, type: 'allergies', share_with_id: share_with[i].share_with_id, share_with_name: share_with[i].share_with_name },
                    ]));
            }
        }
        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS);

    } catch (error) {
        console.log(error);
        return response.errReturned(res, error);
    }
}

async function addPatient(req, res) {
    try {
        const userId = req.auth.user_id
        const { email, name } = req.body

        let err = {}, patient = {}, provider = {}

        //Checking empty field
        if (!(name && email))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.REQUIRED_FIELDS_EMPTY)

        //Reguler expression testing for email
        if (!regex.emailRegex.test(email))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INVALID_EMAIL_ADDRESS);

        //Verifying user authenticity
        [err, provider] = await utils.to(db.models.users.findOne({ where: { id: userId } }))
        if (err) return response.errReturned(res, err)
        if (!provider || provider.length == 0 || provider == null)
            return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND)
        if (provider.role != roleEnum.PROVIDER)
            return response.sendResponse(res, resCode.UNAUTHORIZED, resMessage.NOT_ALLOWED);

        //Checking if email exists
        [err, patient] = await utils.to(db.models.users.findOne({ where: { email } }))
        if (err) return response.errReturned(res, err)
        if (patient)
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.USER_ALREADY_EXIST);

        //Creating Tron Account.
        const account = await tronUtils.createAccount();

        //Saving admin record in db 
        [err, patient] = await utils.to(db.models.users.create(
            {
                name,
                email,
                role: roleEnum.PATIENT,
                refer_destination: roleEnum.PROVIDER,
                tron_wallet_private_key: utils.encrypt(account.privateKey),
                tron_wallet_public_key: utils.encrypt(account.address.base58),
                tron_wallet_public_key_hex: utils.encrypt(account.publicKey),
                referal_coupon: passcodeGenerator.generate({ length: 14, numbers: true }),
            }))
        if (err) return response.errReturned(res, err)
        if (!patient)
            return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)

        const spilt_name = name.split(' ')
        if (spilt_name.length == 2) {
            mailChimpUtil(email, spilt_name[0], spilt_name[1])
        }
        else {
            mailChimpUtil(email, spilt_name[0], process.env.PROJECT_NAME)
        }

        //Saving passcode in db
        [err, passCode] = await utils.to(db.models.pass_codes.create(
            {
                user_id: patient.id,
                pass_code: passcodeGenerator.generate({ length: 14, numbers: true }),
                type: 'signup'
            }));

        //Jwt token generating
        [err, token] = await utils.to(tokenGenerator.createToken(
            {
                email: patient.email,
                user_id: patient.id,
                pass_code: passCode.pass_code,
                set_password: true
            }))

        //Email sending
        const url = `${process.env.BASE_URL}${process.env.RESET_PASSWOR_ROUTE}?token=${token}&newpatient=1`;
        [err, mailSent] = await utils.to(emailTemplates.addNewPatient(patient.email, url, patient.name))
        if (!mailSent) {
            console.log(err)
            return response.errReturned(res, err)
        }

        //Returing successful response
        return response.sendResponse(
            res,
            resCode.SUCCESS,
            resMessage.USER_ADDED_SUCCESSFULLY, null, token)
    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

async function getSharedMedicalRecords(req, res) {
    try {
        const userId = req.auth.user_id
        let { pageNumber, pageSize } = req.body
        const { templateId, searchValue } = req.body

        let err = {}, provider = {}, records = {}

        //Paging
        pageSize = parseInt(pageSize)
        pageNumber = parseInt(pageNumber)
        if (!pageNumber) pageNumber = 0
        if (!pageSize) pageSize = 10
        const start = parseInt(pageNumber * pageSize)
        const end = parseInt(start + pageSize);

        //Verifying user authenticity
        [err, provider] = await utils.to(db.models.users.findOne({ where: { id: userId } }))
        if (err) return response.errReturned(res, err)
        if (!provider || provider.length == 0 || provider == null)
            return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND)
        if (provider.role != roleEnum.PROVIDER)
            return response.sendResponse(res, resCode.UNAUTHORIZED, resMessage.NOT_ALLOWED);

        //Getting medical records from db with paging
        [err, records] = await utils.to(db.query(`
            SELECT sh.id as shareHistoryId, t.id as templateId, t.name as templateName, 
                u.name as patientName, u.email as patientEmail, 
                u.tron_wallet_public_key_hex as patientPublicKeyHex,  
                sh.access_token as accessToken,
                sh.createdAt 
                FROM share_histories sh
                INNER JOIN users u ON sh.share_from_user_id = u.id
                INNER JOIN medical_records m ON sh.medical_record_id = m.id
                INNER JOIN templates t ON m.template_id = t.id
                WHERE sh.share_with_user_id = :userId
                ORDER BY sh.createdAt DESC`,
            {
                replacements: { userId },
                type: db.QueryTypes.SELECT,
            }))
        if (err) return response.errReturned(res, err)
        if (records == null || records.count == 0 || records == undefined)
            return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)

        let returnableData = {}
        if (records) {
            if (templateId) {
                records = records.filter(x => x.templateId == templateId)
            }
            if (searchValue) {
                records = records.filter(x =>
                    x.patientName.toLowerCase().includes(searchValue.toLowerCase()) ||
                    x.patientEmail.toLowerCase().includes(searchValue.toLowerCase()))
            }

            returnableData['count'] = records.length
            let slicedData = records.slice(start, end)
            returnableData['rows'] = slicedData

            //Getting access rigths
            for (let i = 0; i < returnableData.rows.length; i++) {
                [err, shareRights] = await utils.to(db.query(`
                SELECT st.name from share_rights sr
                    INNER JOIN share_types st ON sr.share_type_id = st.id
                    WHERE share_history_id = :id;`,
                    {
                        replacements: { id: returnableData.rows[i].shareHistoryId },
                        type: db.QueryTypes.SELECT,
                    }))
                if (err) return response.errReturned(res, err)
                if (shareRights == null || shareRights.count == 0 || shareRights == undefined)
                    return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)
                returnableData.rows[i].rigths = shareRights.map(x => x.name)
                returnableData.rows[i].patientPublicKeyHex = utils.decrypt(returnableData.rows[i].patientPublicKeyHex)
            }

            //Returing successful response
            return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, returnableData)
        }
    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

async function updateProviderAccessToken(req, res) {
    try {
        const userId = req.auth.user_id
        const { shareHistoryId, accessToken } = req.body

        let err = {}, provider = {}, record = {}

        //Checking empty field
        if (!(shareHistoryId && accessToken))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.REQUIRED_FIELDS_EMPTY);

        //Verifying user authenticity
        [err, provider] = await utils.to(db.models.users.findOne({ where: { id: userId } }))
        if (err) return response.errReturned(res, err)
        if (!provider || provider.length == 0 || provider == null)
            return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND)
        if (provider.role != roleEnum.PROVIDER)
            return response.sendResponse(res, resCode.UNAUTHORIZED, resMessage.NOT_ALLOWED);

        //Checking weather if exists
        [err, record] = await utils.to(db.models.share_histories.findOne(
            {
                where: { id: shareHistoryId, share_with_user_id: userId }
            }))
        if (err) return response.errReturned(res, err)
        if (!record || record == null)
            return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND);

        //Updating access token
        [err, record] = await utils.to(db.models.share_histories.update(
            { access_token: accessToken, status: 'PENDING' },
            { where: { id: shareHistoryId, share_with_user_id: userId } }
        ))
        if (err) return response.errReturned(res, err)
        if (record[0] == 0)
            return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR)

        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.DOCUMENT_UPDATED)

    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

async function removeMedicalRecordHisotry(req, res) {
    try {
        const { user_id } = req.auth
        const { sId } = req.params

        let err = {}, provider = {}, record = {}, shareRights = {}
        if (!sId)
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.REQUIRED_FIELDS_EMPTY);

        //Verifying user authenticity
        [err, provider] = await utils.to(db.models.users.findOne({ where: { id: user_id } }))
        if (err) return response.errReturned(res, err)
        if (!provider || provider.length == 0 || provider == null)
            return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND)
        if (provider.role != roleEnum.PROVIDER)
            return response.sendResponse(res, resCode.UNAUTHORIZED, resMessage.NOT_ALLOWED);

        //Checking weather if exists
        [err, record] = await utils.to(db.models.share_histories.findOne(
            {
                where: { id: sId, share_with_user_id: user_id }
            }))
        if (err) return response.errReturned(res, err)
        if (!record || record == null)
            return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND);

        //Deleting share histroy
        [err, shareRights] = await utils.to(db.models.share_histories.destroy(
            {
                where: { id: sId }
            }))
        if (err) return response.errReturned(res, err)
        if (shareRights == 0)
            return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR);

        //Deleting access rights
        [err, shareRights] = await utils.to(db.models.share_rights.destroy(
            {
                where: { share_history_id: sId }
            }))
        if (err) return response.errReturned(res, err)
        if (shareRights == 0)
            return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR);

        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.ACCESS_RIGHTS_REMOVED)

    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

module.exports = {
    addPatient,
    getAllProviders,
    getProviderSharedData,
    shareListWithProviders,
    getProviderSharedDocument,
    getSharedMedicalRecords,
    updateProviderAccessToken,
    removeMedicalRecordHisotry
}