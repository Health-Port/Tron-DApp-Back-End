module.exports = (sequelize, Sequelize) => {
    const user_files = sequelize.define('user_files', {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            unique: true,
            primaryKey: true
        },
        user_id: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        file_name: {
            type: Sequelize.STRING,
            allowNull: false,          
        },
        access_token: {
            type: Sequelize.STRING,
            allowNull: false,          
        }         
        
    })
    return user_files
}