/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import Button from "../components/ui/button/Button";
import { apiFetch } from "../lib/api";

type GovernmentJob = {
  _id: string;
  jobTitle: string;
  organizationName: string;
  lastDateToApply: string; // ISO from backend
  applyLink: string;
  jobType: string; // 'Govt Jobs' | 'PSU Jobs' | 'Semi Govt Jobs' | 'MSME Jobs'
};

const PAGE_SIZE = 12;

export default function GovernmentJobsPage() {
  const [jobs, setJobs] = useState<GovernmentJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = (await apiFetch("/api/government-jobs")) as any;
        // Support different possible response shapes from apiFetch/backends
        const list: GovernmentJob[] = (
          Array.isArray(res)
            ? res
            : res?.data?.governmentJobs ??
              res?.governmentJobs ??
              res?.data ??
              res ??
              []
        );
        setJobs(list);
      } catch (err: any) {
        const msg = err?.message || String(err);
        setError(msg || "Failed to load government jobs.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Client-side search across key fields
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) =>
      [j.jobTitle, j.organizationName, j.jobType]
        .map((v) => (v || "").toLowerCase())
        .some((v) => v.includes(q))
    );
  }, [jobs, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageClamped = Math.min(page, totalPages);
  const start = (pageClamped - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  useEffect(() => {
    // Reset to first page when search query changes
    setPage(1);
  }, [query]);

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString();
    } catch {
      return iso;
    }
  };

  return (
    <>
      <PageMeta title="Government Jobs" description="Browse latest government jobs" />
      <PageBreadcrumb pageTitle="Government Jobs" />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        {/* Search bar */}
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            className="flex-1 rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent"
            placeholder="Search by title, organization, or type"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button onClick={() => setPage(1)}>Search</Button>
        </div>

        {loading && (
          <div className="rounded bg-blue-50 text-blue-700 px-3 py-2 text-sm dark:bg-blue-900/20 dark:text-blue-300">Loading jobs…</div>
        )}
        {error && (
          <div className="rounded bg-red-50 text-red-700 px-3 py-2 text-sm dark:bg-red-900/20 dark:text-red-300">{error}</div>
        )}

        {!loading && !error && (
          <>
            {filtered.length === 0 ? (
              <div className="rounded bg-yellow-50 text-yellow-700 px-3 py-2 text-sm dark:bg-yellow-900/20 dark:text-yellow-300">
                No jobs found. Try adjusting your search.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {visible.map((job) => (
                  <div
                    key={job._id}
                    className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"
                    style={{ minHeight: 220 }}
                  >
                    <div>
                      <div className="text-base font-semibold text-gray-900 dark:text-white">{job.jobTitle}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">{job.organizationName}</div>
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Type: {job.jobType}</div>
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Last date: {formatDate(job.lastDateToApply)}</div>
                    </div>
                    <div className="mt-3">
                      <a
                        href={job.applyLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-full items-center justify-center rounded bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90"
                      >
                        Apply
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {filtered.length > 0 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Page {pageClamped} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pageClamped === 1}>
                    Previous
                  </Button>
                  <Button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={pageClamped === totalPages}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}