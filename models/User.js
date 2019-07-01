const Sequelize = require('sequelize')
const db = require('../database/db')

module.exports = db.sequelize.define(
    'Users',
    {
        id: {type: Sequelize.INTEGER, primaryKey:true, autoIncrement:true},
        first_name: {type: Sequelize.STRING, notEmpty: true},
        last_name: {type: Sequelize.STRING, notEmpty: true},
        email: {type: Sequelize.STRING, validate: {isEmail:true}},
        org: {type: Sequelize.STRING},
        passwd: {type: Sequelize.STRING, allowNull: false},
        admin_flag: {type: Sequelize.INTEGER},
        session_id: {type: Sequelize.STRING},
    },
    {
        timestamps: false
    }
)