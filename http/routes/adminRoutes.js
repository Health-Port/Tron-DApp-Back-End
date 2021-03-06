const router = require('express').Router()
const authorize = require('../../middlewares/authorization')
const adminController = require('../controllers/admin/adminController')
const twoFactorAuthenticationController = require('../controllers/twoFactorAuthentication/twoFactorAuthenticationController')
const dashboardController = require('../controllers/dashboard/dashboardController')
const featureController = require('../controllers/feature/featureController')
const roleController = require('../controllers/role/roleController')
const loginHistoryController = require('../controllers/loginHistory/loginHistoryController')
const attributeListController = require('../controllers/attributeList/attributeListController')
const templateController = require('../controllers/template/templateController')

router.post('/signIn', adminController.signIn)
router.post('/forgetPassword', adminController.forgetPassword)
router.post('/forgetPassword', adminController.forgetPassword)
router.post('/changePassword', authorize.blockage, authorize.authenticateToken, adminController.changePassword)
router.post('/confirmForgotPassword', authorize.blockage, authorize.authenticateToken, adminController.confirmForgotPassword)

//TwoFactorAuthentication Routes
router.post('/requestTwoFactorAuthentication', authorize.blockage, authorize.authenticateToken, twoFactorAuthenticationController.requestTwoFactorAuthentication)
router.post('/enableDisableTwoFactorAuthentication', authorize.blockage, authorize.authenticateToken, twoFactorAuthenticationController.enableDisableTwoFactorAuthentication)
router.post('/verifyTwoFactorAuthentication', authorize.blockage, authorize.authenticateToken, twoFactorAuthenticationController.verifyTwoFactorAuthentication)

//User related Routes
router.post('/getUsers', authorize.blockage, authorize.authenticateRole, authorize.authenticateToken, adminController.getUsers)
router.post('/getUserById', authorize.blockage, authorize.authenticateRole, authorize.authenticateToken, adminController.getUserById)
router.post('/getTransactionsByUserId', authorize.blockage, authorize.authenticateToken, adminController.getTransactionsByUserId)
router.post('/getLoginHistoriesByUserId', authorize.blockage, authorize.authenticateToken, adminController.getLoginHistoriesByUserId)
router.put('/status/:userId', authorize.blockage, authorize.authenticateRole, authorize.authenticateToken, adminController.updateUserById)

router.post('/getLoginHistories', authorize.blockage, authorize.authenticateToken, adminController.getLoginHistories)
router.post('/getReferrals', authorize.blockage, authorize.authenticateToken, adminController.getReferrals)
router.post('/sendUserResetPasswordRequest', authorize.blockage, authorize.authenticateToken, adminController.sendUserResetPasswordRequest)
router.post('/listTransactions', authorize.blockage, authorize.authenticateToken, adminController.listTransactions)
router.post('/resendLinkEmail', authorize.blockage, authorize.authenticateToken, adminController.resendLinkEmail)
router.post('/updateSPRewardSettings', authorize.blockage, authorize.authenticateToken, adminController.updateSPRewardSettings)
router.post('/updateAirdropSettings', authorize.blockage, authorize.authenticateToken, adminController.updateAirdropSettings)
router.post('/updateSignupLimitPerDay', authorize.blockage, authorize.authenticateToken, adminController.updateSignupLimitPerDay)
router.post('/updateCommissionSettings', authorize.blockage, authorize.authenticateToken, adminController.updateCommissionSettings)
router.post('/updateRewardSettings', authorize.blockage, authorize.authenticateToken, adminController.updateRewardSettings)

router.get('/listSPRewardSettings', authorize.blockage, authorize.authenticateRole, authorize.authenticateToken, adminController.listSPRewardSettings)
router.get('/listAirdropSettings', authorize.blockage, authorize.authenticateRole, authorize.authenticateToken, adminController.listAirdropSettings)
router.get('/listSignupLimitPerDay', authorize.blockage, authorize.authenticateRole, authorize.authenticateToken, adminController.listSignupLimitPerDay)
router.get('/listCommissionSettings', authorize.blockage, authorize.authenticateRole, authorize.authenticateToken, adminController.listCommissionSettings)
router.get('/listRewardSettings', authorize.blockage, authorize.authenticateRole, authorize.authenticateToken, adminController.listRewardSettings)

//Dashboard Routes
router.get('/getTrxEHRBalance', authorize.blockage, authorize.authenticateRole, authorize.authenticateToken, dashboardController.getTrxEHRBalance)
router.get('/getTotalUsersCount', authorize.blockage, authorize.authenticateRole, authorize.authenticateToken, dashboardController.getTotalUsersCount)
router.get('/getTokensRisedByCommission', authorize.blockage, authorize.authenticateRole, authorize.authenticateToken, dashboardController.getTokensRisedByCommission)
router.get('/getTokenDistributed', authorize.blockage, authorize.authenticateRole, authorize.authenticateToken, dashboardController.getTokenDistributed)
router.post('/getTransactionGraphData', authorize.blockage, authorize.authenticateRole, authorize.authenticateToken, dashboardController.getTransactionGraphData)
router.post('/getUserGraphData', authorize.blockage, authorize.authenticateRole, authorize.authenticateToken, dashboardController.getUserGraphData)

//Admin Routes
router.post('/admins', authorize.blockage, authorize.authenticateRole, authorize.authenticateToken, adminController.getAllAdmins)
router.get('/admins/:adminId', authorize.blockage, authorize.authenticateToken, adminController.getAdminById)
router.put('/update/status/:adminId', authorize.blockage, authorize.authenticateRole, authorize.authenticateToken, adminController.updateAdminById)
router.put('/update/:adminId', authorize.blockage, authorize.authenticateRole, authorize.authenticateToken, adminController.updateAdminDetailsById)
router.post('/admins/add', authorize.blockage, authorize.authenticateRole, authorize.authenticateToken, adminController.addNewAdmin)
router.post('/admins/set/password', authorize.blockage, authorize.authenticateToken, adminController.setAdminPassword)

//Features Routes
router.post('/features/add', authorize.blockage, authorize.authenticateToken, featureController.addFeature)
router.get('/features', authorize.blockage, authorize.authenticateToken, featureController.getAllFeatures)

//Role Routes
router.post('/roles', authorize.blockage, authorize.authenticateRole, authorize.authenticateToken, roleController.getAllRoles)
router.post('/roles/add', authorize.blockage, authorize.authenticateRole, authorize.authenticateToken, roleController.addNewRole)
router.put('/roles/update/:roleId', authorize.blockage, authorize.authenticateRole, authorize.authenticateToken, roleController.updateRoleById)
router.put('/roles/status/:roleId', authorize.blockage, authorize.authenticateRole, authorize.authenticateToken, roleController.updateRoleStatusById)
//Excluded from role authencation bec its part of list view and does not exists as feature.
router.get('/roles/active', authorize.blockage, authorize.authenticateToken, roleController.getAllActiveRoles)
router.get('/roles/get/:roleId', authorize.blockage, authorize.authenticateToken, roleController.getRoleByID)

router.get('/roles/list', authorize.blockage, authorize.authenticateToken, roleController.getAllRolesList)
router.get('/roles/:roleId', authorize.blockage, authorize.authenticateRole, authorize.authenticateToken, roleController.getRoleByID)

//Login History Routes
router.post('/history/:adminId', authorize.blockage, authorize.authenticateToken, loginHistoryController.getLoginHistorybyAdminID)

//Attribute List Routes
router.post('/attributeList/add', authorize.blockage, authorize.authenticateRole, authorize.authenticateToken, attributeListController.addAttributeList)
router.post('/attributeList', authorize.blockage, authorize.authenticateRole, authorize.authenticateToken, attributeListController.getAttributeLists)
router.put('/attributeList/update/:listId', authorize.authenticateRole, authorize.blockage, authorize.authenticateToken, attributeListController.updateAttributeListById)
router.get('/attributeList/all', authorize.blockage, authorize.authenticateToken, attributeListController.getAllAttributeLists)
router.get('/attributeList/:attrId', authorize.blockage, authorize.authenticateToken, attributeListController.getAttributeListById)
router.get('/attributeListForCheckboxAndRadio/:templateId', authorize.blockage, authorize.authenticateToken, attributeListController.getAttributeListsForCheckboxAndRadio)

//Template Routes
router.post('/template/add', authorize.blockage, authorize.authenticateRole, authorize.authenticateToken, templateController.addTemplate)
router.post('/template/update/status/:tempId', authorize.authenticateRole, authorize.blockage, authorize.authenticateToken, templateController.updateTemplateStatusById)
router.post('/template/list', authorize.blockage, authorize.authenticateRole, authorize.authenticateToken, templateController.getTemplates)
router.put('/template/update/:tempId', authorize.blockage, authorize.authenticateRole, authorize.authenticateToken, templateController.updateTemplateById)
router.get('/template/:tempId', authorize.blockage, authorize.authenticateToken, templateController.getTemplateById)

module.exports = router