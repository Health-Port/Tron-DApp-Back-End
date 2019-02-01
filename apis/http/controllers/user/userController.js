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
const rewardEnum = require('./../../../enum/rewardEnum');

let invisibleCaptcha = new recaptcha({
    siteKey: process.env.INVISIBLE_CAPTCHA_SITE_KEY,
    secretKey: process.env.INVISIBLE_CAPTCHA_SITE_SECRET
});

const db = global.healthportDb;

async function signUp(req, res) {
    try {
        let role = req.body.role;
        let name = req.body.name;
        let email = req.body.email;
        let is_agree = req.body.isAgree;
        let password = req.body.password;
        let captcha_key = req.body.captchaKey;
        let refer_by_coupon = req.body.referby;
        let refer_destination = req.body.destination;

        let err, user, token, account, passCode;

        //Checking terms and conditions
        if (!is_agree)
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.TERMS_CONDITIONS);

        //Validating captcha only when environment is not dev
        if (process.env.NODE_ENV != 'dev') {
            [err, captcha] = await utils.to(invisibleCaptcha.validate(captcha_key));
            if (err) return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INVALID_CAPTCHA);
            console.log(err);
        }

        //Checking empty email, password and role 
        if (!(email && password && name && role))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.REQUIRED_FIELDS_EMPTY);

        //Reguler expression testing for email
        if (!regex.emailRegex.test(email))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INVALID_EMAIL_ADDRESS);

        //Reguler expression testing for password requirements
        if (!regex.passRegex.test(password))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.PASSWORD_COMPLEXITY);

        //Encrypting password
        let passwordHash = bcrypt.hashSync(password, parseInt(process.env.SALT_ROUNDS));

        //Creating Tron Account.
        account = await tronUtils.createAccount();

        //Saving user record in db 
        [err, user] = await utils.to(db.models.users.create(
            {
                role: role,
                name: name,
                email: email,
                password: passwordHash,
                refer_by_coupon: refer_by_coupon,
                refer_destination: refer_destination ? refer_destination : 'Direct',
                tron_wallet_private_key: utils.encrypt(account.privateKey),
                tron_wallet_public_key: utils.encrypt(account.address.base58),
                referal_coupon: passcodeGenerator.generate({ length: 14, numbers: true }),
            }));
        if (err) return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.USER_ALREADY_EXIST);

        var spilt_name = name.split(' ');
        if (spilt_name.length == 2) {
            mailChimpUtil(email, spilt_name[0], spilt_name[1]);
        }
        else {
            mailChimpUtil(email, spilt_name[0], process.env.PROJECT_NAME);
        }

        //Saving passcode in db
        [err, passCode] = await utils.to(db.models.pass_codes.create(
            {
                user_id: user.id,
                pass_code: passcodeGenerator.generate({ length: 14, numbers: true }),
                type: 'signup'
            }));

        //Jwt token generating
        [err, token] = await utils.to(tokenGenerator.createToken({ email: user.email, user_id: user.id, pass_code: passCode.pass_code }));

        //Email sending
        let url = `${process.env.BASE_URL}${process.env.VERIFICATION_ROUTE}?token=${token}`;
        [err, mailSent] = await utils.to(emailTemplates.signUpTemplate(token, user.email, url, user.name));
        if (!mailSent) {
            console.log(err)
            return response.errReturned(res, err);
        }

        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.EMAIL_CONFIRMATION_REQUIRED, null, token);

    } catch (error) {
        console.log(error);
        return response.errReturned(res, error);
    }
}

async function signIn(req, res) {
    try {
        let email = req.body.email;
        let password = req.body.password;
        let captcha_key = req.body.captchaKey;

        let err, user, token, passCode;

        //Validating captcha only when environment is not dev
        if (process.env.NODE_ENV != 'dev') {
            [err, captcha] = await utils.to(invisibleCaptcha.validate(captcha_key));
            if (err) return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INVALID_CAPTCHA);
        }

        //Checking empty email and password 
        if (!(email && password))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.REQUIRED_FIELDS_EMPTY);

        //Reguler expression testing for email
        if (!regex.emailRegex.test(email))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INVALID_EMAIL_ADDRESS);

        //Finding record from db    
        [err, user] = await utils.to(db.models.users.findOne(
            {
                where:
                {
                    email: email
                }
            }));
        if (user == null) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);
        if (!user.email_confirmed) {
            [err, passCode] = await utils.to(db.models.pass_codes.findOne(
                {
                    where: { user_id: user.id, type: 'signup' },
                    order: [['createdAt', 'DESC']]
                }));

            [err, token] = await utils.to(tokenGenerator.createToken({ email: user.email, user_id: user.id, pass_code: passCode.pass_code }));

            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.EMAIL_CONFIRMATION_REQUIRED, null, token);
        }

        //Jwt token generating
        [err, token] = await utils.to(tokenGenerator.createToken({ email: user.email, user_id: user.id }));

        //Decrypting password
        [err, passwordCheck] = await utils.to(bcrypt.compare(password, user.password));
        if (!passwordCheck) return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.PASSWORD_INCORRECT);

        //Returing successful response with data
        let data = {
            role: user.role,
            name: user.name,
            user_id: user.id,
            email: user.email,
            referal_coupon: user.referal_coupon,
            wallet_address: utils.decrypt(user.tron_wallet_public_key),
            total_tokens: parseFloat(process.env.TRON_TOKEN_TOTAL_SUPPLY),
            user_totkens: await tronUtils.getTRC10TokenBalance(utils.decrypt(user.tron_wallet_private_key), utils.decrypt(user.tron_wallet_public_key)),

        };
        return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESSFULLY_LOGGEDIN, data, token);

    } catch (error) {
        console.log(error);
        return response.errReturned(res, error);
    }
}

async function forgetPassword(req, res) {
    try {
        let email = req.body.email;
        let captcha_key = req.body.captchaKey;

        let err, user, token, foundPasscode, passcodeCreateTime, timeDifferInMin, mailSent;

        let passcode = passcodeGenerator.generate({ length: 14, numbers: true });

        //Validating captcha only when environment is not dev
        if (process.env.NODE_ENV != 'dev') {
            [err, captcha] = await utils.to(invisibleCaptcha.validate(captcha_key));
            if (err) return response.sendResponse(res, respCode.BAD_REQUEST, resMessage.INVALID_CAPTCHA);
        }

        //Reguler expression testing for email
        if (!regex.emailRegex.test(email))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INVALID_EMAIL_ADDRESS);

        //Finding record from db
        [err, user] = await utils.to(db.models.users.findOne({ where: { email: email } }));
        if (user == null) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

        let authentication = { pass_code: passcode, user_id: user.id };

        //Checking passcode in db
        [err, foundPasscode] = await utils.to(db.models.pass_codes.findOne(
            {
                where: { user_id: user.id, type: 'forget' },
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
                user_id: user.id,
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

async function confirmForgotPassword(req, res) {
    try {
        let passcode = req.auth.pass_code;
        let password = req.body.password;
        let captcha_key = req.body.captchaKey;

        let err, data;

        //Validating captcha only when environment is not dev
        if (process.env.NODE_ENV != 'dev') {
            [err, captcha] = await utils.to(invisibleCaptcha.validate(captcha_key));
            if (err) return response.sendResponse(res, respCode.BAD_REQUEST, resMessage.INVALID_CAPTCHA);
        }

        //Checking empty email and password 
        if (!password)
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.REQUIRED_FIELDS_EMPTY);

        //Reguler expression testing for password requirements
        if (!regex.passRegex.test(password))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.PASSWORD_COMPLEXITY);

        //Finding record from db
        [err, data] = await utils.to(db.models.pass_codes.findOne(
            {
                where: { pass_code: passcode, type: 'forget' },
                order: [['createdAt', 'DESC']]
            }));
        if (data.is_used == true) return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.LINK_ALREADY_USED);
        if (data) {
            let passcodeCreateTime = moment(data.createdAt).format('YYYY-MM-DD HH:mm:ss');
            let now = moment().format('YYYY-MM-DD HH:mm:ss');
            let timeDifferInMin = moment(now, 'YYYY-MM-DD HH:mm:ss').diff(passcodeCreateTime, 'm');

            //Checking link expiry
            if (timeDifferInMin >= parseInt(process.env.FORGETPASSWORD_LINK_EXPIRY_TIME))
                return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.LINK_EXPIRED);
        }

        //Encrypting password
        let passwordHash = bcrypt.hashSync(password, parseInt(process.env.SALT_ROUNDS));

        //Updating password in db
        [err, result] = await utils.to(db.models.users.update(
            { password: passwordHash },
            { where: { id: data.user_id } }
        ));

        //Updading passcode
        [err, data] = await utils.to(db.models.pass_codes.update(
            { is_used: true },
            { where: { pass_code: passcode, type: 'forget' } }
        ));

        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.PASSWORD_CHANGED)

    } catch (error) {
        console.log(error);
        return response.errReturned(res, error);
    }
}

async function verifyEmail(req, res) {
    try {
        let email = req.auth.email;
        let passcode = req.auth.pass_code;
        let newEmail = req.auth.new_email;

        let err, user;
        if (!newEmail) {
            //Finding user record from db
            [err, user] = await utils.to(db.models.users.findOne({ where: { email: email } }));
            if (user == null) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);
            if (user.email_confirmed == true) return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.ALREADY_VERIFIED);

            //Finding passcode record from db
            [err, data] = await utils.to(db.models.pass_codes.findOne(
                {
                    where: { pass_code: passcode, type: 'signup' },
                    order: [['createdAt', 'DESC']]
                }));
            if (data == null) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.LINK_EXPIRED);
            if (data) {
                let passcodeCreateTime = moment(data.createdAt).format('YYYY-MM-DD HH:mm:ss');
                let now = moment().format('YYYY-MM-DD HH:mm:ss');
                let timeDifferInMin = moment(now, 'YYYY-MM-DD HH:mm:ss').diff(passcodeCreateTime, 'm');

                //Checking link expiry
                if (timeDifferInMin >= parseInt(process.env.FORGETPASSWORD_LINK_EXPIRY_TIME))
                    return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.LINK_EXPIRED);
            }

            //Reward giving
            let rewardGiven = false;
            let balance = await tronUtils.getTRC10TokenBalance(process.env.MAIN_ACCOUNT_PRIVATE_KEY, process.env.MAIN_ACCOUNT_ADDRESS_KEY);
            let bandwidth = await tronUtils.getBandwidth(process.env.MAIN_ACCOUNT_ADDRESS_KEY);
            let signupRewardTrxId, amount, refData, refRewardTrxId;

            if (bandwidth > 275) {
                if (balance >= 1000) {

                    //Referal 
                    if (user.refer_by_coupon) {
                        [err, refData] = await utils.to(db.models.users.findOne({ where: { referal_coupon: user.refer_by_coupon } }));
                        [err, rewardObj] = await utils.to(db.models.reward_conf.findOne({ where: { reward_type: rewardEnum.REFERRALREWARD } }));
                        amount = parseFloat(rewardObj.reward_amount);
                        [err, refRewardTrxId] = await utils.to(tronUtils.sendTRC10Token(utils.decrypt(refData.tron_wallet_public_key), amount, process.env.MAIN_ACCOUNT_PRIVATE_KEY));
                        if (err) {
                            return response.sendResponse(
                                res,
                                resCode.BAD_REQUEST,
                                resMessage.ACCOUNT_IS_NOT_VERIFIED
                            );
                        }

                        //Saving transection history into db
                        if (refRewardTrxId)
                            [err, obj] = await utils.to(db.models.transections.bulkCreate([
                                { user_id: refData.id, address: utils.encrypt(process.env.MAIN_ACCOUNT_ADDRESS_KEY), number_of_token: amount, trx_hash: refRewardTrxId, type: 'Referal Reward' },
                                { user_id: refData.id, address: refData.tron_wallet_public_key, number_of_token: amount, trx_hash: refRewardTrxId, type: 'Referal Reward' }
                            ]));
                    }

                    //Singup
                    // [err, usersCountResult] = await utils.to(db.models.transections.findAndCountAll({ where: { type: rewardEnum.SIGNUPREWARD } }));
                    [err, rewardsObj] = await utils.to(db.models.reward_conf.findAll({ where: { reward_type: rewardEnum.SIGNUPREWARD } }));
                    if (err) {
                        return response.sendResponse(
                            res,
                            resCode.BAD_REQUEST,
                            resMessage.ACCOUNT_IS_NOT_VERIFIED
                        );
                    }
                    if (rewardsObj && rewardsObj.length > 0) {
                        amount = parseFloat(rewardsObj[0].reward_amount);
                        [err, signupRewardTrxId] = await utils.to(tronUtils.sendTRC10Token(utils.decrypt(user.tron_wallet_public_key), amount, process.env.MAIN_ACCOUNT_PRIVATE_KEY));
                        if (err) {
                            return response.sendResponse(
                                res,
                                resCode.BAD_REQUEST,
                                resMessage.ACCOUNT_IS_NOT_VERIFIED
                            );
                        }
                    }

                    //Saving transection history into db
                    if (signupRewardTrxId) {
                        [err, obj] = await utils.to(db.models.transections.bulkCreate([
                            { user_id: user.id, address: utils.encrypt(process.env.MAIN_ACCOUNT_ADDRESS_KEY), number_of_token: amount, trx_hash: signupRewardTrxId, type: 'New Account' },
                            { user_id: user.id, address: user.tron_wallet_public_key, number_of_token: amount, trx_hash: signupRewardTrxId, type: 'New Account' }
                        ]));
                        rewardGiven = true;
                    }
                }
            }

            //Updating record in db
            [err, update] = await utils.to(db.models.users.update(
                {
                    email_confirmed: true,
                    signup_reward_given: rewardGiven
                },
                { where: { email: email } }));

            //Returing successful response
            return response.sendResponse(res, resCode.SUCCESS, resMessage.ACCOUNT_IS_VERIFIED);
        } else {
            [err, user] = await utils.to(db.models.users.findOne({ where: { email: email } }));
            if (user == null) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.ALREADY_VERIFIED);

            //Finding passcode record from db
            [err, data] = await utils.to(db.models.pass_codes.findOne(
                {
                    where: { pass_code: passcode, type: 'new email' },
                    order: [['createdAt', 'DESC']]
                }));
            if (data == null) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.LINK_EXPIRED);
            if (data.is_used) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.LINK_ALREADY_USED);
            if (data) {
                let passcodeCreateTime = moment(data.createdAt).format('YYYY-MM-DD HH:mm:ss');
                let now = moment().format('YYYY-MM-DD HH:mm:ss');
                let timeDifferInMin = moment(now, 'YYYY-MM-DD HH:mm:ss').diff(passcodeCreateTime, 'm');

                //Checking link expiry
                if (timeDifferInMin >= parseInt(process.env.FORGETPASSWORD_LINK_EXPIRY_TIME))
                    return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.LINK_EXPIRED);
            }

            //Updating email in db
            [err, result] = await utils.to(db.models.users.update(
                { email: newEmail },
                { where: { email: email } }
            ));
            if (err || !result) return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR);

            //Expiring passcode
            [err, update] = await utils.to(db.models.pass_codes.update(
                { is_used: true },
                { where: { pass_code: passcode } }
            ));

            //Returing successful response
            return response.sendResponse(res, resCode.SUCCESS, resMessage.MAIL_UPDATED);
        }
    } catch (error) {
        console.log(error)
        return response.errReturned(res, error);
    }
}

async function resendLinkEmail(req, res) {
    try {
        let passcode = req.auth.pass_code;
        let email = req.auth.email;
        let user_id = req.auth.user_id;
        let newEmail = req.auth.new_email;

        let err, data, foundPasscode;

        if (!newEmail) {
            //Checking if user already exists
            [err, data] = await utils.to(db.models.users.findOne({ where: { email: email } }));
            if (data.email_confirmed == true) return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.ALREADY_VERIFIED);

            //Checking passcode in db
            [err, foundPasscode] = await utils.to(db.models.pass_codes.findOne({ where: { pass_code: passcode, type: 'signup' } }));
            if (foundPasscode) {
                let passcodeCreateTime = moment(foundPasscode.createdAt).format('YYYY-MM-DD HH:mm:ss');
                let now = moment().format('YYYY-MM-DD HH:mm:ss');
                let timeDifferInMin = moment(now, 'YYYY-MM-DD HH:mm:ss').diff(passcodeCreateTime, 'm');

                //re-attempt allowed after 10 mintues
                if ((timeDifferInMin <= parseInt(process.env.FORGETPASSWORD_RE_ATTEMPT_TIME))) {
                    return response.sendResponse(res, resCode.BAD_REQUEST, `You Need to wait ${parseInt(process.env.FORGETPASSWORD_RE_ATTEMPT_TIME) - timeDifferInMin} minutes to avail this service again.`);
                }
            }

            //Saving passcode in db
            [err, passCode] = await utils.to(db.models.pass_codes.create(
                {
                    user_id: user_id,
                    pass_code: passcodeGenerator.generate({ length: 14, numbers: true }),
                    type: 'signup'
                }));

            //Jwt token generating
            [err, token] = await utils.to(tokenGenerator.createToken({
                email: data.email, user_id: user_id, pass_code: passCode.pass_code
            }));

            let url = `${process.env.BASE_URL}${process.env.VERIFICATION_ROUTE}?token=${token}`;

            //Email sending
            [err, mailSent] = await utils.to(emailTemplates.signUpTemplate(token, data.email, url, data.name));
            if (!mailSent) {
                console.log(err)
                return response.errReturned(res, err);
            }

            //Returing successful response
            return response.sendResponse(res, resCode.SUCCESS, resMessage.LINK_RESENT, token);
        } else {
            //Checking passcode in db
            [err, data] = await utils.to(db.models.users.findOne({ where: { email: email } }));
            [err, foundPasscode] = await utils.to(db.models.pass_codes.findOne({ where: { pass_code: passcode, type: 'new email' } }));
            if (foundPasscode) {
                let passcodeCreateTime = moment(foundPasscode.createdAt).format('YYYY-MM-DD HH:mm:ss');
                let now = moment().format('YYYY-MM-DD HH:mm:ss');
                let timeDifferInMin = moment(now, 'YYYY-MM-DD HH:mm:ss').diff(passcodeCreateTime, 'm');

                //re-attempt allowed after 10 mintues
                if ((timeDifferInMin <= parseInt(process.env.FORGETPASSWORD_RE_ATTEMPT_TIME))) {
                    return response.sendResponse(res, resCode.BAD_REQUEST, `You Need to wait ${parseInt(process.env.FORGETPASSWORD_RE_ATTEMPT_TIME) - timeDifferInMin} minutes to avail this service again.`);
                }
            }

            //Saving passcode in db
            [err, passCode] = await utils.to(db.models.pass_codes.create(
                {
                    user_id: user_id,
                    pass_code: passcodeGenerator.generate({ length: 14, numbers: true }),
                    type: 'new email'
                }));

            //Jwt token generating
            [err, token] = await utils.to(tokenGenerator.createToken({
                email: data.email, user_id: user_id, pass_code: passCode.pass_code, new_email: newEmail,
            }));

            let url = `${process.env.BASE_URL}${process.env.VERIFICATION_ROUTE}?token=${token}`;

            //Email sending
            [err, mailSent] = await utils.to(emailTemplates.signUpTemplate(token, newEmail, url, data.name));
            if (!mailSent) {
                console.log(err)
                return response.errReturned(res, err);
            }

            //Returing successful response
            return response.sendResponse(res, resCode.SUCCESS, resMessage.LINK_RESENT, token);
        }
    } catch (error) {
        console.log(error);
        return response.errReturned(res, error);
    }
}

async function contactUs(req, res) {
    try {
        let first_name = req.body.fname;
        let last_name = req.body.lname;
        let email = req.body.email;
        let phone = req.body.phone;
        let message = req.body.message;
        let captcha_key = req.body.captchaKey;

        if (process.env.NODE_ENV != 'dev') {
            [err, captcha] = await utils.to(invisibleCaptcha.validate(captcha_key));
            if (err) return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INVALID_CAPTCHA);
            console.log(err);
        }

        //Reguler expression testing for email
        if (!regex.emailRegex.test(email))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INVALID_EMAIL_ADDRESS);

        //Checking empty email and password 
        if (!(email && message))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.REQUIRED_FIELDS_EMPTY);

        //Email sending
        [err, mailSent] = await utils.to(emailTemplates.contactUsTemplate(message, email, first_name + ' ' + last_name));
        if (!mailSent) {
            console.log(err)
            return response.errReturned(res, err);
        }
        if (mailSent)
            return response.sendResponse(res, resCode.SUCCESS, resMessage.MAIL_SENT_CONTACT_US);

    } catch (error) {
        console.log(error);
        return response.errReturned(res, error);
    }
}

async function changeEmail(req, res) {
    try {
        let user_id = req.body.userId;
        let password = req.body.password;
        let new_email = req.body.newEmail;

        let err, user;
        //Checking empty email, password and role 
        if (!(user_id && password && new_email))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.REQUIRED_FIELDS_EMPTY);

        //Reguler expression testing for email
        if (!regex.emailRegex.test(new_email))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INVALID_EMAIL_ADDRESS);

        //Finding record from db    
        [err, user] = await utils.to(db.models.users.findOne({ where: { id: user_id } }));
        if (user == null) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND);

        //Same email check
        if (new_email == user.email)
            return response.sendResponse(res, resCode.NOT_FOUND, resMessage.MAIL_ALREADY_EXIST);

        //Already exists email check
        [err, mailCheck] = await utils.to(db.models.users.findAll({ where: { email: new_email } }));
        if (mailCheck.length > 0) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.MAIL_ALREADY_EXIST);

        //Decrypting password
        [err, passwordCheck] = await utils.to(bcrypt.compare(password, user.password));
        if (!passwordCheck) return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.PASSWORD_INCORRECT);

        //Passcode
        let passcode = passcodeGenerator.generate({ length: 14, numbers: true });
        [err, obj] = await utils.to(db.models.pass_codes.create(
            {
                user_id: user.id,
                pass_code: passcode,
                type: 'new email'
            }));

        //Jwt token generating
        [err, token] = await utils.to(tokenGenerator.createToken({
            email: user.email,
            user_id: user.id,
            pass_code: passcode,
            new_email: new_email,
        }));

        //Email sending
        let url = `${process.env.BASE_URL}${process.env.VERIFICATION_ROUTE}?token=${token}`;
        [err, mailSent] = await utils.to(emailTemplates.signUpTemplate(token, new_email, url, user.name));
        if (!mailSent) {
            console.log(err)
            return response.errReturned(res, err);
        }

        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.MAIL_SENT, null, token);

    } catch (error) {
        console.log(error);
        return response.errReturned(res, error);
    }
}

module.exports = {
    signUp,
    signIn,
    contactUs,
    verifyEmail,
    changeEmail,
    forgetPassword,
    resendLinkEmail,
    confirmForgotPassword,
}