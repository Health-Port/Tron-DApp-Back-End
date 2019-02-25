module.exports = (sequelize, Sequelize) => {
    const login_histories = sequelize.define('login_histories', {
        id: {
            type: Sequelize.INTEGER,
			autoIncrement: true,
			primaryKey: true
		},
		user_id: {
			type: Sequelize.INTEGER,
			allowNull: false,
		},
		ip_address: {
			type: Sequelize.STRING,
			allowNull: false,
		}
    })
    return login_histories
}