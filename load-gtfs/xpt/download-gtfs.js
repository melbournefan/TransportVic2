const tfnswAPI = require('../../modules/xpt/tfnsw-api.js')
const fs = require('fs')
const path = require('path')

tfnswAPI.makeRequest('/v1/gtfs/schedule/nswtrains', {
  stream: true,
  timeout: 30000
}).then(res => {
  let folder = path.join(__dirname, '../../gtfs/14')
  fs.mkdirSync(folder, { recursive: true })
  let stream = fs.createWriteStream(path.join(folder, 'google_transit.zip'))
  res.pipe(stream)
  stream.on('error', console.log)
}).catch(console.log)
