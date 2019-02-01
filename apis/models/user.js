var RoleEnum = require('./../enum/roleEnum');
module.exports = (sequelize, Sequelize) => {
    const users = sequelize.define('users', {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            unique: true
        },
        name: {
            type: Sequelize.STRING,
            allowNull: true
        },
        email: {
            type: Sequelize.STRING,
            allowNull: false,
            primaryKey: true
        },
        email_confirmed: {
            type: Sequelize.BOOLEAN,
            allowNull: true
        },
        password: {
            type: Sequelize.STRING,
            allowNull: false
        },
        role: {
            type: Sequelize.ENUM,
            values: [
                RoleEnum.PROVIDER, 
                RoleEnum.PATIENT
            ],
            allowNull: false
        },
        tron_wallet_public_key: {
            type: Sequelize.STRING,
            unique: true,
            allowNull: false,
        },
        tron_wallet_private_key: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        referal_coupon: {
            type: Sequelize.STRING,
            unique: true,
            allowNull: false,
        },
        refer_by_coupon: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        refer_destination: {
            type: Sequelize.STRING,
            allowNull: true
        },
        signup_reward_given: {
            type: Sequelize.BOOLEAN,
            allowNull: true
        }
    });

    return users;

}