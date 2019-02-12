module.exports = (sequelize, Sequelize) => {
    const admins = sequelize.define('admins', {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            unique: true,
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
        password: {
            type: Sequelize.STRING,
            allowNull: false
        },
        twofa_enable:{
            type: Sequelize.BOOLEAN,
            defaultValue: false
        }
    })
    return admins
}