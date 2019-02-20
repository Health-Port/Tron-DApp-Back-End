const request = require('superagent');

let Mailchimp = require('mailchimp-api-v3')

let mailchimp = new Mailchimp(process.env.MAIL_CHIMP_API_KEY);

function mailChimpPost(email, firstName, lastName) {

    var add_new_member = {
        method: 'post',
        path: `/lists/${process.env.LIST_UNIQUE_ID}`,
        body: {
            members: [
                {

                    email_address: email,
                    status_if_new: 'subscribed',
                    merge_fields: {
                        'FNAME': firstName,
                        'EMAIL': email,
                        'LNAME': lastName
                    }
                }
            ],
            "update_existing": true
        }
    }
    mailchimp
        .request(add_new_member)
        .then(function (result) {
            console.log(result);
        })
        .catch(function (err) {
            console.log(err);
        })
    }

module.exports = mailChimpPost;