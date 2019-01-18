const router = require('express').Router();
const authorize = require('../../middlewares/authorization');
const userController = require('../controllers/user/userController');
const tokenController = require('../controllers/token/tokenController');
const allergyController = require('../controllers/allergy/allergyController');
const medicationController = require('../controllers/medication/medicationController');
const procedureController = require('../controllers/procedure/procedureController');

/*
    Post Routes
*/
router.post('/signUp', userController.signUp);
router.post('/signIn', userController.signIn);
router.post('/forgetPassword', userController.forgetPassword);
router.post('/confirmForgotPassword', authorize.authenticateToken, userController.confirmForgotPassword);
router.post('/verifyEmail', authorize.authenticateToken, userController.verifyEmail);
router.post('/resendLinkEmail', authorize.authenticateToken, userController.resendLinkEmail);
router.post('/contactUs', userController.contactUs);

router.post('/sendToken', authorize.authenticateToken, tokenController.sendToken);
router.post('/getBalance', authorize.authenticateToken, tokenController.getBalance);
router.post('/getTransectionsByAddress', authorize.authenticateToken, tokenController.getTransectionsByAddress);
router.post('/getFormSubmissionDates', authorize.authenticateToken, tokenController.getFormSubmissionDates);
router.post('/getReferralsByUser', authorize.authenticateToken, tokenController.getReferralsByUser);


router.post('/saveAllergyListByUser', authorize.authenticateToken, allergyController.saveAllergyListByUser);
router.post('/getAllergyListByUser', authorize.authenticateToken, allergyController.getAllergyListByUser);

router.post('/saveMedicationByUser', authorize.authenticateToken, medicationController.saveMedicationByUser);
router.post('/getMedicationListByUser', authorize.authenticateToken, medicationController.getMedicationListByUser);

router.post('/saveProcedureByUser', authorize.authenticateToken, procedureController.saveProcedureByUser);
router.post('/getProcedureListByUser', authorize.authenticateToken, procedureController.getProcedureListByUser);

/*
    Get Routes
*/
//This route is for server testing purpose only
router.get('/getEnv', tokenController.getEnv);

module.exports = router;