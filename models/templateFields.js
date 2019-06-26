module.exports = (sequelize, Sequelize) => {
      const templateFields = sequelize.define('template_fields', {
            id: {
                  type: Sequelize.INTEGER,
                  autoIncrement: true,
                  primaryKey: true
            },
            type: {
                  type: Sequelize.STRING,
                  allowNull: false
            },
            label: {
                  type: Sequelize.STRING,
                  allowNull: false
            },
            placeholder: {
                  type: Sequelize.STRING,
                  allowNull: false
            },
            required: {
                  type: Sequelize.BOOLEAN,
                  allowNull: false
            },
            attribute_list_id: {
                  type: Sequelize.INTEGER
            },
            template_id: {
                  type: Sequelize.INTEGER,
                  allowNull: false
            }
      })
      return templateFields
}