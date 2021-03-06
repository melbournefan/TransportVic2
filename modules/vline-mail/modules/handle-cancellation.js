const utils = require('../../../utils')
const async = require('async')
const postDiscordUpdate = require('../../discord-integration')
const bestStop = require('./find-best-stop')
const findTrip = require('../../vline/find-trip')
const { getDayOfWeek } = require('../../../public-holidays')

async function discordUpdate(text) {
  await postDiscordUpdate('vlineInform', text)
}

async function setServiceAsCancelled(db, departureTime, origin, destination, isCoach) {
  let now = utils.now()
  if (now.get('hours') <= 2) now.add(-1, 'day')
  let today = utils.getYYYYMMDD(now)
  let operationDay = await getDayOfWeek(now)

  let gtfsTimetables = db.getCollection('gtfs timetables')
  let liveTimetables = db.getCollection('live timetables')
  let timetables = db.getCollection('timetables')

  if (departureTime.split(':')[0].length == 1) {
    departureTime = `0${departureTime}`
  }

  let trip
  let nspTrip = await findTrip(timetables, operationDay, origin, destination, departureTime)

  if (nspTrip) {
    trip = await liveTimetables.findDocument({
      operationDays: today,
      runID: nspTrip.runID,
      mode: 'regional train'
    }) || await findTrip(gtfsTimetables, today, origin, destination, departureTime)

    if (trip) {
      trip.runID = nspTrip.runID
      trip.vehicle = nspTrip.vehicle
    }
  } else {
    trip = await findTrip(liveTimetables, today, origin, destination, departureTime)
  }

  if (trip) {
    delete trip._id
    if (isCoach) {
      trip.type = 'replacement coach'
      trip.isRailReplacementBus = true
    } else {
      trip.type = 'cancellation'
      trip.cancelled = true
    }

    global.loggers.mail.info(`Marking ${departureTime} ${origin} - ${destination} train as cancelled.${isCoach ? ' Replacement coaches provided' : ''}`)
    await discordUpdate(`The ${departureTime} ${origin} - ${destination} service has been cancelled today.`)

    trip.operationDays = today

    await liveTimetables.replaceDocument({
      operationDays: today,
      runID: trip.runID,
      mode: 'regional train'
    }, trip, {
      upsert: true
    })
  } else {
    let identifier = {
      departureTime, origin, destination,
      operationDays: today
    }

    global.loggers.mail.err('Failed to find trip', identifier)
    await discordUpdate(`Was told the ${departureTime} ${origin} - ${destination} service has been cancelled, but could not match.`)
  }
}

async function cancellation(db, text) {
  let service = text.match(/(\d{1,2}[:.]\d{1,2}) ([\w ]*?) to ([\w ]*?) (?:service|train|will|has|is)/)

  if (service) {
    let departureTime = service[1].replace('.', ':')
    let origin = bestStop(service[2]) + ' Railway Station'
    let destination = bestStop(service[3]) + ' Railway Station'
    let isCoach = text.includes('coaches') && text.includes('replace')
    await setServiceAsCancelled(db, departureTime, origin, destination, isCoach)
  }
}

module.exports = cancellation
