let path = require('path')
let logger = require('morgan')
let express = require('express')
let cors = require('cors')
let cookieParser = require('cookie-parser')

let app = express()

app.use(cors())
app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

/*
    Routes
*/

let userRoute = require('./http/routes/userRoutes')
let adminRoute = require('./http/routes/adminRoutes')

let airDrop = require('./cron/airdrop')
if (process.env.NODE_ENV == 'production') {
  //airDrop.startTask()
}

let voterReward = require('./cron/voterReward')
if (process.env.NODE_ENV == 'production') {
  voterReward.startTask()
}

app.use('/user', userRoute)
app.use('/admin', adminRoute)

global.healthportDb.authenticate()
  .then(() => console.log("Db Connected"))
  .catch(err => console.log(err))

module.exports = app