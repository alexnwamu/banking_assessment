// global database connection
import { Database } from "sqlite3";
import * as sqlite3 from "sqlite3";
import path from "path";
import bcrypt from "bcryptjs";

const dbPath = path.join(__dirname, "../data/banking.db");

export const db: Database = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database:", err);
  } else {
    console.log("Connected to SQLite database at:", dbPath);
    initializeDatabase();
  }
});

// Basic database initialization
function initializeDatabase() {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const createAccountsTable = `
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      accountNumber TEXT UNIQUE,
      accountType TEXT CHECK(accountType IN ('CHECKING', 'SAVINGS')),
      balance REAL,
      accountHolder TEXT,
      user_id INTEGER,
      createdAt TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `;

  const createTransactionsTable = `
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id TEXT NOT NULL,
      type TEXT CHECK(type IN ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER')),
      amount REAL NOT NULL,
      description TEXT,
      to_account_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES accounts(id),
      FOREIGN KEY (to_account_id) REFERENCES accounts(id)
    )
  `;

  db.serialize(() => {
    db.run(createUsersTable, (err) => {
      if (err) {
        console.error("Error creating users table:", err);
      } else {
        console.log("Users table created");
      }
    });

    db.run(createAccountsTable, (err) => {
      if (err) {
        console.error("Error creating accounts table:", err);
      } else {
        console.log("Accounts table created");
      }
    });

    db.run(createTransactionsTable, (err) => {
      if (err) {
        console.error("Error creating transactions table:", err);
      } else {
        console.log("Transactions table created");
        checkAndInsertSampleData();
      }
    });
  });
}

function checkAndInsertSampleData() {
  // First, ensure demo admin user exists
  createDemoUser();

  db.get(
    "SELECT COUNT(*) as count FROM accounts",
    (err, row: { count: number }) => {
      if (err) {
        console.error("Error checking accounts:", err);
        return;
      }
      if (row.count === 0) {
        insertSampleData();
      } else {
        console.log("Sample data already exists, skipping insertion");
      }
    }
  );
}

async function createDemoUser() {
  const demoEmail = "admin@demo.com";
  const demoPassword = "Admin123";
  const demoName = "Demo Admin";

  db.get(
    "SELECT * FROM users WHERE email = ?",
    [demoEmail],
    async (err, row) => {
      if (err) {
        console.error("Error checking demo user:", err);
        return;
      }
      if (!row) {
        const hashedPassword = await bcrypt.hash(demoPassword, 10);
        db.run(
          "INSERT INTO users (email, password, name) VALUES (?, ?, ?)",
          [demoEmail, hashedPassword, demoName],
          (err) => {
            if (err) {
              console.error("Error creating demo user:", err);
            } else {
              console.log("Demo user created: admin@demo.com / Admin123");
            }
          }
        );
      } else {
        console.log("Demo user already exists");
      }
    }
  );
}

function insertSampleData() {
  const sampleAccounts = [
    {
      id: "1",
      accountNumber: "1001",
      accountType: "CHECKING",
      balance: 5000.0,
      accountHolder: "John Doe",
      createdAt: new Date().toISOString(),
    },
    {
      id: "2",
      accountNumber: "1002",
      accountType: "SAVINGS",
      balance: 10000.0,
      accountHolder: "Jane Smith",
      createdAt: new Date().toISOString(),
    },
  ];

  const insertAccountQuery = `
    INSERT OR REPLACE INTO accounts (id, accountNumber, accountType, balance, accountHolder, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  let accountsInserted = 0;
  sampleAccounts.forEach((account) => {
    db.run(
      insertAccountQuery,
      [
        account.id,
        account.accountNumber,
        account.accountType,
        account.balance,
        account.accountHolder,
        account.createdAt,
      ],
      (err) => {
        if (err) {
          console.error("Error inserting account:", err);
        } else {
          console.log(`Account ${account.accountNumber} inserted`);
          accountsInserted++;

          // Insert sample transactions after all accounts are created
          if (accountsInserted === sampleAccounts.length) {
            insertSampleTransactions();
          }
        }
      }
    );
  });
}

function insertSampleTransactions() {
  const sampleTransactions = [
    // John Doe's transactions
    {
      account_id: "1",
      type: "DEPOSIT",
      amount: 1000,
      description: "Salary deposit",
      created_at: "2024-01-15T10:00:00.000Z",
    },
    {
      account_id: "1",
      type: "WITHDRAWAL",
      amount: 50,
      description: "ATM withdrawal",
      created_at: "2024-01-16T14:30:00.000Z",
    },
    {
      account_id: "1",
      type: "TRANSFER",
      amount: 200,
      description: "Transfer to savings account",
      to_account_id: "2",
      created_at: "2024-01-17T09:15:00.000Z",
    },
    // Jane Smith's transactions
    {
      account_id: "2",
      type: "DEPOSIT",
      amount: 2000,
      description: "Investment return",
      created_at: "2024-01-15T11:00:00.000Z",
    },
    {
      account_id: "2",
      type: "WITHDRAWAL",
      amount: 100,
      description: "Online purchase debit",
      created_at: "2024-01-16T16:45:00.000Z",
    },
    {
      account_id: "2",
      type: "DEPOSIT",
      amount: 500,
      description: "Refund",
      created_at: "2024-01-17T13:20:00.000Z",
    },
  ];

  const insertTransactionQuery = `
    INSERT INTO transactions (account_id, type, amount, description, to_account_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  sampleTransactions.forEach((transaction) => {
    db.run(
      insertTransactionQuery,
      [
        transaction.account_id,
        transaction.type,
        transaction.amount,
        transaction.description,
        transaction.to_account_id || null,
        transaction.created_at,
      ],
      (err) => {
        if (err) {
          console.error("Error inserting transaction:", err);
        } else {
          console.log(
            `Transaction inserted for account ${transaction.account_id}`
          );
        }
      }
    );
  });
}
