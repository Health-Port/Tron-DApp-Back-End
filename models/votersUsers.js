
module.exports = (sequelize, Sequelize) => {
    const voters_users = sequelize.define('voters_users', {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        tron_user_address: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        reward_amount: {
            type: Sequelize.INTEGER,
            allowNull: false,
        },
        trx_hash: {
            type: Sequelize.STRING,
            allowNull: false,
        }
    });
    return voters_users;
}