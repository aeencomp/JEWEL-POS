import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const stores = await pool.query(
    `SELECT id, name, is_active, pos_system FROM stores ORDER BY id`,
  );
  const users = await pool.query(
    `SELECT id, username, role, store_id FROM users ORDER BY id`,
  );
  const customerCounts = await pool.query(
    `SELECT store_id, COUNT(*)::int AS count FROM customers GROUP BY store_id ORDER BY store_id`,
  );
  const inventoryCounts = await pool.query(
    `SELECT store_id, COUNT(*)::int AS count FROM inventory_items GROUP BY store_id ORDER BY store_id`,
  );

  console.log("\n=== STORES ===");
  console.table(stores.rows);

  console.log("\n=== USERS (store_id links user to store data) ===");
  console.table(users.rows);

  console.log("\n=== CUSTOMERS per store_id ===");
  console.table(customerCounts.rows.length ? customerCounts.rows : [{ note: "no customers in database" }]);

  console.log("\n=== INVENTORY per store_id ===");
  console.table(inventoryCounts.rows.length ? inventoryCounts.rows : [{ note: "no inventory in database" }]);

  const orphanCustomers = await pool.query(
    `SELECT COUNT(*)::int AS count FROM customers c
     WHERE NOT EXISTS (SELECT 1 FROM stores s WHERE s.id = c.store_id)`,
  );
  if (orphanCustomers.rows[0].count > 0) {
    console.log("\nWARNING: customers with invalid store_id:", orphanCustomers.rows[0].count);
  }

  const usersNoStore = users.rows.filter(
    (u: { role: string; store_id: number | null }) =>
      u.role === "store" && (u.store_id == null || u.store_id === ""),
  );
  if (usersNoStore.length) {
    console.log("\nWARNING: store users with NULL store_id (will see empty data):");
    console.table(usersNoStore);
  }

  try {
    const oilCustomers = await pool.query(
      `SELECT store_id, COUNT(*)::int AS count FROM oil_customers GROUP BY store_id ORDER BY store_id`,
    );
    console.log("\n=== OIL CUSTOMERS per store_id ===");
    console.table(
      oilCustomers.rows.length
        ? oilCustomers.rows
        : [{ note: "no oil_customers in database" }],
    );
  } catch {
    console.log("\n(oil_customers table not present)");
  }

  const storesNoUser = await pool.query(
    `SELECT s.id, s.name, s.pos_system
     FROM stores s
     LEFT JOIN users u ON u.store_id = s.id AND u.role = 'store'
     WHERE u.id IS NULL
     ORDER BY s.id`,
  );
  if (storesNoUser.rows.length) {
    console.log("\nWARNING: stores with NO store login user:");
    console.table(storesNoUser.rows);
  }

  for (const storeId of [6, 7, 8, 11]) {
    const [o, c, inv] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int c FROM orders WHERE store_id = $1`, [storeId]),
      pool.query(`SELECT COUNT(*)::int c FROM customers WHERE store_id = $1`, [storeId]),
      pool.query(`SELECT COUNT(*)::int c FROM inventory_items WHERE store_id = $1`, [storeId]),
    ]);
    console.log(
      `Store ${storeId}: orders=${o.rows[0].c}, customers=${c.rows[0].c}, inventory=${inv.rows[0].c}`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => pool.end());
