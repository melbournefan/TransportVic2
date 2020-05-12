const express = require('express')
const moment = require('moment')
const router = new express.Router()
const utils = require('../../../utils')
const ptvAPI = require('../../../ptv-api')
const getStoppingPattern = require('../../../modules/utils/get-stopping-pattern')
const stonyPointFormations = require('../../../modules/metro-trains/stony-point-formations')

async function pickBestTrip(data, db) {
  data.mode = 'metro train'
  let tripDay = moment.tz(data.operationDays, 'YYYYMMDD', 'Australia/Melbourne')
  let tripStartTime = moment.tz(`${data.operationDays} ${data.departureTime}`, 'YYYYMMDD HH:mm', 'Australia/Melbourne')
  let tripStartMinutes = utils.getPTMinutesPastMidnight(tripStartTime)
  let tripEndTime = moment.tz(`${data.operationDays} ${data.destinationArrivalTime}`, 'YYYYMMDD HH:mm', 'Australia/Melbourne')
  let tripEndMinutes = utils.getPTMinutesPastMidnight(tripEndTime)
  let operationHour = Math.floor(tripStartMinutes / 60) % 24

  let originStop = await db.getCollection('stops').findDocument({
    codedName: data.origin + '-railway-station',
    'bays.mode': 'metro train'
  })
  let destinationStop = await db.getCollection('stops').findDocument({
    codedName: data.destination + '-railway-station',
    'bays.mode': 'metro train'
  })
  if (!originStop || !destinationStop) return null
  let minutesToTripStart = tripStartTime.diff(utils.now(), 'minutes')
  let minutesToTripEnd = tripEndTime.diff(utils.now(), 'minutes')

  let query = {
    $and: [{
      mode: 'metro train',
      operationDays: data.operationDays
    }, {
      stopTimings: {
        $elemMatch: {
          stopName: originStop.stopName,
          departureTime: data.departureTime
        }
      }
    }, {
      stopTimings: {
        $elemMatch: {
          stopName: destinationStop.stopName,
          arrivalTime: data.destinationArrivalTime
        }
      }
    }]
  }

  let liveTrip = await db.getCollection('live timetables').findDocument(query)
  let useLive = minutesToTripEnd > -5 && minutesToTripStart < 120

  if (liveTrip) {
    if (liveTrip.type === 'timings' && new Date() - liveTrip.updateTime < 2 * 60 * 1000) {
      return liveTrip
    }
  }

  let gtfsTrip = await db.getCollection('gtfs timetables').findDocument(query)

  let isStonyPoint = data.origin === 'stony-point' || data.destination === 'stony-point'

  if (gtfsTrip && isStonyPoint) {
    if (isStonyPoint) {
      query.$and[0] = { mode: 'metro train', operationDays: utils.getPTDayName(tripStartTime) }
      let staticTrip = await db.getCollection('timetables').findDocument(query)
      if (!staticTrip) return gtfsTrip

      gtfsTrip.stopTimings = gtfsTrip.stopTimings.map(stop => {
        if (stop.stopName === 'Frankston Railway Station')
          stop.platform = '3'
        else
          stop.platform = '1'
        return stop
      })
      gtfsTrip.runID = staticTrip.runID
      if (utils.isWeekday(query.operationDays)) {
        if (stonyPointFormations.weekday[gtfsTrip.runID]) {
          gtfsTrip.vehicle = stonyPointFormations.weekday[gtfsTrip.runID]
        }
      }
      gtfsTrip.vehicle = gtfsTrip.vehicle || '2 Car Sprinter'
    }

    return gtfsTrip
  }

  if (!useLive) return gtfsTrip

  let originStopID = originStop.bays.filter(bay => bay.mode === 'metro train')[0].stopGTFSID
  let originTime = tripStartTime
  let expressCount = undefined
  if (gtfsTrip) {
    expressCount = 0
    let stops = gtfsTrip.stopTimings.map(stop => stop.stopName)
    let flindersIndex = stops.indexOf('Flinders Street Railway Station')

    if (flindersIndex && gtfsTrip.direction === 'Down') {
      let stopAfterFlinders = gtfsTrip.stopTimings[flindersIndex + 1]
      originStopID = stopAfterFlinders.stopGTFSID
      originTime = moment.tz(`${data.operationDays} ${stopAfterFlinders.departureTime}`, 'YYYYMMDD HH:mm', 'Australia/Melbourne')
    }

    gtfsTrip.stopTimings.forEach((stop, i) => {
      if (i === 0) return
      expressCount += stop.stopSequence - gtfsTrip.stopTimings[i - 1].stopSequence -1
    })
  }

  let referenceTrip = liveTrip || gtfsTrip

  // get first stop after flinders, or if only 1 stop (nme  shorts) then flinders itself
  // should fix the dumb issue of trips sometimes showing as forming and sometimes as current with crazyburn
  try {
    let isoDeparture = originTime.toISOString()
    let {departures, runs} = await ptvAPI(`/v3/departures/route_type/0/stop/${originStopID}?gtfs=true&date_utc=${originTime.clone().add(-3, 'minutes').toISOString()}&max_results=3&expand=run&expand=stop&include_cancelled=true`)

    let departure
    let isUp = referenceTrip.direction === 'Up'
    let possibleDepartures = departures.filter(departure => {
      let run = runs[departure.run_id]
      let destinationName = run.destination_name.trim()
      let scheduledDepartureTime = moment(departure.scheduled_departure_utc).toISOString()

      let timeMatch = scheduledDepartureTime === isoDeparture
      if (timeMatch) {
        if (isUp && departure.direction_id === 1) {
          return true
        } else {
          return utils.encodeName(destinationName) === data.destination
        }
      }
      return false
    })

    if (possibleDepartures.length > 1) {
      departure = possibleDepartures.filter(departure => {
        return runs[departure.run_id].express_stop_count === expressCount
      })[0]
    } else departure = possibleDepartures[0]

    // interrim workaround cos when services start from a later stop they're really cancelled
    // in the stops before, but PTV thinks otherwise...
    if (!departure) return referenceTrip
    let ptvRunID = departure.run_id
    let departureTime = departure.scheduled_departure_utc

    let trip = await getStoppingPattern(db, ptvRunID, 'metro train', departureTime)
    return trip
  } catch (e) {
    return gtfsTrip
  }
}

router.get('/:origin/:departureTime/:destination/:destinationArrivalTime/:operationDays', async (req, res) => {
  let trip = await pickBestTrip(req.params, res.db)
  if (!trip) return res.status(404).render('errors/no-trip')

  trip.destination = trip.destination.slice(0, -16)
  trip.origin = trip.origin.slice(0, -16)

  trip.stopTimings = trip.stopTimings.map(stop => {
    stop.prettyTimeToArrival = ''

    if (trip.cancelled) {
      stop.headwayDevianceClass = 'cancelled'

      return stop
    } else {
      stop.headwayDevianceClass = 'unknown'
    }

    if (stop.estimatedDepartureTime) {
      let scheduledDepartureTime =
        moment.tz(`${req.params.operationDays} ${stop.departureTime || stop.arrivalTime}`, 'YYYYMMDD HH:mm', 'Australia/Melbourne')
      let headwayDeviance = scheduledDepartureTime.diff(stop.estimatedDepartureTime, 'minutes')

      // trains cannot be early
      let lateThreshold = 5
      if (headwayDeviance <= -lateThreshold) { // <= 5min counts as late
        stop.headwayDevianceClass = 'late'
      } else {
        stop.headwayDevianceClass = 'on-time'
      }

      const timeDifference = moment.utc(moment(stop.estimatedDepartureTime).diff(utils.now()))

      if (+timeDifference < -30000) return stop
      if (+timeDifference <= 60000) stop.prettyTimeToArrival = 'Now'
      else {
        stop.prettyTimeToArrival = ''
        if (timeDifference.get('hours')) stop.prettyTimeToArrival += timeDifference.get('hours') + ' h '
        if (timeDifference.get('minutes')) stop.prettyTimeToArrival += timeDifference.get('minutes') + ' min'
      }
    }
    return stop
  })
  res.render('runs/metro', {trip})
})

module.exports = router
