var RewardEnum = require('./../enum/rewardEnum');
module.exports = (sequelize, Sequelize) => {
    const reward_conf = sequelize.define('reward_conf', {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        reward_type: {
            type: Sequelize.ENUM,
            values: [
                RewardEnum.SIGNUPREWARD, 
                RewardEnum.REFERRALREWARD,
                RewardEnum.ALLDOCUMENTSREWARD,
                RewardEnum.ALLERGYDOCUMENTREWARD,
                RewardEnum.MEDICATIONDOCUMENTREWARD,
                RewardEnum.PROCEDUREDOCUMENTREWARD
            ],
            allowNull: false,
            defaultValue: RewardEnum.SIGNUPREWARD
        },
        reward_amount: {
            type: Sequelize.INTEGER,
            default: 0
        },
        max_users:{
            type: Sequelize.INTEGER,
            allowNull: true
        }
    });

    return reward_conf;

}