const path = require('path')
const logger = require('morgan')
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')

const app = express()
app.set('trust proxy', true)

app.use(cors())
app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

/*
    Routes
*/

const userRoute = require('./http/routes/userRoutes')
const adminRoute = require('./http/routes/adminRoutes')

const airDrop = require('./cron/airdrop')
if (process.env.NODE_ENV == 'production') {
  airDrop.startTask()
}

const voterReward = require('./cron/voterReward')
if (process.env.NODE_ENV == 'production') {
  voterReward.startTask()
}

app.use('/user', userRoute)
app.use('/admin', adminRoute)

global.healthportDb.authenticate()
  .then(() => console.log('Db Connected'))
  .catch(err => console.log(err))

console.log('Env var pvt key: ', process.env.MAIN_ACCOUNT_PRIVATE_KEY)

module.exports = app