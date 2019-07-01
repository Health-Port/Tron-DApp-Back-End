module.exports = (sequelize, Sequelize) => {
    const systemRoles = sequelize.define('system_roles', {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            unique: true
        },
        name: {
            type: Sequelize.STRING,
            allowNull: false
        }
    })
    return systemRoles
}