import { useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import { useProfile, type Company, type CompanyLocation, type UserProfile } from "../../hooks/useProfile";

type Props = {
  user?: UserProfile;
  loading?: boolean;
};

export default function CompanyCard({ user, loading = false }: Props) {
  const { refreshProfile } = useProfile();
  const company: Company | null = useMemo(() => user?.company ?? null, [user]);

  const [isModalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState<string>(company?.name ?? "");
  const [website, setWebsite] = useState<string>(company?.website ?? "");
  const [about, setAbout] = useState<string>(company?.about ?? "");
  const [logo, setLogo] = useState<string>(company?.logo ?? "");
  const [location, setLocation] = useState<CompanyLocation>({
    address: company?.location?.address ?? "",
    country: company?.location?.country ?? "",
    state: company?.location?.state ?? "",
    city: company?.location?.city ?? "",
    district: company?.location?.district ?? "",
    pincode: company?.location?.pincode ?? "",
  });

  const resetForm = () => {
    setName(company?.name ?? "");
    setWebsite(company?.website ?? "");
    setAbout(company?.about ?? "");
    setLogo(company?.logo ?? "");
    setLocation({
      address: company?.location?.address ?? "",
      country: company?.location?.country ?? "",
      state: company?.location?.state ?? "",
      city: company?.location?.city ?? "",
      district: company?.location?.district ?? "",
      pincode: company?.location?.pincode ?? "",
    });
  };

  const openModalForCreate = () => {
    setError(null);
    // reset to blank
    setName("");
    setWebsite("");
    setAbout("");
    setLogo("");
    setLocation({ address: "", country: "", state: "", city: "", district: "", pincode: "" });
    setModalOpen(true);
  };

  const openModalForEdit = () => {
    setError(null);
    resetForm();
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const handleSave = async () => {
    setError(null);
    // Basic validation for required fields
    if (!name || !location.address || !location.country || !location.state || !location.city || !location.district) {
      setError("Please fill in name and full location (address, country, state, city, district).");
      return;
    }
    setSaving(true);
    try {
      const payload = { name, location, website, about, logo };
      if (company?._id) {
        await apiFetch(`/api/companies/${company._id}`, {
          method: "PATCH",
          body: payload,
        });
      } else {
        await apiFetch(`/api/companies`, {
          method: "POST",
          body: payload,
        });
      }
      await refreshProfile();
      setModalOpen(false);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message || "Unable to save company");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between mb-5">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">Company</h4>
        {!loading && (
          company ? (
            <button
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 h-9 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
              onClick={openModalForEdit}
            >
              Edit
            </button>
          ) : (
            <button
              className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-3 h-9 text-sm text-brand-700 hover:bg-brand-100 dark:border-brand-900/40 dark:bg-brand-900/20 dark:text-brand-300"
              onClick={openModalForCreate}
            >
              Add Company
            </button>
          )
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-4 w-52 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="h-4 w-72 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="h-4 w-64 bg-gray-200 dark:bg-gray-800 rounded" />
        </div>
      ) : company ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400">Name</p>
            <p className="text-gray-800 dark:text-gray-200">{company.name}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Website</p>
            <p className="text-gray-800 dark:text-gray-200">{company.website || "—"}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">About</p>
            <p className="text-gray-800 dark:text-gray-200">{company.about || "—"}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Logo URL</p>
            <p className="text-gray-800 dark:text-gray-200">{company.logo || "—"}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-gray-500 dark:text-gray-400">Location</p>
            <p className="text-gray-800 dark:text-gray-200">
              {[company.location?.address, company.location?.district, company.location?.city, company.location?.state, company.location?.country]
                .filter(Boolean)
                .join(", ")}
              {company.location?.pincode ? `, ${company.location.pincode}` : ""}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-gray-600 dark:text-gray-300">No company on file. Add your company details to improve your profile.</p>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h5 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
              {company ? "Edit Company" : "Add Company"}
            </h5>
            {error && (
              <div className="mb-3 rounded bg-red-50 text-red-700 px-3 py-2 text-sm dark:bg-red-900/20 dark:text-red-300">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Company Name</label>
                <input
                  className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={saving}
                  placeholder="e.g., Acme Corp"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Website</label>
                <input
                  className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  disabled={saving}
                  placeholder="https://example.com"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">About</label>
                <textarea
                  className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent"
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  disabled={saving}
                  placeholder="Brief description"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Logo URL</label>
                <input
                  className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent"
                  value={logo}
                  onChange={(e) => setLogo(e.target.value)}
                  disabled={saving}
                  placeholder="https://..."
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Full Address</label>
                <input
                  className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent"
                  value={location.address ?? ""}
                  onChange={(e) => setLocation({ ...location, address: e.target.value })}
                  disabled={saving}
                  placeholder="House no, street, area"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Country</label>
                <input
                  className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent"
                  value={location.country ?? ""}
                  onChange={(e) => setLocation({ ...location, country: e.target.value })}
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">State</label>
                <input
                  className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent"
                  value={location.state ?? ""}
                  onChange={(e) => setLocation({ ...location, state: e.target.value })}
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">City</label>
                <input
                  className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent"
                  value={location.city ?? ""}
                  onChange={(e) => setLocation({ ...location, city: e.target.value })}
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">District</label>
                <input
                  className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent"
                  value={location.district ?? ""}
                  onChange={(e) => setLocation({ ...location, district: e.target.value })}
                  disabled={saving}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Pincode</label>
                <input
                  className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 dark:bg-transparent"
                  value={location.pincode ?? ""}
                  onChange={(e) => setLocation({ ...location, pincode: e.target.value })}
                  disabled={saving}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded-lg border border-gray-200 px-4 h-9 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
                onClick={closeModal}
                disabled={saving}
              >
                Close
              </button>
              <button
                className="rounded-lg border border-brand-200 bg-brand-50 px-4 h-9 text-sm text-brand-700 hover:bg-brand-100 dark:border-brand-900/40 dark:bg-brand-900/20 dark:text-brand-300"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}