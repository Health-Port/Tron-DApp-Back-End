module.exports = (sequelize, Sequelize) => {
    const attributeListValues = sequelize.define('attribute_list_values', {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        label: {
            type: Sequelize.STRING,
            allowNull: false
		},
		value: {
            type: Sequelize.STRING,
            allowNull: false
		},
		list_id: {
            type: Sequelize.INTEGER,
            allowNull: false
        }
    })
    return attributeListValues
}