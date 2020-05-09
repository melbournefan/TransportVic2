const async = require('async')
const DatabaseConnection = require('../../../database/DatabaseConnection')
const config = require('../../../config.json')
const utils = require('../../../utils')
const datamartStops = require('../../../spatial-datamart/train-stations.json').features
const updateStats = require('../../utils/stats')

let stops

const database = new DatabaseConnection(config.databaseURL, config.databaseName)

async function updateStop(stopGTFSID, zone) {
  let dbStop = await stops.findDocument({
    'bays.stopGTFSID': parseInt(stopGTFSID)
  })

  let vlinePlatform = dbStop.bays.find(b => b.mode === 'regional train')
  vlinePlatform.mykiZones = zone

  await stops.replaceDocument({
    _id: dbStop._id
  }, dbStop)
}

database.connect({
  poolSize: 100
}, async err => {
  stops = database.getCollection('stops')
  let updated = 0

  await async.forEach(datamartStops, async stop => {
    let {properties} = stop
    if (properties.STOPID_VLI && !properties.STOPID_MET && properties.STOP_ZONE) { // filter out overland stations
      let zone = properties.STOP_ZONE.slice(5)
      let stopGTFSID = properties.STOPID_VLI

      if (zone === '') { // non-myki zone
        await updateStop(stopGTFSID, 'Paper Ticketed')
      } else {
        let zones = zone.split(', ').map(e=>parseInt(e)).sort((a, b) => a - b)
        if (zones.includes(1)) zones.pop()

        await updateStop(stopGTFSID, zones)
      }

      updated++
    }
  })

  updateStats('vline-stop-zones', updated)
  console.log('Completed loading in ' + updated + ' V/Line stop zones')
  process.exit()
})