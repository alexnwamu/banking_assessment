import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach, Mock } from "vitest";
import TransactionTable from "../TransactionTable";
import { getTransactions } from "../../api";

vi.mock("../../api");

const mockGetTransactions = getTransactions as Mock;

describe("TransactionTable", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderComponent = (accountId: string) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <TransactionTable accountId={accountId} />
      </QueryClientProvider>
    );
  };

  it("renders loading state initially", () => {
    renderComponent("1");
    expect(screen.getByText(/loading transactions/i)).toBeInTheDocument();
  });

  it("renders error state on API failure", async () => {
    mockGetTransactions.mockRejectedValueOnce(new Error("Failed to fetch"));

    renderComponent("1");

    await waitFor(() => {
      expect(
        screen.getByText(/error loading transactions/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
    });
  });

  it("renders transactions successfully", async () => {
    const mockTransactions = {
      transactions: [
        {
          id: 1,
          account_id: "1",
          type: "DEPOSIT" as const,
          amount: 100,
          description: "Test deposit",
          created_at: "2024-01-15T10:00:00Z",
        },
        {
          id: 2,
          account_id: "1",
          type: "WITHDRAWAL" as const,
          amount: 50,
          description: "Test withdrawal",
          created_at: "2024-01-16T10:00:00Z",
        },
      ],
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
    };

    mockGetTransactions.mockResolvedValueOnce(mockTransactions);

    renderComponent("1");

    await waitFor(() => {
      expect(screen.getByText("Test deposit")).toBeInTheDocument();
      expect(screen.getByText("Test withdrawal")).toBeInTheDocument();
      expect(screen.getByText("+$100.00")).toBeInTheDocument();
      expect(screen.getByText("-$50.00")).toBeInTheDocument();
    });
  });

  it("filters transactions by type", async () => {
    const mockTransactions = {
      transactions: [
        {
          id: 1,
          account_id: "1",
          type: "DEPOSIT" as const,
          amount: 100,
          description: "Test deposit",
          created_at: "2024-01-15T10:00:00Z",
        },
        {
          id: 2,
          account_id: "1",
          type: "WITHDRAWAL" as const,
          amount: 50,
          description: "Test withdrawal",
          created_at: "2024-01-16T10:00:00Z",
        },
      ],
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
    };

    mockGetTransactions.mockResolvedValueOnce(mockTransactions);

    renderComponent("1");

    await waitFor(() => {
      expect(screen.getByText("Test deposit")).toBeInTheDocument();
      expect(screen.getByText("Test withdrawal")).toBeInTheDocument();
    });

    const filterSelect = screen.getByLabelText(/filter by/i);
    fireEvent.change(filterSelect, { target: { value: "DEPOSIT" } });

    expect(screen.getByText("Test deposit")).toBeInTheDocument();
    expect(screen.queryByText("Test withdrawal")).not.toBeInTheDocument();
  });

  it("sorts transactions by amount", async () => {
    const mockTransactions = {
      transactions: [
        {
          id: 1,
          account_id: "1",
          type: "DEPOSIT" as const,
          amount: 100,
          description: "Small deposit",
          created_at: "2024-01-15T10:00:00Z",
        },
        {
          id: 2,
          account_id: "1",
          type: "DEPOSIT" as const,
          amount: 500,
          description: "Large deposit",
          created_at: "2024-01-16T10:00:00Z",
        },
      ],
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
    };

    mockGetTransactions.mockResolvedValueOnce(mockTransactions);

    renderComponent("1");

    await waitFor(() => {
      expect(screen.getByText("Small deposit")).toBeInTheDocument();
    });

    const amountSortButton = screen.getByRole("button", { name: /amount/i });
    fireEvent.click(amountSortButton);

    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Small deposit");
    expect(rows[2]).toHaveTextContent("Large deposit");
  });

  it("handles pagination", async () => {
    const mockTransactions = {
      transactions: [],
      total: 25,
      page: 1,
      limit: 10,
      totalPages: 3,
    };

    mockGetTransactions.mockResolvedValueOnce(mockTransactions);

    renderComponent("1");

    await waitFor(() => {
      expect(screen.getByText(/showing page 1 of 3/i)).toBeInTheDocument();
    });

    const nextButton = screen.getByRole("button", { name: /next/i });
    expect(nextButton).not.toBeDisabled();

    const prevButton = screen.getByRole("button", { name: /previous/i });
    expect(prevButton).toBeDisabled();
  });

  it("displays empty state when no transactions", async () => {
    const mockTransactions = {
      transactions: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    };

    mockGetTransactions.mockResolvedValueOnce(mockTransactions);

    renderComponent("1");

    await waitFor(() => {
      expect(screen.getByText(/no transactions found/i)).toBeInTheDocument();
    });
  });

  it("displays transfer information correctly", async () => {
    const mockTransactions = {
      transactions: [
        {
          id: 1,
          account_id: "1",
          type: "TRANSFER" as const,
          amount: 200,
          description: "Transfer to savings",
          to_account_id: "2",
          created_at: "2024-01-15T10:00:00Z",
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    };

    mockGetTransactions.mockResolvedValueOnce(mockTransactions);

    renderComponent("1");

    await waitFor(() => {
      expect(screen.getByText("Transfer to savings")).toBeInTheDocument();
      expect(screen.getByText(/to account: 2/i)).toBeInTheDocument();
      expect(screen.getByText("-$200.00")).toBeInTheDocument();
    });
  });
});
