const express = require('express')
const router = new express.Router()
const getDepartures = require('../../../modules/heritage-train/get-departures')
const moment = require('moment')
const utils = require('../../../utils')
const async = require('async')

async function loadDepartures(req, res) {
  let stops = res.db.getCollection('stops')
  let station = await stops.findDocument({
    codedName: req.params.stopName + '-railway-station'
  })

  if (!station || !station.bays.find(bay => bay.mode === 'heritage train')) {
    return res.status(404).render('errors/no-stop')
  }

  let departures = await getDepartures(station, res.db)
  let stopGTFSIDs = station.bays.map(bay => bay.stopGTFSID)

  departures = departures.map(departure => {
    departure.pretyTimeToDeparture = utils.prettyTime(departure.actualDepartureTime, true, false)

    departure.headwayDevianceClass = 'unknown'
    departure.codedLineName = 'heritage-train'

    let currentStop = departure.trip.stopTimings.find(tripStop => stopGTFSIDs.includes(tripStop.stopGTFSID))
    let {stopGTFSID} = currentStop
    let minutesDiff = currentStop.departureTimeMinutes - departure.trip.stopTimings[0].departureTimeMinutes

    let tripStart = departure.scheduledDepartureTime.clone().add(-minutesDiff, 'minutes')
    let operationDate = utils.getYYYYMMDD(tripStart)

    departure.tripURL = `/heritage/run/${utils.encodeName(departure.trip.origin)}/${departure.trip.departureTime}/`
      + `${utils.encodeName(departure.trip.destination)}/${departure.trip.destinationArrivalTime}/`
      + `${operationDate}#stop-${stopGTFSID}`

    departure.destination = utils.getStopName(departure.trip.destination)
    departure.destinationURL = `/heritage/timings/${utils.encodeName(departure.trip.destination).slice(0, -16)}`

    return departure
  })

  return { departures, station }
}

router.get('/:stopName', async (req, res) => {
  let response = await loadDepartures(req, res)
  if (response) res.render('timings/heritage', response)
})

router.post('/:stopName', async (req, res) => {
  res.render('timings/templates/heritage', await loadDepartures(req, res))
})

module.exports = router
