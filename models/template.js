module.exports = (sequelize, Sequelize) => {
    const templates = sequelize.define('templates', {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        name: {
            type: Sequelize.STRING,
            allowNull: false
		},
		description: {
            type: Sequelize.STRING,
        },
        status: {
            type: Sequelize.BOOLEAN,
            defaultValue: true
        }
    })
    return templates
}