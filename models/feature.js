module.exports = (sequelize, Sequelize) => {
    const features = sequelize.define('features', {
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
        parent_id: {
            type: Sequelize.INTEGER,
            allowNull: true
		},
		is_feature: {
            type: Sequelize.BOOLEAN
        },
        sequence: {
            type: Sequelize.INTEGER
        }
    })
    return features
}