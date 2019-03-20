const express = require('express')
const users = express.Router()
const cors = require('cors')
const bcrypt = require('bcrypt')

const User = require('../models/User')

const saltrounds = 11

users.get('/showall', function(req, res) {
  User.findAll().then(users => res.json(users))
});

users.post('/register', (req, res) => {
    const today = new Date()
    const userData = {
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        email: req.body.email,
        org: req.body.org,
        passwd: req.body.passwd,
        created: today
    }

    User.findOne({
        where: {
            email: req.body.email
        }
    }) 
        .then(user=> {
            if(!user){
                bcrypt.hash(req.body.passwd, saltrounds, (err, hash) => {
                    userData.passwd = hash
                    User.create(userData)
                        .then (user => {
                            res.json({status: user.email + ' registered'})
                        })
                        .catch(err => {
                            res.send('error:' + err)
                        })
                })
            } else {
                res.json({error: "User already exists"})
            }
        })
        .catch(err => {
            res.send('error: ' + err)
        })
})

users.get('/profile/:id', (req, res) => {
    User.findByPk(req.params.id)
    .then (user => {
      res.json(user);
    })
})

users.put('/profile/:id', (req, res) => {
    const id = req.params.id
    const userData = {
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        org: req.body.org,
        email: req.body.email,
        passwd: req.body.passwd
    }
    User.findByPk(id)
        .then (User => {
            if(!User){
                res.json({error: "User not in database"})
            } else {
                bcrypt.hash('passwd', 11, function(err, hash) {
                    userData.passwd = hash
                    User.update( {first_name: req.body.first_name, last_name: req.body.last_name, org: req.body.org, email: req.body.email, passwd: userData.passwd},
                        { where : {id: req.params.id}} )
                        .then( () => {
                            res.status(200).send("updated successfully a customer with id = " + id);
                        })
                        .catch(err => {
                            res.send('error: ' + err)
                        })

                  });
            }
        })
        .catch(err => {
            res.send('error: ' + err)
        })
})


module.exports = users