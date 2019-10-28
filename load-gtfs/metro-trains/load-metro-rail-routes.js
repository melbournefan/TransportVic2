// TODO: refactor even more - loop over all modes

const DatabaseConnection = require('../../database/DatabaseConnection')
const config = require('../../config.json')
const utils = require('../../utils')
const fs = require('fs')
const loadRoutes = require('../utils/load-routes')
const routeData = utils.parseGTFSData(fs.readFileSync('gtfs/2/routes.txt').toString())
const shapeData = utils.parseGTFSData(fs.readFileSync('gtfs/2/shapes.txt').toString())

const database = new DatabaseConnection(config.databaseURL, config.databaseName)
const updateStats = require('../utils/gtfs-stats')

let start = new Date()
let routes = null

database.connect({
  poolSize: 100
}, async err => {
  routes = database.getCollection('routes')

  let routeCount = await loadRoutes(routeData, shapeData, routes, () => ['Metro Trains Melbourne'], 'metro train', name => {
    name = name.replace('Flinders Street', '').replace('City ()', '').replace(' - ', '')
    if (name === 'FrankstonStony Point') return 'Stony Point'
    return name
  })
  await updateStats('mtm-route', routeCount, new Date() - start)

  console.log('Completed loading in ' + routeCount + ' MTM routes')
  process.exit()
});
