module.exports = (sequelize, Sequelize) => {
    const attributeLists = sequelize.define('attribute_lists', {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        name: {
            type: Sequelize.STRING,
            allowNull: false
        }
    })

    attributeLists.associate = (models) => {
		attributeLists.hasMany(models.attribute_list_values, { foreignKey: 'list_id' })
    }
    
    return attributeLists
}