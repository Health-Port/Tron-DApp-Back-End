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
        [err, admin] = await utils.to(db.models.admins.findOne(
            {
                where:
                {
                    email: email
                }
            }));
        if (admin == null) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);
        if (password != admin.password)
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.PASSWORD_INCORRECT);

        //Returing successful response with data
        let data = {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            twofa_enable: admin.twofa_enable,
            //is_admin and istowfa verified.
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

        let authentication = { pass_code: passcode, user_id: admin.id };

        //Checking passcode in db
        [err, foundPasscode] = await utils.to(db.models.pass_codes.findOne(
            {
                where: { user_id: admin.id, type: 'forget' },
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
                type: 'forget'
            }));

        //Jwt token generating
        [err, token] = await utils.to(tokenGenerator.createToken(authentication));

        let url = `${process.env.BASE_URL}${process.env.RESET_PASSWOR_ROUTE}?token=${token}`;

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

module.exports = {
    signIn,
    signUp,
    forgetPassword
}