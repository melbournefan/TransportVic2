const ical = require('node-ical')
const path = require('path')
const moment = require('moment')
const DatabaseConnection = require('./database/DatabaseConnection')
const config = require('./config.json')
const utils = require('./utils')

const database = new DatabaseConnection(config.databaseURL, config.databaseName)
let gtfsTimetables

database.connect(async err => {
  gtfsTimetables = database.getCollection('gtfs timetables')
})

let rawEvents = ical.sync.parseFile(path.join(__dirname, 'additional-data/vic-holidays.ics'))
let events = Object.values(rawEvents).slice(1)

let eventCache = {}
let dayCache = {}

function editName(name) {
  if (name === 'Saturday before Easter Sunday') return 'Easter Saturday'
  if (name === 'Friday before the AFL Grand Final') return 'AFL Grand Final Friday'

  return name
}

events.forEach(event => {
  let start = event.start.toISOString()
  let day = utils.parseTime(start)
  let name = editName(event.summary)

  eventCache[utils.getYYYYMMDD(day)] = name
})

function getPublicHolidayName(time) {
  return eventCache[utils.getYYYYMMDD(time)]
}

async function getPHDayOfWeek(time) {
  let day = utils.getYYYYMMDD(time)
  if (eventCache[day]) {
    if (dayCache[day]) {
      return dayCache[day]
    } else {
      let count782 = await gtfsTimetables.countDocuments({
        operationDays: day,
        routeGTFSID: '4-782',
        mode: 'bus',
        gtfsDirection: '0' // flinders - frankston
      })

      let hasFlinders = await gtfsTimetables.countDocuments({
        operationDays: day,
        routeGTFSID: '4-782',
        mode: 'bus',
        gtfsDirection: '0', // flinders - frankston
        origin: 'Wood Street/Cook Street',
      })

      let phDay

      if (count782 === 15) phDay = 'Saturday'
      if (count782 === 14) {
        if (hasFlinders) phDay = 'Weekday'
        else phDay = 'Sunday'
      }

      dayCache[day] = phDay
      return phDay
    }
  } else {
    return null
  }
}

async function getDayOfWeek(time) {
  let phDay = await getPHDayOfWeek(time)
  let regularDay = utils.getDayOfWeek(time)
  if (!phDay || phDay === 'Weekday') return regularDay

  if (phDay === 'Saturday') return 'Sat'
  else return 'Sun'
}

module.exports = {
  getPublicHolidayName,
  getPHDayOfWeek,
  getDayOfWeek
}
