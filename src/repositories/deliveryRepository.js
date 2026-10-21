const { randomUUID } = require('crypto');

function copy(delivery) {
  return { ...delivery, history: delivery.history.map((entry) => ({ ...entry })) };
}

// Per-process storage, matching the demo order repository. Return copies so
// callers cannot modify a delivery or rewrite its history outside this API.
function createInMemoryDeliveryRepository() {
  const deliveries = new Map();
  return {
    list() {
      return Array.from(deliveries.values(), copy);
    },
    find(id) {
      const delivery = deliveries.get(id);
      return delivery ? copy(delivery) : null;
    },
    findByOrderId(orderId) {
      const delivery = Array.from(deliveries.values()).find((item) => item.orderId === orderId);
      return delivery ? copy(delivery) : null;
    },
    create(orderId) {
      const timestamp = new Date().toISOString();
      const delivery = {
        id: randomUUID(), orderId, status: 'pending',
        history: [{ status: 'pending', timestamp }],
      };
      deliveries.set(delivery.id, delivery);
      return copy(delivery);
    },
    updateStatus(id, status) {
      const delivery = deliveries.get(id);
      if (!delivery) return null;
      if (delivery.status !== status) {
        delivery.history.push({ status, timestamp: new Date().toISOString() });
        delivery.status = status;
      }
      return copy(delivery);
    },
  };
}

module.exports = { createInMemoryDeliveryRepository };
