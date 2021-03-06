const spdy = require('spdy')
const tls = require('tls')
const fs = require('fs')
const path = require('path')
const config = require('../config.json')

let secureContexts = {}
let wildcards = []

module.exports = {
  createSecureContext: certInfo => {
    let certPath = certInfo.path
    let certHost = certInfo.host

    let sslCertPath = path.join(certPath, 'fullchain.pem')
    let sslKeyPath = path.join(certPath, 'privkey.pem')
    let caPath = path.join(certPath, 'chain.pem')

    let context = tls.createSecureContext({
      cert: fs.readFileSync(sslCertPath),
      key: fs.readFileSync(sslKeyPath),
      ca: fs.readFileSync(caPath),
      minVersion: 'TLSv1.2'
    })

    if (certHost.startsWith('*.')) {
      let up = certHost.slice(2)
      if (!wildcards.includes(up)) wildcards.push(up)
      secureContexts[up] = context
    } else {
      secureContexts[certHost] = context
    }
  },

  getSecureContext: hostname => {
    let up = hostname.slice(hostname.indexOf('.') + 1)
    if (wildcards.includes(up) || wildcards.includes(hostname)) return secureContexts[up] || secureContexts[hostname]

    return secureContexts[hostname]
  },

  createSNICallback: () => {
    return (hostname, callback) => {
      callback(null, module.exports.getSecureContext(hostname))
    }
  },

  createServer: (app, sslCerts) => {
    sslCerts.forEach(cert => {
      module.exports.createSecureContext(cert)
    })

    return spdy.createServer({
      SNICallback: module.exports.createSNICallback()
    }, app.app)
  }

}
