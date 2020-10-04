const express = require('express')
const router = new express.Router()
const stationCodes = require('../../../additional-data/station-codes.json')
const rawStationPIDs = require('../../../additional-data/station-pids')
const utils = require('../../../utils')
const url = require('url')
const querystring = require('querystring')
const PIDUtils = require('./PIDUtils')

function filter(req, next) {
  let host = req.headers.host || ''
  if (host.includes('pidsview')) return true
  else return void next()
}

let stationPIDs = {}

Object.keys(rawStationPIDs).forEach(stationName => {
  stationPIDs[utils.encodeName(stationName)] = rawStationPIDs[stationName]
})

router.get('/summary', async (req, res, next) => {
  if (filter(req, next)) {
    let stationCode = req.headers.host.split('.')[0].toUpperCase()

    let stationName = stationCodes[stationCode]
    let codedStationName = utils.encodeName(stationName)
    let stationPID = stationPIDs[codedStationName]

    res.render('mockups/summary-known', {stationPID, station: codedStationName, stationCode, getURL: PIDUtils.getURL})
  }
})

module.exports = router
