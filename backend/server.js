const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();
 
const app = express();
app.use(cors());
app.use(express.json());
 
// ─── DATABASE CONNECTION ───────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
 
// Create table if it doesn't exist yet
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id    SERIAL PRIMARY KEY,
      item  VARCHAR(100) NOT NULL,
      price INTEGER      NOT NULL,
      qty   INTEGER      NOT NULL DEFAULT 1,
      time  VARCHAR(50)
    )
  `);
  console.log("✅ Database ready");
}
 
initDB().catch(console.error);
 
// ─── ROUTES ───────────────────────────────────────────────────────────────────
 
// GET /  → health check
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Restaurant backend is running 🚀" });
});
 
// POST /order  → save one order row
app.post("/order", async (req, res) => {
  const { item, price, qty = 1, time } = req.body;
 
  if (!item || price == null) {
    return res.status(400).json({ error: "item and price are required" });
  }
 
  try {
    const result = await pool.query(
      "INSERT INTO orders (item, price, qty, time) VALUES ($1, $2, $3, $4) RETURNING *",
      [item, price, qty, time || new Date().toLocaleTimeString()]
    );
    console.log("Order saved:", result.rows[0]);
    res.status(201).json({ message: "Order saved ✔", order: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database insert failed" });
  }
});
 
// GET /orders  → return all orders (newest first)
app.get("/orders", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM orders ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});
 
// DELETE /orders  → clear all orders (useful for testing)
app.delete("/orders", async (req, res) => {
  try {
    await pool.query("TRUNCATE TABLE orders RESTART IDENTITY");
    res.json({ message: "All orders cleared" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to clear orders" });
  }
});
 
// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running → http://localhost:${PORT}`);
});
