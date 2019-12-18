const crypto = require('crypto');
const axios = require('axios');

function to(promise) {
    return promise.then(data => {
        return [null, data];
    })
        .catch(err => [err]);
}

function encrypt(data) {
    var cipher = crypto.createCipher('aes-256-ecb', process.env.SECRET);
    return cipher.update(data, 'utf8', 'hex') + cipher.final('hex');
}

function decrypt(data) {
    var cipher = crypto.createDecipher('aes-256-ecb', process.env.SECRET);
    return cipher.update(data, 'hex', 'utf8') + cipher.final('utf8');
}
function checkaddresses(to, from) {
    if (to == from) return true;
    return false;
}

function isBoolean(val) {
    return val === false || val === true
}

async function sendTransactinNotification(slackMessage) {
    const [err, result] = await to(axios.post('https://hooks.slack.com/services/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', {
        text: slackMessage
    }));
    return result;
}

module.exports = {
    to,
    encrypt,
    decrypt,
    checkaddresses,
    isBoolean,
    sendTransactinNotification
};