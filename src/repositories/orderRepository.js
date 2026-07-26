// Order repository interface (the contract the order usecases depend on):
//   list() -> Array<order>
// An order is { id, customer, total, status }. Swap this in-memory
// implementation for a SQL/Redis-backed one without touching the usecases.
function createInMemoryOrderRepository(seed = SEED_ORDERS) {
  const orders = seed.map((order) => ({ ...order }));
  return {
    list() {
      return orders.map((order) => ({ ...order }));
    },
  };
}

const SEED_ORDERS = [
  { id: 1, customer: 'Alice', total: 42.5, status: 'shipped' },
  { id: 2, customer: 'Bob', total: 19.99, status: 'pending' },
  { id: 3, customer: 'Carol', total: 128.0, status: 'delivered' },
];

module.exports = { createInMemoryOrderRepository, SEED_ORDERS };
