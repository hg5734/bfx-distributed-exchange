# The BFX challenge 

# Goals

### 1. Designed microservice which can be deploy for each client independently.

Designed the distributed exchange. We can deploy multiple instance of `server.js` by defining CLIENT_ID in env variable based on number of clients. Each instance will maintain own order book.

```typescript
CLIENT_ID=1 node src/server.js
CLIENT_ID=2 node src/server.js

....
```
Note: i have designed the system in such a way then single instance can be used for single or multiple clients. 

```typescript
  class OrderBook {
    constructor() {
        this.orders = new Map();
    }

    addOrder(order) {
        this.orders.set(order.orderId, order);
    }

    removeOrder(orderId) {
        this.orders.delete(orderId);
    }

    reduceOrderQuantity(orderId, tradeQuantity) {
        let order = this.orders.get(orderId);
        order.quantity -= tradeQuantity;
        this.orders.set(order.orderId, order);
    }
   }
    // used for maintaining clients but as per assignment requirement it will be always used for single client.
    static clients = new Map();

    // this function is used for check existing client and creating new client when order request generated
    static createClient(id) {
        if (!this.clients.has(id)) {
            this.clients.set(id, new OrderBook());
            return this.clients.get(id);
        } else {
            console.log('client order book already exist')
            return this.clients.get(id);
        }
    }
```

### 2. order distribution for multiple instances
Once client connect to dedicate instance and send the buy/sell order though rpc channel, then service maintain record of order book and distribute the message to all other microservices via pub/sub model. (single publisher multiple consumer).

We have created two file `pub.js` & `sub.js`.
```typescript
// When client dedicated instance send message
 orderPublisher.pub(JSON.stringify(payload))

// subscriber code
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

```

### 3. communication between different microservice and protection form  race condition after matching the order
After distribution of order, when any microservice match the order then we can need to add lock in both side of matching orders so it can not matched twice in any other order till trade settle.

We need to maintain boolean for both side of orders and need to active once order matched & need to deactivate once order executed. 

### 4. order book logic & any remainer is added to the orderbook, too.
The whole logic for order book is in `orderboook.js` file. it has also have logic for full fill partial/remainer order. 

```typescript
  if (matchingOrder) {
            //TODO :: Need to call other microservice
            /* need to check with other microservice(instance) to tell that matching order is ready for trade. so we will enable 
            the boolean lock of both side of the order.
            */
            const tradeQuantity = Math.min(order.quantity, matchingOrder.quantity);
            const tradePrice = matchingOrder.price;
            const matchingOrderId = matchingOrder.orderId;
            // Execute the trade
            console.log(`execute trade between client ${order.clientId} and orderId: ${order.orderId}
            client ${matchingOrder.clientId}: matchingOrderId: ${matchingOrderId} quantity=${tradeQuantity}, price=${tradePrice}`);
            // Update the instance order book
            if (tradeQuantity === matchingOrder.quantity) {
                this.removeOrder(instanceClientId, matchingOrderId);
            } else {
                this.reduceOrderQuantity(instanceClientId, matchingOrderId, tradeQuantity)
            }
            return matchingOrder;
        }

```