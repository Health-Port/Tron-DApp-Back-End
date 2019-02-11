const nodemailer = require('nodemailer');

class EmailHandler {
    constructor() {
        this.email = process.env.SMTP_EMAIL;
        this.password = process.env.SMTP_PASSWORD;
    }
    static sendEmail(toEmail, subject, body) {
        const mailOptions = {
            from: `Health Port <${process.env.SMTP_EMAIL}>`, // sender address
            to: toEmail, // list of receivers
            bcc: process.env.SMTP_EMAIL,
            subject: subject, // Subject line
            html: body
        };
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true, // use SSL
            service: 'gmail',
            auth: {
                user: process.env.SMTP_EMAIL,
                pass: process.env.SMTP_PASSWORD
            }
        });
        return new Promise((resolove, reject) => {
            transporter.sendMail(mailOptions, function (err, info) {
                if (err) {
                    console.log(err);
                    reject(false);
                }
                else resolove(true);
            });
        })
    }
    static forgotPasswordTitle() {
        var forgotPasswordEmailTitle = `${process.env.PROJECT_NAME} Reset Password Request`;
        return forgotPasswordEmailTitle;
    }
    static forgotPasswordBody(url) {
        var forgotPasswordEmailTemplate = `
        <p>Dear User,</p>
        <br/>
        <p>We have received a forgot password request. <p>Please Click on the link below to reset your Password</p>
        <a href="${url}">Click Here</a>
        <p>If you have not performed this action, please contact support by clicking link below.</p>
        <br/>
        <p>Thanks,</p>
        <p>Team ${process.env.PROJECT_NAME}</p>
        `
        return forgotPasswordEmailTemplate;
    }
}

module.exports = EmailHandler;