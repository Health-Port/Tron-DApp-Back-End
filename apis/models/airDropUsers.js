
module.exports = (sequelize, Sequelize) => {
    const air_drop_users = sequelize.define('air_drop_users', {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        tron_user_address: {
            type: Sequelize.STRING,
            unique: true,
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
    return air_drop_users;
}