/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import { apiFetch } from "../../lib/api";

type Category = { _id: string; name: string; type: "Service" | "Job"; createdAt?: string };

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState<string>("");
  const [currentPage, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modals and form state
  const [addOpen, setAddOpen] = useState<boolean>(false);
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [formName, setFormName] = useState<string>("");
  const [formType, setFormType] = useState<"Service" | "Job">("Service");
  const [editing, setEditing] = useState<Category | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const res = await apiFetch<any>("/api/categories", { auth: false });
        const list: Category[] = (res as any)?.data?.categories || (res as any)?.categories || [];
        if (!alive) return;
        setCategories(Array.isArray(list) ? list : []);
        setError(null);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) =>
      (c.name?.toLowerCase().includes(q)) || (c.type?.toLowerCase().includes(q)) || (c._id?.toLowerCase().includes(q))
    );
  }, [categories, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const resetForm = () => {
    setFormName("");
    setFormType("Service");
    setEditing(null);
  };

  const openAdd = () => { resetForm(); setAddOpen(true); };
  const closeAdd = () => { setAddOpen(false); };
  const openEdit = (c: Category) => { setEditing(c); setFormName(c.name); setFormType(c.type); setEditOpen(true); };
  const closeEdit = () => { setEditOpen(false); setEditing(null); };

  const onChangeQuery = (val: string) => { setQuery(val); setPage(1); };

  const createCategory = async () => {
    setSaving(true);
    try {
      const res = await apiFetch<any>("/api/categories", { method: "POST", body: { name: formName, type: formType } });
      const createdList: Category[] = (res as any)?.data?.categories || (res as any)?.categories || [];
      const created = Array.isArray(createdList) ? createdList : [];
      setCategories((prev) => [...created, ...prev]);
      closeAdd();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const updateCategory = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await apiFetch<any>(`/api/categories/${editing._id}`, { method: "PUT", body: { name: formName, type: formType } });
      const updated: Category = (res as any)?.data?.category || (res as any)?.category;
      if (updated && updated._id) {
        setCategories((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
      }
      closeEdit();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (id: string) => {
    const ok = window.confirm("Delete this category? This cannot be undone.");
    if (!ok) return;
    try {
      await apiFetch<any>(`/api/categories/${id}`, { method: "DELETE" });
      setCategories((prev) => prev.filter((c) => c._id !== id));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    }
  };

  const exportCsv = () => {
    const headers = ["Name", "Type", "Created", "Id"];
    const rows = filtered.map((c) => [
      c.name ?? "",
      c.type ?? "",
      c.createdAt ? new Date(c.createdAt).toISOString() : "",
      c._id ?? "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `categories_export_${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageMeta title="Admin Categories" description="Manage categories" />
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-theme-lg font-semibold text-gray-800 dark:text-white/90">Categories</h2>
          <div className="flex items-center gap-2">
            <button onClick={exportCsv} className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-800">Download CSV</button>
            <button onClick={openAdd} className="rounded-lg border border-brand-200 bg-brand-50 text-brand-700 px-3 py-2 text-sm">Add Category</button>
          </div>
        </div>

        {error && (
          <div className="mb-3 rounded bg-red-50 text-red-700 px-3 py-2 text-sm dark:bg-red-900/20 dark:text-red-300">{error}</div>
        )}

        <div className="flex items-center gap-3 mb-3">
          <input
            type="text"
            placeholder="Search by name, type, id…"
            className="w-full max-w-[320px] rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent"
            value={query}
            onChange={(e) => onChangeQuery(e.target.value)}
          />
          <span className="text-sm text-gray-600 dark:text-gray-300">{filtered.length} total</span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-600 dark:text-gray-300">Loading…</div>
        ) : (
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableCell className="px-5 py-3 text-start font-semibold">Name</TableCell>
                <TableCell className="px-5 py-3 text-start font-semibold">Type</TableCell>
                <TableCell className="px-5 py-3 text-start font-semibold">Created</TableCell>
                <TableCell className="px-5 py-3 text-start font-semibold">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentItems.map((c) => (
                <TableRow key={c._id}>
                  <TableCell className="px-5 py-3 text-start">{c.name}</TableCell>
                  <TableCell className="px-5 py-3 text-start">{c.type}</TableCell>
                  <TableCell className="px-5 py-3 text-start">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}</TableCell>
                  <TableCell className="px-5 py-3 text-start">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(c)} className="rounded-md border border-gray-200 px-3 py-1 text-xs font-medium dark:border-gray-800">Edit</button>
                      <button onClick={() => deleteCategory(c._id)} className="rounded-md border border-red-200 text-red-700 px-3 py-1 text-xs font-medium bg-red-50 dark:border-red-800 dark:bg-red-900/20">Delete</button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {!loading && (
          <div className="flex items-center justify-between px-2 py-3">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span>Rows per page:</span>
              <select
                className="rounded border border-gray-200 px-2 py-1 text-sm dark:border-gray-800 dark:bg-transparent"
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              >
                {[5,10,20,50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <button disabled={currentPage<=1} onClick={() => setPage((p) => Math.max(1, p-1))} className="rounded border border-gray-200 px-2 py-1 disabled:opacity-50 dark:border-gray-800">Prev</button>
              <span>Page {currentPage} of {pageCount}</span>
              <button disabled={currentPage>=pageCount} onClick={() => setPage((p) => Math.min(pageCount, p+1))} className="rounded border border-gray-200 px-2 py-1 disabled:opacity-50 dark:border-gray-800">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {addOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
          <div className="w-full max-w-[420px] rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-3">Add Category</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Name</label>
                <input value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Type</label>
                <select value={formType} onChange={(e) => setFormType(e.target.value as any)} className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent">
                  <option value="Service">Service</option>
                  <option value="Job">Job</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-4">
              <button onClick={closeAdd} className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-800">Cancel</button>
              <button disabled={saving || !formName.trim()} onClick={createCategory} className="rounded-lg border border-brand-200 bg-brand-50 text-brand-700 px-3 py-2 text-sm disabled:opacity-50">{saving ? "Saving…" : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editOpen && editing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
          <div className="w-full max-w-[420px] rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-3">Edit Category</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Name</label>
                <input value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Type</label>
                <select value={formType} onChange={(e) => setFormType(e.target.value as any)} className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent">
                  <option value="Service">Service</option>
                  <option value="Job">Job</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-4">
              <button onClick={closeEdit} className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-800">Cancel</button>
              <button disabled={saving || !formName.trim()} onClick={updateCategory} className="rounded-lg border border-brand-200 bg-brand-50 text-brand-700 px-3 py-2 text-sm disabled:opacity-50">{saving ? "Saving…" : "Update"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}