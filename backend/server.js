var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var csv = require('fast-csv');
var _ = require("underscore");
var cors = require('cors');

var logger = (require('./helpers/logger')).logger;
var sessionHelper = require("./helpers/sessions");
var dbHelper = require('./helpers/database');
var propertyFieldsMap = require('./helpers/propertyFieldsMap').fieldsMap;

var app = express();
var port = process.env.PORT || 5000
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(sessionHelper.initSession());
app.use(cors());

var Users = require('./routes/Users')
var Properties = require('./routes/Properties')

app.post('/login', async (req, res) => {

    try {
        var email = req.body.email
        var pass = req.body.pass
        var result = await dbHelper.doesUserExist(email, pass);
        var user = result[0];
        if (user) {
            // set this session id in the user's table, and then for all the other pages (like update_properties) we need to check that the session is the same, and if it is, then we want to allow them, but if not, then we want to send back a redirect option, and then take them back to the login page to login
            await dbHelper.updateSessionId(user.id, req.sessionID);
            
            res.status(200).send({success: true});
        } else {
            res.status(200).send({success: false});
        }
    } catch(e) {
        logger.log('error', e, {origin: 'server'});
        res.status(500).send({success: false, error: e.stack.toString(), serverSideError: true});
    }
});

app.post('/log_event', (req, res) => {

    // logger defaults
    var level = "info";
    var message = null;
    var log = req.body;

    // add session id to metadata
    if (_.has(req, "sessionID")) {
        log.sid = req.sessionID;
    }

    if (_.has(log, "level")) {
        level = log.level;
        log = _.omit(log, "level");
    }

    if (_.has(log, "message")) {
        message = log.message;
        log = _.omit(log, "message");
    }

    logger.log(level, message, log);

    res.sendStatus(200);
});

app.use('/', Properties)

app.use('/users', Users)



app.listen(port, () =>{
    console.log('Express Server is running on port: ' + port)
})