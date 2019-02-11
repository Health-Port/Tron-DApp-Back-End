module.exports = (sequelize, Sequelize) => {
    const transections = sequelize.define('transections', {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            unique: true,
            primaryKey: true
        },
        user_id: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        address: {
            type: Sequelize.STRING,
            allowNull: false
        },
        type: {
            type: Sequelize.STRING,
            allowNull: false
        },
        note: {
            type: Sequelize.STRING,
            allowNull: false
        },
        number_of_token: {
            type: Sequelize.STRING,
            allowNull: false
        },
        trx_hash: {
            type: Sequelize.STRING,
            allowNull: false,
        }
    });

    return transections;

}