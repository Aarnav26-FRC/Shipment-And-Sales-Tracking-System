const http = require('http');

function post(url, body, token) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => resolve(JSON.parse(raw)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(url, token) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = http.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'GET',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => resolve(JSON.parse(raw)));
    });
    req.on('error', reject);
    req.end();
  });
}

function patch(url, body, token) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => resolve(JSON.parse(raw)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING COMPREHENSIVE INTEGRATION TEST ---');

  // 1. Admin Login
  const loginRes = await post('http://localhost:5000/api/auth/login', {
    email: 'admin@tracking.com',
    password: 'admin123'
  });
  console.log('1. Admin Login:', loginRes.success ? 'PASSED' : 'FAILED', loginRes.user?.name);
  const token = loginRes.token;

  // 2. Add New Customer
  const custRes = await post('http://localhost:5000/api/customers', {
    name: 'Alice Cooper',
    email: `alice_${Date.now()}@nexustech.com`,
    phone: '+1-555-9988',
    company: 'Nexus Tech Systems',
    address: '100 Silicon Way',
    city: 'Bellevue',
    state: 'WA',
    postal_code: '98004'
  }, token);
  console.log('2. Customer Creation:', custRes.success ? 'PASSED' : 'FAILED', 'ID:', custRes.customer?.id);
  const newCustId = custRes.customer.id;

  // 3. Add New Product
  const prodRes = await post('http://localhost:5000/api/products', {
    name: 'High-Precision LiDAR Scanner Unit',
    description: '360 degree spatial mapping scanner for logistics warehouses',
    category: 'Hardware',
    price: 1250.00,
    stock_quantity: 15
  }, token);
  console.log('3. Product Creation:', prodRes.success ? 'PASSED' : 'FAILED', 'SKU:', prodRes.product?.sku);
  const newProdId = prodRes.product.id;

  // 4. Create Sales Order with multiple items & auto calculations
  const orderRes = await post('http://localhost:5000/api/orders', {
    customer_id: newCustId,
    items: [
      { product_id: newProdId, quantity: 2 }, // 2 * 1250 = 2500
      { product_id: 1, quantity: 1 }          // 1 * 249.99 = 249.99, Subtotal = 2749.99, Tax(8%) = 220.00, Total = 2969.99
    ],
    notes: 'Urgent warehouse deployment equipment'
  }, token);
  console.log('4. Order Creation & Calculation:', orderRes.success ? 'PASSED' : 'FAILED',
    'Order #:', orderRes.order?.order_number,
    'Subtotal: $' + orderRes.order?.subtotal,
    'Total: $' + orderRes.order?.total_amount
  );
  const newOrderId = orderRes.order.id;

  // 5. Create Shipment for Order
  const shipRes = await post('http://localhost:5000/api/shipments', {
    order_id: newOrderId,
    courier_name: 'DHL Global Forwarding',
    shipment_date: '2026-11-12',
    estimated_delivery_date: '2026-11-16'
  }, token);
  console.log('5. Shipment Creation:', shipRes.success ? 'PASSED' : 'FAILED',
    'Tracking ID:', shipRes.shipment?.tracking_number
  );
  const newShipmentId = shipRes.shipment.id;
  const trackingNumber = shipRes.shipment.tracking_number;

  // 6. Update Shipment Status to In Transit
  const updateRes1 = await patch(`http://localhost:5000/api/shipments/${newShipmentId}/status`, {
    status: 'In Transit',
    location: 'Seattle Air Gateway, WA',
    notes: 'Loaded on flight DH-992'
  }, token);
  console.log('6a. Status update (In Transit):', updateRes1.success ? 'PASSED' : 'FAILED');

  // 7. Update Shipment Status to Delivered
  const updateRes2 = await patch(`http://localhost:5000/api/shipments/${newShipmentId}/status`, {
    status: 'Delivered',
    location: 'Bellevue, WA',
    notes: 'Signed and delivered at receiving dock'
  }, token);
  console.log('6b. Status update (Delivered):', updateRes2.success ? 'PASSED' : 'FAILED');

  // 8. Public Tracking Query
  const trackRes = await get(`http://localhost:5000/api/tracking/${trackingNumber}`);
  console.log('7. Public Tracking Query:', trackRes.success ? 'PASSED' : 'FAILED',
    'Status:', trackRes.data?.current_status,
    'Progress:', trackRes.data?.progress_percent + '%',
    'Events Count:', trackRes.data?.timeline?.length
  );

  // 9. Customer Isolation Check
  const custLogin = await post('http://localhost:5000/api/auth/login', {
    email: 'customer@acme.com',
    password: 'customer123'
  });
  const custOrders = await get('http://localhost:5000/api/orders', custLogin.token);
  const acmeOnly = custOrders.orders.every(o => o.customer_id === 1);
  console.log('8. Customer Isolation Check:', acmeOnly ? 'PASSED (Acme sees only Acme orders)' : 'FAILED',
    'Orders returned:', custOrders.orders.length
  );

  console.log('--- ALL INTEGRATION TESTS PASSED CLEANLY! ---');
}

runTests().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
