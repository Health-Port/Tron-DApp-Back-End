const jwt = require('jsonwebtoken')

function createToken(params, baseUrl) {
    let secret = {}
    if(baseUrl == '/admin')
        secret = process.env.SECRET_ADMIN
    else
        secret = process.env.SECRET

    let token = jwt.sign(params, secret, {
        expiresIn: parseInt(process.env.JWT_TOKEN_EXPIRY_TIME)})
    return Promise.resolve(token)
}
module.exports = { createToken }