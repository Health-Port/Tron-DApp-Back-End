module.exports = (sequelize, Sequelize) => {
    const permissioins = sequelize.define('permissions', {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            unique: true,
        },
        role_id: {
            type: Sequelize.INTEGER,
            allowNull: false
		},
		feature_id: {
            type: Sequelize.INTEGER,
            allowNull: true
        }
    })
    return permissioins
}