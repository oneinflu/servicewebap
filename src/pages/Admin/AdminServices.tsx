/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { apiFetch } from "../../lib/api";

type Category = { _id: string; name: string };
type Service = {
  _id: string;
  categoryPrices: Array<{ category: Category; price: number }>;
  location: { address: string; district: string; city: string; state: string; country: string; pincode: string };
  user?: { name?: string; email?: string; phone?: string };
  createdAt?: string;
  isCompanyPost?: boolean;
  companyId?: string | null;
};

export default function AdminServices() {
  const [services, setServices] = useState<Service[]>([]);
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
          data: { services: Service[] };
        }>("/api/services");
        if (!mounted) return;
        setServices(res?.data?.services ?? []);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!mounted) return;
        setError(msg || "Failed to load services");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return services;
    const match = (s: Service) => {
      const catNames = (s.categoryPrices || []).map(cp => cp.category?.name || "").join(" ");
      const priceText = (s.categoryPrices || []).map(cp => String(cp.price)).join(" ");
      const loc = `${s.location?.address || ""} ${s.location?.city || ""} ${s.location?.district || ""} ${s.location?.state || ""} ${s.location?.country || ""} ${s.location?.pincode || ""}`;
      const userText = `${s.user?.name || ""} ${s.user?.email || ""} ${s.user?.phone || ""}`;
      return (
        (catNames.toLowerCase().includes(q)) ||
        (priceText.toLowerCase().includes(q)) ||
        (loc.toLowerCase().includes(q)) ||
        (userText.toLowerCase().includes(q))
      );
    };
    return services.filter(match);
  }, [services, query]);

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
      "Prices",
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
      "CreatedAt",
      "Id",
    ];
    const rows = filtered.map((s) => {
      const cats = (s.categoryPrices || []).map(cp => cp.category?.name || "").join("|");
      const prices = (s.categoryPrices || []).map(cp => String(cp.price)).join("|");
      return [
        cats,
        prices,
        s.location?.address ?? "",
        s.location?.city ?? "",
        s.location?.district ?? "",
        s.location?.state ?? "",
        s.location?.country ?? "",
        s.location?.pincode ?? "",
        s.user?.name ?? "",
        s.user?.email ?? "",
        s.user?.phone ?? "",
        s.isCompanyPost ? "Yes" : "No",
        s.createdAt ? new Date(s.createdAt).toISOString() : "",
        s._id,
      ];
    });
    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `services_export_${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageMeta title="Admin Services" description="View all user-posted services" />
      <PageBreadcrumb pageTitle="Admin Services" />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">View-only list of all services posted by users.</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search by category, price, location, or user"
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

        {loading && <div className="text-sm text-gray-600 dark:text-gray-300">Loading services...</div>}
        {error && (
          <div className="rounded bg-red-50 text-red-700 px-3 py-2 text-sm dark:bg-red-900/20 dark:text-red-300">{error}</div>
        )}

        {!loading && !error && (
          <>
            {paged.length === 0 ? (
              <div className="text-sm text-gray-600 dark:text-gray-300">No services found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-white/5">
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Categories & Prices</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Location</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">User</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Company Post</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {paged.map(svc => (
                      <tr key={svc._id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                        <td className="px-4 py-2 align-top">
                          <ul className="space-y-1">
                            {(svc.categoryPrices || []).map(cp => (
                              <li key={`${svc._id}-${cp.category?._id || Math.random()}`} className="text-sm text-gray-800 dark:text-gray-200">
                                <span className="font-medium">{cp.category?.name || "Unknown"}</span>
                                <span className="ml-2 text-gray-600 dark:text-gray-400">₹{cp.price}</span>
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 align-top">
                          <div className="max-w-xs">
                            <div className="truncate">{svc.location?.address}</div>
                            <div className="truncate text-xs text-gray-600 dark:text-gray-400">{[svc.location?.city, svc.location?.district, svc.location?.state, svc.location?.country, svc.location?.pincode].filter(Boolean).join(", ")}</div>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 align-top">
                          <div className="truncate">{svc.user?.name || "Unknown"}</div>
                          <div className="truncate text-xs text-gray-600 dark:text-gray-400">{svc.user?.email || ""}</div>
                          <div className="truncate text-xs text-gray-600 dark:text-gray-400">{svc.user?.phone || ""}</div>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 align-top">
                          {svc.isCompanyPost ? "Yes" : "No"}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 align-top">
                          {svc.createdAt ? new Date(svc.createdAt).toLocaleString() : ""}
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
                  className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 outline-none ring-0 focus:border-gray-300 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-gray-200"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span className="ml-2">{filtered.length} total</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex items-center rounded-md px-3 py-1 text-xs font-medium border border-gray-200 disabled:opacity-50 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => changePage(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  Prev
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-300">Page {currentPage} of {totalPages}</span>
                <button
                  className="inline-flex items-center rounded-md px-3 py-1 text-xs font-medium border border-gray-200 disabled:opacity-50 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => changePage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
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