const tronUtils = require('./tronUtils');
const utils = require('./utils');

const db = global.healthportDb;

async function cutCommission(tron_wallet_public_key, type) {
    [err, user] = await utils.to(db.models.users.findOne({ where: { tron_wallet_public_key: tron_wallet_public_key } }));
    let privateKey = utils.decrypt(user.tron_wallet_private_key);
    let balance = await tronUtils.getTRC10TokenBalance(privateKey, utils.decrypt(tron_wallet_public_key));
    if (balance == 0) return Promise.reject('Insufficient Balance');
    
    let bandwidth = await tronUtils.getBandwidth(utils.decrypt(tron_wallet_public_key));
    if (bandwidth < 275) return Promise.reject('Bandwidth is low');
    try {
        [err, commissionObj] = await utils.to(db.models.commission_conf.findAll());
        if (commissionObj && commissionObj.length > 0) {
            if (balance < commissionObj[0].commission_amount) return Promise.reject('Insufficient Balance for fee to deduct');
            let trxId = await tronUtils.sendTRC10Token(process.env.COMMISSION_ACCOUNT_ADDRESS_KEY, parseInt(commissionObj[0].commission_amount), privateKey);
            [err, obj] = await utils.to(db.models.transections.bulkCreate([
                { user_id: user.id, address: utils.encrypt(process.env.COMMISSION_ACCOUNT_ADDRESS_KEY), number_of_token: commissionObj[0].commission_amount, trx_hash: trxId, type: type },
                { user_id: user.id, address: tron_wallet_public_key, number_of_token: commissionObj[0].commission_amount, trx_hash: trxId, type: type }
            ]));
            return obj;
        }
    } catch (error) {
        console.log(error);
        return Promise.reject(error);
    }
}

module.exports = cutCommission;