const { createInMemoryOrderRepository } = require('../repositories/orderRepository');

// Retrieves the customer orders from the repository. HTTP-agnostic so it can
// be exercised directly in unit tests and backed by any repository
// implementing the order repository contract.
function listOrders(repository = defaultRepository) {
  return repository.list();
}

const defaultRepository = createInMemoryOrderRepository();

module.exports = { listOrders };
