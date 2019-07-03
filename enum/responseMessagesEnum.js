const ResponseMessagesEnum = {
    API_ERROR: 'Server is down, please try again later.',
    ATTRIBUTE_IS_REQUIRED: 'Atleast one attribute is required to add new list.',
    ATTRIBUTE_LIST_ID_REQUIRED: 'Attribute list id is required for dropdowns.',
    ACCESS_RIGHTS_REQUIRED: 'Access rights are required.',
    ALREADY_VERIFIED: 'Account already verified.',
    ACCESS_DENIED: 'Access denied. No token provided.',
    ACCOUNT_IS_VERIFIED: 'Your account is verified successfully.',
    ACCOUNT_IS_NOT_ACTIVE: 'Receiver account is not an active account.',
    ACCOUNT_IS_NOT_VERIFIED: 'There is some issue in account verification, please try again.',
    AMOUNT_IS_NOT_INTEGER: 'Only whole numbers are allowed.',
    BALANCE_IS_ZERO: 'You have zero balance.',
    BOTH_ID_PARENTID_REQUIRED: 'Both id and parent id are required.',
    BOTH_LABEL_VALUE_REQUIRED: 'Both label and values are required in attribute list.',
    BOTH_LABEL_TYPE_REQUIRED: 'Both label and types are required in templete fields.',
    BOOLEAN_VALUE_REQUIRED: 'Only boolean value is allowed.',
    BANDWIDTH_IS_LOW: 'You currently have low bandwidth on TRON Network. Please wait for a few minutes and try again.',
    BANDWIDTH_IS_LOW_RECEIVER: 'Please wait bandwidth to be allocated to receiver address. Try again after 5 minutes.',
    COUNTRY_INTEGER: 'Country should be integer.',
    CHARACTER_COUNT_ERROR: 'Name should be less than 30 Characters.',
    CODE_NOT_VARIFIED: 'Invalid authentication code.',
    CHECK_YOUR_EMAIL: 'Please check email to setup your account password.',
    DOCUMENT_SAVED: 'Document saved successfully.',
    DUPLICATE_ITEMS: 'Please remove duplicate items and try again.',
    DOCUMENT_RETRIEVED: 'Document retrieved successfully.',
    EMAIL_CONFIRMATION_REQUIRED: 'Please verify your account to continue further.',
    FEATURE_IS_REQUIRED: 'Atleast one feature is required to add new role.',
    ID_IS_MISSING: 'Id is missing in feature array.',
    INVALID_EMAIL_ADDRESS: 'Invalid email address.',
    INVALID_TOKEN: 'Session expired, please signin again.',
    INVALID_TO_ADDRESS: 'Invalid address.',
    INVALID_CAPTCHA: 'Captcha is invalid.',
    INVALID_DATE: 'Date should be in mm-dd-yyyy format.',
    INSUFFICIENT_BALANCE: 'You have insufficient balance for this transaction',
    LINK_EXPIRED: 'Link has expired.',
    LINK_ALREADY_USED: 'Link already used.',
    LINK_RESENT: 'Verification link has been sent again.',
    LIST_ALREADY_EXIST: 'List already exist.',
    LIST_NAME_REQUIRED: 'List name is required.',
    LIST_ADDED_SUCCESSFULLY: 'List added successfully.',
    LIST_UPDATED_SUCCESSFULLY: 'List updated successfully.',
    MAIL_SENT: 'Please check your email to continue further.',
    MAIL_SENT_USER: 'Link has been sent to user email address.',
    MAIL_NOT_SENT: 'Email server is down, please try again later.',
    MAIL_SENT_CONTACT_US: 'Your messsage has been sent successfully.',
    MAIL_UPDATED: 'Your email changed successfully, please login to continue.',
    MAIL_ALREADY_EXIST: 'Email already exist.',
    NO_RECORD_FOUND: 'No record found.',
    NO_ACCESS_RIGHTS_FOUND: 'No access right found.',
    NOT_ALLOWED: 'You are not allowed to perform this action.',
    NAME_IS_REQUIRED: 'Name is required.',
    NAME_ALREADY_EXISTS: 'Name already exists.', 
    PARENT_ID_MISSING: 'Parent id is missing.',
    PASSWORD_ARE_SAME: 'Current and new passwords are same.',
    PASSWORD_ERROR: 'Password length needs to between 8 to 30 characters.',
    PASSWORD_UPDATED: 'Password updated successfully.',
    PASSWORD_ALREADY_UPDATED: 'Password already updated.',
    PASSWORD_INCORRECT: 'Incorrect password.',
    PASSWORD_COMPLEXITY: 'Password must be between 8 to 30 characters with 1 uppercase letter, 1 special character and alphanumric characters.',
    PASSWORD_CHANGED: 'Your Password updated successfully, please login to continue.',
    REQUIRED_FIELDS_EMPTY: 'Required fields cannot be empty.',
    ROLE_ALREADY_EXIST: 'Role already exist.',
    ROLE_NAEME_REQUIRED: 'Role name is required.',
    ROLE_NAEME_NOT_ALLOWED: 'Role name is not allowed.',
    ROLE_IS_BLOCKED: 'Role is blocked.',
    ROLE_NOT_FOUND: 'Role not found.',
    ROLE_UPDATED: 'Role updated successfully.',
    ROLE_ADDED: 'Role added successfully.',
    ROLE_BLOCKED: 'Role is blocked successfully.',
    ROLE_ACTIVATED: 'Role is activated successfully.',
    SUCCESSFULLY_LOGGEDIN: 'User login successfully.',
    SUCCESS: 'Success',
    SYSTEM_ROLE_ID_REQUIRED: 'System role id is required.',
    STATUS_UPDATED_SUCCESSFULLY: 'Status updated successfully.',
    STATUS_IS_NOT_BOOLEAN: 'Status must be boolean.',
    STATE_IS_INVALID: 'State is invalid.',
    SIGNUP_LIMIT: 'Sign Up limit has exceeded, come back tomorrow for registration',
    TOKEN_ERROR: 'Unable to generate token.',
    TRON_IS_NOT_CONNECTED: 'Tron node is not connected.',
    TRON_BALANCE_IS_ZERO: 'Your have insufficient Tron balance.',
    TERMS_CONDITIONS:'Please check terms and conditions.',
    TEMPLATE_ADDED_SUCCESSFULLY: 'Template added successfully.',
    TEMPLATE_UPDATED_SUCCESSFULLY: 'Template updated successfully.',
    TEMPLATE_ALREADY_EXIST: 'Template already exist.',
    TO_FROM_ADDRESS_ARE_SAME:'You cannot send EHR from your account to your own address.',
    TWO_FACTOR_IS_ALREADY_ENABLED: '2 Factor authentication is already enabled.',
    TWO_FACTOR_IS_ENABLED: '2 Factor Authentication is enabled successfully',
    TWO_FACTOR_IS_DISABLED: '2 Factor Authentication is disabled successfully',
    USER_ADDED_SUCCESSFULLY: 'User added successfully.',
    USER_UPDATED_SUCCESSFULLY: 'User updated successfully.',
    USER_ALREADY_EXIST: 'User already exist.',
    USER_IS_BLOCKEd: 'User is blocked.',
    USER_NOT_FOUND: 'User not found.',
    USER_ACTIVATED: 'User is activated successfully.',
    USER_BLOCKED: 'User is blocked successfully.',
    USER_KYC_SUBMITTED: 'User Kyc details submitted successfully',
    UNABLE_TO_SIGNUP_RIGHT_NOW: 'Sorry unable to signup right now.',
    UNABLE_TO_SIGNIN_RIGHT_NOW: 'Sorry unable to signin right now.',
}

module.exports = ResponseMessagesEnum