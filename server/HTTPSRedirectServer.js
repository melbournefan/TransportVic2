const url = require('url')
const path = require('path')
const fs = require('fs')
const config = require('../config.json')

module.exports = class HTTPSRedirectServer {
  app (req, res) {
    const redirectedURL = 'https://' + req.headers.host + req.url

    res.writeHead(308, { Location: redirectedURL })
    res.end()
  }
}
