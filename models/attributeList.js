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
    return attributeLists
}