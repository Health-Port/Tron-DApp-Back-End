module.exports = (sequelize, Sequelize) => {
    const shareRights = sequelize.define('share_rights', {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            unique: true,
        },
		share_type_id: {
            type: Sequelize.INTEGER,
            allowNull: false
		},
		share_history_id: {
            type: Sequelize.INTEGER,
            allowNull: false
		}
    })
    return shareRights
}