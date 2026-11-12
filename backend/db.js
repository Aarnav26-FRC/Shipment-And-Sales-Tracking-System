const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'shipment_sales_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true
};

let pool;

async function initDB() {
  try {
    // 1. First connect without database selected to ensure DB exists
    const rootConn = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password
    });

    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await rootConn.end();

    // 2. Connect pool to the target database
    pool = mysql.createPool(config);

    // 3. Create tables
    await createTables();

    // 4. Seed data if needed
    await seedInitialData();

    console.log(`[DB] Successfully connected to MySQL database: ${config.database}`);
    return pool;
  } catch (error) {
    console.error('[DB Error] Failed to initialize database:', error.message);
    throw error;
  }
}

async function createTables() {
  // Customers table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      phone VARCHAR(20) NOT NULL,
      company VARCHAR(100) NOT NULL,
      address VARCHAR(255) NOT NULL,
      city VARCHAR(50) NOT NULL,
      state VARCHAR(50) NOT NULL,
      postal_code VARCHAR(20) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Users table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role ENUM('admin', 'customer') NOT NULL DEFAULT 'customer',
      customer_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Products table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sku VARCHAR(50) NOT NULL UNIQUE,
      name VARCHAR(150) NOT NULL,
      description TEXT,
      category VARCHAR(50) NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      stock_quantity INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Sales Orders table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sales_orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_number VARCHAR(50) NOT NULL UNIQUE,
      customer_id INT NOT NULL,
      subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      tax DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      status ENUM('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled') NOT NULL DEFAULT 'Pending',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Order Items table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      product_id INT NOT NULL,
      quantity INT NOT NULL,
      unit_price DECIMAL(10, 2) NOT NULL,
      total_price DECIMAL(10, 2) NOT NULL,
      FOREIGN KEY (order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Shipments table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS shipments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tracking_number VARCHAR(50) NOT NULL UNIQUE,
      order_id INT NOT NULL,
      courier_name VARCHAR(100) NOT NULL,
      shipment_date DATE NOT NULL,
      estimated_delivery_date DATE NOT NULL,
      actual_delivery_date DATE NULL,
      current_status ENUM('Processing', 'Packed', 'Dispatched', 'In Transit', 'Out for Delivery', 'Delivered') NOT NULL DEFAULT 'Processing',
      shipping_address VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES sales_orders(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Shipment Tracking timeline table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS shipment_tracking (
      id INT AUTO_INCREMENT PRIMARY KEY,
      shipment_id INT NOT NULL,
      status VARCHAR(50) NOT NULL,
      location VARCHAR(100) NOT NULL,
      notes VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

async function seedInitialData() {
  // Check if customers already exist
  const [existingCusts] = await pool.query('SELECT COUNT(*) as cnt FROM customers');
  if (existingCusts[0].cnt > 0) {
    return; // Already seeded
  }

  console.log('[DB] Seeding comprehensive initial sample data...');

  // 1. Seed Customers
  const customersData = [
    ['John Doe', 'contact@acme.com', '+1-555-0101', 'Acme Industrial Corp', '742 Evergreen Terrace', 'Springfield', 'IL', '62704'],
    ['Sarah Jenkins', 's.jenkins@apexlogistics.com', '+1-555-0102', 'Apex Logistics Ltd', '1200 Harbor Boulevard', 'Jersey City', 'NJ', '07310'],
    ['Michael Chen', 'mchen@techcorp.io', '+1-555-0103', 'TechCorp Solutions', '450 Innovation Parkway', 'San Jose', 'CA', '95134'],
    ['Elena Rostova', 'erostova@globalretail.net', '+1-555-0104', 'Global Retail Network', '88 Fifth Avenue', 'New York', 'NY', '10011'],
    ['Dr. Robert Vance', 'rvance@primehealth.org', '+1-555-0105', 'Prime Health Care', '300 Metro Health Plaza', 'Cleveland', 'OH', '44109'],
    ['David Miller', 'dmiller@blueskytech.com', '+1-555-0106', 'BlueSky Technologies', '900 Enterprise Way', 'Austin', 'TX', '78701']
  ];

  for (const c of customersData) {
    await pool.query(
      `INSERT INTO customers (name, email, phone, company, address, city, state, postal_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      c
    );
  }

  // 2. Seed Users (Admin & Customers)
  const hashedAdminPass = await bcrypt.hash('admin123', 10);
  const hashedCustomerPass = await bcrypt.hash('customer123', 10);

  // Admin user
  await pool.query(
    `INSERT INTO users (name, email, password, role, customer_id) VALUES (?, ?, ?, ?, ?)`,
    ['System Administrator', 'admin@tracking.com', hashedAdminPass, 'admin', null]
  );

  // Customer user 1 (Acme)
  await pool.query(
    `INSERT INTO users (name, email, password, role, customer_id) VALUES (?, ?, ?, ?, ?)`,
    ['Acme Representative', 'customer@acme.com', hashedCustomerPass, 'customer', 1]
  );

  // Customer user 2 (TechCorp)
  await pool.query(
    `INSERT INTO users (name, email, password, role, customer_id) VALUES (?, ?, ?, ?, ?)`,
    ['TechCorp Purchasing', 'techcorp@tracking.com', hashedCustomerPass, 'customer', 3]
  );

  // 3. Seed Products (9 diverse enterprise products)
  const productsData = [
    ['PRD-1001', 'Industrial Barcode Scanner Pro', 'High-speed 2D handheld wireless barcode imager with Bluetooth cradle.', 'Hardware', 249.99, 45],
    ['PRD-1002', 'Wireless Handheld Terminal', 'Android-based rugged warehouse terminal with physical keypad and RFID.', 'Mobile Computing', 499.50, 28],
    ['PRD-1003', 'Thermal Transfer Label Printer', 'Heavy-duty 4-inch industrial direct thermal barcode label printer.', 'Warehouse Equipment', 329.00, 15],
    ['PRD-1004', 'Heavy-Duty Digital Pallet Scale', '3000kg capacity floor scale with LED weight indicator and ramp.', 'Industrial Tools', 899.00, 8],
    ['PRD-1005', 'RFID Tag Reader & Writer', 'UHF Gen2 EPC global long-range RFID desktop reader/encoder.', 'RFID Solutions', 189.75, 60],
    ['PRD-1006', 'Rugged Logistics Android Tablet', '10.1-inch sunlight-readable waterproof military-grade fleet tablet.', 'Mobile Computing', 649.00, 22],
    ['PRD-1007', 'Automated Conveyor Sensor Kit', 'Photoelectric optical sensor array for packaging verification.', 'Automation', 145.00, 35],
    ['PRD-1008', 'High-Yield Thermal Ribbon 12-Pack', 'Resin enhanced wax ribbon for industrial barcode print engines.', 'Consumables', 79.99, 120],
    ['PRD-1009', 'Smart GPS Fleet Telematics Tracker', '4G LTE real-time cargo and vehicle OBD tracker with temp monitor.', 'Telematics', 119.50, 50]
  ];

  for (const p of productsData) {
    await pool.query(
      `INSERT INTO products (sku, name, description, category, price, stock_quantity) VALUES (?, ?, ?, ?, ?, ?)`,
      p
    );
  }

  // 4. Seed Sales Orders and Order Items
  // Order 1: Acme Corp ($1,078.98) - Shipped
  const [ord1] = await pool.query(
    `INSERT INTO sales_orders (order_number, customer_id, subtotal, tax, total_amount, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['ORD-2026-001', 1, 999.00, 79.98, 1078.98, 'Shipped', 'Expedited logistics equipment delivery']
  );
  await pool.query(`INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)`, [ord1.insertId, 1, 2, 249.99, 499.98]);
  await pool.query(`INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)`, [ord1.insertId, 2, 1, 499.50, 499.50]);

  // Order 2: TechCorp Solutions ($2,497.50) - Processing
  const [ord2] = await pool.query(
    `INSERT INTO sales_orders (order_number, customer_id, subtotal, tax, total_amount, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['ORD-2026-002', 3, 2312.50, 185.00, 2497.50, 'Processing', 'Corporate branch deployment batch 1']
  );
  await pool.query(`INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)`, [ord2.insertId, 2, 3, 499.50, 1498.50]);
  await pool.query(`INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)`, [ord2.insertId, 5, 4, 189.75, 759.00]);

  // Order 3: Apex Logistics ($1,798.00) - Delivered
  const [ord3] = await pool.query(
    `INSERT INTO sales_orders (order_number, customer_id, subtotal, tax, total_amount, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['ORD-2026-003', 2, 1664.81, 133.19, 1798.00, 'Delivered', 'Harbor dock pallet terminal upgrade']
  );
  await pool.query(`INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)`, [ord3.insertId, 4, 2, 899.00, 1798.00]);

  // Order 4: Global Retail ($1,298.00) - Shipped
  const [ord4] = await pool.query(
    `INSERT INTO sales_orders (order_number, customer_id, subtotal, tax, total_amount, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['ORD-2026-004', 4, 1201.85, 96.15, 1298.00, 'Shipped', 'Store inventory scanning rollout']
  );
  await pool.query(`INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)`, [ord4.insertId, 6, 2, 649.00, 1298.00]);

  // Order 5: Prime Health ($799.90) - Pending
  const [ord5] = await pool.query(
    `INSERT INTO sales_orders (order_number, customer_id, subtotal, tax, total_amount, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['ORD-2026-005', 5, 740.65, 59.25, 799.90, 'Pending', 'Pharmaceutical barcode tracking kit']
  );
  await pool.query(`INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)`, [ord5.insertId, 8, 10, 79.99, 799.90]);

  // Order 6: Acme Corp ($478.00) - Delivered
  const [ord6] = await pool.query(
    `INSERT INTO sales_orders (order_number, customer_id, subtotal, tax, total_amount, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['ORD-2026-006', 1, 442.59, 35.41, 478.00, 'Delivered', 'Sensor replacement units']
  );
  await pool.query(`INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)`, [ord6.insertId, 7, 2, 145.00, 290.00]);
  await pool.query(`INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)`, [ord6.insertId, 9, 1, 119.50, 119.50]);

  // 5. Seed 5+ Shipments with distinct statuses
  // Shipment 1: In Transit (Order 1)
  const [shp1] = await pool.query(
    `INSERT INTO shipments (tracking_number, order_id, courier_name, shipment_date, estimated_delivery_date, actual_delivery_date, current_status, shipping_address)
     VALUES (?, ?, ?, '2026-11-09', '2026-11-13', NULL, 'In Transit', ?)`,
    ['TRK-FEDEX-90124', ord1.insertId, 'FedEx Express Priority', '742 Evergreen Terrace, Springfield, IL 62704']
  );
  await pool.query(`INSERT INTO shipment_tracking (shipment_id, status, location, notes, created_at) VALUES (?, ?, ?, ?, '2026-11-09 09:30:00')`, [shp1.insertId, 'Processing', 'Warehouse Central, Chicago IL', 'Shipment order generated and label printed']);
  await pool.query(`INSERT INTO shipment_tracking (shipment_id, status, location, notes, created_at) VALUES (?, ?, ?, ?, '2026-11-09 14:15:00')`, [shp1.insertId, 'Packed', 'Warehouse Central, Chicago IL', 'Package inspected and packed into reinforced container']);
  await pool.query(`INSERT INTO shipment_tracking (shipment_id, status, location, notes, created_at) VALUES (?, ?, ?, ?, '2026-11-10 08:45:00')`, [shp1.insertId, 'Dispatched', 'Chicago Sort Facility, IL', 'Departed distribution center via freight truck']);
  await pool.query(`INSERT INTO shipment_tracking (shipment_id, status, location, notes, created_at) VALUES (?, ?, ?, ?, '2026-11-11 11:20:00')`, [shp1.insertId, 'In Transit', 'Peoria Sorting Hub, IL', 'Package scanned in transit through regional hub']);

  // Shipment 2: Processing (Order 2)
  const [shp2] = await pool.query(
    `INSERT INTO shipments (tracking_number, order_id, courier_name, shipment_date, estimated_delivery_date, actual_delivery_date, current_status, shipping_address)
     VALUES (?, ?, ?, '2026-11-11', '2026-11-16', NULL, 'Processing', ?)`,
    ['TRK-DHL-44821', ord2.insertId, 'DHL Global Forwarding', '450 Innovation Parkway, San Jose, CA 95134']
  );
  await pool.query(`INSERT INTO shipment_tracking (shipment_id, status, location, notes, created_at) VALUES (?, ?, ?, ?, '2026-11-11 10:00:00')`, [shp2.insertId, 'Processing', 'Silicon Valley Dispatch Hub, CA', 'Order received in fulfillment queue']);

  // Shipment 3: Delivered (Order 3)
  const [shp3] = await pool.query(
    `INSERT INTO shipments (tracking_number, order_id, courier_name, shipment_date, estimated_delivery_date, actual_delivery_date, current_status, shipping_address)
     VALUES (?, ?, ?, '2026-11-05', '2026-11-08', '2026-11-08', 'Delivered', ?)`,
    ['TRK-UPS-11209', ord3.insertId, 'UPS Freight Ground', '1200 Harbor Boulevard, Jersey City, NJ 07310']
  );
  await pool.query(`INSERT INTO shipment_tracking (shipment_id, status, location, notes, created_at) VALUES (?, ?, ?, ?, '2026-11-05 08:00:00')`, [shp3.insertId, 'Processing', 'Newark Logistics Hub, NJ', 'Manifest created']);
  await pool.query(`INSERT INTO shipment_tracking (shipment_id, status, location, notes, created_at) VALUES (?, ?, ?, ?, '2026-11-05 13:00:00')`, [shp3.insertId, 'Packed', 'Newark Logistics Hub, NJ', 'Pallet secured']);
  await pool.query(`INSERT INTO shipment_tracking (shipment_id, status, location, notes, created_at) VALUES (?, ?, ?, ?, '2026-11-06 09:30:00')`, [shp3.insertId, 'Dispatched', 'Newark Sort Center, NJ', 'On vehicle for regional transfer']);
  await pool.query(`INSERT INTO shipment_tracking (shipment_id, status, location, notes, created_at) VALUES (?, ?, ?, ?, '2026-11-07 14:40:00')`, [shp3.insertId, 'In Transit', 'Secaucus Hub, NJ', 'Arrived at local distribution depot']);
  await pool.query(`INSERT INTO shipment_tracking (shipment_id, status, location, notes, created_at) VALUES (?, ?, ?, ?, '2026-11-08 07:15:00')`, [shp3.insertId, 'Out for Delivery', 'Jersey City, NJ', 'Loaded onto local delivery van']);
  await pool.query(`INSERT INTO shipment_tracking (shipment_id, status, location, notes, created_at) VALUES (?, ?, ?, ?, '2026-11-08 13:50:00')`, [shp3.insertId, 'Delivered', 'Jersey City, NJ', 'Delivered to Loading Dock A. Signed by: M. Santos']);

  // Shipment 4: Out for Delivery (Order 4)
  const [shp4] = await pool.query(
    `INSERT INTO shipments (tracking_number, order_id, courier_name, shipment_date, estimated_delivery_date, actual_delivery_date, current_status, shipping_address)
     VALUES (?, ?, ?, '2026-11-08', '2026-11-12', NULL, 'Out for Delivery', ?)`,
    ['TRK-BLUD-77319', ord4.insertId, 'Blue Dart Express', '88 Fifth Avenue, New York, NY 10011']
  );
  await pool.query(`INSERT INTO shipment_tracking (shipment_id, status, location, notes, created_at) VALUES (?, ?, ?, ?, '2026-11-08 10:00:00')`, [shp4.insertId, 'Processing', 'Queens Sorting Facility, NY', 'Order ready for fulfillment']);
  await pool.query(`INSERT INTO shipment_tracking (shipment_id, status, location, notes, created_at) VALUES (?, ?, ?, ?, '2026-11-08 15:30:00')`, [shp4.insertId, 'Packed', 'Queens Sorting Facility, NY', 'Carton packaged with shock absorbers']);
  await pool.query(`INSERT INTO shipment_tracking (shipment_id, status, location, notes, created_at) VALUES (?, ?, ?, ?, '2026-11-09 07:00:00')`, [shp4.insertId, 'Dispatched', 'JFK Air Terminal, NY', 'Departed transit point']);
  await pool.query(`INSERT INTO shipment_tracking (shipment_id, status, location, notes, created_at) VALUES (?, ?, ?, ?, '2026-11-10 16:20:00')`, [shp4.insertId, 'In Transit', 'Manhattan Hub, NY', 'Checked into Manhattan South facility']);
  await pool.query(`INSERT INTO shipment_tracking (shipment_id, status, location, notes, created_at) VALUES (?, ?, ?, ?, '2026-11-11 08:30:00')`, [shp4.insertId, 'Out for Delivery', 'Manhattan Midtown, NY', 'Courier on route with recipient']);

  // Shipment 5: Packed (Order 6)
  const [shp5] = await pool.query(
    `INSERT INTO shipments (tracking_number, order_id, courier_name, shipment_date, estimated_delivery_date, actual_delivery_date, current_status, shipping_address)
     VALUES (?, ?, ?, '2026-11-11', '2026-11-15', NULL, 'Packed', ?)`,
    ['TRK-SPD-33882', ord6.insertId, 'SpeedPost Express Priority', '742 Evergreen Terrace, Springfield, IL 62704']
  );
  await pool.query(`INSERT INTO shipment_tracking (shipment_id, status, location, notes, created_at) VALUES (?, ?, ?, ?, '2026-11-11 08:30:00')`, [shp5.insertId, 'Processing', 'Springfield Operations Center, IL', 'Electronic manifest created']);
  await pool.query(`INSERT INTO shipment_tracking (shipment_id, status, location, notes, created_at) VALUES (?, ?, ?, ?, '2026-11-11 11:15:00')`, [shp5.insertId, 'Packed', 'Springfield Operations Center, IL', 'Sealed and barcode verified']);

  console.log('[DB] Seeding completed successfully!');
}

function getPool() {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initDB first.');
  }
  return pool;
}

module.exports = {
  initDB,
  getPool
};
