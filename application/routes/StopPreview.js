const express = require('express')
const utils = require('../../utils')
const router = new express.Router()
const bayData = require('../../additional-data/bus-bays')
const trainReplacementBays = require('../../additional-data/train-replacement-bays')
const platformGeometry = require('../../additional-data/station-platform-geometry')
const turf = require('@turf/turf')

router.post('/:suburb/:stopName', async (req, res) => {
  let stops = res.db.getCollection('stops')
  let stop = await stops.findDocument({
    codedName: req.params.stopName,
    codedSuburb: req.params.suburb
  })

  if (!stop) return res.json(null)

  let trainStationName = stop.stopName.slice(0, -16)

  stop.trainReplacementBays = trainReplacementBays[trainStationName]
  if (stop.trainReplacementBays) {
    let extraLocations = stop.trainReplacementBays.map(e => e.location.coordinates)
    stop.stationName = trainStationName
    stop.location.coordinates = stop.location.coordinates.concat(extraLocations)
  }

  stop.platformGeometry = platformGeometry[trainStationName] || null

  let allFeatures = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: stop.location
      }
    ]
  }

  if (stop.platformGeometry) {
    allFeatures.features = allFeatures.features.concat(stop.platformGeometry.map(g => ({
      type: "Feature",
      geometry: g.geometry
    })))
  }

  let bbox = turf.bboxPolygon(turf.bbox(allFeatures))
  stop.bbox = bbox
  res.json(stop)
})

router.get('/:suburb/:stopName', (req, res) => {
  res.render('stop-preview')
})

router.get('/bays', (req, res) => {
  res.json(bayData)
})

module.exports = router
