const router = require('express').Router()
const authorize = require('../../middlewares/authorization')
const adminController = require('../controllers/admin/adminController')
const twoFactorAuthenticationController = require('../controllers/twoFactorAuthentication/twoFactorAuthenticationController')

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

module.exports = router