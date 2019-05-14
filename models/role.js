module.exports = (sequelize, Sequelize) => {
    const roles = sequelize.define('roles', {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            unique: true,
        },
        name: {
            type: Sequelize.STRING,
            allowNull: false
		},
		description: {
            type: Sequelize.STRING,
            allowNull: true
        }
    })
    return roles
}