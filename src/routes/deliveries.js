const express = require('express');
const { createInMemoryDeliveryRepository } = require('../repositories/deliveryRepository');
const { createInMemoryOrderRepository } = require('../repositories/orderRepository');

const STATUSES = ['pending', 'shipped', 'in_transit', 'delivered'];

function createDeliveryRouter({
  repository = createInMemoryDeliveryRepository(),
  orderRepository = createInMemoryOrderRepository(),
} = {}) {
  const router = express.Router();

  router.get('/api/deliveries', (_req, res) => {
    res.json({ deliveries: repository.list() });
  });

  router.post('/api/deliveries', (req, res) => {
    const { orderId } = req.body || {};
    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ error: 'invalid_order_id' });
    }
    if (!orderRepository.list().some((order) => order.id === orderId)) {
      return res.status(404).json({ error: 'order_not_found' });
    }
    if (repository.findByOrderId(orderId)) {
      return res.status(409).json({ error: 'delivery_already_exists' });
    }
    const delivery = repository.create(orderId);
    return res.status(201).location(`/api/deliveries/${delivery.id}`).json(delivery);
  });

  router.get('/api/deliveries/:id', (req, res) => {
    const delivery = repository.find(req.params.id);
    if (!delivery) return res.status(404).json({ error: 'delivery_not_found' });
    return res.json(delivery);
  });

  router.get('/api/deliveries/:id/history', (req, res) => {
    const delivery = repository.find(req.params.id);
    if (!delivery) return res.status(404).json({ error: 'delivery_not_found' });
    return res.json({ history: delivery.history });
  });

  router.patch('/api/deliveries/:id/status', (req, res) => {
    const { status } = req.body || {};
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: 'invalid_status', allowedStatuses: STATUSES });
    }
    const delivery = repository.updateStatus(req.params.id, status);
    if (!delivery) return res.status(404).json({ error: 'delivery_not_found' });
    return res.json(delivery);
  });

  router.use((err, _req, res, next) => {
    if (res.headersSent) return next(err);
    return res.status(500).json({ error: 'internal_error' });
  });

  return router;
}

module.exports = { createDeliveryRouter };
