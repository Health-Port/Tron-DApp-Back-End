
module.exports = (sequelize, Sequelize) => {
    const voter_rewards = sequelize.define('voter_rewards', {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        candidate_address: {
            type: Sequelize.STRING,
            allowNull: false
        },
        voter_address: {
            type: Sequelize.STRING,
            allowNull: false
        },
        votes: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        time_stamp: {
            type: Sequelize.DATE,
            allowNull: false
        },
        cycle_no: {
            type: Sequelize.INTEGER,
            allowNull: false
        }
    });
    return voter_rewards;
}