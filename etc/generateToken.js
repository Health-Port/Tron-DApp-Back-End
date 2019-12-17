const jwt = require('jsonwebtoken')

function createToken(params) {
    let token = jwt.sign(params, process.env.JWt_SECRET, {
        expiresIn: parseInt(process.env.JWT_TOKEN_EXPIRY_TIME)})
    return Promise.resolve(token)
}
module.exports = { createToken }