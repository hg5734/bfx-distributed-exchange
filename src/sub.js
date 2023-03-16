const { PeerSub } = require('grenache-nodejs-ws')
const Link = require('grenache-nodejs-link');
const link = new Link({
  grape: 'http://127.0.0.1:30001'
})
link.start()

const subPeer = new PeerSub(link, {})

module.exports = subPeer;
