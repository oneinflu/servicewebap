/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { apiFetch } from "../../lib/api";

type Category = { _id: string; name: string };
type Job = {
  _id: string;
  categories: Category[];
  location: { address: string; district: string; city: string; state: string; country: string; pincode: string };
  user?: { name?: string; email?: string; phone?: string };
  createdAt?: string;
  isCompanyPost?: boolean;
  companyId?: string | null;
};

export default function AdminJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<{
          status: string;
          results: number;
          data: { jobs: Job[] };
        }>("/api/jobs");
        if (!mounted) return;
        setJobs(res?.data?.jobs ?? []);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!mounted) return;
        setError(msg || "Failed to load jobs");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    const match = (j: Job) => {
      const catNames = (j.categories || []).map(c => c?.name || "").join(" ");
      const loc = `${j.location?.address || ""} ${j.location?.city || ""} ${j.location?.district || ""} ${j.location?.state || ""} ${j.location?.country || ""} ${j.location?.pincode || ""}`;
      const userText = `${j.user?.name || ""} ${j.user?.email || ""} ${j.user?.phone || ""}`;
      const companyText = j.isCompanyPost ? "company" : "";
      return (
        catNames.toLowerCase().includes(q) ||
        loc.toLowerCase().includes(q) ||
        userText.toLowerCase().includes(q) ||
        companyText.includes(q)
      );
    };
    return jobs.filter(match);
  }, [jobs, query]);

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

  const handleExportCsv = () => {
    const headers = [
      "Categories",
      "Address",
      "City",
      "District",
      "State",
      "Country",
      "Pincode",
      "UserName",
      "UserEmail",
      "UserPhone",
      "CompanyPost",
      "CompanyId",
      "CreatedAt",
      "Id",
    ];
    const rows = filtered.map((j) => [
      (j.categories || []).map(c => c?.name || "").join("|"),
      j.location?.address ?? "",
      j.location?.city ?? "",
      j.location?.district ?? "",
      j.location?.state ?? "",
      j.location?.country ?? "",
      j.location?.pincode ?? "",
      j.user?.name ?? "",
      j.user?.email ?? "",
      j.user?.phone ?? "",
      j.isCompanyPost ? "Yes" : "No",
      j.companyId ?? "",
      j.createdAt ? new Date(j.createdAt).toISOString() : "",
      j._id,
    ]);
    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jobs_export_${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageMeta title="Admin Jobs" description="View all user-posted jobs" />
      <PageBreadcrumb pageTitle="Admin Jobs" />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">View-only list of all jobs posted by users.</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search by category, location, or user"
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

        {loading && <div className="text-sm text-gray-600 dark:text-gray-300">Loading jobs...</div>}
        {error && (
          <div className="rounded bg-red-50 text-red-700 px-3 py-2 text-sm dark:bg-red-900/20 dark:text-red-300">{error}</div>
        )}

        {!loading && !error && (
          <>
            {paged.length === 0 ? (
              <div className="text-sm text-gray-600 dark:text-gray-300">No jobs found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-white/5">
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Categories</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Location</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">User</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Company Post</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {paged.map(job => (
                      <tr key={job._id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                        <td className="px-4 py-2 align-top">
                          <ul className="space-y-1">
                            {(job.categories || []).map(cat => (
                              <li key={`${job._id}-${cat?._id || Math.random()}`} className="text-sm text-gray-800 dark:text-gray-200">
                                <span className="font-medium">{cat?.name || "Unknown"}</span>
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 align-top">
                          <div className="max-w-xs">
                            <div className="truncate">{job.location?.address}</div>
                            <div className="truncate text-xs text-gray-600 dark:text-gray-400">{[job.location?.city, job.location?.district, job.location?.state, job.location?.country, job.location?.pincode].filter(Boolean).join(", ")}</div>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 align-top">
                          <div className="truncate">{job.user?.name || "Unknown"}</div>
                          <div className="truncate text-xs text-gray-600 dark:text-gray-400">{job.user?.email || ""}</div>
                          <div className="truncate text-xs text-gray-600 dark:text-gray-400">{job.user?.phone || ""}</div>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 align-top">
                          {job.isCompanyPost ? "Yes" : "No"}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 align-top">
                          {job.createdAt ? new Date(job.createdAt).toLocaleString() : ""}
                        </td>
                      </tr>
                    ))}
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