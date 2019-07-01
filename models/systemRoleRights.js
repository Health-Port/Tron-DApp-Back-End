module.exports = (sequelize, Sequelize) => {
    const systemRoleRights = sequelize.define('system_role_rights', {
        id: {
            type: Sequelize.INTEGER,
			autoIncrement: true,
			primaryKey: true,
            unique: true
        },
        view: {
            type: Sequelize.BOOLEAN,
			defaultValue: false
		},
		edit: {
            type: Sequelize.BOOLEAN,
			defaultValue: false
		},
		update: {
            type: Sequelize.BOOLEAN,
			defaultValue: false
		},
		share_via_email: {
            type: Sequelize.BOOLEAN,
			defaultValue: false
		},
		share: {
            type: Sequelize.BOOLEAN,
			defaultValue: false
		},
		system_role_id: {
            type: Sequelize.INTEGER,
			defaultValue: false,
			allowNull: false,
		},
		template_id: {
            type: Sequelize.INTEGER,
			defaultValue: false,
			allowNull: false,
        }
    })
    return systemRoleRights
}