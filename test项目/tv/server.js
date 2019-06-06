let express = require('express')
let path = require('path')
let app = express()

app.use(express.static(__dirname, {
  index: 'index.html'
}))

app.listen(8888, function () {
  console.log('app listening on port 8888');
})