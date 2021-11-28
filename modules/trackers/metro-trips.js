const async = require('async')
const config = require('../../config')
const utils = require('../../utils')
const urls = require('../../urls')
const DatabaseConnection = require('../../database/DatabaseConnection')
const schedule = require('./scheduler')
const ptvAPI = require('../../ptv-api')
const { getDayOfWeek } = require('../../public-holidays')
const { singleSTYTrains } = require('../metro-trains/add-stony-point-data')

const routeGTFSIDs = require('../../additional-data/metro-route-gtfs-ids')

const database = new DatabaseConnection(config.databaseURL, config.databaseName)
let dbStops
let liveTimetables

let secondsTo3AM = 3 * 60 * 60
let secondsInDay = 1440 * 60

let undergroundLoopStations = ['Parliament', 'Flagstaff', 'Melbourne Central']
let cityLoopStations = ['Southern Cross', ...undergroundLoopStations]

let routes = {
  'Alamein': '82',
  'Belgrave': '84',
  'Craigieburn': '85',
  'Cranbourne': '86',
  'Frankston': '88',
  'Glen Waverley': '89',
  'Hurstbridge': '90',
  'Lilydale': '91',
  'Pakenham': '92',
  'Sandringham': '93',
  'Mernda': '87',
  'Stony Point': '94',
  'Sunbury': '95',
  'Upfield': '96',
  'Werribee': '97',
  'Williamstown': '98'
}

let stySinglePlatform = [
  'Leawarra',
  'Baxter',
  'Somerville',
  'Tyabb',
  'Hastings',
  'Bittern',
  'Morradoo',
  'Crib Point',
  'Stony Point'
]

async function getTimetable(id) {
  return await utils.getData('metro-op-timetable', id, async () => {
    return JSON.parse(await utils.request(urls.op.format(id), { timeout: 17000 }))
  }, 1000 * 60 * 5)
}

async function getStation(name) {
  return await utils.getData('metro-station-platform', name, async () => {
    let stopData = await dbStops.findDocument({ stopName: name })
    if (!stopData) console.log(name)
    let metroBay = stopData.bays.find(bay => bay.mode === 'metro train')

    return metroBay
  }, 1000 * 60 * 60)
}

async function requestDepartureData() {
  return await utils.getData('metro-live-departures', 'departures', async () => {
    let data = JSON.parse(await utils.request(urls.hcmt, { timeout: 15000 }))
    return data.entries.map(stop => {
      if (stop.estimated_arrival_time_seconds < 10800) stop.estimated_arrival_time_seconds += secondsInDay
      if (stop.estimated_departure_time_seconds < 10800) stop.estimated_departure_time_seconds += secondsInDay

      return stop
    })
  }, 1000 * 60 * 1)
}

async function appendNewData(existingTrip, trip, stopDescriptors, startOfDay) {
  existingTrip.stopTimings.forEach(stop => {
    let updatedData = stopDescriptors.find(newStop => stop.stopName.includes(newStop.station))

    if (updatedData) {
      let minutes = updatedData.estimated_departure_time_seconds / 60
      stop.estimatedDepartureTime = utils.getMomentFromMinutesPastMidnight(minutes, startOfDay)
      stop.platform = updatedData.estimated_platform
    }
  })

  existingTrip.stopTimings.forEach(stop => {
    if (stop.estimatedDepartureTime) {
      if (stop.actualDepartureTimeMS < stop.scheduledDepartureTime) {
        stop.estimatedDepartureTime = stop.scheduledDepartureTime.clone() // Disallow being early
      }
    }
  })

  existingTrip.stopTimings.forEach(stop => {
    if (stop.estimatedDepartureTime && stop.estimatedDepartureTime.toISOString) { // If it is an existing value it is already a string
      stop.actualDepartureTimeMS = +stop.estimatedDepartureTime
      stop.estimatedDepartureTime = stop.estimatedDepartureTime.toISOString()
    }
  })

  let existingLastStop = existingTrip.destination
  let index = stopDescriptors.findIndex(stop => existingLastStop.includes(stop.station))

  if (index !== -1) {
    let baseTrip = stopDescriptors.slice(index + 1).map(stop => parseRawData(stop, startOfDay))

    let newStops = await mapStops(baseTrip, stopDescriptors, startOfDay)
    existingTrip.stopTimings = existingTrip.stopTimings.concat(newStops)
  }

  if (trip.stopsAvailable.some(stop => stop.isAdditional)) {
    let removedStops = trip.stopsAvailable.filter(stop => !stop.isAdditional).map(stop => stop.stopName)
    existingTrip.stopTimings.forEach(stop => {
      if (removedStops.includes(stop.stopName)) {
        stop.cancelled = true
      }
    })
  }

  let lastStop = existingTrip.stopTimings[existingTrip.stopTimings.length - 1]

  let updatedTimetable = {
    ...existingTrip,
    trueDestination: lastStop.stopName,
    destination: lastStop.stopName,
    trueDestinationArrivalTime: lastStop.arrivalTime,
    destinationArrivalTime: lastStop.arrivalTime,
    cancelled: trip.stopsAvailable[0].cancelled,
    forming: trip.forming === '0' ? null : trip.forming
  }

  return updatedTimetable
}

async function mapStops(stops, stopDescriptors, startOfDay) {
  let allStops = await async.map(stops, async stop => {
    let metroBay = await getStation(stop.stopName)

    let scheduledTime = utils.formatHHMM(stop.scheduledDepartureTime)
    let departureData = stopDescriptors.find(stopDescriptor => stop.stopName.startsWith(stopDescriptor.station))
    let estimatedDepartureTime, platform = stop.platform

    if (departureData) {
      let minutes = departureData.estimated_departure_time_seconds / 60
      estimatedDepartureTime = utils.getMomentFromMinutesPastMidnight(minutes, startOfDay)
      platform = departureData.estimated_platform
    }

    return {
      stopName: stop.stopName,
      stopNumber: null,
      suburb: metroBay.suburb,
      stopGTFSID: metroBay.stopGTFSID,
      arrivalTime: scheduledTime,
      arrivalTimeMinutes: stop.scheduledDepartureMinutes,
      departureTime: scheduledTime,
      departureTimeMinutes: stop.scheduledDepartureMinutes,
      estimatedDepartureTime,
      actualDepartureTimeMS: estimatedDepartureTime ? +estimatedDepartureTime : +stop.scheduledDepartureTime,
      scheduledDepartureTime: stop.scheduledDepartureTime.toISOString(),
      platform,
      stopConditions: { pickup: "0", dropoff: "0" }
    }
  })

  allStops.forEach(stop => {
    if (stop.estimatedDepartureTime) {
      if (stop.actualDepartureTimeMS < stop.scheduledDepartureTime) {
        stop.estimatedDepartureTime = stop.scheduledDepartureTime.clone() // Disallow being early
      }
    }
  })

  allStops.forEach(stop => {
    if (stop.estimatedDepartureTime) {
      stop.estimatedDepartureTime = stop.estimatedDepartureTime.toISOString()
    }
  })

  return allStops
}

async function createTrip(trip, stopDescriptors, startOfDay, routeName) {
  let stopTimings = await mapStops(trip.stopsAvailable, stopDescriptors, startOfDay)

  let baseTrip = {
    stopTimings,
    direction: trip.direction
  }

  let firstStop = baseTrip.stopTimings[0]
  let lastStop = baseTrip.stopTimings[baseTrip.stopTimings.length - 1]

  let routeGTFSID = routeGTFSIDs[routeName]

  let tripDirectionIndicator = 'Down'
  if (routeName === 'Mernda') tripDirectionIndicator = 'Up'
  let gtfsDirection = trip.direction === tripDirectionIndicator ? '0' : '1'

  let vehicle = null
  if (routeName === 'Stony Point') {
    let dayOfWeek = await getDayOfWeek(startOfDay)

    vehicle = { size: 2, type: 'Sprinter', consist: [] }

    if (!['Sat', 'Sun'].includes(dayOfWeek) && singleSTYTrains.includes(trip.runID)) {
      vehicle.size = 1
    }
  }

  let timetable = {
    mode: 'metro train',
    routeName,
    routeGTFSID,
    runID: trip.runID,
    formedBy: null,
    forming: trip.forming === '0' ? null : trip.forming,
    vehicle,
    operationDays: trip.operationDays,
    stopTimings: baseTrip.stopTimings,
    trueDestination: lastStop.stopName,
    destination: lastStop.stopName,
    trueDestinationArrivalTime: lastStop.arrivalTime,
    destinationArrivalTime: lastStop.arrivalTime,
    departureTime: firstStop.departureTime,
    trueDepartureTime: firstStop.departureTime,
    origin: firstStop.stopName,
    trueOrigin: firstStop.stopName,
    gtfsDirection,
    direction: trip.direction,
    shapeID: '',
    gtfsMode: 2,
    cancelled: trip.stopsAvailable[0].cancelled
  }

  return timetable
}

function parseRawData(stop, startOfDay) {
  let minutes = stop.time_seconds / 60
  let scheduledDepartureTime = utils.getMomentFromMinutesPastMidnight(minutes, startOfDay)

  // These services sometimes show as platform 0
  if (stySinglePlatform.includes(stop.station)) stop.platform = '1'
  if (stop.station === 'Wattleglen') stop.station = 'Wattle Glen'
  if (stop.station === 'St Albans') stop.station = 'St. Albans'

  return {
    stopName: stop.station + ' Railway Station',
    stopSeconds: stop.time_seconds,
    scheduledDepartureTime,
    scheduledDepartureMinutes: Math.round(parseInt(stop.time_seconds) / 60),
    platform: stop.platform,
    cancelled: stop.status === 'C',
    isAdditional: stop.status === 'A'
  }
}

async function checkTrip(trip, stopDepartures, startOfDay, day, now, routeName) {
  let existingTrip = await liveTimetables.findDocument({
    mode: 'metro train',
    operationDays: day,
    runID: trip.runID
  })

  let stopDescriptors = stopDepartures.filter(stop => stop.trip_id === trip.runID).sort((a, b) => a.time_seconds - b.time_seconds)

  if (existingTrip) {
    return await appendNewData(existingTrip, trip, stopDescriptors, startOfDay)
  } else {
    return await createTrip(trip, stopDescriptors, startOfDay, routeName)
  }
}

async function getDepartures(routeName) {
  let routeID = routes[routeName]
  let timetable = await getTimetable(routeID)

  let startOfDay = utils.now().startOf('day')
  let day = utils.getYYYYMMDD(startOfDay)
  let now = utils.now()
  let dayOfWeek = await getDayOfWeek(now)
  let metroDay = startOfDay.format('YYYY-MM-DD')

  let stopDepartures = await requestDepartureData()

  let tripsToday = timetable.filter(trip => {
    return trip.date === metroDay
  })

  let allTrips = Object.values(tripsToday.reduce((trips, stop) => {
    let runID = stop.trip_id
    if (!trips[runID]) trips[runID] = {
      runID: runID,
      forming: stop.forms_trip_id,
      stopsAvailable: [],
      direction: runID[3] % 2 === 0 ? 'Up' : 'Down',
      operationDays: day
    }

    trips[runID].stopsAvailable.push(parseRawData(stop, startOfDay))

    return trips
  }, {}))

  let routeTrips = await async.map(allTrips, async trip => {
    return await checkTrip(trip, stopDepartures, startOfDay, day, now, routeName)
  })

  return routeTrips
}

async function loadTrips() {
  let allLines = Object.keys(routes)
  let allTrips = (await async.mapLimit(allLines, 5, async line => {
    return await getDepartures(line)
  })).reduce((a, e) => a.concat(e), [])

  let forming = {}
  let formedBy = {}

  allTrips.forEach(trip => {
    let { runID, forming } = trip
    if (forming) {
      forming[runID] = forming
      if (!formedBy[forming]) formedBy[forming] = []
      formedBy[forming].push(runID)
    }
  })

  allTrips.forEach(trip => {
    let formedByTrip
    if (formedBy[trip.runID]) {
      let possibleFormedByTrips = allTrips.filter(possibleTrip => formedBy[trip.runID].includes(possibleTrip.runID))
      if (possibleFormedByTrips.length === 1) formedByTrip = possibleFormedByTrips[0]
      else formedByTrip = possibleFormedByTrips.find(trip => !trip.cancelled) || possibleFormedByTrips[0]

      trip.formedBy = formedByTrip.runID
    }

    if (trip.direction === 'Down' && trip.trueOrigin === 'Flinders Street Railway Station' && trip.formedBy) { // Prepend loop stops from previous trip
      let tripFSSStop = trip.stopTimings.find(stop => stop.stopName === 'Flinders Street Railway Station')
      let fssIndex = trip.stopTimings.indexOf(tripFSSStop)

      if (formedByTrip && formedByTrip.trueDestination === 'Flinders Street Railway Station') {
        let formedByLoopStops = formedByTrip.stopTimings.filter(stop => cityLoopStations.includes(stop.stopName.slice(0, -16)))
        let fssStop = formedByTrip.stopTimings[formedByTrip.stopTimings.length - 1]

        if (fssStop.arrivalTimeMinutes < 180) return // Don't want to accidentally create a messed up trip with the wrong departure day etc

        if (formedByLoopStops.length) {
          tripFSSStop.arrivalTime = fssStop.arrivalTime
          tripFSSStop.arrivalTimeMinutes = fssStop.arrivalTimeMinutes // Show the proper arrival time into FSS

          let nonLoopStops = trip.stopTimings.filter((stop, i) => {
            if (cityLoopStations.includes(stop.stopName.slice(0, -16))) return i > fssIndex
            return true
          })

          let mergedTimings = [
            ...formedByLoopStops,
            ...nonLoopStops
          ]

          trip.stopTimings = mergedTimings
        }
      } else {
        trip.stopTimings = trip.stopTimings.slice(fssIndex)
      }
    } else {
      // Don't really need to bother with this as it is not as important
    }
  })

  let bulkOperations = []
  allTrips.forEach(trip => {
    bulkOperations.push({
      replaceOne: {
        filter: {
          mode: 'metro train',
          operationDays: trip.operationDays,
          runID: trip.runID
        },
        replacement: trip,
        upsert: true
      }
    })
  })

  await liveTimetables.bulkWrite(bulkOperations)
  global.loggers.trackers.metro.log(`Successfully updated ${bulkOperations.length} metro trips`)
}

async function requestTimings() {
  global.loggers.trackers.metro.info('Logging Metro trips')

  try {
    await loadTrips()
  } catch (e) {
    global.loggers.trackers.metro.err('Failed to find metro trips, skipping', e)
  }
}

database.connect(async () => {
  dbStops = database.getCollection('stops')
  liveTimetables = database.getCollection('live timetables')

  schedule([
    [180, 240, 6], // Run it from 3am - 4am, taking into account website updating till ~3.30am
    [240, 360, 4],
    [360, 1199, 1.5],
    [1200, 1380, 3],
    [1380, 1439, 4]
  ], requestTimings, 'hcmt tracker', global.loggers.trackers.metro)
})
