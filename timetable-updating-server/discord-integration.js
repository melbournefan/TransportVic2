const utils = require('../utils')
const config = require('../config.json')
const modules = require('../modules.json')

module.exports = async text => {
  if (modules.discordIntegration && modules.discordIntegration.timetables) {
    await utils.request(config.discordURLs.timetables, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: text
      })
    })
  }
}
