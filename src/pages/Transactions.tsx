/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import Button from "../components/ui/button/Button";
import { apiFetch } from "../lib/api";

type Transaction = {
  _id: string;
  subscriptionType: "SERVICE_SEARCH" | "JOB_SEARCH" | "SERVICE_POST" | string;
  amount: number;
  status: "pending" | "completed" | "failed" | string;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  createdAt?: string;
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = (await apiFetch("/api/payments/my-transactions")) as any;
      const list: Transaction[] = res?.data?.transactions ?? res?.transactions ?? res ?? [];
      setTransactions(Array.isArray(list) ? list : []);
    } catch (err: any) {
      const msg = err?.message || String(err);
      setError(msg || "Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const formatDate = (iso?: string) => {
    if (!iso) return "-";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const formatRupees = (amount?: number) => {
    if (typeof amount !== "number") return "-";
    return `₹${amount}`;
  };

  return (
    <>
      <PageMeta title="Transactions" description="Your payment history" />
      <PageBreadcrumb pageTitle="Transactions" />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-gray-700 dark:text-gray-300">View your subscription payment transactions.</div>
          <Button onClick={loadTransactions} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        </div>

        {error && (
          <div className="mb-4 rounded bg-red-50 text-red-700 px-3 py-2 text-sm dark:bg-red-900/20 dark:text-red-300">{error}</div>
        )}

        {loading ? (
          <div className="rounded bg-blue-50 text-blue-700 px-3 py-2 text-sm dark:bg-blue-900/20 dark:text-blue-300">Loading transactions…</div>
        ) : transactions.length === 0 ? (
          <div className="rounded bg-gray-50 text-gray-700 px-3 py-2 text-sm dark:bg-white/[0.06] dark:text-gray-300">No transactions found.</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-900/20">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Payment ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Order ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {transactions.map((t) => (
                  <tr key={t._id}>
                    <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{formatDate(t.createdAt)}</td>
                    <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200">{t.subscriptionType?.replace("_", " ")}</td>
                    <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200">{formatRupees(t.amount)}</td>
                    <td className="px-4 py-2 text-sm">
                      <span
                        className={
                          t.status === "completed"
                            ? "rounded bg-green-100 px-2 py-1 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            : t.status === "failed"
                            ? "rounded bg-red-100 px-2 py-1 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                            : "rounded bg-yellow-100 px-2 py-1 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                        }
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-600 dark:text-gray-300 break-all">{t.razorpayPaymentId}</td>
                    <td className="px-4 py-2 text-xs text-gray-600 dark:text-gray-300 break-all">{t.razorpayOrderId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}