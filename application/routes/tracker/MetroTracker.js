const async = require('async')
const express = require('express')
const utils = require('../../../utils')
const router = new express.Router()
const url = require('url')
const querystring = require('querystring')
const moment = require('moment')
const stationCodes = require('../../../additional-data/station-codes')
const rawLineRanges = require('../../../additional-data/metro-tracker/line-ranges')
const lineGroups = require('../../../additional-data/metro-tracker/line-groups')

const metroTypes = require('../../../additional-data/metro-tracker/metro-types')
const metroConsists = require('../../../additional-data/metro-tracker/metro-consists')

let stationCodeLookup = {}

Object.keys(stationCodes).forEach(stationCode => {
  stationCodeLookup[stationCodes[stationCode]] = stationCode
})

function generateQuery(type) {
  let matchedMCars = metroConsists.filter(consist => consist.type === type).map(consist => consist.leadingCar)
  return metroConsists.filter(consist => matchedMCars.includes(consist[0]))
}

let comengQuery = { $in: generateQuery('Comeng') }
let siemensQuery = { $in: generateQuery('Siemens') }
let xtrapQuery = { $in: generateQuery('Xtrapolis') }

let lineRanges = {}

let lineGroupCodes = {
  'Caulfield': 'CFD',
  'Clifton Hill': 'CHL',
  'Burnley': 'BLY',
  'Northern': 'NTH'
}

let typeCode = {
  'Direct': 'direct',
  'Via BLY Loop': 'via_BLYLoop',
  'Via NTH Loop': 'via_NTHLoop',
  'Via CHL Loop': 'via_CHLLoop',
  'Via CFD Loop': 'via_CFDLoop',
  'Via City Circle': 'via_ccl',
  'NME Via SSS Direct': 'nme_viasss'
}

Object.keys(rawLineRanges).forEach(line => {
  let ranges = rawLineRanges[line]
  lineRanges[line] = ranges.map(range => {
    let lower = range[0]
    let upper = range[1]
    let prefix = range[2] || ''
    let numbers = []
    for (let n = lower; n <= upper; n++) {
      if (n < 1000) {
        n = utils.pad(n.toString(), prefix ? 3 : 4, '0')
      }
      numbers.push(prefix + n)
    }
    return numbers
  }).reduce((a, e) => a.concat(e), [])
})

router.get('/', (req, res) => {
  res.render('tracker/metro/index')
})

function adjustTrip(trip, date, today, minutesPastMidnightNow) {
  let e = utils.encodeName
  let {departureTime, destinationArrivalTime} = trip
  let departureTimeMinutes = utils.getMinutesPastMidnightFromHHMM(departureTime),
      destinationArrivalTimeMinutes = utils.getMinutesPastMidnightFromHHMM(destinationArrivalTime)

  let tripDate = trip.date

  if (destinationArrivalTimeMinutes < departureTimeMinutes) destinationArrivalTimeMinutes += 1440

  trip.url = `/metro/run/${e(trip.origin)}/${trip.departureTime}/${e(trip.destination)}/${trip.destinationArrivalTime}/${tripDate}`

  trip.departureTimeMinutes = departureTimeMinutes
  trip.active = minutesPastMidnightNow <= destinationArrivalTimeMinutes || date !== today

  return trip
}

router.get('/date', async (req, res) => {
  let {db} = res
  let metroTrips = db.getCollection('metro trips')

  let today = utils.getYYYYMMDDNow()
  let {date} = querystring.parse(url.parse(req.url).query)
  if (date) date = utils.getYYYYMMDD(utils.parseDate(date))
  else date = today

  let minutesPastMidnightNow = utils.getMinutesPastMidnightNow()

  let trips = (await metroTrips.findDocuments({ date })
    .sort({destination: 1}).toArray())
    .map(trip => adjustTrip(trip, date, today, minutesPastMidnightNow))
    .sort((a, b) => a.departureTimeMinutes - b.departureTimeMinutes)

  res.render('tracker/metro/by-date', {
    trips,
    date: utils.parseTime(date, 'YYYYMMDD')
  })
})

router.get('/line', async (req, res) => {
  let {db} = res
  let metroTrips = db.getCollection('metro trips')
  let liveTimetables = db.getCollection('live timetables')

  let today = utils.getYYYYMMDDNow()
  let {date, line} = querystring.parse(url.parse(req.url).query)
  if (date) date = utils.getYYYYMMDD(utils.parseDate(date))
  else date = today

  let minutesPastMidnightNow = utils.getMinutesPastMidnightNow()

  let baseLineRanges = lineRanges[line] || []

  let additionalTDNs = await liveTimetables.distinct('runID', {
    operationDays: date,
    routeName: line
  })

  let trips = (await metroTrips.findDocuments({
    date,
    runID: {
      $in: baseLineRanges.concat(additionalTDNs)
    }
  }).sort({destination: 1}).toArray())
  .map(trip => adjustTrip(trip, date, today, minutesPastMidnightNow))
  .sort((a, b) => a.departureTimeMinutes - b.departureTimeMinutes)

  res.render('tracker/metro/by-line', {
    trips,
    line,
    date: utils.parseTime(date, 'YYYYMMDD')
  })
})

router.get('/consist', async (req, res) => {
  let {db} = res
  let metroTrips = db.getCollection('metro trips')
  let today = utils.getYYYYMMDDNow()
  let {consist, date} = querystring.parse(url.parse(req.url).query)
  if (date) date = utils.getYYYYMMDD(utils.parseDate(date))
  else date = today

  let minutesPastMidnightNow = utils.getMinutesPastMidnightNow()

  let trips = (await metroTrips.findDocuments({ consist, date })
    .sort({destination: 1}).toArray())
    .map(trip => adjustTrip(trip, date, today, minutesPastMidnightNow))
    .sort((a, b) => a.departureTimeMinutes - b.departureTimeMinutes)

  let operationDays = await metroTrips.distinct('date', { consist })
  let servicesByDay = {}

  await async.forEachSeries(operationDays, async date => {
    let humanDate = date.slice(6, 8) + '/' + date.slice(4, 6) + '/' + date.slice(0, 4)

    servicesByDay[humanDate] = {
      services: (await metroTrips.distinct('runID', {
        consist, date
      })).sort((a, b) => a - b),
      date
    }
  })

  res.render('tracker/metro/by-consist', {
    trips,
    consist,
    servicesByDay,
    date: utils.parseTime(date, 'YYYYMMDD')
  })
})

router.get('/bot', async (req, res) => {
  let {db} = res
  let metroTrips = db.getCollection('metro trips')

  res.header('Access-Control-Allow-Origin', '*')

  let {runID, consist, date} = querystring.parse(url.parse(req.url).query)

  let trips = []

  if (runID) {
    trips = await metroTrips.findDocuments({
      date,
      runID
    }).sort({departureTime: 1}).toArray()
  } else if (consist) {
    trips = await metroTrips.findDocuments({
      date,
      consist
    }).sort({departureTime: 1}).toArray()
  }

  let extraData = {}

  if (consist && !trips.length) {
    extraData.lastSeen = (await metroTrips.distinct('date', { consist })).slice(-1)[0]
  }

  res.json({
    trips: trips.map(adjustTrip).map(trip => {
      trip.originCode = stationCodeLookup[trip.origin]
      trip.destinationCode = stationCodeLookup[trip.destination]

      let runID = trip.runID
      let type = null
      let viaLoop = runID[1] > 5
      let line = Object.keys(lineRanges).find(possibleLine => {
        return lineRanges[possibleLine].includes(runID)
      })

      if (!line) return trip
      let lineGroup = lineGroups[line]

      // Down, handles CCL too
      if (trip.destination === 'Flinders Street' || trip.origin === 'Flinders Street') {
        if (viaLoop) {
          if (lineGroup === 'City Circle') type = 'Via City Circle'
          else type = `Via ${lineGroupCodes[lineGroup]} Loop`
        } else {
          if (trip.destination === 'Southern Cross') type = 'Direct'
          else if (lineGroup === 'Northern') type = 'NME Via SSS Direct'
          else type = 'Direct'
        }

        trip.type = type
        trip.typeCode = typeCode[type]
      }

      return trip
    }),
    extraData
  })
})

module.exports = router
