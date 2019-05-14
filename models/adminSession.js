module.exports = (sequelize, Sequelize) => {
    const admin_sessions = sequelize.define('admin_sessions', {
        id: {
            type: Sequelize.INTEGER,
			autoIncrement: true,
			primaryKey: true,
			unique: true,
		},
		admin_id: {
			type: Sequelize.INTEGER,
			allowNull: false,
		},
		ip_address: {
			type: Sequelize.STRING,
			allowNull: false,
		}
    })
    return admin_sessions
}