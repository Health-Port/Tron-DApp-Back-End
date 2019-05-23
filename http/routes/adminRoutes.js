const router = require('express').Router()
const authorize = require('../../middlewares/authorization')
const adminController = require('../controllers/admin/adminController')
const twoFactorAuthenticationController = require('../controllers/twoFactorAuthentication/twoFactorAuthenticationController')
const dashboardController = require('../controllers/dashboard/dashboardController')
const featureController = require('../controllers/feature/featureController')
const roleController = require('../controllers/role/roleController')
const loginHistoryController = require('../controllers/loginHistory/loginHistoryController')

router.post('/signIn', adminController.signIn)
router.post('/signUp', adminController.signUp)
router.post('/forgetPassword', adminController.forgetPassword)
router.post('/forgetPassword', adminController.forgetPassword)
router.post('/changePassword', authorize.authenticateToken, adminController.changePassword)
router.post('/confirmForgotPassword', authorize.authenticateToken, adminController.confirmForgotPassword)

router.post('/requestTwoFactorAuthentication', authorize.authenticateToken, twoFactorAuthenticationController.requestTwoFactorAuthentication)
router.post('/enableDisableTwoFactorAuthentication', authorize.authenticateToken, twoFactorAuthenticationController.enableDisableTwoFactorAuthentication)
router.post('/verifyTwoFactorAuthentication', authorize.authenticateToken, twoFactorAuthenticationController.verifyTwoFactorAuthentication)

router.post('/getLoginHistories', authorize.authenticateToken, adminController.getLoginHistories)
router.post('/getUsers', authorize.authenticateToken, adminController.getUsers)
router.post('/getUserById', authorize.authenticateToken, adminController.getUserById)
router.post('/getTransactionsByUserId', authorize.authenticateToken, adminController.getTransactionsByUserId)
router.post('/getLoginHistoriesByUserId', authorize.authenticateToken, adminController.getLoginHistoriesByUserId)
router.post('/getReferrals', authorize.authenticateToken, adminController.getReferrals)
router.post('/sendUserResetPasswordRequest', authorize.authenticateToken, adminController.sendUserResetPasswordRequest)
router.post('/listTransactions', authorize.authenticateToken, adminController.listTransactions)
router.post('/resendLinkEmail', authorize.authenticateToken, adminController.resendLinkEmail)
router.post('/updateSPRewardSettings', authorize.authenticateToken, adminController.updateSPRewardSettings)
router.post('/updateAirdropSettings', authorize.authenticateToken, adminController.updateAirdropSettings)
router.post('/updateSignupLimitPerDay', authorize.authenticateToken, adminController.updateSignupLimitPerDay)
router.post('/updateCommissionSettings', authorize.authenticateToken, adminController.updateCommissionSettings)
router.post('/updateRewardSettings', authorize.authenticateToken, adminController.updateRewardSettings)

router.get('/listSPRewardSettings', authorize.authenticateToken, adminController.listSPRewardSettings)
router.get('/listAirdropSettings', authorize.authenticateToken, adminController.listAirdropSettings)
router.get('/listSignupLimitPerDay', authorize.authenticateToken, adminController.listSignupLimitPerDay)
router.get('/listCommissionSettings', authorize.authenticateToken, adminController.listCommissionSettings)
router.get('/listRewardSettings', authorize.authenticateToken, adminController.listRewardSettings)

//Dashboard Routes
router.get('/getTrxEHRBalance', authorize.authenticateToken, dashboardController.getTrxEHRBalance)
router.get('/getTotalUsersCount', authorize.authenticateToken, dashboardController.getTotalUsersCount)
router.get('/getTokensRisedByCommission', authorize.authenticateToken, dashboardController.getTokensRisedByCommission)
router.get('/getTokenDistributed', authorize.authenticateToken, dashboardController.getTokenDistributed)
router.post('/getTransactionGraphData', authorize.authenticateToken, dashboardController.getTransactionGraphData)
router.post('/getUserGraphData', authorize.authenticateToken, dashboardController.getUserGraphData)

//Admin Routes
router.post('/admins', authorize.authenticateToken, adminController.getAllAdmins)
router.get('/admins/:adminId', authorize.authenticateToken, adminController.getAdminById)
router.put('/update/status/:adminId', authorize.authenticateToken, adminController.updateAdminById)
router.put('/update/:adminId', authorize.authenticateToken, adminController.updateAdminDetailsById)
router.post('/admins/add', authorize.authenticateToken, adminController.addNewAdmin)

//Features Routes
router.post('/features/add', authorize.authenticateToken, featureController.addFeature)
router.get('/features', authorize.authenticateToken, featureController.getAllFeatures)

//Role Routes
router.post('/roles', authorize.authenticateToken, roleController.getAllRoles)
router.post('/roles/add', authorize.authenticateToken, roleController.addNewRole)
router.put('/roles/update/:roleId', authorize.authenticateToken, roleController.updateRoleById)
router.put('/roles/status/:roleId', authorize.authenticateToken, roleController.updateRoleStatusById)
router.get('/roles/active', authorize.authenticateToken, roleController.getAllActiveRoles)
router.get('/roles/:roleId', authorize.authenticateToken, roleController.getRoleByID)


//Login History Routes
router.get('/history/:adminId', authorize.authenticateToken, loginHistoryController.getLoginHistorybyAdminID)

module.exports = router