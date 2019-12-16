const bcrypt = require('bcrypt')
const moment = require('moment')
const recaptcha = require('recaptcha2')
const passcodeGenerator = require('generate-password')

const utils = require('../../../etc/utils')
const regex = require('../../../etc/regex')
const response = require('../../../etc/response')
const tronUtils = require('../../../etc/tronUtils')
const resCode = require('../../../enum/responseCodesEnum')
const tokenGenerator = require('../../../etc/generateToken')
const emailTemplates = require('../../../etc/emailTemplates')
const mailChimpUtil = require('../../../etc/mailChimpUtil')
const resMessage = require('../../../enum/responseMessagesEnum')
const rewardEnum = require('./../../../enum/rewardEnum')
const roleEnum = require('./../../../enum/roleEnum')
const Sequelize = require('sequelize')
const geoip = require('geoip-lite')

const invisibleCaptcha = new recaptcha({
    siteKey: process.env.INVISIBLE_CAPTCHA_SITE_KEY,
    secretKey: process.env.INVISIBLE_CAPTCHA_SITE_SECRET
})

const db = global.healthportDb

async function signUp(req, res) {
    try {
        const obj = {
            'role': req.body.role,
            'name': req.body.name,
            'email': req.body.email,
            'is_agree': req.body.isAgree,
            'password': req.body.password,
            'captcha_key': req.body.captchaKey,
            'refer_by_coupon': req.body.referby,
            'refer_destination': req.body.destination
        }
        const domain_name = obj.email.split("@");
        let err, token = {}, passCode = {}, captcha = {}, user = {}, mailSent = {}, result = {}, perDayLimit = {}, dumpableEmail = {};

        let currentDate = new Date()
        currentDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate()
        );
        //check dumpable email
        [err, dumpableEmail] = await utils.to(db.models.dumpable_emails.findOne(
            {
                where: { domain_name: domain_name[1] }
            }
        ))
        if (dumpableEmail) {
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INVALID_EMAIL_ADDRESS)
        }

        //Checking daily signup limit
        [err, result] = await await utils.to(db.models.users.count({
            where: {
                createdAt: {
                    [Sequelize.Op.gt]: currentDate //new Date(new Date() - 24 * 60 * 60 * 1000),
                }
            }
        }));
        [err, perDayLimit] = await utils.to(db.models.reward_conf.findOne(
            {
                where: { reward_type: rewardEnum.SIGNUPREWARD }
            }
        ))
        if (perDayLimit.max_users != null && result >= perDayLimit.max_users) {
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.SIGNUP_LIMIT)
        }

        //Checking terms and conditions
        if (!obj.is_agree)
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.TERMS_CONDITIONS)

        //Validating captcha only when environment is not dev
        if (process.env.NODE_ENV != 'dev') {
            [err, captcha] = await utils.to(invisibleCaptcha.validate(obj.captcha_key))
            if (err) return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INVALID_CAPTCHA)
            console.log(err, captcha)
        }

        //Checking empty email, password and role 
        if (!(obj.email && obj.password && obj.name && obj.role))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.REQUIRED_FIELDS_EMPTY)

        //Reguler expression testing for email
        if (!regex.emailRegex.test(obj.email))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INVALID_EMAIL_ADDRESS)

        //Reguler expression testing for password requirements
        if (!regex.passRegex.test(obj.password))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.PASSWORD_COMPLEXITY)

        //Encrypting password
        const passwordHash = bcrypt.hashSync(obj.password, parseInt(process.env.SALT_ROUNDS))

        //Creating Tron Account.
        const account = await tronUtils.createAccount();

        //Saving user record in db
        [err, user] = await utils.to(db.models.users.create(
            {
                role: obj.role,
                name: obj.name,
                email: obj.email,
                password: passwordHash,
                refer_by_coupon: obj.refer_by_coupon,
                refer_destination: obj.refer_destination ? obj.refer_destination : 'Direct',
                tron_wallet_private_key: utils.encrypt(account.privateKey),
                tron_wallet_public_key: utils.encrypt(account.address.base58),
                tron_wallet_public_key_hex: utils.encrypt(account.publicKey),
                referal_coupon: passcodeGenerator.generate({ length: 14, numbers: true }),
            }))
        if (err) return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.USER_ALREADY_EXIST)

        const spilt_name = obj.name.split(' ')
        if (spilt_name.length == 2) {
            mailChimpUtil(obj.email, spilt_name[0], spilt_name[1])
        }
        else {
            mailChimpUtil(obj.email, spilt_name[0], process.env.PROJECT_NAME)
        }

        //Saving passcode in db
        [err, passCode] = await utils.to(db.models.pass_codes.create(
            {
                user_id: user.id,
                pass_code: passcodeGenerator.generate({ length: 14, numbers: true }),
                type: 'signup'
            }));

        //Jwt token generating
        [err, token] = await utils.to(tokenGenerator.createToken({ email: user.email, user_id: user.id, pass_code: passCode.pass_code }))

        //Email sending
        const url = `${process.env.BASE_URL}${process.env.VERIFICATION_ROUTE}?token=${token}`;
        [err, mailSent] = await utils.to(emailTemplates.signUpTemplate(token, user.email, url, user.name))
        if (!mailSent) {
            console.log(err)
            return response.errReturned(res, err)
        }

        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.EMAIL_CONFIRMATION_REQUIRED, null, token)


    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

async function signIn(req, res) {
    try {
        const obj = {
            'email': req.body.email,
            'password': req.body.password,
            'ip_address': req.headers["x-real-ip"],
            'captcha_key': req.body.captchaKey,
        }

        //Validating captcha only when environment is not dev
        if (process.env.NODE_ENV != 'dev') {
            [err, captcha] = await utils.to(invisibleCaptcha.validate(obj.captcha_key))
            if (err) return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INVALID_CAPTCHA)
        }

        //Checking empty email and password 
        if (!(obj.email && obj.password))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.REQUIRED_FIELDS_EMPTY)

        //Reguler expression testing for email
        if (!regex.emailRegex.test(obj.email))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INVALID_EMAIL_ADDRESS);

        //Finding record from db    
        [err, user] = await utils.to(db.models.users.findOne({ where: { email: obj.email } }))
        if (user == null)
            return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND)
        if (!user.status)
            return response.sendResponse(res, resCode.UNAUTHORIZED, resMessage.USER_IS_BLOCKED)
        if (!user.password)
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.CHECK_YOUR_EMAIL)
        if (!user.email_confirmed) {
            [err, passCode] = await utils.to(db.models.pass_codes.findOne(
                {
                    where: { user_id: user.id, type: 'signup' },
                    order: [['createdAt', 'DESC']]
                }));

            [err, token] = await utils.to(tokenGenerator.createToken(
                {
                    email: user.email,
                    user_id: user.id,
                    pass_code: passCode.pass_code
                }))

            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.EMAIL_CONFIRMATION_REQUIRED, null, token)
        }

        //Jwt token generating
        [err, token] = await utils.to(tokenGenerator.createToken({ email: user.email, user_id: user.id }));

        //Decrypting password
        [err, passwordCheck] = await utils.to(bcrypt.compare(obj.password, user.password))
        if (!passwordCheck)
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.PASSWORD_INCORRECT)

        //Returing successful response with data
        const data = {
            role: user.role,
            name: user.name,
            user_id: user.id,
            email: user.email,
            referal_coupon: user.referal_coupon,
            twofa_enable: user.is_twofa_enable,
            is_twofa_verified: user.is_twofa_verified,
            wallet_address: utils.decrypt(user.tron_wallet_public_key),
            public_key_hex: user.tron_wallet_public_key_hex ?
                utils.decrypt(user.tron_wallet_public_key_hex) : '',
            total_tokens: parseFloat(process.env.TRON_TOKEN_TOTAL_SUPPLY),
            user_totkens: await tronUtils.getTRC10TokenBalance(utils.decrypt(user.tron_wallet_private_key), utils.decrypt(user.tron_wallet_public_key)),
        }

        //Saving login history
        if (process.env.NODE_ENV != 'dev') {
            let loginHistory = {}
            loginHistory = {
                user_id: user.id,
                ip_address: obj.ip_address
            };
            [err, loginHistory] = await utils.to(db.models.login_histories.create(loginHistory));
            if (err) return response.errReturned(res, err)
        }
        return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESSFULLY_LOGGEDIN, data, token)

    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

async function forgetPassword(req, res) {
    try {
        const obj = {
            'email': req.body.email,
            'captcha_key': req.body.captchaKey
        }

        let err, user = {}, token = {}, timeDifferInMin = {}, captcha = {}, passcodeCreateTime = {}, foundPasscode = {}, mailSent = {}

        const passcode = passcodeGenerator.generate({ length: 14, numbers: true })

        //Validating captcha only when environment is not dev
        if (process.env.NODE_ENV != 'dev') {
            [err, captcha] = await utils.to(invisibleCaptcha.validate(obj.captcha_key))
            if (err) return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INVALID_CAPTCHA)
            console.log(err, captcha)
        }

        //Reguler expression testing for email
        if (!regex.emailRegex.test(obj.email))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INVALID_EMAIL_ADDRESS);

        //Finding record from db
        [err, user] = await utils.to(db.models.users.findOne({ where: { email: obj.email } }))
        if (user == null) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND)

        const authentication = { pass_code: passcode, user_id: user.id };

        //Checking passcode in db
        [err, foundPasscode] = await utils.to(db.models.pass_codes.findOne(
            {
                where: { user_id: user.id, type: 'forget' },
                order: [['createdAt', 'DESC']]
            }))
        if (foundPasscode) {
            passcodeCreateTime = moment(foundPasscode.createdAt).format('YYYY-MM-DD HH:mm:ss')
            const now = moment().format('YYYY-MM-DD HH:mm:ss')
            timeDifferInMin = moment(now, 'YYYY-MM-DD HH:mm:ss').diff(passcodeCreateTime, 'm')

            //re-attempt allowed after 10 mintues
            if (!(timeDifferInMin >= parseInt(process.env.FORGETPASSWORD_RE_ATTEMPT_TIME))) {
                return response.sendResponse(res, resCode.BAD_REQUEST, `You Need to wait ${parseInt(process.env.FORGETPASSWORD_RE_ATTEMPT_TIME) - timeDifferInMin} minutes to avail this service again.`)
            }
        }

        //Saving passcode in db
        let objPasscode = {};
        [err, objPasscode] = await utils.to(db.models.pass_codes.create(
            {
                user_id: user.id,
                pass_code: passcode,
                type: 'forget'
            }))
        if (err) console.log(objPasscode);

        //Jwt token generating
        [err, token] = await utils.to(tokenGenerator.createToken(authentication))

        const url = `${process.env.BASE_URL}${process.env.RESET_PASSWOR_ROUTE}?token=${token}`;

        //Email sending
        [err, mailSent] = await utils.to(emailTemplates.forgetPasswordTemplate(token, obj.email, url))
        if (!mailSent) {
            console.log(err)
            return response.errReturned(res, err)
        }

        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.MAIL_SENT)

    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

async function confirmForgotPassword(req, res) {
    try {
        const obj = {
            'passcode': req.auth.pass_code,
            'password': req.body.password,
            'captcha_key': req.body.captchaKey,
        }

        let err, data = {}, captcha = {}

        //Validating captcha only when environment is not dev
        if (process.env.NODE_ENV != 'dev') {
            [err, captcha] = await utils.to(invisibleCaptcha.validate(obj.captcha_key))
            if (err) return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INVALID_CAPTCHA)
            console.log(err, captcha)
        }

        //Checking empty email and password 
        if (!obj.password)
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.REQUIRED_FIELDS_EMPTY)

        //Reguler expression testing for password requirements
        if (!regex.passRegex.test(obj.password))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.PASSWORD_COMPLEXITY);

        //Finding record from db
        [err, data] = await utils.to(db.models.pass_codes.findOne(
            {
                where: { pass_code: obj.passcode, type: 'forget' },
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
        const passwordHash = bcrypt.hashSync(obj.password, parseInt(process.env.SALT_ROUNDS));

        //Updating password in db
        [err, data] = await utils.to(db.models.users.update(
            { password: passwordHash },
            { where: { id: data.user_id } }
        ));

        //Updading passcode
        [err, data] = await utils.to(db.models.pass_codes.update(
            { is_used: true },
            { where: { pass_code: obj.passcode, type: 'forget' } }
        ))

        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.PASSWORD_CHANGED)

    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

async function verifyEmail(req, res) {
    try {
        const obj = {
            'email': req.auth.email,
            'passcode': req.auth.pass_code,
            'newEmail': req.auth.new_email,
            'password': req.body.password
        }

        let err, user = {}, data

        //Only if when account was created by provider.
        if (req.auth.set_password) {
            //Checking empty email
            if (!obj.password) {
                return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.REQUIRED_FIELDS_EMPTY)
            }
            //Reguler expression testing for password requirements
            if (!regex.passRegex.test(obj.password))
                return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.PASSWORD_COMPLEXITY)
        }

        if (!obj.newEmail) {
            //Finding user record from db
            [err, user] = await utils.to(db.models.users.findOne({ where: { email: obj.email } }))
            if (user == null)
                return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND)
            if (user.email_confirmed == true)
                return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.ALREADY_VERIFIED);

            //Finding passcode record from db
            [err, data] = await utils.to(db.models.pass_codes.findOne(
                {
                    where: { pass_code: obj.passcode, type: 'signup' },
                    order: [['createdAt', 'DESC']]
                }))
            if (data == null) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.LINK_EXPIRED)
            if (data) {
                const passcodeCreateTime = moment(data.createdAt).format('YYYY-MM-DD HH:mm:ss')
                const now = moment().format('YYYY-MM-DD HH:mm:ss')
                const timeDifferInMin = moment(now, 'YYYY-MM-DD HH:mm:ss').diff(passcodeCreateTime, 'm')

                if (!obj.password) {
                    //Checking link expiry
                    if (timeDifferInMin >= parseInt(process.env.FORGETPASSWORD_LINK_EXPIRY_TIME))
                        return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.LINK_EXPIRED)
                }
            }

            //Reward giving
            let rewardGiven = false
            const balance = await tronUtils.getTRC10TokenBalance(process.env.MAIN_ACCOUNT_PRIVATE_KEY, process.env.MAIN_ACCOUNT_ADDRESS_KEY)
            const bandwidth = await tronUtils.getBandwidth(process.env.MAIN_ACCOUNT_ADDRESS_KEY)
            let signupRewardTrxId, amount, refData, refRewardTrxId, rewardObj, rewardsObj

            if (bandwidth > 275) {
                if (balance >= 1000) {

                    //Referal 
                    if (user.refer_by_coupon) {
                        [err, refData] = await utils.to(db.models.users.findOne({ where: { referal_coupon: user.refer_by_coupon } }));
                        [err, rewardObj] = await utils.to(db.models.reward_conf.findOne({ where: { reward_type: rewardEnum.REFERRALREWARD } }))
                        amount = parseFloat(rewardObj.reward_amount);
                        [err, refRewardTrxId] = await utils.to(tronUtils.sendTRC10Token(utils.decrypt(refData.tron_wallet_public_key), amount, process.env.MAIN_ACCOUNT_PRIVATE_KEY))
                        if (err) {
                            return response.sendResponse(
                                res,
                                resCode.BAD_REQUEST,
                                resMessage.ACCOUNT_IS_NOT_VERIFIED
                            )
                        }
                        //Send Nofication After Transactions 
                        let slackMessage = `Reward - EHR ${amount} reward was sent to account ${user.email}. Transaction Hash: ${refRewardTrxId}`
                        const slackResult = utils.sendTransactinNotification(slackMessage);

                        //Saving transection history into db
                        if (refRewardTrxId)
                            [err, data] = await utils.to(db.models.transections.bulkCreate([
                                { user_id: -1, address: utils.encrypt(process.env.MAIN_ACCOUNT_ADDRESS_KEY), number_of_token: amount, trx_hash: refRewardTrxId, type: 'Referral Reward' },
                                { user_id: refData.id, address: refData.tron_wallet_public_key, number_of_token: amount, trx_hash: refRewardTrxId, type: 'Referral Reward' }
                            ]))
                    }

                    //Singup (patient or provider)
                    if (user.role == roleEnum.PATIENT)
                        [err, rewardsObj] = await utils.to(db.models.reward_conf.findAll({ where: { reward_type: rewardEnum.SIGNUPREWARD } }))
                    else
                        [err, rewardsObj] = await utils.to(db.models.reward_conf.findAll({ where: { reward_type: rewardEnum.SIGNUPREWARDFORPROVIDER } }))
                    if (err) {
                        return response.sendResponse(
                            res,
                            resCode.BAD_REQUEST,
                            resMessage.ACCOUNT_IS_NOT_VERIFIED
                        )
                    }
                    if (rewardsObj && rewardsObj.length > 0) {
                        amount = parseFloat(rewardsObj[0].reward_amount);
                        [err, signupRewardTrxId] = await utils.to(tronUtils.sendTRC10Token(utils.decrypt(user.tron_wallet_public_key), amount, process.env.MAIN_ACCOUNT_PRIVATE_KEY))
                        if (err) {
                            return response.sendResponse(
                                res,
                                resCode.BAD_REQUEST,
                                resMessage.ACCOUNT_IS_NOT_VERIFIED
                            )
                        }
                        //Send Nofication After Transactions 
                        let slackMessage = `Reward - EHR ${amount} reward was sent to account ${user.email}. Transaction Hash: ${refRewardTrxId}`
                        const slackResult = utils.sendTransactinNotification(slackMessage);
                    }

                    //Saving transection history into db
                    if (signupRewardTrxId) {
                        [err, data] = await utils.to(db.models.transections.bulkCreate([
                            { user_id: -1, address: utils.encrypt(process.env.MAIN_ACCOUNT_ADDRESS_KEY), number_of_token: amount, trx_hash: signupRewardTrxId, type: 'New Account' },
                            { user_id: user.id, address: user.tron_wallet_public_key, number_of_token: amount, trx_hash: signupRewardTrxId, type: 'New Account' }
                        ]))
                        rewardGiven = true
                    }
                }
            }

            //Updating record in db
            [err, data] = await utils.to(db.models.users.update({
                email_confirmed: true,
                password: obj.password ? bcrypt.hashSync(obj.password, parseInt(process.env.SALT_ROUNDS)) : user.password,
                signup_reward_given: rewardGiven
            },
                { where: { email: obj.email } }))

            //Returing successful response
            if (req.auth.set_password)
                return response.sendResponse(res, resCode.SUCCESS, resMessage.PASSWORD_UPDATED)

            return response.sendResponse(res, resCode.SUCCESS, resMessage.ACCOUNT_IS_VERIFIED)
        } else {
            [err, user] = await utils.to(db.models.users.findOne({ where: { email: obj.email } }))
            if (user == null)
                return response.sendResponse(res, resCode.NOT_FOUND, resMessage.ALREADY_VERIFIED);

            //Finding passcode record from db
            [err, data] = await utils.to(db.models.pass_codes.findOne(
                {
                    where: { pass_code: obj.passcode, type: 'new email' },
                    order: [['createdAt', 'DESC']]
                }))
            if (data == null) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.LINK_EXPIRED)
            if (data.is_used) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.LINK_ALREADY_USED)
            if (data) {
                const passcodeCreateTime = moment(data.createdAt).format('YYYY-MM-DD HH:mm:ss')
                const now = moment().format('YYYY-MM-DD HH:mm:ss')
                const timeDifferInMin = moment(now, 'YYYY-MM-DD HH:mm:ss').diff(passcodeCreateTime, 'm')

                //Checking link expiry
                if (timeDifferInMin >= parseInt(process.env.FORGETPASSWORD_LINK_EXPIRY_TIME))
                    return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.LINK_EXPIRED)
            }

            //Updating email in db
            [err, data] = await utils.to(db.models.users.update(
                { email: obj.newEmail },
                { where: { email: obj.email } }
            ))
            if (err || !data)
                return response.sendResponse(res, resCode.INTERNAL_SERVER_ERROR, resMessage.API_ERROR);

            //Expiring passcode
            [err, data] = await utils.to(db.models.pass_codes.update(
                { is_used: true },
                { where: { pass_code: obj.passcode } }
            ))

            //Returing successful response
            return response.sendResponse(res, resCode.SUCCESS, resMessage.MAIL_UPDATED)
        }
    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

async function resendLinkEmail(req, res) {
    try {
        const obj = {
            'passcode': req.auth.pass_code,
            'email': req.auth.email,
            'user_id': req.auth.user_id,
            'newEmail': req.auth.new_email,
        }

        let err, data, foundPasscode, passCode, token, mailSent

        if (!obj.newEmail) {
            //Checking if user already exists
            [err, data] = await utils.to(db.models.users.findOne({ where: { email: obj.email } }))
            if (data.email_confirmed == true)
                return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.ALREADY_VERIFIED);

            //Checking passcode in db
            [err, foundPasscode] = await utils.to(db.models.pass_codes.findOne({ where: { pass_code: obj.passcode, type: 'signup' } }))
            if (foundPasscode) {
                const passcodeCreateTime = moment(foundPasscode.createdAt).format('YYYY-MM-DD HH:mm:ss')
                const now = moment().format('YYYY-MM-DD HH:mm:ss')
                const timeDifferInMin = moment(now, 'YYYY-MM-DD HH:mm:ss').diff(passcodeCreateTime, 'm')

                //re-attempt allowed after 10 mintues
                if ((timeDifferInMin <= parseInt(process.env.FORGETPASSWORD_RE_ATTEMPT_TIME))) {
                    return response.sendResponse(res, resCode.BAD_REQUEST, `You Need to wait ${parseInt(process.env.FORGETPASSWORD_RE_ATTEMPT_TIME) - timeDifferInMin} minutes to avail this service again.`)
                }
            }

            //Saving passcode in db
            [err, passCode] = await utils.to(db.models.pass_codes.create(
                {
                    user_id: obj.user_id,
                    pass_code: passcodeGenerator.generate({ length: 14, numbers: true }),
                    type: 'signup'
                }));

            //Jwt token generating
            [err, token] = await utils.to(tokenGenerator.createToken({
                email: data.email, user_id: obj.user_id, pass_code: passCode.pass_code
            }))

            const url = `${process.env.BASE_URL}${process.env.VERIFICATION_ROUTE}?token=${token}`;

            //Email sending
            [err, mailSent] = await utils.to(emailTemplates.signUpTemplate(token, data.email, url, data.name))
            if (!mailSent) {
                console.log(err)
                return response.errReturned(res, err)
            }

            //Returing successful response
            return response.sendResponse(res, resCode.SUCCESS, resMessage.LINK_RESENT, token)
        } else {
            //Checking passcode in db
            [err, data] = await utils.to(db.models.users.findOne({ where: { email: obj.email } }));
            [err, foundPasscode] = await utils.to(db.models.pass_codes.findOne({ where: { pass_code: obj.passcode, type: 'new email' } }))
            if (foundPasscode) {
                const passcodeCreateTime = moment(foundPasscode.createdAt).format('YYYY-MM-DD HH:mm:ss')
                const now = moment().format('YYYY-MM-DD HH:mm:ss')
                const timeDifferInMin = moment(now, 'YYYY-MM-DD HH:mm:ss').diff(passcodeCreateTime, 'm')

                //re-attempt allowed after 10 mintues
                if ((timeDifferInMin <= parseInt(process.env.FORGETPASSWORD_RE_ATTEMPT_TIME))) {
                    return response.sendResponse(res, resCode.BAD_REQUEST, `You Need to wait ${parseInt(process.env.FORGETPASSWORD_RE_ATTEMPT_TIME) - timeDifferInMin} minutes to avail this service again.`)
                }
            }

            //Saving passcode in db
            [err, passCode] = await utils.to(db.models.pass_codes.create(
                {
                    user_id: obj.user_id,
                    pass_code: passcodeGenerator.generate({ length: 14, numbers: true }),
                    type: 'new email'
                }));

            //Jwt token generating
            [err, token] = await utils.to(tokenGenerator.createToken({
                email: data.email, user_id: obj.user_id, pass_code: passCode.pass_code, new_email: obj.newEmail,
            }))

            const url = `${process.env.BASE_URL}${process.env.VERIFICATION_ROUTE}?token=${token}`;

            //Email sending
            [err, mailSent] = await utils.to(emailTemplates.signUpTemplate(token, obj.newEmail, url, data.name))
            if (!mailSent) {
                console.log(err)
                return response.errReturned(res, err)
            }

            //Returing successful response
            return response.sendResponse(res, resCode.SUCCESS, resMessage.LINK_RESENT, token)
        }
    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

async function contactUs(req, res) {
    try {
        const obj = {
            first_name: req.body.fname,
            last_name: req.body.lname,
            email: req.body.email,
            message: req.body.message,
            captcha_key: req.body.captchaKey,
        }

        let err, mailSent = {}, captcha = {}

        if (process.env.NODE_ENV != 'dev') {
            [err, captcha] = await utils.to(invisibleCaptcha.validate(obj.captcha_key))
            if (err) return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INVALID_CAPTCHA)
            console.log(err, captcha)
        }

        //Reguler expression testing for email
        if (!regex.emailRegex.test(obj.email))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INVALID_EMAIL_ADDRESS)

        //Checking empty email and password 
        if (!(obj.email && obj.message))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.REQUIRED_FIELDS_EMPTY);

        //Email sending
        [err, mailSent] = await utils.to(emailTemplates.contactUsTemplate(obj.message, obj.email, `${obj.first_name} ${obj.last_name}`))
        if (!mailSent) {
            console.log(err)
            return response.errReturned(res, err)
        }
        if (mailSent)
            return response.sendResponse(res, resCode.SUCCESS, resMessage.MAIL_SENT_CONTACT_US)

    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

async function changeEmail(req, res) {
    try {
        const obj = {
            'user_id': req.body.userId,
            'password': req.body.password,
            'new_email': req.body.newEmail,
        }

        let err, user = {}, mailCheck = {}, passwordCheck = {}, objPasscode = {}, token = {}, mailSent = {}

        //Checking empty email, password and role 
        if (!(obj.user_id && obj.password && obj.new_email))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.REQUIRED_FIELDS_EMPTY)

        //Reguler expression testing for email
        if (!regex.emailRegex.test(obj.new_email))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INVALID_EMAIL_ADDRESS);

        //Finding record from db    
        [err, user] = await utils.to(db.models.users.findOne({ where: { id: obj.user_id } }))
        if (user == null) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND)

        //Same email check
        if (obj.new_email == user.email)
            return response.sendResponse(res, resCode.NOT_FOUND, resMessage.MAIL_ALREADY_EXIST);

        //Already exists email check
        [err, mailCheck] = await utils.to(db.models.users.findAll({ where: { email: obj.new_email } }))
        if (mailCheck.length > 0) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.MAIL_ALREADY_EXIST);

        //Decrypting password
        [err, passwordCheck] = await utils.to(bcrypt.compare(obj.password, user.password))
        if (!passwordCheck) return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.PASSWORD_INCORRECT)

        //Passcode
        const passcode = passcodeGenerator.generate({ length: 14, numbers: true });
        [err, objPasscode] = await utils.to(db.models.pass_codes.create(
            {
                user_id: user.id,
                pass_code: passcode,
                type: 'new email'
            }))
        console.log(objPasscode);

        //Jwt token generating
        [err, token] = await utils.to(tokenGenerator.createToken({
            email: user.email,
            user_id: user.id,
            pass_code: passcode,
            new_email: obj.new_email
        }))

        //Email sending
        const url = `${process.env.BASE_URL}${process.env.VERIFICATION_ROUTE}?token=${token}`;
        [err, mailSent] = await utils.to(emailTemplates.signUpTemplate(token, obj.new_email, url, user.name))
        if (!mailSent) {
            console.log(err)
            return response.errReturned(res, err)
        }

        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.MAIL_SENT, null, token)

    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

async function getPrivateKey(req, res) {
    try {
        const { address } = req.params
        const userId = req.auth.user_id
        let err = {}, user = {}, mailSent = {};

        //Finding record from db    
        [err, user] = await utils.to(db.models.users.findOne({ where: { id: userId } }))
        if (user == null) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND)
        if (err) return response.errReturned(res, err)

        //Decripting public and private keys
        user.tron_wallet_public_key = utils.decrypt(user.tron_wallet_public_key)
        user.tron_wallet_private_key = utils.decrypt(user.tron_wallet_private_key);

        //HP-489
        if (address && address != user.tron_wallet_public_key)
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INVALID_TO_ADDRESS)

        if (address) {
            return response.sendResponse(
                res,
                resCode.SUCCESS,
                resMessage.SUCCESS,
                { privateKey: user.tron_wallet_private_key }
            );
        }

        //Email sending
        [err, mailSent] = await utils.to(emailTemplates.sendPrivateKey(user))
        if (!mailSent) {
            return response.errReturned(res, err)
        }

        //Returing successful response
        if (mailSent)
            return response.sendResponse(res, resCode.SUCCESS, resMessage.MAIL_SENT)

    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

module.exports = {
    signUp,
    signIn,
    contactUs,
    verifyEmail,
    changeEmail,
    getPrivateKey,
    forgetPassword,
    resendLinkEmail,
    confirmForgotPassword
}