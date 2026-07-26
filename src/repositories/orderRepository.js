// Order repository interface (the contract the order usecases depend on):
//   list(filters) -> Array<order>
// An order is { id, customer, total, status, date }. `date` is an ISO
// day (YYYY-MM-DD). Filters is an optional { status, customer, date } object:
// status matches exactly, customer matches case-insensitively as a substring,
// and date matches exactly. Swap this in-memory implementation for a
// SQL/Redis-backed one without touching the usecases.
function createInMemoryOrderRepository(seed = SEED_ORDERS) {
  const orders = seed.map((order) => ({ ...order }));
  return {
    list(filters = {}) {
      const { status, customer, date } = filters;
      const wantedCustomer = customer == null ? null : String(customer).toLowerCase();
      return orders
        .filter((order) => {
          if (status != null && order.status !== status) return false;
          if (date != null && order.date !== date) return false;
          if (
            wantedCustomer != null &&
            !order.customer.toLowerCase().includes(wantedCustomer)
          ) {
            return false;
          }
          return true;
        })
        .map((order) => ({ ...order }));
    },
  };
}

const SEED_ORDERS = [
  { id: 1, customer: 'Alice', total: 42.5, status: 'shipped', date: '2026-07-20' },
  { id: 2, customer: 'Bob', total: 19.99, status: 'pending', date: '2026-07-22' },
  { id: 3, customer: 'Carol', total: 128.0, status: 'delivered', date: '2026-07-24' },
];

module.exports = { createInMemoryOrderRepository, SEED_ORDERS };
