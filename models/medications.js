module.exports = (sequelize, Sequelize) => {
    const medications = sequelize.define('medications', {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        user_id: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        name: {
            type: Sequelize.STRING,
            allowNull: false
        },
        dose: {
            type: Sequelize.STRING,
            allowNull: false
        },
        frequency: {
            type: Sequelize.STRING,
            allowNull: false
        },
        physician: {
            type: Sequelize.STRING,
            allowNull: false
        },
        no_known_medications:{
            type: Sequelize.BOOLEAN,
            allowNull: false
        }
    });

    return medications;

}