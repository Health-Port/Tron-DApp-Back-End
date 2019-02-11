const router = require('express').Router();
const authorize = require('../../middlewares/authorization');
const adminController = require('../controllers/admin/adminController');
const tokenController = require('../controllers/token/tokenController');


router.post('/signIn', adminController.signIn);
router.post('/signUp', adminController.signUp);
router.post('/forgetPassword', adminController.forgetPassword);

module.exports = router;