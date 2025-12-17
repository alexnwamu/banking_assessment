/**
 * Banking Dashboard API Server
 * Features:
 * - Persistent SQLite database
 * - JWT authentication
 * - Input validation with express-validator
 * - Rate limiting
 * - Error handling
 */

import express from "express";
import cors from "cors";
import { db } from "./db";
import { transactionRouter } from "./transactions /transaction.route";
import { authRouter } from "./auth/auth.route";
import { authenticateToken } from "./middleware/auth.middleware";
import { generalLimiter, authLimiter } from "./middleware/rateLimit.middleware";

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(generalLimiter);

// Auth routes (with stricter rate limiting)
app.use("/api/auth", authLimiter, authRouter);

// Protected API routes
app.get("/api/accounts", authenticateToken, (req, res) => {
  db.all("SELECT * FROM accounts", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get("/api/accounts/:id", authenticateToken, (req, res) => {
  db.get("SELECT * FROM accounts WHERE id = ?", [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: "Account not found" });
      return;
    }
    res.json(row);
  });
});

// Get all transactions (for transactions page)
app.get("/api/transactions", authenticateToken, (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = (page - 1) * limit;

  db.get(
    "SELECT COUNT(*) as total FROM transactions",
    (err, countRow: { total: number }) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      db.all(
        `SELECT t.*, a.accountHolder, a.accountNumber 
       FROM transactions t 
       LEFT JOIN accounts a ON t.account_id = a.id 
       ORDER BY t.created_at DESC 
       LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, rows) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          res.json({
            transactions: rows,
            total: countRow.total,
            page,
            limit,
            totalPages: Math.ceil(countRow.total / limit),
          });
        }
      );
    }
  );
});

app.use("/api/accounts", authenticateToken, transactionRouter);

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({ error: "Something went wrong!" });
  }
);

// Server startup
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
