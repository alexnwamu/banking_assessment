import { Request, Response } from "express";
import { createTransaction, getTransactions } from "./transaction.controller";
import { db } from "../db";

// Mock the db module
jest.mock("../db", () => ({
  db: {
    run: jest.fn(),
    get: jest.fn(),
    all: jest.fn(),
  },
}));

describe("Transaction Controller", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      params: { id: "1" },
      body: {},
      query: {},
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    jest.clearAllMocks();
  });

  describe("createTransaction", () => {
    it("should create a deposit transaction successfully", async () => {
      mockRequest.body = {
        type: "DEPOSIT",
        amount: 100,
        description: "Test deposit",
      };

      (db.run as jest.Mock)
        .mockImplementationOnce((query, callback) => callback(null)) // BEGIN TRANSACTION
        .mockImplementationOnce((query, params, callback) => callback(null)) // UPDATE account
        .mockImplementationOnce((query, params, callback) => {
          callback.call({ lastID: 1 }, null);
        }) // INSERT transaction
        .mockImplementationOnce((query, callback) => callback(null)); // COMMIT

      (db.get as jest.Mock).mockImplementationOnce(
        (query, params, callback) => {
          callback(null, { id: "1", balance: 1000 });
        }
      );

      await createTransaction(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          accountId: "1",
          type: "DEPOSIT",
          amount: 100,
          description: "Test deposit",
          balance: 1100,
        })
      );
    });

    it("should create a withdrawal transaction successfully", async () => {
      mockRequest.body = {
        type: "WITHDRAWAL",
        amount: 50,
        description: "Test withdrawal",
      };

      (db.run as jest.Mock)
        .mockImplementationOnce((query, callback) => callback(null)) // BEGIN TRANSACTION
        .mockImplementationOnce((query, params, callback) => callback(null)) // UPDATE account
        .mockImplementationOnce((query, params, callback) => {
          callback.call({ lastID: 2 }, null);
        }) // INSERT transaction
        .mockImplementationOnce((query, callback) => callback(null)); // COMMIT

      (db.get as jest.Mock).mockImplementationOnce(
        (query, params, callback) => {
          callback(null, { id: "1", balance: 1000 });
        }
      );

      await createTransaction(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 2,
          accountId: "1",
          type: "WITHDRAWAL",
          amount: 50,
          description: "Test withdrawal",
          balance: 950,
        })
      );
    });

    it("should create a transfer transaction successfully", async () => {
      mockRequest.body = {
        type: "TRANSFER",
        amount: 200,
        description: "Test transfer",
        toAccountId: "2",
      };

      (db.run as jest.Mock)
        .mockImplementationOnce((query, callback) => callback(null)) // BEGIN TRANSACTION
        .mockImplementationOnce((query, params, callback) => callback(null)) // UPDATE source account
        .mockImplementationOnce((query, params, callback) => callback(null)) // UPDATE target account
        .mockImplementationOnce((query, params, callback) => {
          callback.call({ lastID: 3 }, null);
        }) // INSERT transaction
        .mockImplementationOnce((query, callback) => callback(null)); // COMMIT

      (db.get as jest.Mock)
        .mockImplementationOnce((query, params, callback) => {
          callback(null, { id: "1", balance: 1000 });
        }) // Source account
        .mockImplementationOnce((query, params, callback) => {
          callback(null, { id: "2", balance: 500 });
        }); // Target account

      await createTransaction(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 3,
          accountId: "1",
          type: "TRANSFER",
          amount: 200,
          description: "Test transfer",
          toAccountId: "2",
          balance: 800,
        })
      );
    });

    it("should return 400 for invalid transaction type", async () => {
      mockRequest.body = {
        type: "INVALID",
        amount: 100,
        description: "Test",
      };

      await createTransaction(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error:
          "Invalid transaction type. Must be 'DEPOSIT', 'WITHDRAWAL', or 'TRANSFER'",
      });
    });

    it("should return 400 for negative amount", async () => {
      mockRequest.body = {
        type: "DEPOSIT",
        amount: -100,
        description: "Test",
      };

      await createTransaction(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: "Amount must be a positive number",
      });
    });

    it("should return 400 for amount exceeding limit", async () => {
      mockRequest.body = {
        type: "DEPOSIT",
        amount: 1000001,
        description: "Test",
      };

      await createTransaction(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: "Amount exceeds maximum limit of $1,000,000",
      });
    });

    it("should return 400 for missing description", async () => {
      mockRequest.body = {
        type: "DEPOSIT",
        amount: 100,
        description: "",
      };

      await createTransaction(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: "Description is required",
      });
    });

    it("should return 400 for transfer without target account", async () => {
      mockRequest.body = {
        type: "TRANSFER",
        amount: 100,
        description: "Test transfer",
      };

      await createTransaction(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: "Target account ID is required for transfers",
      });
    });

    it("should return 404 for non-existent account", async () => {
      mockRequest.body = {
        type: "DEPOSIT",
        amount: 100,
        description: "Test",
      };

      (db.run as jest.Mock)
        .mockImplementationOnce((query, callback) => callback(null)) // BEGIN TRANSACTION
        .mockImplementationOnce((query, callback) => callback(null)); // ROLLBACK

      (db.get as jest.Mock).mockImplementationOnce(
        (query, params, callback) => {
          callback(null, null);
        }
      );

      await createTransaction(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: "Account not found",
      });
    });

    it("should return 400 for insufficient funds", async () => {
      mockRequest.body = {
        type: "WITHDRAWAL",
        amount: 2000,
        description: "Test withdrawal",
      };

      (db.run as jest.Mock)
        .mockImplementationOnce((query, callback) => callback(null)) // BEGIN TRANSACTION
        .mockImplementationOnce((query, callback) => callback(null)); // ROLLBACK

      (db.get as jest.Mock).mockImplementationOnce(
        (query, params, callback) => {
          callback(null, { id: "1", balance: 1000 });
        }
      );

      await createTransaction(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: "Insufficient funds",
      });
    });
  });

  describe("getTransactions", () => {
    it("should fetch transactions successfully", async () => {
      mockRequest.query = { page: "1", limit: "10" };

      const mockTransactions = [
        {
          id: 1,
          account_id: "1",
          type: "DEPOSIT",
          amount: 100,
          description: "Test",
          created_at: "2024-01-01",
        },
        {
          id: 2,
          account_id: "1",
          type: "WITHDRAWAL",
          amount: 50,
          description: "Test",
          created_at: "2024-01-02",
        },
      ];

      (db.get as jest.Mock)
        .mockImplementationOnce((query, params, callback) => {
          callback(null, { id: "1", balance: 1000 });
        }) // Account exists
        .mockImplementationOnce((query, params, callback) => {
          callback(null, { count: 2 });
        }); // Total count

      (db.all as jest.Mock).mockImplementationOnce(
        (query, params, callback) => {
          callback(null, mockTransactions);
        }
      );

      await getTransactions(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        transactions: mockTransactions,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it("should handle pagination", async () => {
      mockRequest.query = { page: "2", limit: "5" };

      (db.get as jest.Mock)
        .mockImplementationOnce((query, params, callback) => {
          callback(null, { id: "1", balance: 1000 });
        })
        .mockImplementationOnce((query, params, callback) => {
          callback(null, { count: 20 });
        });

      (db.all as jest.Mock).mockImplementationOnce(
        (query, params, callback) => {
          callback(null, []);
        }
      );

      await getTransactions(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        transactions: [],
        total: 20,
        page: 2,
        limit: 5,
        totalPages: 4,
      });
    });

    it("should return 404 for non-existent account", async () => {
      (db.get as jest.Mock).mockImplementationOnce(
        (query, params, callback) => {
          callback(null, null);
        }
      );

      await getTransactions(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: "Account not found",
      });
    });

    it("should handle database errors", async () => {
      (db.get as jest.Mock).mockImplementationOnce(
        (query, params, callback) => {
          callback(new Error("Database error"), null);
        }
      );

      await getTransactions(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: "Failed to fetch transactions",
      });
    });
  });
});
