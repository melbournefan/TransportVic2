const nodeMailin = require('node-mailin')
const cheerio = require('cheerio')

const handleChange = require('./modules/handle-change')
const handleCancellation = require('./modules/handle-cancellation')
const handleNonStop = require('./modules/handle-non-stop')
const handleReinstatement = require('./modules/handle-reinstatement')
const handleNoCatering = require('./modules/handle-no-catering')

const HTTPSServer = require('../../server/HTTPSServer')

const DatabaseConnection = require('../../database/DatabaseConnection')
const config = require('../../config.json')

const database = new DatabaseConnection(config.databaseURL, config.databaseName)

async function inboundMessage(connection, data) {
  let {subject, html} = data
  let $ = cheerio.load(html)
  let textContent = $('center').text()

  handleMessage(subject || '', textContent)
}

async function handleMessage(subject, rawText) {
  let text = rawText.replace(/SCS/g, 'Southern Cross').replace(/Flinders St\.? /g, 'Flinders Street')
    .replace(/\n/g, ' ').replace(/\u00A0/g, ' ').replace(/More information at.+/, '')
    .replace(/[-–]/g, ' to ')
    .replace(/  +/g, ' ').trim()

  if (text.length > 300) {
    return global.loggers.spamMail.log(`Disregarded vline email: ${text.trim()}`)
  }

  global.loggers.mail.log(`Got Mail: ${text.replace(/\n/g, ' ')}`)

  text = text.replace(/due .*/, '').replace(/(service|train) /, '')

  // Tracker makes this kinda useless now
  if (subject.includes('Service reduction') || text.includes('reduced capacity')) return

  if ((subject.includes('Service cancellation') || text.includes('not run') || (text.includes('no longer run') && !text.includes('no longer run to ') && !text.includes('no longer run between') && !text.includes('no longer run from')) || text.includes('has been cancelled')) && !(text.includes('terminate') || text.includes('end') || text.includes('early'))) {
    await handleCancellation(database, text)
  } else if (text.includes('been reinstated') || text.includes('running as scheduled') || text.includes('will now run as scheduled') || text.includes('operate as scheduled')|| text.includes('resume running')) {
    await handleReinstatement(database, text)
  } else if (text.includes('will not stop at') || text.includes('will run express') || text.includes('will not be stopping')) {
    await handleNonStop(database, text)
  } else if (text.includes('without') && text.includes('buffet')) {
    await handleNoCatering(database, text)
  } else {
    await handleChange(database, text)
  }
}

module.exports = () => {
  database.connect(async err => {
    let options = {
      port: 25,
      logLevel: 'error',
      smtpOptions: {
        banner: 'TransportVic V/Line Inform Email Server',
        disableReverseLookup: false
      },
      disableDNSValidation: false
    }

    if (config.useHTTPS) {
      options.secure = true
      options.SNICallback = HTTPSServer.createSNICallback()
    }

    nodeMailin.start(options)

    global.loggers.mail.info('V/Line Email Server started')

    nodeMailin.on('validateRecipient', (session, address, callback) => {
      if (address !== config.vlineInformEmail) {
        let error = new Error(`5.1.1 <${address}>: Requested action not taken: mailbox unavailable`)
        error.responseCode = 550

        global.loggers.spamMail.log(`Rejected mail addressed to ${address}`)

        return callback(error)
      }
      callback()
    })

    nodeMailin.on('validateSender', (session, address, callback) => {
      if (!address.includes('@inform.vline.com.au')) {
        let error = new Error(`5.7.0 <${address}>: Authentication required`)
        error.responseCode = 530

        global.loggers.spamMail.log(`Rejected Non-V/Line Email from ${address}`, session)

        callback(error)
      } else callback()
    })

    nodeMailin.on('message', (connection, data, content) => {
      inboundMessage(connection, data)
    })

    nodeMailin.on('error', err => {
      global.loggers.mail.err(err)
    })
  })
}
