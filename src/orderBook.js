// Created temporary class for mapping client with order, In real world we will store this client & order book with database
module.exports = class MatchOrderBook {

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

    static getClientOrderBook(id) {
        return this.clients.get(id);
    }

    static addOrder(clientId, order) {
        let orderBook = this.getClientOrderBook(clientId);
        orderBook.addOrder(order);
        this.clients.set(clientId, orderBook);
    }

    static reduceOrderQuantity(clientId, orderId, tradeQuantity) {
        let orderBook = this.getClientOrderBook(clientId);
        orderBook.reduceOrderQuantity(orderId, tradeQuantity);
        this.clients.set(clientId, orderBook);
    }

    static removeOrder(clientId, orderId) {
        let orderBook = this.getClientOrderBook(clientId);
        orderBook.removeOrder(orderId);
        this.clients.set(clientId, orderBook);
    }

    static async matchOrderEngine(instanceClientId, order) {
        let orderBook = this.getClientOrderBook(instanceClientId);
        let orderList = [...orderBook.orders.values()]
        const matchingOrder = orderList.find(orderObj => (
            orderObj.type !== order.type &&
            orderObj.price === order.price &&
            orderObj.quantity >= order.quantity
        ));
        console.log('matching', matchingOrder)
        if (matchingOrder) {
            //TODO :: Need to call other microservice
            /* need to check with other microservice(instance) to tell that matching order is ready for trade. so we will enable 
            the boolean of that order so if in case it's ready to avoid race condition and order will be remove from order book
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
        else {
            // no order found
            console.log(`no order found `);
        }
        return false;
    }
}

// Order book to maintain bids and asks for client.
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