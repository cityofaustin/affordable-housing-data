const Sequelize = require('sequelize')
const db = require('../database/db')

module.exports = db.sequelize.define(
    'Users',
    {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        first_name: {
            type: Sequelize.STRING
        },
        last_name: {
            type: Sequelize.STRING
        },
        email: {
            type: Sequelize.STRING
        },
        org: {
            type: Sequelize.STRING
        },
        passwd: {
            type: Sequelize.STRING
        },
        session_id: {
            type: Sequelize.STRING
        }
    },
    {
        timestamps: false
    }
)