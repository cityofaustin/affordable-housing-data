var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var path = require('path');
var cookieParser = require('cookie-parser');
// var logger = require('morgan');
var cors = require('cors');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// MIDDLE WARE
app.use(cors());
// app.use(logger('dev'));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

if (process.env.NODE_ENV !== 'production') {
    // app.use(express.static(path.join(__dirname, 'client/build')));
    console.log(process.env.NODE_ENV)
} else {
    // serve the react app file
    
}

app.use(express.static(path.join(__dirname, 'client/build')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

app.get('/*', function(req, res) {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'), function(err) {
        if (err) {
            res.status(500).send(err)
        }
    });
});



module.exports = app;
