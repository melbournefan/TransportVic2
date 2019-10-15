const async = require('async')
const moment = require('moment')
const utils = require('../../utils')
const urls = require('../../urls.json')
const cheerio = require('cheerio')
const request = require('request-promise')

const terminiToLines = require('../load-gtfs/vline-trains/termini-to-lines')

let modes = {
  'metro train': 0
}

module.exports = async function (db, originVNETName, destinationVNETName, originDepartureTime, runID) {
  let stopsCollection = db.getCollection('stops')
  let liveTimetables = db.getCollection('live timetables')
  let body = (await request(urls.vlineServiceStops.format(originVNETName, destinationVNETName, originDepartureTime, runID)))
    .replace(/a:/g, '')
  const $ = cheerio.load(body)

  let stops = Array.from($('Stop'))
  let dbStops = {}

  await async.forEach(stops, async stop => {
    let stopName = $('LocationName', stop).text()
    let locationID = $('LocationID', stop).text()

    let dbStop = await stopsCollection.findDocument({
      bays: {
        $elemMatch: {
          mode: 'regional train',
          vnetStationName: stopName
        }
      }
    })
    dbStops[locationID] = dbStop
  })

  let stopTimings = departures.map(departure => {
    let arrivalTime = $('ArrivalTime', departure).text()
    let departureTime = $('DepartureTime', departure).text()
    if (arrivalTime === '0001-01-01T00:00:00') arrivalTime = null
    else arrivalTime = moment.tz(arrivalTime, 'Australia/Melbourne')

    if (departureTime === '0001-01-01T00:00:00') departureTime = null
    else arrivalTime = moment.tz(departureTime, 'Australia/Melbourne')

    let locationID = $('LocationID', stop).text()
    let stopData = dbStops[locationID]
    let stopBay = stopData.filter(bay => bay.mode === 'regional train')[0]

    let departureTimeMinutes = utils.getPTMinutesPastMidnight(scheduledDepartureTime)

    let stopTiming = {
      stopName: stopBay.fullStopName,
      stopGTFSID: stopBay.stopGTFSID,
      arrivalTime: null,
      arrivalTimeMinutes: null,
      departureTime: null,
      departureTimeMinutes: null,
      estimatedDepartureTime: null,
      platform: null,
      stopConditions: ""
    }

    if (arrivalTime) {
      stopTiming.arrivalTime = arrivalTime.format('HH:mm')
      stopTiming.arrivalTimeMinutes = utils.getPTMinutesPastMidnight(arrivalTime)
    }
    if (departureTime) {
      stopTiming.departureTime = departureTime.format('HH:mm')
      stopTiming.departureTimeMinutes = utils.getPTMinutesPastMidnight(departureTime)
    }

    if (i == 0) {
      stopTiming.arrivalTime = null
      stopTiming.arrivalTimeMinutes = null
    } else if (i == departures.length - 1) {
      stopTiming.departureTime = null
      stopTiming.departureTimeMinutes = null
    }

    return stopTiming
  })

  let origin = stopTimings[0].stopName,
    dest = stopTimings[stopTimings.length - 1].stopName
  let originDest = `${origin.slice(0, -16)}-${dest.slice(0, -16)}`
  let routeName = terminiToLines[originDest] || terminiToLines[origin.slice(0, -16)] || terminiToLines[dest.slice(0, -16)]

  let timetable = {
    mode: 'regional train', routeName,
    runID,
    operationDay: utils.getYYYYMMDDNow(),
    vehicle: null,
    stopTimings,
    destination: dest,
    destinationArrivalTime: stopTimings[stopTimings.length - 1].arrivalTime,
    departureTime: stopTimings[0].departureTime,
    origin,
    type: 'timings'
  }

  let key = {
    mode, routeName: timetable.routeName,
    operationDay: timetable.operationDay,
    runID: timetable.runID
  }

  await liveTimetables.replaceDocument(key, timetable, {
    upsert: true
  })
  return timetable
}
