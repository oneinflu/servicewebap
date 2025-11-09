/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import { apiFetch } from "../../lib/api";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";

type User = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  isAdmin?: boolean;
  referralId?: string;
  referralCount?: number;
  createdAt?: string;
};

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const resp = await apiFetch("/api/auth/users", { auth: true });
        const list = (resp as any)?.data?.users || (resp as any)?.users || [];
        if (!alive) return;
        setUsers(Array.isArray(list) ? list : []);
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

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      return [u.name, u.email, u.phone, u.referralId]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [users, query]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredUsers.length / pageSize)), [filteredUsers.length, pageSize]);
  const currentPage = Math.min(page, totalPages);
  const pagedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  const onChangeQuery = (val: string) => {
    setQuery(val);
    setPage(1); // reset to first page when searching
  };

  const handleExportCsv = () => {
    const headers = ["Name", "Email", "Phone", "Admin", "Referral", "ReferralCount", "Created", "Id"];
    const rows = filteredUsers.map((u) => [
      u.name ?? "",
      u.email ?? "",
      u.phone ?? "",
      u.isAdmin ? "Yes" : "No",
      u.referralId ?? "",
      typeof u.referralCount === "number" ? String(u.referralCount) : "",
      u.createdAt ? new Date(u.createdAt).toISOString() : "",
      u._id,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users_export_${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageMeta title="Admin Users" description="All registered users" />
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <div className="px-5 pt-4 pb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">Users</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  value={query}
                  onChange={(e) => onChangeQuery(e.target.value)}
                  placeholder="Search name, email, phone, referral"
                  className="w-64 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none ring-0 focus:border-gray-300 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-gray-200"
                />
              </div>
              <button
                onClick={handleExportCsv}
                className="inline-flex items-center rounded-md px-3 py-2 text-xs font-medium border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Download CSV
              </button>
            </div>
          </div>
          {loading && <div className="px-5 pb-4 text-sm text-gray-500">Loading users…</div>}
          {error && <div className="px-5 pb-4 text-sm text-red-600">{error}</div>}
          {!loading && !error && (
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Name</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Email</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Phone</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Admin</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Referral</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Created</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {pagedUsers.map((u) => (
                  <TableRow key={u._id}>
                    <TableCell className="px-5 py-4 sm:px-6 text-start">{u.name}</TableCell>
                    <TableCell className="px-5 py-4 sm:px-6 text-start">{u.email}</TableCell>
                    <TableCell className="px-5 py-4 sm:px-6 text-start">{u.phone || "—"}</TableCell>
                    <TableCell className="px-5 py-4 sm:px-6 text-start">{u.isAdmin ? "Yes" : "No"}</TableCell>
                    <TableCell className="px-5 py-4 sm:px-6 text-start">{u.referralId || "—"} {typeof u.referralCount === "number" ? `(${u.referralCount})` : ""}</TableCell>
                    <TableCell className="px-5 py-4 sm:px-6 text-start">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="px-5 py-4 sm:px-6 text-start">
                      <Link to={`/admin/users/${u._id}`} className="inline-flex items-center rounded-md px-3 py-1 text-xs font-medium border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800">View</Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!loading && !error && (
            <div className="flex items-center justify-between px-5 py-3">
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
                <span className="ml-2">{filteredUsers.length} total</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="inline-flex items-center rounded-md px-3 py-1 text-xs font-medium border border-gray-200 disabled:opacity-50 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Prev
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-300">Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="inline-flex items-center rounded-md px-3 py-1 text-xs font-medium border border-gray-200 disabled:opacity-50 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}