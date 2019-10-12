const express = require('express')
const router = new express.Router()
const getDepartures = require('../../../modules/regional-coach/get-departures')
const moment = require('moment')
const utils = require('../../../utils')

router.get('/:stopName', async (req, res) => {
  const stop = await res.db.getCollection('stops').findDocument({
    codedName: req.params.stopName
  })

  if (!stop) {
    // TODO: create error page
    return res.end('Could not lookup timings for ' + req.params.stopName + '. Are you sure regional coaches stop there?')
  }

  let departures = await getDepartures(stop, res.db)

  departures = departures.map(departure => {
    const timeDifference = moment.utc(departure.scheduledDepartureTime.diff(utils.now()))

    if (+timeDifference <= 60000) departure.prettyTimeToArrival = 'Now'
    else {
      departure.prettyTimeToArrival = ''
      if (timeDifference.get('hours')) departure.prettyTimeToArrival += timeDifference.get('hours') + ' h '
      if (timeDifference.get('minutes')) departure.prettyTimeToArrival += timeDifference.get('minutes') + ' min'
    }

    departure.headwayDevianceClass = 'unknown'
    
    departure.codedLineName = utils.encodeName(departure.trip.routeName)

    return departure
  })

  res.render('timings/regional-coach', { departures, stop })
})

module.exports = router