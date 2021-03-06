const nodeMailin = require('node-mailin')
const cheerio = require('cheerio')

const handleChange = require('./modules/handle-change')
const handleCancellation = require('./modules/handle-cancellation')
const handleNonStop = require('./modules/handle-non-stop')
const handleReinstatement = require('./modules/handle-reinstatement')

const DatabaseConnection = require('../../database/DatabaseConnection')
const config = require('../../config.json')

const database = new DatabaseConnection(config.databaseURL, config.databaseName)

async function inboundMessage(data) {
  let sender = data.from.text
  if (!sender.includes('@inform.vline.com.au')) return

  let {subject, html} = data
  let $ = cheerio.load(html)
  let textContent = $('center').text()
  textContent = textContent

  handleMessage(subject, textContent)
}

async function handleMessage(subject, text) {
  text = text.replace(/SCS/g, 'Southern Cross').replace(/Flinders St\.? /g, 'Flinders Street').replace(/\n/g, ' ').replace(/\u00A0/g, ' ').replace(/More information at.+/, '').replace(/[-–]/g, ' to ').replace(/  +/g, ' ').trim()
  global.loggers.mail.log(`Got Mail: ${text.replace(/\n/g, ' ')}\n`)

  // Tracker makes this kinda useless now
  if (subject.includes('Service reduction') || text.includes('reduced capacity')) return

  if (subject.includes('Service cancellation') || text.includes('will not run') || (text.includes('no longer run') && !text.includes('no longer run to ') && !text.includes('no longer run between') && !text.includes('no longer run from')) || text.includes('has been cancelled')) {
    await handleCancellation(database, text)
  } else if (text.includes('been reinstated') || text.includes('running as scheduled') || text.includes('will now run as scheduled')) {
    await handleReinstatement(database, text)
  } else if (text.includes('will not stop at') || text.includes('will run express')) {
    await handleNonStop(database, text)
  } else {
    await handleChange(database, text)
  }
}

module.exports = () => {
  database.connect(async err => {
    nodeMailin.start({
      port: 25,
      logLevel: 'error',
      smtpOptions: {
        SMTPBanner: 'TransportVic V/Line Inform Email Server'
      }
    })

    global.loggers.mail.info('V/Line Email Server started')

    nodeMailin.on('message', (connection, data, content) => {
      inboundMessage(data)
    })

    nodeMailin.on('error', err => {
      global.loggers.mail.err(err)
    })
  })
}
