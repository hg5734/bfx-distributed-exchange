const { PeerPub } = require('grenache-nodejs-ws')
const Link = require('grenache-nodejs-link');
const port = 1024 + Math.floor(Math.random() * 10000)
const link = new Link({
    grape: 'http://127.0.0.1:30001'
})
link.start();
const peer = new PeerPub(link, {})
peer.init()

const service = peer.transport('server')
service.listen(port)

setInterval(function () {
    link.announce('distribute_order', service.port, {})
}, 1000)

module.exports = service;