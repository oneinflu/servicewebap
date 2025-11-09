
import { useEffect, useMemo, useState } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import { apiFetch, API_BASE } from "../lib/api";

type Company = {
  _id: string;
  name?: string;
  website?: string;
  about?: string;
  logo?: string;
  location?: {
    address?: string;
    country?: string;
    state?: string;
    city?: string;
    district?: string;
    pincode?: string;
  };
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    let mounted = true;
    (async () => {
      setError(null);
      setLoading(true);
      try {
        const res = await apiFetch<{
          status: string;
          results: number;
          data: { companies: Company[] };
        }>("/api/companies");
        if (!mounted) return;
        setCompanies(res?.data?.companies ?? []);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!mounted) return;
        setError(msg || "Failed to load companies");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter(c =>
      (c.name || "").toLowerCase().includes(q) ||
      (c.website || "").toLowerCase().includes(q) ||
      (c.location?.city || "").toLowerCase().includes(q) ||
      (c.location?.state || "").toLowerCase().includes(q) ||
      (c.location?.country || "").toLowerCase().includes(q)
    );
  }, [companies, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const changePage = (p: number) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
  };

  return (
    <>
      <PageMeta title="Companies" description="View companies added by users" />
      <PageBreadcrumb pageTitle="Companies" />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">View-only list of companies added by users.</p>
          <input
            type="text"
            placeholder="Search by name, website, or location"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            className="w-full md:w-80 rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent"
          />
        </div>

        {loading && (
          <div className="text-sm text-gray-600 dark:text-gray-300">Loading companies...</div>
        )}
        {error && (
          <div className="rounded bg-red-50 text-red-700 px-3 py-2 text-sm dark:bg-red-900/20 dark:text-red-300">{error}</div>
        )}

        {!loading && !error && (
          <>
            {paged.length === 0 ? (
              <div className="text-sm text-gray-600 dark:text-gray-300">No companies found.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paged.map((c) => (
                  <article key={c._id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded bg-gray-100 dark:bg-white/5 overflow-hidden flex items-center justify-center">
                        {c.logo ? (
                          <img src={`${c.logo.startsWith("http") ? c.logo : `${API_BASE}${c.logo}`}`} alt={c.name || "Company Logo"} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs text-gray-500 dark:text-gray-400">No logo</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-medium text-gray-900 dark:text-white/90">{c.name || "Unnamed Company"}</h3>
                        {c.website && (
                          <a
                            href={c.website}
                            target="_blank"
                            rel="noreferrer"
                            className="truncate text-xs text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {c.website}
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                      {[c.location?.city, c.location?.state, c.location?.country].filter(Boolean).join(", ") || "Location not specified"}
                    </div>

                    {c.about && (
                      <p className="text-sm text-gray-700 dark:text-gray-200 line-clamp-3">
                        {c.about}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  className="rounded border border-gray-200 px-3 py-1 text-sm disabled:opacity-50 dark:border-gray-800"
                  onClick={() => changePage(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  Prev
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-300">Page {currentPage} of {totalPages}</span>
                <button
                  className="rounded border border-gray-200 px-3 py-1 text-sm disabled:opacity-50 dark:border-gray-800"
                  onClick={() => changePage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}