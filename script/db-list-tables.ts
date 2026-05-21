import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const host = process.env.DATABASE_URL?.match(/@([^/]+)/)?.[1] ?? "unknown";
  console.log("Connected to:", host);

  const tables = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' ORDER BY table_name`,
  );

  if (tables.rows.length === 0) {
    console.log("\nNo tables in this database — it is empty (no JewelPOS schema).");
    console.log("No customer data can exist until tables are created and data is imported.");
    return;
  }

  console.log("\nTables:", tables.rows.map((r) => r.table_name).join(", "));

  if (tables.rows.some((r) => r.table_name === "customers")) {
    const counts = await pool.query(
      `SELECT store_id, COUNT(*)::int AS count FROM customers GROUP BY store_id ORDER BY store_id`,
    );
    const total = await pool.query(`SELECT COUNT(*)::int AS count FROM customers`);
    console.log("\nTotal customers:", total.rows[0].count);
    if (counts.rows.length) console.table(counts.rows);
  } else {
    console.log("\nNo 'customers' table found.");
  }
}

main()
  .catch((e) => console.error("Error:", e.message))
  .finally(() => pool.end());
