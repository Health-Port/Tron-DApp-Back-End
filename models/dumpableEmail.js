module.exports = (sequelize, Sequelize) => {
    const dumpable_emails = sequelize.define('dumpable_emails', {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            unique: true,
        },
        domain_name: {
            type: Sequelize.STRING,
            allowNull: false
		}, 
        status: {
            type: Sequelize.BOOLEAN,
            defaultValue: true
        }
    })
    return dumpable_emails
}