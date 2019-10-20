// TODO: also refactor

const DatabaseConnection = require('../../database/DatabaseConnection')
const config = require('../../config.json')
const utils = require('../../utils')
const fs = require('fs')
const loadStops = require('../utils/load-stops')
const { createStopsLookup } = require('../utils/datamart-utils')
const stopsData = utils.parseGTFSData(fs.readFileSync('gtfs/2/stops.txt').toString())
const datamartStops = require('../../spatial-datamart/metro-train-stations.json').features

const database = new DatabaseConnection(config.databaseURL, 'TransportVic2')
let stops = null

database.connect({
  poolSize: 100
}, async err => {
  stops = database.getCollection('stops')

  let stopsLookup = createStopsLookup(datamartStops)
  let stopCount = await loadStops(stopsData, stops, 'metro train', stopsLookup)

  console.log('Completed loading in ' + stopCount + ' MTM railway stations')
  process.exit()
});
