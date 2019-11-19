const config = require('../config.json')
const DatabaseConnection = require('../database/DatabaseConnection')
const utils = require('../utils')
const shuffle = require('lodash.shuffle')
const stops = require('../additional-data/tracker-stops')
const async = require('async')
const getDepartures = require('../modules/bus/get-departures')

const database = new DatabaseConnection(config.databaseURL, config.databaseName)
let dbStops
let refreshRate = 10

function isDay() {
  let minutes = utils.getMinutesPastMidnightNow()

  return 300 <= minutes && minutes <= 1260 // 0500 - 2100
}

function isNight() {
  let minutes = utils.getMinutesPastMidnightNow()

  return 1261 <= minutes && minutes <= 1410 // 2101 - 2330
}

/*
  Requests from:
  0500 - 2100: 160 req
  2100 - 2330: 15 req

*/
function updateRefreshRate() {
  if (isDay()) refreshRate = 7
  else if (isNight()) refreshRate = 10
  else {
    let minutes = utils.getMinutesPastMidnightNow()
    if (minutes < 300) minutes += 1440

    refreshRate = 1740 - minutes + 1
    console.log('Tracker going to sleep for ' + refreshRate + ' minutes')
  }
}

function pickRandomStops() {
  let size = 15
  if (isNight()) size = 6
  return shuffle(stops).slice(0, size)
}

async function requestTimings() {
  let stops = pickRandomStops()
  await async.forEachOf(stops, async (stop, i) => {
    console.log('requesting timings for', stop)
    let [codedSuburb, codedName] = stop.split('/')
    let dbStop = await dbStops.findDocument({ codedName, codedSuburb })

    setTimeout(async () => {
      await getDepartures(dbStop, database)
    }, i * 7500)
  })

  updateRefreshRate()
  setTimeout(requestTimings, refreshRate * 60 * 1000)
}

database.connect(async () => {
  dbStops = database.getCollection('stops')
  await requestTimings()
})
