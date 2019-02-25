const bcrypt = require('bcrypt');
const moment = require('moment');
const recaptcha = require('recaptcha2');
const request = require('superagent');
const passcodeGenerator = require('generate-password');

const utils = require('../../../etc/utils');
const regex = require('../../../etc/regex');
const response = require('../../../etc/response');
const tronUtils = require('../../../etc/tronUtils');
const resCode = require('../../../enum/responseCodesEnum');
const tokenGenerator = require('../../../etc/generateToken');
const emailTemplates = require('../../../etc/emailTemplates');
const mailChimpUtil = require('../../../etc/mailChimpUtil');
const resMessage = require('../../../enum/responseMessagesEnum');

const db = global.healthportDb;

async function signIn(req, res) {
    try {
        let email = req.body.email;
        let password = req.body.password;

        let err, admin;

        //Checking empty email and password 
        if (!(email && password))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.REQUIRED_FIELDS_EMPTY);

        //Reguler expression testing for email
        if (!regex.emailRegex.test(email))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INVALID_EMAIL_ADDRESS);

        //Finding record from db    
        [err, admin] = await utils.to(db.models.admins.findOne({ where: { email: email } }));
        if (admin == null) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);
        if (password != admin.password)
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.PASSWORD_INCORRECT);

        //Returing successful response with data
        let data = {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            is_admin: admin.is_admin,
            twofa_enable: admin.twofa_enable,
            is_twofa_verified: admin.is_twofa_verified
        };

        [err, token] = await utils.to(tokenGenerator.createToken(data));

        return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESSFULLY_LOGGEDIN, data, token);

    } catch (error) {
        console.log(error);
        return response.errReturned(res, error);
    }
}

async function signUp(req, res) {
    try {
        let email = req.body.email;
        let name = req.body.name;
        let password = req.body.password;

        let err, data;

        //Checking empty email, password and name 
        if (!(email && password && name))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.REQUIRED_FIELDS_EMPTY);

        //Reguler expression testing for email
        if (!regex.emailRegex.test(email))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INVALID_EMAIL_ADDRESS);

        //Saving admin record in db 
        [err, data] = await utils.to(db.models.admins.create(
            {
                name: name,
                email: email,
                password: password,
            }));
        if (err) return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.USER_ALREADY_EXIST);

        return response.sendResponse(res, resCode.SUCCESS, resMessage.USER_ADDED_SUCCESSFULLY);

    } catch (error) {
        console.log(error);
        return response.errReturned(res, error);
    }
}

async function forgetPassword(req, res) {
    try {
        let email = req.body.email;

        let err, admin, token, foundPasscode, passcodeCreateTime, timeDifferInMin, mailSent;

        let passcode = passcodeGenerator.generate({ length: 14, numbers: true });

        //Reguler expression testing for email
        if (!regex.emailRegex.test(email))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INVALID_EMAIL_ADDRESS);

        //Finding record from db
        [err, admin] = await utils.to(db.models.admins.findOne({ where: { email: email } }));
        if (admin == null) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

        let authentication = { pass_code: passcode, user_id: admin.id, email: admin.email };

        //Checking passcode in db
        [err, foundPasscode] = await utils.to(db.models.pass_codes.findOne(
            {
                where: { user_id: admin.id, type: 'admin forget' },
                order: [['createdAt', 'DESC']]
            }));
        if (foundPasscode) {
            passcodeCreateTime = moment(foundPasscode.createdAt).format('YYYY-MM-DD HH:mm:ss');
            let now = moment().format('YYYY-MM-DD HH:mm:ss');
            timeDifferInMin = moment(now, 'YYYY-MM-DD HH:mm:ss').diff(passcodeCreateTime, 'm');

            //re-attempt allowed after 10 mintues
            if (!(timeDifferInMin >= parseInt(process.env.FORGETPASSWORD_RE_ATTEMPT_TIME))) {
                return response.sendResponse(res, resCode.BAD_REQUEST, `You Need to wait ${parseInt(process.env.FORGETPASSWORD_RE_ATTEMPT_TIME) - timeDifferInMin} minutes to avail this service again.`);
            }
        }

        //Saving passcode in db
        [err, obj] = await utils.to(db.models.pass_codes.create(
            {
                user_id: admin.id,
                pass_code: passcode,
                type: 'admin forget'
            }));

        //Jwt token generating
        [err, token] = await utils.to(tokenGenerator.createToken(authentication));

        let url = `${process.env.BASE_URL_ADMIN}${process.env.RESET_PASSWOR_ROUTE}?token=${token}`;

        //Email sending
        [err, mailSent] = await utils.to(emailTemplates.forgetPasswordTemplate(token, email, url));
        if (!mailSent) {
            console.log(err)
            return response.errReturned(res, err);
        }

        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.MAIL_SENT);

    } catch (error) {
        console.log(error);
        return response.errReturned(res, error);
    }
}

async function confirmForgotPassword(req, res) {
    try {
        const obj = {
            'passcode': req.auth.pass_code,
            'password': req.body.password,
            'email': req.auth.email
        }

        let err, data = {}

        //Checking passcode email and password
        if (!(obj.password && obj.passcode))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.REQUIRED_FIELDS_EMPTY)

        //Reguler expression testing for password requirements
        if (!regex.passRegex.test(obj.password))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.PASSWORD_COMPLEXITY);

        //Finding record from db
        [err, data] = await utils.to(db.models.pass_codes.findOne(
            {
                where: { pass_code: obj.passcode, type: 'admin forget' },
                order: [['createdAt', 'DESC']]
            }))
        if (data.is_used == true) return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.LINK_ALREADY_USED)
        if (data) {
            const passcodeCreateTime = moment(data.createdAt).format('YYYY-MM-DD HH:mm:ss')
            const now = moment().format('YYYY-MM-DD HH:mm:ss')
            const timeDifferInMin = moment(now, 'YYYY-MM-DD HH:mm:ss').diff(passcodeCreateTime, 'm')

            //Checking link expiry
            if (timeDifferInMin >= parseInt(process.env.FORGETPASSWORD_LINK_EXPIRY_TIME))
                return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.LINK_EXPIRED)
        }

        //Encrypting password
        //const passwordHash = bcrypt.hashSync(obj.password, parseInt(process.env.SALT_ROUNDS));

        //Updating password in db
        [err, data] = await utils.to(db.models.admins.update(
            { password: obj.password },
            { where: { id: data.user_id } }
        ));

        //Updading passcode
        [err, data] = await utils.to(db.models.pass_codes.update(
            { is_used: true },
            { where: { pass_code: obj.passcode, type: 'admin forget' } }
        ));

        //Email sending
        [err, mailSent] = await utils.to(emailTemplates.passwordSuccessfullyChanged(obj.email));
        if (!mailSent) {
            console.log(err)
            return response.errReturned(res, err);
        }

        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.PASSWORD_CHANGED)

    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

async function changePassword(req, res) {
    try {
        const obj = {
            'adminId': req.auth.id,
            'oldPassword': req.body.oldPassword,
            'newPassword': req.body.newPassword
        }

        let err, admin = {}

        //Checking empty fields
        if (!(obj.adminId && obj.oldPassword && obj.newPassword))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.REQUIRED_FIELDS_EMPTY);

        if (obj.oldPassword == obj.newPassword)
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.PASSWORD_ARE_SAME);

        //Finding record from db    
        [err, admin] = await utils.to(db.models.admins.findOne({ where: { id: obj.adminId } }))
        if (admin == null) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND)

        if (obj.oldPassword != admin.password)
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.PASSWORD_INCORRECT);

        //Updading passcode
        [err, update] = await utils.to(db.models.admins.update(
            { password: obj.newPassword },
            { where: { id: obj.adminId } }
        ));

        //Email sending
        [err, mailSent] = await utils.to(emailTemplates.passwordSuccessfullyChanged(admin.email));
        if (!mailSent) {
            console.log(err)
            return response.errReturned(res, err);
        }

        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.PASSWORD_CHANGED)

    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

async function getLoginHistories(req, res) {
    try {
        const obj = {
            'searchValue': req.body.searchValue,
            'pageNumber': req.body.pageNumber,
            'pageSize': req.body.pageSize,
            'from': req.body.from,
            'to': req.body.to,
            'isCsvExport': req.body.isCsvExport
        }
        let fromDate, toDate;
        if (obj.from && obj.to) {
            fromDate = `${obj.from.year}-${obj.from.month}-${obj.from.day}`;
            fromDate = new Date(fromDate).getTime();

            toDate = `${obj.to.year}-${obj.to.month}-${obj.to.day}`;
            toDate = new Date(toDate).getTime();
        }

        let dbData, returnableData = {};

        //Paging
        let pageSize = parseInt(obj.pageSize);
        let pageNumber = parseInt(obj.pageNumber);
        if (!pageNumber) pageNumber = 0;
        if (!pageSize) pageSize = 20;
        let start = parseInt(pageNumber * pageSize);
        let end = parseInt(start + pageSize);

        [err, dbData] = await utils.to(db.query('select l.id, l.user_id, u.name, u.email, u.role, l.createdAt, l.ip_address from users u inner join login_histories l ON u.id = l.user_id order by l.createdAt Desc',
            {
                type: db.QueryTypes.SELECT,
            }));
        if (obj.isCsvExport == 'true') {
            //Returing successful response
            return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, dbData);
        }
        
        if(dbData.length > 0){
            for (let i = 0; i < dbData.length; i++) {
                dbData[i].createdAt = new Date(dbData[i].createdAt).getTime();
            }
        }
        
        if (dbData) {
            if ((obj.from && obj.to) && obj.searchValue) {
                dbData = dbData.filter(x => x.createdAt >= Date.parse(obj.from) && x.createdAt <= Date.parse(obj.to));
                dbData = dbData.filter(x => x.name.toLowerCase().includes(obj.searchValue.toLowerCase()) || x.email.toLowerCase().includes(obj.searchValue.toLowerCase()));
            } else if (obj.from && obj.to) {
                dbData = dbData.filter(x => x.createdAt >= fromDate && x.createdAt <= toDate);
            } else if (obj.searchValue) {
                dbData = dbData.filter(x => x.name.toLowerCase().includes(obj.searchValue.toLowerCase()) || x.email.toLowerCase().includes(obj.searchValue.toLowerCase()));
            }

            returnableData['count'] = dbData.length;
            let slicedData = dbData.slice(start, end)
            returnableData['rows'] = slicedData;
        }

        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, returnableData);

    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

async function getUsers(req, res) {
    try {
        const obj = {
            'searchValue': req.body.searchValue,
            'pageNumber': req.body.pageNumber,
            'pageSize': req.body.pageSize,
            'role': req.body.role,
            'isCsvExport': req.body.isCsvExport
        }

        let dbData, returnableData = {};

        //Paging
        let pageSize = parseInt(obj.pageSize);
        let pageNumber = parseInt(obj.pageNumber);
        if (!pageNumber) pageNumber = 0;
        //if (pageNumber) pageNumber = pageNumber - 1;
        if (!pageSize) pageSize = 20;
        let start = parseInt(pageNumber * pageSize);
        let end = parseInt(start + pageSize);

        [err, dbData] = await utils.to(db.query('select id, name, email, role, tron_wallet_public_key, createdAt from users order by createdAt desc',
            {
                type: db.QueryTypes.SELECT,
            }));
        if (obj.isCsvExport == 'true') {
            //Returing successful response
            return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, dbData);
        }
        if (dbData) {
            if (obj.role && obj.searchValue) {
                dbData = dbData.filter(x => x.role == obj.role);
                dbData = dbData.filter(x => x.name.toLowerCase().includes(obj.searchValue.toLowerCase()) || x.email.toLowerCase().includes(obj.searchValue.toLowerCase()));
            } else if (obj.role) {
                dbData = dbData.filter(x => x.role == obj.role);
            } else if (obj.searchValue) {
                dbData = dbData.filter(x => x.name.toLowerCase().includes(obj.searchValue.toLowerCase()) || x.email.toLowerCase().includes(obj.searchValue.toLowerCase()));
            }

            returnableData['count'] = dbData.length;
            let slicedData = dbData.slice(start, end)
            returnableData['rows'] = slicedData;
        }

        //Decrypting public address
        for (let i = 0; i < returnableData.rows.length; i++) {
            returnableData.rows[i].tron_wallet_public_key = utils.decrypt(returnableData.rows[i].tron_wallet_public_key);
        }

        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, returnableData);

    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

async function getUserById(req, res) {
    try {
        const obj = {
            'userId': req.body.userId
        }

        let err, user;

        [err, user] = await utils.to(db.query(`
                        select u.id, u.email, u.role, u.tron_wallet_public_key, u.tron_wallet_private_key, 
                        l.createdAt as last_login_date, u.createdAt as account_created_date from users u
                        inner join login_histories l ON u.id = l.user_id 
                        where u.id = ${obj.userId} 
                        order by l.createdAt desc
                        limit 1`,
            {
                type: db.QueryTypes.SELECT,
            }));
        if (user == null) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

        let data = {
            id: user[0].id,
            email: user[0].email,
            dateCreated: user[0].account_created_date,
            lastLoginDate: user[0].last_login_date,
            publicKey: utils.decrypt(user[0].tron_wallet_public_key),
            ehrBalance: await tronUtils.getTRC10TokenBalance(utils.decrypt(user[0].tron_wallet_private_key), utils.decrypt(user[0].tron_wallet_public_key)),
            trxBalance: await tronUtils.getTrxBalance(utils.decrypt(user[0].tron_wallet_private_key), utils.decrypt(user[0].tron_wallet_public_key)),
        };

        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, data);

    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

async function getTransactionsByUserId(req, res) {
    try {
        const obj = {
            'userId': req.body.userId,
            'pageNumber': req.body.pageNumber,
            'pageSize': req.body.pageSize,
        }
        let err, transections;

        //Paging
        if (!obj.pageNumber) obj.pageNumber = 0;
        if (!obj.pageSize) obj.pageSize = 10;
        let start = parseInt(obj.pageNumber * obj.pageSize);
        let end = parseInt(start + obj.pageSize);

        [err, transections] = await utils.to(db.models.transections.findAndCountAll(
            {
                where: [{ user_id: obj.userId }],
                order: [['createdAt', 'DESC']],
                limit: obj.pageSize,
                offset: start
            }));

        if (transections == null) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND);

        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, transections);

    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

async function getLoginHistoriesByUserId(req, res) {
    try {
        const obj = {
            'userId': req.body.userId,
            'pageNumber': req.body.pageNumber,
            'pageSize': req.body.pageSize,
        }
        let err, loginHistories;

        //Paging
        if (!obj.pageNumber) obj.pageNumber = 0;
        if (!obj.pageSize) obj.pageSize = 10;
        let start = parseInt(obj.pageNumber * obj.pageSize);
        let end = parseInt(start + obj.pageSize);

        [err, loginHistories] = await utils.to(db.models.login_histories.findAndCountAll(
            {
                where: [{ user_id: obj.userId }],
                order: [['createdAt', 'DESC']],
                limit: obj.pageSize,
                offset: start
            }));
        if (loginHistories == null) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND);

        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, loginHistories);

    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

async function getReferrals(req, res) {
    try {
        const obj = {
            'userId': req.body.userId,
            'pageNumber': req.body.pageNumber,
            'pageSize': req.body.pageSize,
        }
        let err, user, referrals, rewardConfs;

        //Paging
        if (!obj.pageNumber) obj.pageNumber = 0;
        if (!obj.pageSize) obj.pageSize = 10;
        let start = parseInt(obj.pageNumber * obj.pageSize);
        let end = parseInt(start + obj.pageSize);

        [err, user] = await utils.to(db.models.users.findOne({ where: { id: obj.userId } }));
        if (user == null) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND);

        [err, referrals] = await utils.to(db.models.users.findAndCountAll(
            {
                where: [{ refer_by_coupon: user.referal_coupon }],
                order: [['createdAt', 'DESC']],
                limit: obj.pageSize,
                offset: start
            }));
        if (referrals == null) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND);
        
        [err, rewardConfs] = await utils.to(db.models.reward_conf.findOne({ where: { reward_type: 'Referral Reward' } }));

        let data = [];
        for (let i = 0; i < referrals.rows.length; i++) {
            data[i] = {
                'id': referrals.rows[i].id,
                'email': referrals.rows[i].email,
                'channel': referrals.rows[i].refer_destination,
                'createdAt': referrals.rows[i].createdAt,
                'ehrReward': rewardConfs.reward_amount
            }
        }
        referrals.rows = data;
        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, referrals);

    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

module.exports = {
    signIn,
    signUp,
    changePassword,
    forgetPassword,
    confirmForgotPassword,
    getLoginHistories,
    getUsers,
    getUserById,
    getTransactionsByUserId,
    getLoginHistoriesByUserId,
    getReferrals
}