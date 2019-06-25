const router = require('express').Router()
const authorize = require('../../middlewares/authorization')
const adminController = require('../controllers/admin/adminController')
const twoFactorAuthenticationController = require('../controllers/twoFactorAuthentication/twoFactorAuthenticationController')
const dashboardController = require('../controllers/dashboard/dashboardController')
const featureController = require('../controllers/feature/featureController')
const roleController = require('../controllers/role/roleController')
const loginHistoryController = require('../controllers/loginHistory/loginHistoryController')
const attributeListController = require('../controllers/attributeList/attributeListController')

router.post('/signIn', adminController.signIn)
router.post('/signUp', adminController.signUp)
router.post('/forgetPassword', adminController.forgetPassword)
router.post('/forgetPassword', adminController.forgetPassword)
router.post('/changePassword', authorize.authenticateToken, adminController.changePassword)
router.post('/confirmForgotPassword', authorize.authenticateToken, adminController.confirmForgotPassword)

//TwoFactorAuthentication Routes
router.post('/requestTwoFactorAuthentication', authorize.authenticateToken, twoFactorAuthenticationController.requestTwoFactorAuthentication)
router.post('/enableDisableTwoFactorAuthentication', authorize.authenticateToken, twoFactorAuthenticationController.enableDisableTwoFactorAuthentication)
router.post('/verifyTwoFactorAuthentication', authorize.authenticateToken, twoFactorAuthenticationController.verifyTwoFactorAuthentication)

//User related Routes
router.post('/getUsers', authorize.authenticateRole, authorize.authenticateToken, adminController.getUsers)
router.post('/getUserById', authorize.authenticateRole, authorize.authenticateToken, adminController.getUserById)
router.post('/getTransactionsByUserId', authorize.authenticateToken, adminController.getTransactionsByUserId)
router.post('/getLoginHistoriesByUserId', authorize.authenticateToken, adminController.getLoginHistoriesByUserId)
router.put('/status/:userId', authorize.authenticateRole, authorize.authenticateToken, adminController.updateUserById)

router.post('/getLoginHistories', authorize.authenticateToken, adminController.getLoginHistories)
router.post('/getReferrals', authorize.authenticateToken, adminController.getReferrals)
router.post('/sendUserResetPasswordRequest', authorize.authenticateToken, adminController.sendUserResetPasswordRequest)
router.post('/listTransactions', authorize.authenticateToken, adminController.listTransactions)
router.post('/resendLinkEmail', authorize.authenticateToken, adminController.resendLinkEmail)
router.post('/updateSPRewardSettings', authorize.authenticateToken, adminController.updateSPRewardSettings)
router.post('/updateAirdropSettings', authorize.authenticateToken, adminController.updateAirdropSettings)
router.post('/updateSignupLimitPerDay', authorize.authenticateToken, adminController.updateSignupLimitPerDay)
router.post('/updateCommissionSettings', authorize.authenticateToken, adminController.updateCommissionSettings)
router.post('/updateRewardSettings', authorize.authenticateToken, adminController.updateRewardSettings)

router.get('/listSPRewardSettings', authorize.authenticateRole,authorize.authenticateToken, adminController.listSPRewardSettings)
router.get('/listAirdropSettings', authorize.authenticateRole,authorize.authenticateToken, adminController.listAirdropSettings)
router.get('/listSignupLimitPerDay', authorize.authenticateRole,authorize.authenticateToken, adminController.listSignupLimitPerDay)
router.get('/listCommissionSettings', authorize.authenticateRole,authorize.authenticateToken, adminController.listCommissionSettings)
router.get('/listRewardSettings', authorize.authenticateRole,authorize.authenticateToken, adminController.listRewardSettings)

//Dashboard Routes
router.get('/getTrxEHRBalance', authorize.authenticateRole, authorize.authenticateToken, dashboardController.getTrxEHRBalance)
router.get('/getTotalUsersCount', authorize.authenticateRole, authorize.authenticateToken, dashboardController.getTotalUsersCount)
router.get('/getTokensRisedByCommission', authorize.authenticateRole, authorize.authenticateToken, dashboardController.getTokensRisedByCommission)
router.get('/getTokenDistributed', authorize.authenticateRole, authorize.authenticateToken, dashboardController.getTokenDistributed)
router.post('/getTransactionGraphData', authorize.authenticateRole, authorize.authenticateToken, dashboardController.getTransactionGraphData)
router.post('/getUserGraphData', authorize.authenticateRole, authorize.authenticateToken, dashboardController.getUserGraphData)

//Admin Routes
router.post('/admins', authorize.authenticateRole, authorize.authenticateToken, adminController.getAllAdmins)
router.get('/admins/:adminId', authorize.authenticateRole, authorize.authenticateToken, adminController.getAdminById)
router.put('/update/status/:adminId', authorize.authenticateRole, authorize.authenticateToken, adminController.updateAdminById)
router.put('/update/:adminId', authorize.authenticateRole, authorize.authenticateToken, adminController.updateAdminDetailsById)
router.post('/admins/add', authorize.authenticateRole, authorize.authenticateToken, adminController.addNewAdmin)
router.post('/admins/set/password', authorize.authenticateToken, adminController.setAdminPassword)

//Features Routes
router.post('/features/add', authorize.authenticateToken, featureController.addFeature)
router.get('/features', authorize.authenticateToken, featureController.getAllFeatures)

//Role Routes
router.post('/roles', authorize.authenticateRole, authorize.authenticateToken, roleController.getAllRoles)
router.post('/roles/add', authorize.authenticateRole, authorize.authenticateToken, roleController.addNewRole)
router.put('/roles/update/:roleId', authorize.authenticateRole, authorize.authenticateToken, roleController.updateRoleById)
router.put('/roles/status/:roleId', authorize.authenticateRole, authorize.authenticateToken, roleController.updateRoleStatusById)
//Excluded from role authencation bec its part of list view and does not exists as feature.
router.get('/roles/active', authorize.authenticateToken, roleController.getAllActiveRoles)
router.get('/roles/list', authorize.authenticateToken, roleController.getAllRolesList)
router.get('/roles/:roleId', authorize.authenticateRole, authorize.authenticateToken, roleController.getRoleByID)

//Login History Routes
router.post('/history/:adminId', authorize.authenticateRole, authorize.authenticateToken, loginHistoryController.getLoginHistorybyAdminID)

//Attribute List Routes
router.post('/attributeList/add', authorize.authenticateToken, attributeListController.addAttributeList)
router.post('/attributeList', authorize.authenticateToken, attributeListController.getAttributeLists)
router.get('/attributeList/:attrId', authorize.authenticateToken, attributeListController.getAttributeListById)
router.put('/attributeList/update/:listId', authorize.authenticateToken, attributeListController.updateAttributeListById)

module.exports = router