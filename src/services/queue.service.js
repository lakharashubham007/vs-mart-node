const { Queue } = require('bullmq');

const connection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379
};

const orderQueue = new Queue('order-processing', { connection });

const addOrderToQueue = async (orderId) => {
    await orderQueue.add('process-order', { orderId }, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000
        }
    });
};

module.exports = {
    addOrderToQueue
};
