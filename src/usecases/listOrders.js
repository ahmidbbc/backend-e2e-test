const { createInMemoryOrderRepository } = require('../repositories/orderRepository');

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// Retrieves the customer orders from the repository, applying the given
// filters (status, customer, date) and paginating the result. HTTP-agnostic
// so it can be exercised directly in unit tests and backed by any repository
// implementing the order repository contract.
//
// options: { status, customer, date, page, size }. Returns
// { orders, pagination: { page, size, total, totalPages } }.
function listOrders(options = {}, repository = defaultRepository) {
  const { status, customer, date } = options;
  const page = normalizePage(options.page);
  const size = normalizeSize(options.size);

  const all = repository.list({ status, customer, date });
  const total = all.length;
  const start = (page - 1) * size;
  const orders = all.slice(start, start + size);

  return {
    orders,
    pagination: {
      page,
      size,
      total,
      totalPages: Math.ceil(total / size),
    },
  };
}

function normalizePage(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : DEFAULT_PAGE;
}

function normalizeSize(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(n, MAX_PAGE_SIZE);
}

const defaultRepository = createInMemoryOrderRepository();

module.exports = { listOrders, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE };
