var crypto = require('crypto');

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
module.exports = {
    to,
    encrypt,
    decrypt, 
    checkaddresses
};