/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import { apiFetch } from "../../lib/api";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";

type Service = {
  _id: string;
  categoryPrices?: Array<{ category?: { name?: string }; price?: number }>;
  location?: { address?: string; country?: string; state?: string; city?: string; district?: string; pincode?: string };
  user?: { _id?: string; name?: string };
  createdAt?: string;
};

type Job = {
  _id: string;
  categories?: Array<{ name?: string }>;
  location?: { address?: string; country?: string; state?: string; city?: string; district?: string; pincode?: string };
  user?: { _id?: string; name?: string };
  createdAt?: string;
};

type Subscription = { _id: string; type: string; endDate?: string };

type User = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  isAdmin?: boolean;
  skippedCompanyInfo?: boolean;
  referralId?: string;
  referralCount?: number;
  referredBy?: { _id: string; name?: string; email?: string; referralId?: string } | string;
  createdAt?: string;
  updatedAt?: string;
};

type Company = {
  _id: string;
  name: string;
  location?: { address?: string; country?: string; state?: string; city?: string; district?: string; pincode?: string };
  website?: string;
  about?: string;
  logo?: string;
  user?: string | { _id: string };
  createdAt?: string;
  updatedAt?: string;
};

export default function AdminUserDetail() {
  const { id } = useParams<{ id: string }>();
  const [services, setServices] = useState<Service[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Fetch all services and jobs (admin has access) and filter client-side by user id.
        const [sv, jb] = await Promise.all([
          apiFetch("/api/services", { auth: true }),
          apiFetch("/api/jobs", { auth: true }),
        ]);
        const svArr = (sv as any)?.data?.services || (sv as any)?.services || [];
        const jbArr = (jb as any)?.data?.jobs || (jb as any)?.jobs || [];
        const svByUser = Array.isArray(svArr) ? svArr.filter((s: any) => s?.user?._id === id) : [];
        const jbByUser = Array.isArray(jbArr) ? jbArr.filter((j: any) => j?.user?._id === id) : [];

        // Try admin subscription lookup if available; fallback to empty
        let subs: any[] = [];
        try {
          const resp = await apiFetch(`/api/subscriptions/user/${id}`, { auth: true });
          subs = (resp as any)?.data?.subscriptions || (resp as any)?.subscriptions || [];
        } catch {
          subs = [];
        }

        // Fetch users list to find full user details
        let usr: User | null = null;
        try {
          const uresp = await apiFetch("/api/auth/users", { auth: true });
          const ulist: User[] = (uresp as any)?.data?.users || (uresp as any)?.users || [];
          usr = Array.isArray(ulist) ? ulist.find((u: any) => u._id === id) ?? null : null;
        } catch {
          usr = null;
        }

        // Fetch all companies and pick the one for this user (if any)
        let comp: Company | null = null;
        try {
          const cresp = await apiFetch("/api/companies", { auth: true });
          const clist: Company[] = (cresp as any)?.data?.companies || (cresp as any)?.companies || [];
          comp = Array.isArray(clist) ? clist.find((c: any) => {
            const cu = c?.user;
            if (!cu) return false;
            return typeof cu === "string" ? cu === id : cu?._id === id;
          }) ?? null : null;
        } catch {
          comp = null;
        }

        if (!alive) return;
        setServices(svByUser);
        setJobs(jbByUser);
        setSubscriptions(Array.isArray(subs) ? subs : []);
        setUser(usr);
        setCompany(comp);
        setError(null);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  const userName = useMemo(() => {
    return user?.name || services[0]?.user?.name || jobs[0]?.user?.name || "User";
  }, [user, services, jobs]);

  return (
    <div>
      <PageMeta title={`User Detail`} description={`Posts and subscriptions`} />
      <div className="mb-3">
        <Link to="/admin/users" className="text-sm text-gray-600 hover:underline">← Back to Users</Link>
      </div>
      {loading && <div className="text-sm text-gray-500">Loading user data…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* User & Subscriptions */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.03] md:col-span-1">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">User</h3>
            <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <p>ID: {id}</p>
              <p>Name: {userName}</p>
              <p>Email: {user?.email ?? "—"}</p>
              <p>Phone: {user?.phone ?? "—"}</p>
              <p>Admin: {user?.isAdmin ? "Yes" : "No"}</p>
              <p>Referral ID: {user?.referralId ?? "—"}</p>
              <p>Referral Count: {typeof user?.referralCount === "number" ? user?.referralCount : "—"}</p>
              <p>Skipped Company Info: {user?.skippedCompanyInfo ? "Yes" : "No"}</p>
              <p>Created: {user?.createdAt ? new Date(user.createdAt).toLocaleString() : "—"}</p>
              <p>Updated: {user?.updatedAt ? new Date(user.updatedAt).toLocaleString() : "—"}</p>
            </div>
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-4 mb-2">Subscriptions</h4>
            <div className="max-w-full overflow-x-auto">
              {subscriptions.length === 0 ? (
                <p className="text-sm text-gray-500">No active subscriptions</p>
              ) : (
                <Table>
                  <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                    <TableRow>
                      <TableCell isHeader className="px-3 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Type</TableCell>
                      <TableCell isHeader className="px-3 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">End Date</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {subscriptions.map((s) => (
                      <TableRow key={s._id}>
                        <TableCell className="px-3 py-2 text-start">{s.type}</TableCell>
                        <TableCell className="px-3 py-2 text-start">{s.endDate ? new Date(s.endDate).toLocaleDateString() : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          {/* Company (if any) */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.03] md:col-span-1">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Company</h3>
            {!company ? (
              <p className="text-sm text-gray-500">No company information</p>
            ) : (
              <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <p>Name: {company.name}</p>
                <p>Website: {company.website || "—"}</p>
                <p>Location: {[company.location?.address, company.location?.city, company.location?.district, company.location?.state, company.location?.country].filter(Boolean).join(", ")}{company.location?.pincode ? ` (${company.location?.pincode})` : ""}</p>
                <p>Created: {company.createdAt ? new Date(company.createdAt).toLocaleString() : "—"}</p>
              </div>
            )}
          </div>

          {/* Services */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.03] md:col-span-1">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Services Posted</h3>
            <div className="max-w-full overflow-x-auto">
              {services.length === 0 ? (
                <p className="text-sm text-gray-500">No services</p>
              ) : (
                <Table>
                  <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                    <TableRow>
                      <TableCell isHeader className="px-3 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Category</TableCell>
                      <TableCell isHeader className="px-3 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Price</TableCell>
                      <TableCell isHeader className="px-3 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Location</TableCell>
                      <TableCell isHeader className="px-3 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Created</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {services.map((s) => (
                      <TableRow key={s._id}>
                        <TableCell className="px-3 py-2 text-start">{s.categoryPrices?.[0]?.category?.name || "Service"}</TableCell>
                        <TableCell className="px-3 py-2 text-start">{typeof s.categoryPrices?.[0]?.price === "number" ? s.categoryPrices?.[0]?.price : "—"}</TableCell>
                        <TableCell className="px-3 py-2 text-start">{s.location?.address || s.location?.city || s.location?.district || s.location?.state || s.location?.country || "—"}{s.location?.pincode ? `, ${s.location.pincode}` : ""}</TableCell>
                        <TableCell className="px-3 py-2 text-start">{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          {/* Jobs */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.03] md:col-span-1">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Jobs Posted</h3>
            <div className="max-w-full overflow-x-auto">
              {jobs.length === 0 ? (
                <p className="text-sm text-gray-500">No jobs</p>
              ) : (
                <Table>
                  <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                    <TableRow>
                      <TableCell isHeader className="px-3 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Category</TableCell>
                      <TableCell isHeader className="px-3 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Location</TableCell>
                      <TableCell isHeader className="px-3 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Created</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {jobs.map((j) => (
                      <TableRow key={j._id}>
                        <TableCell className="px-3 py-2 text-start">{j.categories?.[0]?.name || "Job"}</TableCell>
                        <TableCell className="px-3 py-2 text-start">{j.location?.address || j.location?.city || j.location?.district || j.location?.state || j.location?.country || "—"}{j.location?.pincode ? `, ${j.location.pincode}` : ""}</TableCell>
                        <TableCell className="px-3 py-2 text-start">{j.createdAt ? new Date(j.createdAt).toLocaleDateString() : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}