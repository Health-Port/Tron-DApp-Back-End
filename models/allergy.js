module.exports = (sequelize, Sequelize) => {
    const allergies = sequelize.define('allergies', {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        user_id: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        category: {
            type: Sequelize.STRING,
            allowNull: false
        },
        reactions: {
            type: Sequelize.STRING,
            allowNull: false
        },
        severity: {
            type: Sequelize.STRING,
            allowNull: false
        },
        substance: {
            type: Sequelize.STRING,
            allowNull: false
        },
        no_known_allergies:{
            type: Sequelize.BOOLEAN,
            allowNull: false
        }
    });

    return allergies;

}