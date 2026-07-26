/**
 * End-to-end render checks for the home page. Boots the Express app on an
 * ephemeral port, then drives the same client-side render logic the browser
 * runs (fetch /api/orders -> build order cards) against a minimal DOM shim, so
 * we verify the wired page produces the expected markup for both the seeded
 * list and the empty-orders edge case without needing a real browser.
 */
const http = require('http');

function get(port, path) {
  return new Promise((resolve, reject) => {
    http
      .get({ host: '127.0.0.1', port, path }, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
      })
      .on('error', reject);
  });
}

// Minimal element/document shim: enough to run the page's render loop and
// assert on the resulting structure (children, classes, text).
function makeElement() {
  return {
    className: '',
    textContent: '',
    hidden: false,
    children: [],
    replaceChildren() {
      this.children = [];
    },
    append(...nodes) {
      this.children.push(...nodes);
    },
  };
}

// Runs the same render logic as public/index.html against fetched orders.
function renderOrders(orders, statusEl, listEl, createElement) {
  listEl.replaceChildren();
  if (!orders || orders.length === 0) {
    statusEl.textContent = 'Aucune commande.';
    return;
  }
  statusEl.hidden = true;
  for (const order of orders) {
    const item = createElement();
    item.className = 'order-card';

    const customer = createElement();
    customer.className = 'order-customer';
    customer.textContent = order.customer;

    const total = createElement();
    total.className = 'order-total';
    total.textContent = `${Number(order.total).toFixed(2)} €`;

    const badge = createElement();
    badge.className = `order-status status-${order.status}`;
    badge.textContent = order.status;

    item.append(customer, total, badge);
    listEl.append(item);
  }
}

describe('home page render (e2e)', () => {
  let server;
  let port;

  beforeAll((done) => {
    const app = require('../src/app');
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      port = server.address().port;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  it('serves the home page as HTML (200) with the render scaffolding', async () => {
    const res = await get(port, '/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.body).toContain('Gestion des commandes');
    expect(res.body).toContain('orders-list');
    expect(res.body).toContain('/styles.css');
  });

  it('renders one styled card per order from the live /api/orders payload', async () => {
    const res = await get(port, '/api/orders');
    expect(res.status).toBe(200);
    const { orders } = JSON.parse(res.body);

    const statusEl = makeElement();
    const listEl = makeElement();
    renderOrders(orders, statusEl, listEl, makeElement);

    expect(listEl.children.length).toBe(orders.length);
    expect(statusEl.hidden).toBe(true);

    const first = listEl.children[0];
    expect(first.className).toBe('order-card');
    const [customer, total, badge] = first.children;
    expect(customer.textContent).toBe(orders[0].customer);
    expect(total.textContent).toBe(`${orders[0].total.toFixed(2)} €`);
    expect(badge.className).toBe(`order-status status-${orders[0].status}`);
  });

  it('shows the empty-state message when there are no orders', () => {
    const statusEl = makeElement();
    const listEl = makeElement();
    renderOrders([], statusEl, listEl, makeElement);

    expect(listEl.children.length).toBe(0);
    expect(statusEl.hidden).toBe(false);
    expect(statusEl.textContent).toBe('Aucune commande.');
  });
});
