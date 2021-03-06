const async = require('async')
const express = require('express')
const utils = require('../../../utils')
const router = new express.Router()
const url = require('url')
const querystring = require('querystring')
const moment = require('moment')
const vlineFleet = require('../../../additional-data/vline-tracker/vline-fleet')
const vlineConsists = require('../../../additional-data/vline-tracker/carriage-sets')
const { getDayOfWeek } = require('../../../public-holidays')

let lines = {
  Geelong: ['Geelong', 'Marshall', 'South Geelong', 'Waurn Ponds', 'Wyndham Vale', 'Warrnambool'],
  Ballarat: ['Ararat', 'Maryborough', 'Ballarat', 'Wendouree', 'Bacchus Marsh', 'Melton'],
  Bendigo: ['Bendigo', 'Kyneton', 'Epsom', 'Eaglehawk', 'Swan Hill', 'Echuca', 'Sunbury'],
  Gippsland: ['Traralgon', 'Sale', 'Bairnsdale', 'Pakenham'],
  Seymour: ['Seymour', 'Shepparton', 'Albury', 'Craigieburn']
}

router.get('/', (req, res) => {
  res.render('tracker/vline/index')
})

function adjustTrip(trip, date, today, minutesPastMidnightNow) {
  let e = utils.encodeName
  let {departureTime, destinationArrivalTime} = trip
  let departureTimeMinutes = utils.getMinutesPastMidnightFromHHMM(departureTime),
      destinationArrivalTimeMinutes = utils.getMinutesPastMidnightFromHHMM(destinationArrivalTime)

  let tripDate = trip.date

  if (departureTimeMinutes < 180) {
    departureTimeMinutes += 1440
    tripDate = utils.getYYYYMMDD(utils.parseDate(tripDate).add(1, 'day'))
  }
  if (destinationArrivalTimeMinutes < departureTimeMinutes) destinationArrivalTimeMinutes += 1440

  trip.url = `/vline/run/${e(trip.origin)}-railway-station/${trip.departureTime}/${e(trip.destination)}-railway-station/${trip.destinationArrivalTime}/${tripDate}`

  trip.departureTimeMinutes = departureTimeMinutes
  trip.active = minutesPastMidnightNow <= destinationArrivalTimeMinutes || date !== today

  return trip
}

router.get('/date', async (req, res) => {
  let {db} = res
  let vlineTrips = db.getCollection('vline trips')

  let today = utils.getYYYYMMDDNow()
  let {date} = querystring.parse(url.parse(req.url).query)
  if (date) date = utils.getYYYYMMDD(utils.parseDate(date))
  else date = today

  let minutesPastMidnightNow = utils.getMinutesPastMidnightNow()

  let trips = (await vlineTrips.findDocuments({ date })
    .sort({destination: 1}).toArray())
    .map(trip => adjustTrip(trip, date, today, minutesPastMidnightNow))
    .sort((a, b) => a.departureTimeMinutes - b.departureTimeMinutes)

  res.render('tracker/vline/by-date', {
    trips,
    date: utils.parseTime(date, 'YYYYMMDD')
  })
})

router.get('/line', async (req, res) => {
  let {db} = res
  let vlineTrips = db.getCollection('vline trips')

  let today = utils.getYYYYMMDDNow()
  let {date, line} = querystring.parse(url.parse(req.url).query)
  if (date) date = utils.getYYYYMMDD(utils.parseDate(date))
  else date = today

  let lineGroup = lines[line] || []

  let minutesPastMidnightNow = utils.getMinutesPastMidnightNow()

  let trips = (await vlineTrips.findDocuments({
    date,
    $or: [{
      origin: {
        $in: lineGroup
      }
    }, {
      destination: {
        $in: lineGroup
      }
    }]
  }).sort({destination: 1}).toArray())
  .map(trip => adjustTrip(trip, date, today, minutesPastMidnightNow))
  .sort((a, b) => a.departureTimeMinutes - b.departureTimeMinutes)

  res.render('tracker/vline/by-line', {
    trips,
    line,
    date: utils.parseTime(date, 'YYYYMMDD')
  })
})

router.get('/consist', async (req, res) => {
  let {db} = res
  let vlineTrips = db.getCollection('vline trips')
  let today = utils.getYYYYMMDDNow()
  let {consist, date} = querystring.parse(url.parse(req.url).query)
  if (date) date = utils.getYYYYMMDD(utils.parseDate(date))
  else date = today

  let minutesPastMidnightNow = utils.getMinutesPastMidnightNow()

  let trips = (await vlineTrips.findDocuments({ consist, date })
    .sort({destination: 1}).toArray())
    .map(trip => adjustTrip(trip, date, today, minutesPastMidnightNow))
    .sort((a, b) => a.departureTimeMinutes - b.departureTimeMinutes)

  let operationDays = await vlineTrips.distinct('date', { consist })
  let servicesByDay = {}

  await async.forEachSeries(operationDays, async date => {
    let humanDate = date.slice(6, 8) + '/' + date.slice(4, 6) + '/' + date.slice(0, 4)

    servicesByDay[humanDate] = {
      services: (await vlineTrips.distinct('runID', {
        consist, date
      })).sort((a, b) => a - b),
      date
    }
  })

  res.render('tracker/vline/by-consist', {
    trips,
    consist,
    servicesByDay,
    date: utils.parseTime(date, 'YYYYMMDD')
  })
})

router.get('/highlights', async (req, res) => {
  let {db} = res
  let vlineTrips = db.getCollection('vline trips')
  let nspTimetables = db.getCollection('timetables')
  let today = utils.getYYYYMMDDNow()
  let {consist, date} = querystring.parse(url.parse(req.url).query)
  if (date) date = utils.getYYYYMMDD(utils.parseDate(date))
  else date = today

  let dayOfWeek = await getDayOfWeek(utils.parseDate(date))

  let minutesPastMidnightNow = utils.getMinutesPastMidnightNow()

  let allTrips = (await vlineTrips.findDocuments({ date })
    .sort({destination: 1}).toArray())
    .filter(trip => trip.consist[0] !== '')
    .map(trip => adjustTrip(trip, date, today, minutesPastMidnightNow))
    .sort((a, b) => a.departureTimeMinutes - b.departureTimeMinutes)

  let doubleHeaders = allTrips.filter(trip => {
    return trip.consist[1] && trip.consist[0].startsWith('N') && trip.consist[1].startsWith('N')
  })

  let timetables = {}
  await async.forEach(allTrips, async trip => {
    timetables[trip.runID] = await nspTimetables.findDocument({
      runID: trip.runID,
      operationDays: dayOfWeek
    })
  })

  let consistTypeChanged = allTrips.filter(trip => {
    let nspTimetable = timetables[trip.runID]

    if (nspTimetable) {
      let tripVehicleType
      if (trip.consist[0].startsWith('VL')) tripVehicleType = 'VL'
      else if (trip.consist[0].startsWith('70')) tripVehicleType = 'SP'
      else {
        tripVehicleType = 'N +'
        let carriage = trip.consist.find(c => !c.startsWith('N') && !c.startsWith('P') && (c.includes('N') || c.includes('H')))
        if (carriage) tripVehicleType += carriage.includes('N') ? 'N' : 'H'
        else return true
      }

      let nspTripType = nspTimetable.vehicle
      if (nspTripType.endsWith('+PCJ')) nspTripType = nspTripType.slice(0, -4)

      let vlMatch = (nspTripType.includes('VL') || nspTripType.includes('VR')) && tripVehicleType == 'VL'
      let spMatch = nspTripType.includes('SP') && tripVehicleType == 'SP'

      if (vlMatch || spMatch) return false
      if (nspTripType.startsWith('N') && tripVehicleType.startsWith('N')) {
        return tripVehicleType.slice(-1) !== nspTripType.slice(-1)
      }

      return true
    }
  })

  let oversizeConsist = allTrips.filter(trip => {
    // We're only considering where consist type wasnt changed. otherwise 1xVL and 2xSP would trigger even though its equiv
    if (consistTypeChanged.includes(trip)) return false
    let nspTimetable = timetables[trip.runID]

    if (nspTimetable && !nspTimetable.flags.tripAttaches) {
      let tripVehicleType
      let nspTripType = nspTimetable.vehicle
      let consistSize = trip.consist.length
      let nspConsistSize = parseInt(nspTripType[0])
      if (nspTripType === '3VL') nspConsistSize = 1

      if (!trip.consist[0].startsWith('N')) {
        return consistSize > nspConsistSize
      }
    }
  })

  let setAltered = allTrips.filter(trip => {
    if (!trip.consist[0].startsWith('N')) return false
    let {consist, set} = trip
    let knownSet = vlineConsists[set]
    if (!knownSet) return true

    let carriages = consist.slice(1).filter(c => !c.startsWith('P'))

    if (knownSet.some(known => !carriages.includes(known))) return true
    if (carriages.some(car => !knownSet.includes(car))) return true
  })

  let unknownVehicle = allTrips.filter(trip => {
    return trip.consist.some(c => !vlineFleet.includes(c))
  })

  res.render('tracker/vline/highlights', {
    doubleHeaders,
    consistTypeChanged,
    oversizeConsist,
    setAltered,
    unknownVehicle,
    date: utils.parseTime(date, 'YYYYMMDD')
  })
})

module.exports = router
