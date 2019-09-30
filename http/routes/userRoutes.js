const router = require('express').Router()
const authorize = require('../../middlewares/authorization')
const userController = require('../controllers/user/userController')
const tokenController = require('../controllers/token/tokenController')
const allergyController = require('../controllers/allergy/allergyController')
const providerController = require('../controllers/provider/providerController')
const procedureController = require('../controllers/procedure/procedureController')
const medicationController = require('../controllers/medication/medicationController')
const twoFactorAuthenticationController = require('../controllers/twoFactorAuthentication/twoFactorAuthenticationController')
const templateController = require('../controllers/template/templateController')
const medicalRecordController = require('../controllers/medicalRecord/medicalRecordController')
const shareTypeController = require('../controllers/shareType/shareTypeController')
const shareHistoryController = require('../controllers/shareHistory/shareHistoryController')
const filesController = require('../controllers/files/filesController')

router.post('/signUp', userController.signUp)
router.post('/signIn', userController.signIn)
router.post('/forgetPassword', userController.forgetPassword)
router.post('/confirmForgotPassword', authorize.authenticateToken, userController.confirmForgotPassword)
router.post('/verifyEmail', authorize.authenticateToken, userController.verifyEmail)
router.post('/resendLinkEmail', authorize.authenticateToken, userController.resendLinkEmail)
router.post('/contactUs', userController.contactUs)
router.post('/changeEmail', authorize.authenticateToken, userController.changeEmail)
router.get('/getPrivateKey', authorize.authenticateToken, userController.getPrivateKey)
router.get('/getPrivateKey/:address', authorize.authenticateToken, userController.getPrivateKey)

router.post('/sendToken', authorize.authenticateToken, tokenController.sendToken)
router.post('/getBalance', authorize.authenticateToken, tokenController.getBalance)
router.post('/getTransectionsByAddress', authorize.authenticateToken, tokenController.getTransectionsByAddress)
router.post('/getFormSubmissionDates', authorize.authenticateToken, tokenController.getFormSubmissionDates)
router.post('/getReferralsByUser', authorize.authenticateToken, tokenController.getReferralsByUser)

router.post('/saveAllergyListByUser', authorize.authenticateToken, allergyController.saveAllergyListByUser)
router.post('/getAllergyListByUser', authorize.authenticateToken, allergyController.getAllergyListByUser)

router.post('/saveMedicationByUser', authorize.authenticateToken, medicationController.saveMedicationByUser)
router.post('/getMedicationListByUser', authorize.authenticateToken, medicationController.getMedicationListByUser)

router.post('/saveProcedureByUser', authorize.authenticateToken, procedureController.saveProcedureByUser)
router.post('/getProcedureListByUser', authorize.authenticateToken, procedureController.getProcedureListByUser)

//User_files
router.post('/saveFileByUserId', authorize.authenticateToken, filesController.saveFileByUserId)
router.post('/getFileByUserId', authorize.authenticateToken, filesController.getFileByUserId)
router.post('filesCallHandaling/:action', authorize.authenticateToken, filesController.filesCallHandaling)
router.get('/getFileHistoryById/:fId', authorize.authenticateToken, filesController.getFileHistoryById)

//Providers
router.get('/getAllProviders/:mId', authorize.authenticateToken, providerController.getAllProviders)
router.get('/getAllProviders', authorize.authenticateToken, providerController.getAllProviders)
router.post('/shareListWithProviders', authorize.authenticateToken, providerController.shareListWithProviders)
router.post('/getProviderSharedData', authorize.authenticateToken, providerController.getProviderSharedData)
router.post('/getProviderSharedDocument', authorize.authenticateToken, providerController.getProviderSharedDocument)
router.post('/patient/add', authorize.authenticateToken, providerController.addPatient)
router.post('/shared-medical-records/list', authorize.authenticateToken, providerController.getSharedMedicalRecords)
router.post('/provider/update-token', authorize.authenticateToken, providerController.updateProviderAccessToken)
router.post('/patient/update-token', authorize.authenticateToken, providerController.updatePatientAccessToken)
router.get('/provider/remove-access/:sId', authorize.authenticateToken, providerController.removeMedicalRecordHisotry)

//TwoFactorAuthentication Routes
router.post('/requestTwoFactorAuthentication', authorize.authenticateToken, twoFactorAuthenticationController.requestTwoFactorAuthentication)
router.post('/enableDisableTwoFactorAuthentication', authorize.authenticateToken, twoFactorAuthenticationController.enableDisableTwoFactorAuthentication)
router.post('/verifyTwoFactorAuthentication', authorize.authenticateToken, twoFactorAuthenticationController.verifyTwoFactorAuthentication)

//Template Routes
router.post('/template/list', authorize.authenticateToken, templateController.getTemplates)
router.get('/template/list-all', authorize.authenticateToken, templateController.getAllTemplates)
router.get('/template/:tempId', authorize.authenticateToken, templateController.getTemplateById)

//Medical Record Routes
router.post('/medical-record/add', authorize.authenticateToken, medicalRecordController.addMedicalRecord)
router.post('/medical-record/list', authorize.authenticateToken, medicalRecordController.getMedicalRecordsByUserId)
router.get('/medical-record/list-all', authorize.authenticateToken, medicalRecordController.getAllMedicalRecordsByUserId)
router.get('/medical-record/:tempId', authorize.authenticateToken, medicalRecordController.getMedicalRecordByTemplateId)
router.get('/medical-record/template-attribute/:tempId', authorize.authenticateToken, medicalRecordController.getMedicalRecordByTemplateIdWithAttributes)
router.post('/medical-record/ipfs/:action', authorize.authenticateToken, medicalRecordController.ipfsCallHandeling)

//Share Types Routes
router.get('/share-types/list', authorize.authenticateToken, shareTypeController.getShareTypes)

//Share History Routes
router.post('/share-history/add', authorize.authenticateToken, shareHistoryController.addShareHistory)
router.post('/rights/update', authorize.authenticateToken, shareHistoryController.updateRights)
router.post('/share-history/list', authorize.authenticateToken, shareHistoryController.getMedicalRecordHisotry)
router.post('/share-history/remove-access', authorize.authenticateToken, shareHistoryController.removeAccessRightByProviderId)
router.post('/share-history/add-all', authorize.authenticateToken, shareHistoryController.shareAllMedialRecrods)
router.get('/share-history/pending-all', authorize.authenticateToken, shareHistoryController.getPendingshareHistories)
router.post('/share-history/recompute-tokens', authorize.authenticateToken, shareHistoryController.recomputeAccessTokens)
router.get('/share-history/:sId', authorize.authenticateToken, shareHistoryController.getShareHistoryById)
router.get('/share-history/template/:tId', authorize.authenticateToken, shareHistoryController.getShareHistoriesByTemplateId)

module.exports = router