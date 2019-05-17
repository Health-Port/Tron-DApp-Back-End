const moment = require('moment')
const passcodeGenerator = require('generate-password')

const rewardEnum = require('../../../enum/rewardEnum')
const utils = require('../../../etc/utils')
const regex = require('../../../etc/regex')
const response = require('../../../etc/response')
const tronUtils = require('../../../etc/tronUtils')
const resCode = require('../../../enum/responseCodesEnum')
const tokenGenerator = require('../../../etc/generateToken')
const emailTemplates = require('../../../etc/emailTemplates')
const resMessage = require('../../../enum/responseMessagesEnum')

const db = global.healthportDb

async function signIn(req, res) {
    try {
        const obj = {
            'email': req.body.email,
            'password': req.body.password,
            'ip_address': req.headers['x-real-ip']
        }
        let err, admin = {}, token = {}, permissions = {}

        //Checking empty email and password 
        if (!(obj.email && obj.password))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.REQUIRED_FIELDS_EMPTY)

        //Reguler expression testing for email
        if (!regex.emailRegex.test(obj.email))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INVALID_EMAIL_ADDRESS);

        //Finding record from db    
        [err, admin] = await utils.to(db.models.admins.findOne({ where: { email: obj.email } }))
        if (err) return response.errReturned(res, err)
        if (admin == null || admin.length == 0) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND)
        if (obj.password != admin.password)
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.PASSWORD_INCORRECT)


        //**** //Saving login history */
        if (process.env.NODE_ENV != 'dev') {
            let loginHistory = {}
            loginHistory = {
                admin_id: admin.id,
                ip_address: obj.ip_address
            };
            [err, loginHistory] = await utils.to(db.models.admin_sessions.create(loginHistory))
            if (err) return response.errReturned(res, err)
        }
        //****Getting permissions by role id****///
        //
        //
        [err, permissions] = await utils.to(db.query(`
        select r.name roleName, f.name as featureName, r.id as roleId, f.id as featureId,
            f.parent_id as parentId, f.is_feature as isFeature, f.sequence as sequence 
            from permissions p 
            inner join features f ON p.feature_id = f.id
            inner join roles r ON r.id = p.role_id
            where p.role_id = :roleId and r.status = :status`,
            {
                replacements: { roleId: parseInt(admin.role_id), status: true },
                type: db.QueryTypes.SELECT,
            }))
        if (err) return response.errReturned(res, err)
        if (!permissions || permissions.length == 0)
            return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)

        const menuItems = []
        for (let i = 0; i < permissions.length; i++) {
            if (permissions[i].parentId == 0) {
                menuItems.push(permissions[i])
                menuItems[menuItems.length - 1].children = (permissions.filter(x => x.parentId ==
                    menuItems[menuItems.length - 1].featureId))

            } //else if (menuItems[menuItems.length - 1].featureId == permissions[i].parentId) {
            //menuItems[menuItems.length - 1].children = (permissions.filter(x => x.parentId == 
            //                                           menuItems[menuItems.length - 1].featureId))
            //i = i + menuItems[menuItems.length - 1].children.length - 1
            //}
        }
        //Returing successful response with data
        const data = {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            is_admin: admin.is_admin,
            twofa_enable: admin.twofa_enable,
            is_twofa_verified: admin.is_twofa_verified,
        };

        [err, token] = await utils.to(tokenGenerator.createToken(data))
        data.permissions = menuItems
        return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESSFULLY_LOGGEDIN, data, token)

    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

async function signUp(req, res) {
    try {
        const obj = {
            'email': req.body.email,
            'name': req.body.name,
            'password': req.body.password
        }
        let err = {}, data = {}

        //Checking empty email, password and name 
        if (!(obj.email && obj.password && obj.name))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.REQUIRED_FIELDS_EMPTY)

        //Reguler expression testing for email
        if (!regex.emailRegex.test(obj.email))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INVALID_EMAIL_ADDRESS);

        //Saving admin record in db 
        [err, data] = await utils.to(db.models.admins.create(
            {
                name: obj.name,
                email: obj.email,
                password: obj.password
            }))
        if (err) return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.USER_ALREADY_EXIST, err)

        return response.sendResponse(res, resCode.SUCCESS, resMessage.USER_ADDED_SUCCESSFULLY, data)

    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

async function forgetPassword(req, res) {
    try {
        const obj = {
            'email': req.body.email
        }

        let err, admin = {}, token = {}, foundPasscode = {}, passcodeCreateTime = {}, timeDifferInMin = {}, mailSent = {}

        const passcode = passcodeGenerator.generate({ length: 14, numbers: true })

        //Reguler expression testing for email
        if (!regex.emailRegex.test(obj.email))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.INVALID_EMAIL_ADDRESS);

        //Finding record from db
        [err, admin] = await utils.to(db.models.admins.findOne({ where: { email: obj.email } }))
        if (err) return response.errReturned(res, err)
        if (admin == null || admin.length == 0) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)

        const authentication = { pass_code: passcode, user_id: admin.id, email: admin.email };

        //Checking passcode in db
        [err, foundPasscode] = await utils.to(db.models.pass_codes.findOne(
            {
                where: { user_id: admin.id, type: 'admin forget' },
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
                user_id: admin.id,
                pass_code: passcode,
                type: 'admin forget'
            }))
        if (err) console.log(objPasscode);

        //Jwt token generating
        [err, token] = await utils.to(tokenGenerator.createToken(authentication))

        const url = `${process.env.BASE_URL_ADMIN}${process.env.RESET_PASSWOR_ROUTE}?token=${token}`;

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
            'email': req.auth.email
        }

        let err, data = {}, mailSent = {}

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
        [err, mailSent] = await utils.to(emailTemplates.passwordSuccessfullyChanged(obj.email))
        if (!mailSent) {
            console.log(err)
            return response.errReturned(res, err)
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

        let err, admin = {}, update = {}, mailSent = {}

        //Checking empty fields
        if (!(obj.adminId && obj.oldPassword && obj.newPassword))
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.REQUIRED_FIELDS_EMPTY)

        if (obj.oldPassword == obj.newPassword)
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.PASSWORD_ARE_SAME);

        //Finding record from db    
        [err, admin] = await utils.to(db.models.admins.findOne({ where: { id: obj.adminId } }))
        if (admin == null || admin.length == 0) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)

        if (obj.oldPassword != admin.password)
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.PASSWORD_INCORRECT);

        //Updading passcode
        [err, update] = await utils.to(db.models.admins.update(
            { password: obj.newPassword },
            { where: { id: obj.adminId } }
        ))
        if (!update) return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.API_ERROR);

        //Email sending
        [err, mailSent] = await utils.to(emailTemplates.passwordSuccessfullyChanged(admin.email))
        if (!mailSent) {
            console.log(err)
            return response.errReturned(res, err)
        }

        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.PASSWORD_CHANGED)

    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

async function resendLinkEmail(req, res) {
    try {
        const obj = {
            'userId': req.body.userId,
        }

        let err = {}, data = {}, foundPasscode = {}, passCode = {}, token = {}, mailSent = {};

        //Checking if user already exists
        [err, data] = await utils.to(db.models.users.findOne({ where: { id: obj.userId } }))
        if (data.email_confirmed == true)
            return response.sendResponse(res, resCode.BAD_REQUEST, resMessage.ALREADY_VERIFIED);

        //Checking passcode in db
        [err, foundPasscode] = await utils.to(db.models.pass_codes.findOne(
            {
                where: { user_id: obj.userId, type: 'signup' },
                order: [['createdAt', 'DESC']]
            }))
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
                user_id: obj.userId,
                pass_code: passcodeGenerator.generate({ length: 14, numbers: true }),
                type: 'signup'
            }));

        //Jwt token generating
        [err, token] = await utils.to(tokenGenerator.createToken({
            email: data.email, user_id: obj.userId, pass_code: passCode.pass_code
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

    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

async function sendUserResetPasswordRequest(req, res) {
    try {
        const obj = {
            'email': req.body.email
        }

        let err, user = {}, token = {}, timeDifferInMin = {}, passcodeCreateTime = {}, foundPasscode = {}, mailSent = {}

        const passcode = passcodeGenerator.generate({ length: 14, numbers: true });

        //Finding record from db
        [err, user] = await utils.to(db.models.users.findOne({ where: { email: obj.email } }))
        if (user == null || user.length == 0) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.USER_NOT_FOUND)

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
        return response.sendResponse(res, resCode.SUCCESS, 'Reset Password Request Sent Successfully!')

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
            'role': req.body.role
        }

        let err = {}, dbData
        const returnableData = {}

        //Paging
        let pageSize = parseInt(obj.pageSize)
        let pageNumber = parseInt(obj.pageNumber)
        if (!pageNumber) pageNumber = 0
        if (!pageSize) pageSize = 20
        const start = parseInt(pageNumber * pageSize)
        const end = parseInt(start + pageSize);

        [err, dbData] = await utils.to(db.query('select id, name, email, role, tron_wallet_public_key, createdAt from users order by createdAt desc',
            {
                type: db.QueryTypes.SELECT,
            }))
        if (err) return response.errReturned(res, err)

        if (dbData) {
            if (obj.role && obj.searchValue) {
                dbData = dbData.filter(x => x.role.toLowerCase() == obj.role.toLowerCase())
                dbData = dbData.filter(x => x.name.toLowerCase().includes(obj.searchValue.toLowerCase()) || x.email.toLowerCase().includes(obj.searchValue.toLowerCase()))
            } else if (obj.role) {
                dbData = dbData.filter(x => x.role.toLowerCase() == obj.role.toLowerCase())
            } else if (obj.searchValue) {
                dbData = dbData.filter(x => x.name.toLowerCase().includes(obj.searchValue.toLowerCase()) || x.email.toLowerCase().includes(obj.searchValue.toLowerCase()))
            }

            returnableData['count'] = dbData.length
            const slicedData = dbData.slice(start, end)
            returnableData['rows'] = slicedData
        }

        //Decrypting public address
        for (let i = 0; i < returnableData.rows.length; i++) {
            returnableData.rows[i].tron_wallet_public_key = utils.decrypt(returnableData.rows[i].tron_wallet_public_key)
        }

        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, returnableData)

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

        let err = {}, user = {};

        [err, user] = await utils.to(db.query(`
                        select u.id, u.email, u.role, u.tron_wallet_public_key, u.tron_wallet_private_key, 
                        l.createdAt as last_login_date, u.createdAt as account_created_date from users u
                        left join login_histories l ON u.id = l.user_id 
                        where u.id = :userId 
                        order by l.createdAt desc
                        limit 1`,
            {
                replacements: { userId: parseInt(obj.userId) },
                type: db.QueryTypes.SELECT,
            }))
        if (err) return response.errReturned(res, err)
        if (user == null || user.length == 0) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)

        const data = {
            id: user[0].id,
            email: user[0].email,
            dateCreated: user[0].account_created_date,
            lastLoginDate: user[0].last_login_date,
            publicKey: utils.decrypt(user[0].tron_wallet_public_key),
            ehrBalance: await tronUtils.getTRC10TokenBalance(utils.decrypt(user[0].tron_wallet_private_key), utils.decrypt(user[0].tron_wallet_public_key)),
            trxBalance: await tronUtils.getTrxBalance(utils.decrypt(user[0].tron_wallet_private_key), utils.decrypt(user[0].tron_wallet_public_key)),
        }

        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, data)

    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

async function listTransactions(req, res) {
    try {
        const obj = {
            'searchValue': req.body.searchValue,
            'pageNumber': req.body.pageNumber,
            'pageSize': req.body.pageSize
        }
        let err = {}, dbData = {}
        const returnableData = {}

        //Paging
        let pageSize = parseInt(obj.pageSize)
        let pageNumber = parseInt(obj.pageNumber)
        if (!pageNumber) pageNumber = 0
        if (!pageSize) pageSize = 20
        const start = parseInt(pageNumber * pageSize)
        const end = parseInt(start + pageSize);

        [err, dbData] = await utils.to(db.query(`
            select user_id, address, type, note, number_of_token, trx_hash, createdAt 
            from transections
            where user_id > 0 
            order by createdAt desc`,
            {
                type: db.QueryTypes.SELECT,
            }))
        if (err) return response.errReturned(res, err)
        if (dbData == null || dbData.length == 0) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)

        if (dbData) {
            if (obj.searchValue) {
                dbData = dbData.filter(x => x.address.includes(utils.encrypt(obj.searchValue)) || x.trx_hash.includes(obj.searchValue))
            }

            returnableData['count'] = dbData.length
            const slicedData = dbData.slice(start, end)
            returnableData['rows'] = slicedData
        }

        //Decrypting public address
        for (let i = 0; i < returnableData.rows.length; i++) {
            returnableData.rows[i].address = utils.decrypt(returnableData.rows[i].address)
        }

        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, returnableData)
    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }

}

async function getTransactionsByUserId(req, res) {
    try {
        const obj = {
            'userId': req.body.publicKey,
            'pageNumber': req.body.pageNumber,
            'pageSize': req.body.pageSize,
        }
        let err = {}, transections = {}

        //Paging
        if (!obj.pageNumber) obj.pageNumber = 0
        if (!obj.pageSize) obj.pageSize = 10
        const start = parseInt(obj.pageNumber * obj.pageSize);

        [err, transections] = await utils.to(db.models.transections.findAndCountAll(
            {
                where: [{ address: utils.encrypt(obj.userId) }],
                order: [['createdAt', 'DESC']],
                limit: obj.pageSize,
                offset: start
            }))
        if (err) return response.errReturned(res, err)
        if (transections == null || transections.count == 0 || transections == undefined)
            return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)

        //Decrypting public address
        for (let i = 0; i < transections.rows.length; i++) {
            transections.rows[i].address = utils.decrypt(transections.rows[i].address)
        }

        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, transections)

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
        let err = {}, fromDate, toDate, dbData
        const returnableData = {}

        if (obj.from && obj.to) {
            fromDate = `${obj.from.year}-${obj.from.month}-${obj.from.day}`
            fromDate = new Date(fromDate).getTime()

            toDate = `${obj.to.year}-${obj.to.month}-${obj.to.day}`
            toDate = new Date(toDate)
            toDate = new Date(
                toDate.getFullYear(),
                toDate.getMonth(),
                toDate.getDate() + 1
            )
            toDate = new Date(toDate).getTime()
        }

        //Paging
        let pageSize = parseInt(obj.pageSize)
        let pageNumber = parseInt(obj.pageNumber)
        if (!pageNumber) pageNumber = 0
        if (!pageSize) pageSize = 20
        const start = parseInt(pageNumber * pageSize)
        const end = parseInt(start + pageSize);

        [err, dbData] = await utils.to(db.query(`
                        select l.id, l.user_id, u.name, u.email, u.role, l.createdAt, l.ip_address from users u 
                        inner join login_histories l ON u.id = l.user_id 
                        order by l.createdAt Desc`,
            {
                type: db.QueryTypes.SELECT,
            }))
        if (err) return response.errReturned(res, err)

        if (dbData) {
            if ((obj.from && obj.to) && obj.searchValue) {
                dbData = dbData.filter(x => x.createdAt >= fromDate && x.createdAt <= toDate)
                dbData = dbData.filter(x => x.name.toLowerCase().includes(obj.searchValue.toLowerCase()) || x.email.toLowerCase().includes(obj.searchValue.toLowerCase()))
            } else if (obj.from && obj.to) {
                dbData = dbData.filter(x => x.createdAt >= fromDate && x.createdAt <= toDate)
            } else if (obj.searchValue) {
                dbData = dbData.filter(x => x.name.toLowerCase().includes(obj.searchValue.toLowerCase()) || x.email.toLowerCase().includes(obj.searchValue.toLowerCase()))
            }

            returnableData['count'] = dbData.length
            const slicedData = dbData.slice(start, end)
            returnableData['rows'] = slicedData
        }

        if (obj.isCsvExport) {
            if (dbData.length > 0) {
                for (let i = 0; i < dbData.length; i++) {
                    delete dbData[i].user_id
                    delete dbData[i].id
                }
            }

            if (!dbData || dbData == null || dbData.count == 0 || dbData.length == 0) {
                return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)
            }

            //Returing successful response
            return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, dbData)
        }

        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, returnableData)

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
        let err = {}, loginHistories = {}

        //Paging
        if (!obj.pageNumber) obj.pageNumber = 0
        if (!obj.pageSize) obj.pageSize = 10
        const start = parseInt(obj.pageNumber * obj.pageSize);

        [err, loginHistories] = await utils.to(db.models.login_histories.findAndCountAll(
            {
                where: [{ user_id: obj.userId }],
                order: [['createdAt', 'DESC']],
                limit: obj.pageSize,
                offset: start
            }))
        if (err) return response.errReturned(res, err)
        if (loginHistories == null || loginHistories.length == 0) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)

        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, loginHistories)

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
        let err = {}, user = {}, referrals = {}, rewardConfs = {}

        //Paging
        if (!obj.pageNumber) obj.pageNumber = 0
        if (!obj.pageSize) obj.pageSize = 10
        const start = parseInt(obj.pageNumber * obj.pageSize);

        [err, user] = await utils.to(db.models.users.findOne({ where: { id: obj.userId } }))
        if (err) return response.errReturned(res, err)
        if (user == null || user.length == 0) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND);

        [err, referrals] = await utils.to(db.models.users.findAndCountAll(
            {
                where: [{ refer_by_coupon: user.referal_coupon }],
                order: [['createdAt', 'DESC']],
                limit: obj.pageSize,
                offset: start
            }))
        if (err) return response.errReturned(res, err)
        if (referrals == null || referrals.count == 0)
            return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND);

        //[err, rewardConfs] = await utils.to(db.models.reward_conf.findOne({ where: { reward_type: 'Referral Reward' } }))
        //if (err) return response.errReturned(res, err);

        [err, rewardConfs] = await utils.to(db.models.transections.findAll(
            {
                where: { type: 'Referral Reward', user_id: user.id },
                order: [['createdAt', 'DESC']],
            }))
        if (err) return response.errReturned(res, err)

        const data = []
        let totalReward = 0
        for (let i = 0; i < referrals.rows.length; i++) {
            data[i] = {
                'id': referrals.rows[i].id,
                'email': referrals.rows[i].email,
                'channel': referrals.rows[i].refer_destination,
                'createdAt': referrals.rows[i].createdAt,
                'ehrReward': rewardConfs[i] ? parseFloat(rewardConfs[i].number_of_token) : 0
            }
            totalReward += rewardConfs[i] ? parseFloat(rewardConfs[i].number_of_token) : 0
        }

        referrals.rows = data
        referrals['totalReward'] = totalReward

        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, referrals)

    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

async function listSPRewardSettings(req, res) {
    try {

        let err = {}, spData = {};
        //Finding record from db    
        [err, spData] = await utils.to(db.models.reward_conf.findOne(
            {
                attributes: ['id', 'reward_type', 'max_amount', 'reward_per_vote', 'cron_job_status'],
                where: { reward_type: rewardEnum.SUPERREPRESENTATIVEREWARD }
            }
        ))
        if (spData == null || spData.length == 0) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)
        if (err) return response.errReturned(res, err)

        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, spData)

    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

async function updateSPRewardSettings(req, res) {
    try {
        const obj = {
            'cronJobStatus': req.body.cronJobStatus,
            'maxAmount': req.body.maxAmount,
            'rewardPerVote': req.body.rewardPerVote
        }
        let err = {}, spSettings = {}

        if (!(obj.maxAmount > 0) && !(obj.rewardPerVote > 0))
            return response.sendResponse(res, resCode.BAD_REQUEST, 'Values should be positive integers.');

        //Updading passcode
        [err, spSettings] = await utils.to(db.models.reward_conf.update(
            {
                cron_job_status: obj.cronJobStatus,
                max_amount: obj.maxAmount,
                reward_per_vote: obj.rewardPerVote
            },
            { where: { reward_type: rewardEnum.SUPERREPRESENTATIVEREWARD } }
        ))
        if (err) return response.errReturned(res, err)
        if (spSettings.length == 0) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.API_ERROR)

        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS)

    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

async function listAirdropSettings(req, res) {
    try {

        let err = {}, airdropData = {};
        //Finding record from db    
        [err, airdropData] = await utils.to(db.models.reward_conf.findOne(
            {
                attributes: ['id', 'reward_type', 'reward_amount', 'reward_end_date', 'max_users', 'cron_job_status'],
                where: { reward_type: rewardEnum.AIRDROPREWARD }
            }
        ))
        if (airdropData == null || airdropData.length == 0) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)
        if (err) return response.errReturned(res, err)

        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, airdropData)

    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

async function updateAirdropSettings(req, res) {
    try {
        const obj = {
            'cronJobStatus': req.body.cronJobStatus,
            'rewardAmount': req.body.rewardAmount,
            'maxUsers': req.body.maxUsers,
        }
        let err = {}, airdropSettings = {}

        if (!(obj.rewardAmount > 0) && !(obj.maxUsers > 0))
            return response.sendResponse(res, resCode.BAD_REQUEST, 'Values should be positive integers.');

        //Updading passcode
        [err, airdropSettings] = await utils.to(db.models.reward_conf.update(
            {
                cron_job_status: obj.cronJobStatus,
                reward_amount: obj.rewardAmount,
                max_users: obj.maxUsers
            },
            { where: { reward_type: rewardEnum.AIRDROPREWARD } }
        ))
        if (err) return response.errReturned(res, err)
        if (airdropSettings.length == 0) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.API_ERROR)

        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS)

    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

async function updateSignupLimitPerDay(req, res) {
    try {
        const obj = {
            'perDayLimit': req.body.perDayLimit
        }
        let err = {}, result = {}

        if (!(obj.perDayLimit > 0 || obj.perDayLimit == null))
            return response.sendResponse(res, resCode.NOT_FOUND, 'Values should be positive integers');

        [err, result] = await utils.to(db.models.reward_conf.findOne(
            {
                where: { reward_type: rewardEnum.SIGNUPREWARD }
            }
        ))
        if (err) return response.errReturned(res, err)
        if (!result || result == null)
            return response.sendResponse(res, resCode.NOT_FOUND, resMessage.API_ERROR);

        [err, result] = await utils.to(db.models.reward_conf.update(
            { max_users: obj.perDayLimit },
            { where: { reward_type: rewardEnum.SIGNUPREWARD } }
        ))
        if (!err && result.length > 0)
            return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS)
        return response.errReturned(res, err)

    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

async function listSignupLimitPerDay(req, res) {
    try {

        let err = {}, result = {};
        //Finding record from db    
        [err, result] = await utils.to(db.models.reward_conf.findOne(
            {
                where: { reward_type: rewardEnum.SIGNUPREWARD }
            }
        ))
        if (result == null || result.length == 0) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)
        if (err) return response.errReturned(res, err)

        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, result.max_users)

    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

async function listCommissionSettings(req, res) {
    try {

        let err = {}, result = {};
        //Finding record from db    
        [err, result] = await utils.to(db.models.commission_conf.findAll())
        if (result == null || result.length == 0) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)
        if (err) return response.errReturned(res, err)

        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, result)

    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

async function updateCommissionSettings(req, res) {
    try {
        const obj = {
            'commissionAmount': req.body.commissionAmount,
            'commissionType': req.body.commissionType,
        }
        let err = {}, commissionSettings = {}

        if (!(obj.commissionAmount > 0))
            return response.sendResponse(res, resCode.BAD_REQUEST, 'Values should be positive integers.');

        //Updading
        [err, commissionSettings] = await utils.to(db.models.commission_conf.update(
            {
                commission_amount: obj.commissionAmount,
            },
            { where: { commission_type: obj.commissionType } }
        ))
        if (err) return response.errReturned(res, err)
        if (commissionSettings.length == 0) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.API_ERROR)

        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS)

    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

async function listRewardSettings(req, res) {
    try {

        let err = {}, result = {};

        //Finding record from db    
        [err, result] = await utils.to(db.query('SELECT id, reward_type, reward_amount FROM reward_confs where id IN(1,2,3,4,5,7)',
            {
                type: db.QueryTypes.SELECT,
            }))
        if (result == null || result.length == 0) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.NO_RECORD_FOUND)
        if (err) return response.errReturned(res, err)

        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS, result)

    } catch (error) {
        console.log(error)
        return response.errReturned(res, error)
    }
}

async function updateRewardSettings(req, res) {
    try {
        const obj = {
            'rewardData': req.body.rewardData,
        }

        let err = {}, resutl = {}

        for (let i = 0; i < obj.rewardData.length; i++) {
            //Updading
            [err, resutl] = await utils.to(db.models.reward_conf.update(
                {
                    reward_amount: obj.rewardData[i].value,
                },
                { where: { id: obj.rewardData[i].id } }
            ))
        }

        if (err) return response.errReturned(res, err)
        if (resutl.length == 0) return response.sendResponse(res, resCode.NOT_FOUND, resMessage.API_ERROR)

        //Returing successful response
        return response.sendResponse(res, resCode.SUCCESS, resMessage.SUCCESS)

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
    getReferrals,
    sendUserResetPasswordRequest,
    listTransactions,
    resendLinkEmail,
    listSPRewardSettings,
    updateSPRewardSettings,
    listAirdropSettings,
    updateAirdropSettings,
    updateSignupLimitPerDay,
    listSignupLimitPerDay,
    listCommissionSettings,
    updateCommissionSettings,
    listRewardSettings,
    updateRewardSettings
}