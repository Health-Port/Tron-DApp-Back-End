module.exports = (sequelize, Sequelize) => {
    const passcodes = sequelize.define('pass_codes', {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        user_id: {
            type: Sequelize.STRING,
            allowNull: true
        },
        pass_code: {
            type: Sequelize.STRING,
            allowNull: false
        },
        type: {
            type: Sequelize.STRING,
            allowNull: false
        },
        is_used: {
            type: Sequelize.BOOLEAN,
            defaultValue: false
        }
    });

    return passcodes;

}