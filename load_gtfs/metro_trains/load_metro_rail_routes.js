// TODO: refactor even more - loop over all modes

const DatabaseConnection = require('../../database/DatabaseConnection')
const config = require('../../config.json')
const utils = require('../../utils')
const fs = require('fs')
const loadRoutes = require('../utils/load_routes')
const routeData = utils.parseGTFSData(fs.readFileSync('gtfs/2/routes.txt').toString())
const shapeData = utils.parseGTFSData(fs.readFileSync('gtfs/2/shapes.txt').toString())

const database = new DatabaseConnection(config.databaseURL, 'TransportVic2')
let routes = null

database.connect({
  poolSize: 100
}, async err => {
  routes = database.getCollection('routes')
  routes.createIndex({ routeName: 1 })

  let routeCount = await loadRoutes(routeData, shapeData, routes, () => ['Metro Trains Melbourne'], 'metro train')

  console.log('Completed loading in ' + routeCount + ' MTM routes')
  process.exit()
});
