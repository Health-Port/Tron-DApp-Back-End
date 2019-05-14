module.exports = (sequelize, Sequelize) => {
    const admins = sequelize.define('admins', {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            unique: true,
        },
        role_id: {
            type: Sequelize.INTEGER,
            allowNull: false
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
        is_admin:{
            type: Sequelize.BOOLEAN,
            defaultValue: true
        },
        is_twofa_enable:{
            type: Sequelize.BOOLEAN,
            defaultValue: false
        },
        is_twofa_verified:{
            type: Sequelize.BOOLEAN,
            defaultValue: false
        },
        twofa_formatted_key:{
            type: Sequelize.STRING
        }
    })
    return admins
}