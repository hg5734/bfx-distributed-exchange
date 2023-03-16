'use strict'

const { PeerRPCServer } = require('grenache-nodejs-http')
const Link = require('grenache-nodejs-link');

const MatchOrderBook = require('./orderBook');
const orderPublisher = require('./pub');
const orderSubscriber = require('./sub');

const link = new Link({
    grape: 'http://127.0.0.1:30001'
})

link.start()
const peer = new PeerRPCServer(link, {
    timeout: 3000
})
peer.init()


const port = 1024 + Math.floor(Math.random() * 10000)
const service = peer.transport('server')
service.listen(port)

// This instanceClientId is used to describe instance for client
const instanceClientId = process.env.CLIENT_ID || "1";
console.log('instance id', instanceClientId);

setInterval(function () {
    // console.log('server started', service.port)
    link.announce(('client' + instanceClientId).trim(), service.port, {})
}, 1000)




service.on('request', async (rid, key, payload, handler) => {
    console.log('order request sent', payload);
    try {
        let { clientId } = payload;
        //order datatype ex: { id: 1, type: 'buy', quantity: 10, price: 100, clientId: 1 }
        if (clientId && payload) {
            // TODO: we need validate order input parameter as well
            // created client for mapping order book, if client already exit in mapping then function won't create new mapping
            if (clientId == instanceClientId) {
                MatchOrderBook.createClient(clientId);
                // order added 
                MatchOrderBook.addOrder(clientId, payload);
                orderPublisher.pub(JSON.stringify(payload))
                handler.reply(null, { msg: 'order added', data: Object.fromEntries(MatchOrderBook.getClientOrderBook(+instanceClientId)?.orders || {}) });
            }
            else { // this will go for match order
                console.log('control in matching order')
                let result = await MatchOrderBook.matchOrderEngine(instanceClientId, payload);
                if (result) {
                    handler.reply(null, { msg: 'order executed', data: Object.fromEntries(MatchOrderBook.getClientOrderBook(+instanceClientId)?.orders || {}) });
                } else {
                    handler.reply(null, { msg: 'no order executed', data: payload });
                }
            }
        } else {
            handler.reply(null, { msg: 'invalid input data' })
        }
    } catch (error) {
        console.log(error);
        handler.reply(null, { msg: 'error' })
    }

})

setTimeout(() => {
    orderSubscriber.init()
    orderSubscriber.sub('distribute_order', { timeout: 10000 })

    orderSubscriber.on('connected', () => {
        console.log('connected')
    })
    orderSubscriber.on('disconnected', () => {
        console.log('disconnected')
    })
    orderSubscriber.on('message', (msg) => {
        console.log(msg, instanceClientId);
        try {
            let payload = JSON.parse(msg);
            let { clientId } = payload;
            if (clientId != instanceClientId) {
                let result = await MatchOrderBook.matchOrderEngine(instanceClientId, payload);
                if (result) {
                    console.log('order executed', Object.fromEntries(MatchOrderBook.getClientOrderBook(+instanceClientId)?.orders || {}));
                    // TODO: we will publish this order execution to client to notify frontend/backend etc
                } else {
                   console.log('no order executed');
                }

            } else {
                console.log('ignored message due to same client');
            }
        } catch (error) {
            console.log(error);
        }
    })
}, 3000)



