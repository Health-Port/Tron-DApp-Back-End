const mailer = require('../etc/emailHandler');
const utilites = require('./utils');

async function forgetPasswordTemplate(token, email, url) {
    var urlLink = url;
    var subject = `${process.env.PROJECT_NAME} Reset Password Request`;
    var body = `
                            Dear User,<br/><br/>
                            We have received a forgot password request.<br/>
                            Please Click <a href=${urlLink} target=_blank>here</a> to Change Your Password.<br/>
                            If you have not performed this action, please contact support.
                            <br/><br/>
                            Thanks,<br/>
                            Team ${process.env.PROJECT_NAME}
                            `;
  
    let error, result;
    [error, result] = await utilites.to(mailer.sendEmail(email, subject, body));
    if(result) return Promise.resolve(true);
    else return Promise.reject(error);
}

async function signUpTemplate(token, email, url, name) {
    let urlLink = url;
    let subject = `Welcome to ${process.env.PROJECT_NAME} - Email Verification`;
    let body = `
    Dear ${name},<br/><br/>
                            Please click the link below to confirm your email:<br/>
                            <a href="${urlLink}" target="_blank">Verify Account Now</a><br/><br/>
                            Sincerely,<br/>
                            ${process.env.PROJECT_NAME}
                            `;
    
    let error, result;
    [error, result] = await utilites.to(mailer.sendEmail(email, subject, body));
    if(result) return Promise.resolve(true);
    else return Promise.reject(error);
}

async function contactUsTemplate(message, email, name) {
    let subject = `${process.env.PROJECT_NAME} Support`;
    let body = `
    Dear ${name},<br/><br/>
    Thank you for contacting ${process.env.PROJECT_NAME}!<br/><br/>
    We have received your information as shown below.
    <br/><br/>
    Email: ${email}
    <br/>
    Message: ${message}
    <br/><br/>
    Support will respond to your query shortly.
    <br/>
    Thanks<br/>
    Team ${process.env.PROJECT_NAME}
    `;
    
    let error, result;
    [error, result] = await utilites.to(mailer.sendEmail(email, subject, body));
    if(result) return Promise.resolve(true);
    else return Promise.reject(error);
}

module.exports = {
    forgetPasswordTemplate,
    signUpTemplate,
    contactUsTemplate
};