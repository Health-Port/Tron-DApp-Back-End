const router = require('express').Router()
const adminController = require('../controllers/admin/adminController')

router.post('/signIn', adminController.signIn)
router.post('/signUp', adminController.signUp)
router.post('/forgetPassword', adminController.forgetPassword)

module.exports = router