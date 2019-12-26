const db = global.healthportDb
const utils = require('../../../etc/utils')
const response = require('../../../etc/response')

async function addDumpableEmails() {
    const dumpEmails = require('../../../etc/dumpableEmail.json')
    let data = {} , err = {} , res = {};
    [err, res] = await utils.to(db.models.dumpable_emails.findOne({}))
    if (err) return response.errReturned(res, err)
    if (res == null || res == 0 || res.lenght > 0) {
        [err , data] = await utils.to(db.models.dumpable_emails.bulkCreate(dumpEmails))
        console.log(data)
    }
}
module.exports = {
    addDumpableEmails
}
