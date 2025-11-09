/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { apiFetch } from "../../lib/api";

type UserLite = { _id: string; name?: string; email?: string; phone?: string; createdAt?: string };
type Subscription = {
  _id: string;
  user: UserLite | string;
  type: "SERVICE_SEARCH" | "JOB_SEARCH" | "SERVICE_POST" | string;
  startDate?: string;
  endDate: string;
  createdAt?: string;
  updatedAt?: string;
  freeServicePostUsed?: boolean;
  isActive?: boolean;
  daysRemaining?: number;
};

type Summary = {
  activeCounts: { SERVICE_POST: number; JOB_SEARCH: number; SERVICE_SEARCH: number };
  totalUsers: number;
  activeUsersCount: number;
  freeUsersCount: number;
};

export default function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await apiFetch<{
          status: string;
          results: number;
          data: { subscriptions: Subscription[]; summary: Summary };
        }>("/api/subscriptions/all", { auth: true });
        if (!alive) return;
        const subs = (resp as any)?.data?.subscriptions || (resp as any)?.subscriptions || [];
        const sum = (resp as any)?.data?.summary || (resp as any)?.summary || null;
        setSubscriptions(Array.isArray(subs) ? subs : []);
        setSummary(sum);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg || "Failed to load subscriptions");
      } finally {
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subscriptions;
    const str = (v: any) => String(v || "").toLowerCase();
    return subscriptions.filter((s) => {
      const u = s.user as UserLite;
      return [s.type, u?.name, u?.email, u?.phone]
        .filter(Boolean)
        .some((v) => str(v).includes(q));
    });
  }, [subscriptions, query]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / pageSize)), [filtered.length, pageSize]);
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const changePage = (next: number) => {
    if (next < 1 || next > totalPages) return;
    setPage(next);
  };

  const fmtDate = (iso?: string) => {
    if (!iso) return "";
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  };

  const handleExportCsv = () => {
    const headers = [
      "UserName",
      "UserEmail",
      "UserPhone",
      "Type",
      "StartDate",
      "EndDate",
      "Active",
      "DaysRemaining",
      "FreeServicePostUsed",
      "CreatedAt",
      "Id",
    ];
    const rows = filtered.map((s) => {
      const u = s.user as UserLite;
      return [
        u?.name ?? "",
        u?.email ?? "",
        u?.phone ?? "",
        s.type ?? "",
        s.startDate ? new Date(s.startDate).toISOString() : "",
        s.endDate ? new Date(s.endDate).toISOString() : "",
        s.isActive ? "Yes" : "No",
        typeof s.daysRemaining === "number" ? String(s.daysRemaining) : "",
        s.freeServicePostUsed ? "Yes" : "No",
        s.createdAt ? new Date(s.createdAt).toISOString() : "",
        s._id,
      ];
    });
    const csv = [headers.join(","), ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscriptions_export_${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageMeta title="Admin Subscriptions" description="View and analyze subscriptions" />
      <PageBreadcrumb pageTitle="Admin Subscriptions" />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="rounded-md border border-gray-200 dark:border-gray-800 p-3">
              <div className="text-xs text-gray-500">Service Post (active)</div>
              <div className="text-lg font-semibold">{summary.activeCounts.SERVICE_POST}</div>
            </div>
            <div className="rounded-md border border-gray-200 dark:border-gray-800 p-3">
              <div className="text-xs text-gray-500">Job Search (active)</div>
              <div className="text-lg font-semibold">{summary.activeCounts.JOB_SEARCH}</div>
            </div>
            <div className="rounded-md border border-gray-200 dark:border-gray-800 p-3">
              <div className="text-xs text-gray-500">Service Search (active)</div>
              <div className="text-lg font-semibold">{summary.activeCounts.SERVICE_SEARCH}</div>
            </div>
            <div className="rounded-md border border-gray-200 dark:border-gray-800 p-3">
              <div className="text-xs text-gray-500">Free Users (no active subs)</div>
              <div className="text-lg font-semibold">{summary.freeUsersCount}</div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">View-only list of all subscriptions with user details.</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search by user or type"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              className="w-full md:w-96 rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent"
            />
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center rounded-md px-3 py-2 text-xs font-medium border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Download CSV
            </button>
          </div>
        </div>

        {loading && <div className="text-sm text-gray-600 dark:text-gray-300">Loading subscriptions...</div>}
        {error && (
          <div className="rounded bg-red-50 text-red-700 px-3 py-2 text-sm dark:bg-red-900/20 dark:text-red-300">{error}</div>
        )}

        {!loading && !error && (
          <>
            {paged.length === 0 ? (
              <div className="text-sm text-gray-600 dark:text-gray-300">No subscriptions found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-white/5">
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">User</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Start</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">End</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Active</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Days Left</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Free SP Used</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {paged.map((s) => {
                      const u = s.user as UserLite;
                      return (
                        <tr key={s._id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                          <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 align-top">
                            <div className="truncate">{u?.name || "Unknown"}</div>
                            <div className="truncate text-xs text-gray-600 dark:text-gray-400">{u?.email || ""}</div>
                            <div className="truncate text-xs text-gray-600 dark:text-gray-400">{u?.phone || ""}</div>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 align-top">{s.type}</td>
                          <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 align-top">{fmtDate(s.startDate)}</td>
                          <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 align-top">{fmtDate(s.endDate)}</td>
                          <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 align-top">{s.isActive ? "Yes" : "No"}</td>
                          <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 align-top">{typeof s.daysRemaining === "number" ? s.daysRemaining : ""}</td>
                          <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 align-top">{s.freeServicePostUsed ? "Yes" : "No"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="rounded border border-gray-200 px-2 py-1 dark:border-gray-800 dark:bg-transparent"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span>
                  {filtered.length} total
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => changePage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="rounded border border-gray-200 px-2 py-1 text-sm disabled:opacity-50 dark:border-gray-800"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-300">Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => changePage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="rounded border border-gray-200 px-2 py-1 text-sm disabled:opacity-50 dark:border-gray-800"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}