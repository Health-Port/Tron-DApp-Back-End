var ResponseMessagesEnum = {
    API_ERROR: "Server is down, please try again later.",
    ALREADY_VERIFIED: "Account already verified.",
    ACCESS_DENIED: "Access denied. No token provided.",
    ACCOUNT_IS_VERIFIED: "Your account is verified successfully.",
    ACCOUNT_IS_NOT_ACTIVE: "Receiver account is not an active account.",
    ACCOUNT_IS_NOT_VERIFIED: "There is some issue in account verification, please try again.",
    AMOUNT_IS_NOT_INTEGER: "Only whole numbers are allowed.",
    BALANCE_IS_ZERO: "You have zero balance.",
    BANDWIDTH_IS_LOW: 'You currently have low bandwidth on TRON Network. Please wait for a few minutes and try again.',
    BANDWIDTH_IS_LOW_RECEIVER: 'Please wait bandwidth to be allocated to receiver address. Try again after 5 minutes.',
    COUNTRY_INTEGER: "Country should be integer.",
    DOCUMENT_SAVED: "Document saved successfully.",
    DOCUMENT_RETRIEVED: "Document retrieved successfully.",
    EMAIL_CONFIRMATION_REQUIRED: "Please verify your account to continue further.",
    INVALID_EMAIL_ADDRESS: "Invalid email address.",
    INVALID_TOKEN: "Session expired, please signin again.",
    INVALID_TO_ADDRESS: "Invalid address.",
    INVALID_CAPTCHA: "Captcha is invalid.",
    INVALID_DATE: "Date should be in mm-dd-yyyy format.",
    INSUFFICIENT_BALANCE: "You have insufficient balance for this transaction",
    LINK_EXPIRED: "Link has expired.",
    LINK_ALREADY_USED: "Link already used.",
    LINK_RESENT: "Verification link has been sent again.",
    MAIL_SENT: "Please check your email to continue further.",
    MAIL_SENT_USER: "Link has been sent to user's email address.",
    MAIL_NOT_SENT: "Email server is down, please try again later.",
    MAIL_SENT_CONTACT_US: "Your messsage has been sent successfully.",
    MAIL_UPDATED: "Your email changed successfully, please login to continue.",
    MAIL_ALREADY_EXIST: "Email already exist.",
    NO_RECORD_FOUND: "No record found.",
    PASSWORD_ARE_SAME: "Current and new passwords are same.",
    PASSWORD_ERROR: "Password length needs to between 8 to 30 characters.",
    PASSWORD_UPDATED: "Password updated successfully.",
    PASSWORD_INCORRECT: "Incorrect password.",
    PASSWORD_COMPLEXITY: "Password must be between 8 to 30 characters with 1 uppercase letter, 1 special character and alphanumric characters.",
    PASSWORD_CHANGED: "Your Password updated successfully, please login to continue.",
    REQUIRED_FIELDS_EMPTY: "Required fields cannot be empty.",
    SUCCESSFULLY_LOGGEDIN: "User login successfully.",
    SUCCESS: "Success",
    SIGNUP_LIMIT: "Sign Up limit has exceeded, come back tomorrow for registration",
    TOKEN_ERROR: "Unable to generate token.",
    TRON_IS_NOT_CONNECTED: "Tron node is not connected.",
    TRON_BALANCE_IS_ZERO: "Your have insufficient Tron balance.",
    TERMS_CONDITIONS:"Please check terms and conditions.",
    TO_FROM_ADDRESS_ARE_SAME:"You cannot send EHR from your account to your own address.",
    USER_ADDED_SUCCESSFULLY: "User added successfully.",
    USER_UPDATED_SUCCESSFULLY: "User updated successfully.",
    USER_ALREADY_EXIST: "User already exist.",
    USER_NOT_FOUND: "User not found.",
    USER_KYC_SUBMITTED: "User Kyc details submitted successfully",
    UNABLE_TO_SIGNUP_RIGHT_NOW: "Sorry unable to signup right now.",
    UNABLE_TO_SIGNIN_RIGHT_NOW: "Sorry unable to signin right now.",
}

module.exports = ResponseMessagesEnum