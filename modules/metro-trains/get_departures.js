const TimedCache = require('timed-cache')
const async = require('async')
const ptvAPI = require('../../ptv-api')
const utils = require('../../utils')
const departuresCache = new TimedCache({ defaultTtl: 1000 * 60 * 1 })
const moment = require('moment')

let cityLoopStations = ['southern cross', 'parliament', 'flagstaff', 'melbourne central']

let burnleyGroup = [1, 2, 7, 9] // alamein, belgrave, glen waverley, lilydale
let caulfieldGroup = [4, 6, 11, 12] // cranbourne, frankston, pakenham, sandringham
let northenGroup = [3, 14, 15, 16, 17, 1482] // craigieburn, sunbury, upfield, werribee, williamstown, flemington racecourse
let cliftonHillGroup = [5, 8] // mernda, hurstbridge

function determineLoopRunning(routeID, runID, destination) {
  if (routeID === 13) return []

  let upService = cityLoopStations.includes(destination.toLowerCase()) || destination === 'Flinders Street'
  let throughCityLoop = runID[1] > 5 || upService

  if (routeID === 6 && destination == 'Southern Cross') {
    throughCityLoop = false
  }
  let stopsViaFlindersFirst = runID[1] <= 5

  cityLoopConfig = []

  // assume up trains
  if (northenGroup.includes(routeID)) {
    if (stopsViaFlindersFirst && !throughCityLoop)
    cityLoopConfig = ['NME', 'SSS', 'FSS']
    else if (stopsViaFlindersFirst && throughCityLoop)
    cityLoopConfig = ['SSS', 'FSS', 'PAR', 'MCE', 'FGS']
    else if (!stopsViaFlindersFirst && throughCityLoop)
    cityLoopConfig = ['FGS', 'MCE', 'PAR', 'FSS', 'SSS']
  } else {
    if (stopsViaFlindersFirst && throughCityLoop) { // flinders then loop
      if (burnleyGroup.concat(caulfieldGroup).concat(cliftonHillGroup).includes(routeID))
      cityLoopConfig = ['FSS', 'SSS', 'FGS', 'MCE', 'PAR']
    } else if (!stopsViaFlindersFirst && throughCityLoop) { // loop then flinders
      if (burnleyGroup.concat(caulfieldGroup).concat(cliftonHillGroup).includes(routeID))
      cityLoopConfig = ['PAR', 'MCE', 'FSG', 'SSS', 'FSS']
    } else if (stopsViaFlindersFirst && !throughCityLoop) { // direct to flinders
      if (routeID == 6) // frankston
      cityLoopConfig = ['RMD', 'FSS', 'SSS']
      else if (burnleyGroup.concat(caulfieldGroup).includes(routeID))
      cityLoopConfig = ['RMD', 'FSS']
      else if (cliftonHillGroup.includes(routeID))
      cityLoopConfig = ['JLI', 'FSS']
    }
  }

  if (!upService) { // down trains away from city
    cityLoopConfig.reverse()
  }

  return cityLoopConfig
}

async function getDepartures(station, db, departuresCount=6, includeCancelled=true, platform=null) {
  let cacheKey = station.stopName + 'M-' + departuresCount + '-' + includeCancelled + '-' + platform

  if (departuresCache.get(cacheKey)) {
    return departuresCache.get(cacheKey)
  }

  const gtfsTimetables = db.getCollection('gtfs timetables')

  const minutesPastMidnight = utils.getMinutesPastMidnightNow()
  let transformedDepartures = []

  const metroPlatform = station.bays.filter(bay => bay.mode === 'metro train')[0]
  const {departures, runs, routes} = await ptvAPI(`/v3/departures/route_type/0/stop/${metroPlatform.stopGTFSID}?gtfs=true&max_results=${departuresCount}&include_cancelled=${includeCancelled}&expand=run&expand=route${platform ? `&platform_numbers=${platform}` : ''}`)

  await async.forEach(departures, async departure => {
    const run = runs[departure.run_id]
    let routeName = routes[departure.route_id].route_name
    if (routeName === 'Showgrounds - Flemington Racecourse') routeName = 'Showgrounds/Flemington'
    let platform = departure.platform_number

    if (platform == null) { // show replacement bus
      if (departure.flags.includes('RRB-RUN')) platform = 'RRB';
      run.vehicle_descriptor = {}
    }

    if (departure.route_id === 13) { // stony point platforms
      if (station.stopName === 'Frankston Railway Station') platform = 3;
      else platform = 1;
      run.vehicle_descriptor = {} // ok maybe we should have kept the STY timetable but ah well
    }

    if (!platform) return // run too far away
    const runID = run.vehicle_descriptor.id

    const scheduledDepartureTime = moment.tz(departure.scheduled_departure_utc, 'Australia/Melbourne')
    const scheduledDepartureTimeMinutes = utils.getPTMinutesPastMidnight(scheduledDepartureTime)

    if (scheduledDepartureTime.diff(utils.now(), 'minutes') > 90) { // show only up to next 1.5 hr of departures
      return
    }

    const estimatedDepartureTime = departure.estimated_departure_utc ? moment.tz(departure.estimated_departure_utc, 'Australia/Melbourne') : null

    let destination = run.destination_name
    if (routeName === 'Frankston' && destination === 'Southern Cross')
      destination = 'Flinders Street'

    destination += ' Railway Station'

    let trip = (await gtfsTimetables.findDocuments({
      routeName,
      destination,
      operationDays: utils.getYYYYMMDDNow(),
      mode: "metro train",
      stopTimings: {
        $elemMatch: {
          stopGTFSID: metroPlatform.stopGTFSID,
          departureTimeMinutes: scheduledDepartureTimeMinutes
        }
      }
    }).limit(2).toArray())

    trip = trip.sort((a, b) => utils.time24ToMinAftMidnight(b.departureTime) - utils.time24ToMinAftMidnight(a.departureTime))[0]

    if (!trip) return console.log(departure, run)

    const cityLoopConfig = platform !== 'RRB' ? determineLoopRunning(departure.route_id, runID, run.destination_name) : []

    transformedDepartures.push({
      trip, scheduledDepartureTime, estimatedDepartureTime, platform,
      scheduledDepartureTimeMinutes, cancelled: run.status === 'cancelled', cityLoopConfig,
      destination: run.destination_name, runID
    })
  })

  transformedDepartures = transformedDepartures.sort((a, b) => {
    return (a.estimatedDepartureTime || a.scheduledDepartureTime) - (b.estimatedDepartureTime || b.scheduledDepartureTime)
  })

  departuresCache.put(cacheKey, transformedDepartures)
  return transformedDepartures
}

module.exports = getDepartures