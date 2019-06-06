const path = require('path')
const express = require('express')
const app = express()
var http = require('http')

app.use(express.static(path.join(__dirname), {
  index: 'selfBill.html'
}))

var httpServer = http.createServer(app)

httpServer.listen('3000', function(err) {
  if (err) {
    console.log(err)
    return
  }
  console.log('Listening at http://localhost:3000')
})
