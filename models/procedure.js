module.exports = (sequelize, Sequelize) => {
    const procedures = sequelize.define('procedures', {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        user_id: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        procedure: {
            type: Sequelize.STRING,
            allowNull: false
        },
        time_stamp: {
            type: Sequelize.BIGINT,
            allowNull: false
        },
        no_known_procedures:{
            type: Sequelize.BOOLEAN,
            allowNull: false
        }
    });

    return procedures;

}