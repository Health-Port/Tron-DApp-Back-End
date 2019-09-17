module.exports = (sequelize, Sequelize) => {
    const medicalRecords = sequelize.define('medical_records', {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            unique: true,
        },
		template_id: {
            type: Sequelize.INTEGER,
            allowNull: false
		},
		user_id: {
            type: Sequelize.INTEGER,
            allowNull: false
		},
		access_token: {
            type: Sequelize.STRING,
            allowNull: false
        }
    })
    return medicalRecords
}