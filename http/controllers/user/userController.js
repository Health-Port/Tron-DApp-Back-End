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
const Sequelize = require('sequelize')
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

        let err, token = {}, passCode = {}, captcha = {}, user = {}, mailSent = {}, result = {}, perDayLimit = {};

        //Checking daily signup limit
        [err, result] = await await utils.to(db.models.users.count({
            where: {
                createdAt: {
                    [Sequelize.Op.gt]: new Date(new Date() - 24 * 60 * 60 * 1000),
                    //[Sequelize.Op.lt]: new Date(new Date() + 24 * 60 * 60 * 1000)
                }
            }
        }));
        [err, perDayLimit] = await utils.to(db.models.reward_conf.findOne(
            {
                where: { reward_type: rewardEnum.SIGNUPREWARD }
            }
        ))
        if (perDayLimit.max_users != null && result > perDayLimit.max_users) {
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

var geoip = require('geoip-lite');

function getIpInfo(ip) {
    // IPV6 addresses can include IPV4 addresses
    // So req.ip can be '::ffff:86.3.182.58'
    // However geoip-lite returns null for these
    if (ip.includes('::ffff:')) {
        ip = ip.split(':').reverse()[0]
    }
    var lookedUpIP = geoip.lookup(ip);
    if ((ip === '127.0.0.1'||ip == "::1")) {
        return "127.0.0.1"
    }
    if (!lookedUpIP){
        return { error: "Error occured while trying to process the information" }
    }
    console.log(lookedUpIP);
    return lookedUpIP;
}

function getIpInfoMiddleware(req) {
	var xForwardedFor = (req.headers["x-real-ip"] || '').replace(/:\d+$/, '');
	console.log("ip address with real",xForwardedFor);
    var ip = xForwardedFor || req.connection.remoteAddress;
    req.ipInfo = getIpInfo(ip);
}


async function test(req,res) {
	getIpInfoMiddleware(req);
	res.status(200).json({message:"ip get",ip: req.ipInfo})
}
async function signIn(req, res) {
    try {
        const obj = {
            'email': req.body.email,
            'password': req.body.password,
            'ip_address':req.headers["x-real-ip"],
            'captcha_key': req.body.captchaKey,
        }

        //Validating captcha only when environment is not dev
        if (process.env.NODE_ENV != 'dev') {
            [err, captcha] = await utils.to(invisibleCaptcha.validate(obj.captcha_key))
            if (err) return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INVALID_CAPTCHA)
            console.log(err, captcha)
        }

        //Checking empty email and password 
        if (!(obj.email && obj.password))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.REQUIRED_FIELDS_EMPTY)

        //Reguler expression testing for email
        if (!regex.emailRegex.test(obj.email))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INVALID_EMAIL_ADDRESS);

        //Finding record from db    
        [err, user] = await utils.to(db.models.users.findOne({ where: { email: obj.email } }))
        if (user == null) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND)
        if (!user.email_confirmed) {
            [err, passCode] = await utils.to(db.models.pass_codes.findOne(
                {
                    where: { user_id: user.id, type: 'signup' },
                    order: [['createdAt', 'DESC']]
                }));

            [err, token] = await utils.to(tokenGenerator.createToken({ email: user.email, user_id: user.id, pass_code: passCode.pass_code }))

            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.EMAIL_CONFIRMATION_REQUIRED, null, token)
        }

        //Jwt token generating
        [err, token] = await utils.to(tokenGenerator.createToken({ email: user.email, user_id: user.id }));

        //Decrypting password
        [err, passwordCheck] = await utils.to(bcrypt.compare(obj.password, user.password))
        if (!passwordCheck) return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.PASSWORD_INCORRECT)

        //Returing successful response with data
        const data = {
            role: user.role,
            name: user.name,
            user_id: user.id,
            email: user.email,
            referal_coupon: user.referal_coupon,
            wallet_address: utils.decrypt(user.tron_wallet_public_key),
            total_tokens: parseFloat(process.env.TRON_TOKEN_TOTAL_SUPPLY),
            user_totkens: await tronUtils.getTRC10TokenBalance(utils.decrypt(user.tron_wallet_private_key), utils.decrypt(user.tron_wallet_public_key)),
        }

        //Saving login history
        let loginHistory = {}
        loginHistory = {
            user_id: user.id,
            ip_address: obj.ip_address
        };

        [err, loginHistory] = await utils.to(db.models.login_histories.create(loginHistory));

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
        }

        let err, user = {}, data

        if (!obj.newEmail) {
            //Finding user record from db
            [err, user] = await utils.to(db.models.users.findOne({ where: { email: obj.email } }))
            if (user == null) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND)
            if (user.email_confirmed == true) return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.ALREADY_VERIFIED);

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

                //Checking link expiry
                if (timeDifferInMin >= parseInt(process.env.FORGETPASSWORD_LINK_EXPIRY_TIME))
                    return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.LINK_EXPIRED)
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

                        //Saving transection history into db
                        if (refRewardTrxId)
                            [err, data] = await utils.to(db.models.transections.bulkCreate([
                                { user_id: -1, address: utils.encrypt(process.env.MAIN_ACCOUNT_ADDRESS_KEY), number_of_token: amount, trx_hash: refRewardTrxId, type: 'Referal Reward' },
                                { user_id: refData.id, address: refData.tron_wallet_public_key, number_of_token: amount, trx_hash: refRewardTrxId, type: 'Referal Reward' }
                            ]))
                    }

                    //Singup
                    [err, rewardsObj] = await utils.to(db.models.reward_conf.findAll({ where: { reward_type: rewardEnum.SIGNUPREWARD } }))
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
            [err, data] = await utils.to(db.models.users.update(
                {
                    email_confirmed: true,
                    signup_reward_given: rewardGiven
                },
                { where: { email: obj.email } }))

            //Returing successful response
            return response.sendResponse(res, resCode.SUCCESS, resMessage.ACCOUNT_IS_VERIFIED)
        } else {
            [err, user] = await utils.to(db.models.users.findOne({ where: { email: obj.email } }))
            if (user == null) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.ALREADY_VERIFIED);

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

module.exports = {
    signUp,
    signIn,
    contactUs,
    verifyEmail,
    changeEmail,
    forgetPassword,
    resendLinkEmail,
	confirmForgotPassword,
	test
}