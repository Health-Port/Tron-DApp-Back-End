
module.exports = (sequelize, Sequelize) => {
    const commission_conf = sequelize.define('commission_conf', {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        commission_amount: {
            type: Sequelize.INTEGER,
            default: 0
        }
    });

    return commission_conf;
}