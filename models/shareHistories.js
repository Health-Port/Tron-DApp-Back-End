module.exports = (sequelize, Sequelize) => {
    const shareHistories = sequelize.define('share_histories', {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            unique: true,
        },
		medical_record_id: {
            type: Sequelize.INTEGER,
            allowNull: false
		},
		share_from_user_id: {
            type: Sequelize.INTEGER,
            allowNull: false
		},
		share_with_user_id: {
            type: Sequelize.INTEGER,
            allowNull: false
		},
		access_token: {
            type: Sequelize.STRING,
            allowNull: false
        },
        status : {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: 'SUCCESS'
        },
        provider_reward : {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false
        }
    })
    return shareHistories
}