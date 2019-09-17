module.exports = (sequelize, Sequelize) => {
    const shareTypes = sequelize.define('share_types', {
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
            allowNull: false
        }
    })
    return shareTypes
}