const fs = require('fs')
const path = require('path')
const async = require('async')
const DatabaseConnection = require('../../database/DatabaseConnection')
const BufferedLineReader = require('../divide-and-conquer/BufferedLineReader')
const config = require('../../config.json')
const loadStops = require('../utils/load-stops')
const gtfsUtils = require('../../gtfs-utils')

const database = new DatabaseConnection(config.databaseURL, config.databaseName)
const updateStats = require('../utils/stats')

let permittedStops = [
 "Gunning Station",
 "Harden Station",
 "Broadmeadows Station",
 "Albury Station",
 "Moss Vale Station",
 "Yass Station",
 "Seymour Station",
 "Melbourne (Southern Cross) Station",
 "The Rock Station",
 "Henty Station",
 "Culcairn Station",
 "Wangaratta Station",
 "Benalla Station",
 "Junee Station",
 "Goulburn Station",
 "Campbelltown Station",
 "Central Station",
 "Cootamundra Station",
 "Wagga Wagga Station"
]

let suburbs = {
  Central: "Sydney, NSW",
  "Wagga Wagga": "Turvey Park, NSW"
}

database.connect({
  poolSize: 100
}, async err => {
  let stops = database.getCollection('stops')
  let stopsLineReader = new BufferedLineReader(path.join(__dirname, '../../gtfs/14/stops.txt'))
  await stopsLineReader.open()

  let stopsData = []

  while (stopsLineReader.available()) {
    let line = await stopsLineReader.nextLine()
    line = gtfsUtils.splitLine(line)

    let rawStopName = line[1]
    if (!rawStopName.includes(' Station')) rawStopName += ' Station'
    let stopName = rawStopName.replace(/ Plat.+/, '').trim()

    if (permittedStops.includes(stopName) && rawStopName.includes('Platform')) {
      let originalName = line[1].replace('Station', 'Railway Station')
      let mergeName = stopName.replace('Station', 'Railway Station')
      let stopGTFSID = parseInt(line[0].replace('P', '0')) + 140000000
      let fakeSuburb = stopName.replace(' Station', '')
      fakeSuburb = suburbs[fakeSuburb] || fakeSuburb + ', NSW'

      if (mergeName === 'Melbourne (Southern Cross) Station') mergeName = 'Southern Cross Railway Station'

      stopsData.push({
        originalName,
        fullStopName: mergeName,
        stopGTFSID,
        location: {
          type: 'Point',
          coordinates: [parseFloat(line[3]), parseFloat(line[2])]
        },
        stopNumber: null,
        mode: 'regional train',
        suburb: fakeSuburb
      })
    }
  }

  await loadStops(stops, stopsData, {})

  await updateStats('xpt-stations', stopsData.length)
  console.log('Completed loading in ' + stopsData.length + ' xpt stations')
  process.exit()
})
