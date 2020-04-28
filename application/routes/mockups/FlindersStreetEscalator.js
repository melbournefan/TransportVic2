const express = require('express')
const router = new express.Router()
const async = require('async')

const TrainUtils = require('./TrainUtils')
const getLineStops = require('./route-stops')

let cityStations = ['southern-cross', 'parliament', 'flagstaff', 'melbourne-central', 'flinders-street']

let stoppingTextMap = {
  stopsAll: 'Stops All Stations',
  allExcept: 'Not Stopping At {0}',
  expressAtoB: '{0} to {1}',
  sasAtoB: 'Stops All Stations from {0} to {1}',
  runsExpressAtoB: 'Runs Express from {0} to {1}',
  runsExpressTo: 'Runs Express to {0}',
  thenRunsExpressAtoB: 'then Runs Express from {0} to {1}',
  sasTo: 'Stops All Stations to {0}',
  thenSASTo: 'then Stops All Stations to {0}'
}

let stoppingTypeMap = {
  vlineService: {
    stoppingType: 'No Suburban Passengers'
  },
  sas: 'Stops All',
  limExp: 'Limited Express',
  exp: 'Express'
}

async function getData(req, res) {
  const station = await res.db.getCollection('stops').findDocument({
    codedName: (req.params.station || 'flinders-street') + '-railway-station'
  })

  return await TrainUtils.getPIDSDepartures(res.db, station, req.params.platform, stoppingTextMap, stoppingTypeMap)
}

router.get('/:platform/:station*?', async (req, res) => {
  let departures = await getData(req, res)

  res.render('mockups/flinders-street/escalator', {platform: req.params.platform})
})

router.post('/:platform/:station*?', async (req, res) => {
  let departures = await getData(req, res)
  let isCityStop = cityStations.includes(req.params.station)

  res.json({...departures, isCityStop})
})

module.exports = router
