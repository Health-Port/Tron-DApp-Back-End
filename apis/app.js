var path = require('path');
var logger = require('morgan');
var express = require('express');
var cors = require('cors');
var cookieParser = require('cookie-parser');

var app = express();

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

/*
    Routes
*/

var userRoute = require('./http/routes/userRoutes');

var airDrop = require('./cron/airdrop');
// airDrop.startTask();

var voterReward = require('./cron/voterReward');
voterReward.startTask();

app.use('/user', userRoute);

global.healthportDb.authenticate()
  .then(() => console.log("Db Connected"))
  .catch(err => console.log(err));

module.exports = app;
