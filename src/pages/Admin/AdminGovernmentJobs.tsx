/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { apiFetch } from "../../lib/api";

type GovJob = {
  _id: string;
  jobTitle: string;
  organizationName: string;
  lastDateToApply?: string;
  applyLink: string;
  jobType: 'Govt Jobs' | 'PSU Jobs' | 'Semi Govt Jobs' | 'MSME Jobs' | string;
  createdAt?: string;
  updatedAt?: string;
};

const JOB_TYPES = ['Govt Jobs','PSU Jobs','Semi Govt Jobs','MSME Jobs'];

export default function AdminGovernmentJobs() {
  const [jobs, setJobs] = useState<GovJob[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<GovJob | null>(null);
  const [viewOpen, setViewOpen] = useState<boolean>(false);
  const [viewItem, setViewItem] = useState<GovJob | null>(null);

  // Form state
  const [jobTitle, setJobTitle] = useState<string>("");
  const [organizationName, setOrganizationName] = useState<string>("");
  const [lastDateToApply, setLastDateToApply] = useState<string>("");
  const [applyLink, setApplyLink] = useState<string>("");
  const [jobType, setJobType] = useState<string>(JOB_TYPES[0]);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const resp = await apiFetch<{ status: string; results: number; data: { governmentJobs: GovJob[] } }>("/api/government-jobs", { auth: true });
        if (!alive) return;
        const list = (resp as any)?.data?.governmentJobs || [];
        setJobs(Array.isArray(list) ? list : []);
        setError(null);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg || "Failed to load government jobs");
      } finally {
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const refresh = async () => {
    try {
      const resp = await apiFetch<{ status: string; results: number; data: { governmentJobs: GovJob[] } }>("/api/government-jobs", { auth: true });
      const list = (resp as any)?.data?.governmentJobs || [];
      setJobs(Array.isArray(list) ? list : []);
    } catch {
      // keep previous data
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter(j => {
      if (typeFilter && j.jobType !== typeFilter) return false;
      if (!q) return true;
      return [j.jobTitle, j.organizationName, j.jobType, j.applyLink]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q));
    });
  }, [jobs, query, typeFilter]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / pageSize)), [filtered.length, pageSize]);
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const changePage = (next: number) => { if (next < 1 || next > totalPages) return; setPage(next); };
  const fmtDate = (iso?: string) => { if (!iso) return ""; try { return new Date(iso).toLocaleDateString(); } catch { return String(iso); } };

  const resetForm = () => {
    setJobTitle("");
    setOrganizationName("");
    setLastDateToApply("");
    setApplyLink("");
    setJobType(JOB_TYPES[0]);
    setSaveError(null);
    setSaving(false);
  };

  const openCreate = () => { setEditing(null); resetForm(); setFormOpen(true); };
  const openEdit = (j: GovJob) => {
    setEditing(j);
    setJobTitle(j.jobTitle || "");
    setOrganizationName(j.organizationName || "");
    setLastDateToApply(j.lastDateToApply ? j.lastDateToApply.substring(0,10) : "");
    setApplyLink(j.applyLink || "");
    setJobType(j.jobType || JOB_TYPES[0]);
    setSaveError(null);
    setFormOpen(true);
  };
  const closeForm = () => { setFormOpen(false); setEditing(null); };

  const submitForm = async () => {
    try {
      setSaving(true);
      setSaveError(null);
      // basic validations
      if (!jobTitle || !organizationName || !lastDateToApply || !applyLink || !jobType) {
        setSaveError("All fields are required");
        return;
      }
      const body = {
        jobTitle,
        organizationName,
        lastDateToApply, // 'YYYY-MM-DD' is acceptable for Date
        applyLink,
        jobType,
      };
      if (editing) {
        await apiFetch(`/api/government-jobs/${editing._id}`, { method: 'PATCH', auth: true, body });
      } else {
        await apiFetch(`/api/government-jobs`, { method: 'POST', auth: true, body });
      }
      closeForm();
      await refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setSaveError(msg || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (j: GovJob) => {
    if (!confirm(`Delete ${j.jobTitle}?`)) return;
    try {
      await apiFetch(`/api/government-jobs/${j._id}`, { method: 'DELETE', auth: true });
      await refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(msg || 'Failed to delete');
    }
  };

  const openView = (j: GovJob) => { setViewItem(j); setViewOpen(true); };
  const closeView = () => { setViewOpen(false); setViewItem(null); };

  return (
    <>
      <PageMeta title="Admin Government Jobs" description="Manage government job postings" />
      <PageBreadcrumb pageTitle="Admin Government Jobs" />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search by title, organization, link"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              className="w-full md:w-96 rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent"
            />
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="rounded border border-gray-200 px-2 py-2 text-sm dark:border-gray-800 dark:bg-transparent"
            >
              <option value="">All Types</option>
              {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openCreate}
              className="inline-flex items-center rounded-md px-3 py-2 text-xs font-medium border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800"
            >Add Government Job</button>
          </div>
        </div>

        {loading && <div className="text-sm text-gray-600 dark:text-gray-300">Loading government jobs...</div>}
        {error && (
          <div className="rounded bg-red-50 text-red-700 px-3 py-2 text-sm dark:bg-red-900/20 dark:text-red-300">{error}</div>
        )}

        {!loading && !error && (
          <>
            {paged.length === 0 ? (
              <div className="text-sm text-gray-600 dark:text-gray-300">No government jobs found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-white/5">
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Title</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Organization</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Last Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Apply Link</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Created</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {paged.map(j => (
                      <tr key={j._id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                        <td className="px-4 py-2 align-top">
                          <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{j.jobTitle}</div>
                        </td>
                        <td className="px-4 py-2 align-top">
                          <div className="text-sm text-gray-700 dark:text-gray-300">{j.organizationName}</div>
                        </td>
                        <td className="px-4 py-2 align-top">
                          <span className="text-xs">{j.jobType}</span>
                        </td>
                        <td className="px-4 py-2 align-top">
                          <span className="text-xs">{fmtDate(j.lastDateToApply)}</span>
                        </td>
                        <td className="px-4 py-2 align-top">
                          <a href={j.applyLink} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">Open</a>
                        </td>
                        <td className="px-4 py-2 align-top">
                          <span className="text-xs">{fmtDate(j.createdAt)}</span>
                        </td>
                        <td className="px-4 py-2 align-top">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openView(j)}
                              className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border border-gray-200 dark:border-gray-800"
                            >View</button>
                            <button
                              onClick={() => openEdit(j)}
                              className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border border-gray-200 dark:border-gray-800"
                            >Edit</button>
                            <button
                              onClick={() => remove(j)}
                              className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border border-red-200 text-red-600 dark:border-red-800"
                            >Delete</button>
                          </div>
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
                  className="rounded border border-gray-200 px-2 py-1 text-xs dark:border-gray-800 dark:bg-transparent"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border border-gray-200 dark:border-gray-800" onClick={() => changePage(page - 1)}>Prev</button>
                <span className="text-xs">Page {currentPage} / {totalPages}</span>
                <button className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border border-gray-200 dark:border-gray-800" onClick={() => changePage(page + 1)}>Next</button>
              </div>
            </div>
          </>
        )}
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">{editing ? 'Edit Government Job' : 'Add Government Job'}</h3>
              <button onClick={closeForm} className="text-sm px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700">Close</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400">Job Title</label>
                <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" />
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400">Organization Name</label>
                <input value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" />
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400">Last Date to Apply</label>
                <input type="date" value={lastDateToApply} onChange={(e) => setLastDateToApply(e.target.value)} className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" />
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400">Apply Link</label>
                <input value={applyLink} onChange={(e) => setApplyLink(e.target.value)} className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" />
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400">Job Type</label>
                <select value={jobType} onChange={(e) => setJobType(e.target.value)} className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent">
                  {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {saveError && <div className="rounded bg-red-50 text-red-700 px-3 py-2 text-sm dark:bg-red-900/20 dark:text-red-300">{saveError}</div>}
              <div className="flex items-center justify-end gap-2">
                <button onClick={submitForm} disabled={saving} className="inline-flex items-center rounded-md px-3 py-2 text-xs font-medium border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 disabled:opacity-50">{saving ? 'Saving…' : (editing ? 'Update' : 'Save')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewOpen && viewItem && (
        <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Government Job Details</h3>
              <button onClick={closeView} className="text-sm px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700">Close</button>
            </div>
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <div><span className="font-medium">Title:</span> {viewItem.jobTitle}</div>
              <div><span className="font-medium">Organization:</span> {viewItem.organizationName}</div>
              <div><span className="font-medium">Type:</span> {viewItem.jobType}</div>
              <div><span className="font-medium">Last Date:</span> {fmtDate(viewItem.lastDateToApply)}</div>
              <div><span className="font-medium">Apply Link:</span> <a href={viewItem.applyLink} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">Open</a></div>
              <div><span className="font-medium">Created:</span> {fmtDate(viewItem.createdAt)}</div>
              <div><span className="font-medium">Updated:</span> {fmtDate(viewItem.updatedAt)}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}