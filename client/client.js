'use strict'

const { PeerRPCClient }  = require('grenache-nodejs-http')
const Link = require('grenache-nodejs-link')
const { PeerSub } = require('grenache-nodejs-ws')

const link = new Link({
  grape: 'http://127.0.0.1:30001'
})
link.start()

const peer = new PeerRPCClient(link, {})
peer.init()

const subPeer = new PeerSub(link, {})
subPeer.init()

subPeer.sub('pub_test', { timeout: 10000 })

subPeer.on('connected', () => {
  console.log('connected')
})

subPeer.on('disconnected', () => {
  console.log('disconnected')
})

subPeer.on('message', (msg) => {
  console.log(msg)
})


// Place a new order
const order = {
  clientId: 1,
  type: 'buy',
  price: 100,
  quantity: 3,
  currency: 'BTC',
  orderId: new Date().getTime()
};

peer.request('client1', order, { timeout: 10000 }, (err, data) => {
  if (err) {
    console.error(err)
    process.exit(-1)
  }
  console.log(data) // { msg: 'world' }
})

