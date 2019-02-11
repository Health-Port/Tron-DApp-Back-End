
module.exports = (sequelize, Sequelize) => {
    const patient_provider_records = sequelize.define('patient_provider_records', {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        user_id: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        share_with_id: {
            type: Sequelize.INTEGER,
        },
        share_with_name: {
            type: Sequelize.STRING,
        },
        type: {
            type: Sequelize.STRING,
            allowNull: false
        }
    });
    return patient_provider_records;
}