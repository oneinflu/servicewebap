import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import Videos from "./pages/UiElements/Videos";
import Images from "./pages/UiElements/Images";
import Alerts from "./pages/UiElements/Alerts";
import Badges from "./pages/UiElements/Badges";
import Avatars from "./pages/UiElements/Avatars";
import Buttons from "./pages/UiElements/Buttons";
import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";
import Calendar from "./pages/Calendar";
import BasicTables from "./pages/Tables/BasicTables";
import FormElements from "./pages/Forms/FormElements";
import Blank from "./pages/Blank";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import ServicesPage from "./pages/Services";
import JobsPage from "./pages/Jobs";
import CompanyPage from "./pages/Company";
import CompaniesPage from "./pages/Companies";
import GovernmentJobsPage from "./pages/GovernmentJobs";
import SubscriptionsPage from "./pages/Subscriptions";
import TransactionsPage from "./pages/Transactions";

import AdminUsers from "./pages/Admin/AdminUsers";
import AdminUserDetail from "./pages/Admin/AdminUserDetail";
import AdminCategories from "./pages/Admin/AdminCategories";
import AdminServices from "./pages/Admin/AdminServices";
import AdminJobs from "./pages/Admin/AdminJobs";
import AdminSubscriptions from "./pages/Admin/AdminSubscriptions";
import AdminTransactions from "./pages/Admin/AdminTransactions";
import AdminPayments from "./pages/Admin/AdminPayments";
import AdminGovernmentJobs from "./pages/Admin/AdminGovernmentJobs";
import AdminReferralSettings from "./pages/Admin/AdminReferralSettings";
import ReferEarnPage from "./pages/ReferEarn";
import ReferHowItWorks from "./pages/ReferHowItWorks";

function RequireAdmin({ children }: { children: ReactNode }) {
  const token = localStorage.getItem("token");
  const isAdmin = localStorage.getItem("isAdmin") === "true";
  if (!token) return <Navigate to="/signin" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

function RequireAuth({ children }: { children: ReactNode }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/signin" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Protected Dashboard Layout */}
          <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
            <Route index path="/" element={<Home />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/companies" element={<CompaniesPage />} />
            <Route path="/company" element={<CompanyPage />} />
            <Route path="/subscriptions" element={<SubscriptionsPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
          
            <Route path="/refer-earn" element={<ReferEarnPage />} />
            <Route path="/refer/how-it-works" element={<ReferHowItWorks />} />
            <Route
              path="/admin/dashboard"
              element={
                <RequireAdmin>
                  <AdminDashboard />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/services"
              element={
                <RequireAdmin>
                  <AdminServices />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/jobs"
              element={
                <RequireAdmin>
                  <AdminJobs />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/subscriptions"
              element={
                <RequireAdmin>
                  <AdminSubscriptions />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/transactions"
              element={
                <RequireAdmin>
                  <AdminTransactions />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/payments"
              element={
                <RequireAdmin>
                  <AdminPayments />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/users"
              element={
                <RequireAdmin>
                  <AdminUsers />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/companies"
              element={
                <RequireAdmin>
                  <CompaniesPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/categories"
              element={
                <RequireAdmin>
                  <AdminCategories />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/referral-settings"
              element={
                <RequireAdmin>
                  <AdminReferralSettings />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/government-jobs"
              element={
                <RequireAdmin>
                  <AdminGovernmentJobs />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/users/:id"
              element={
                <RequireAdmin>
                  <AdminUserDetail />
                </RequireAdmin>
              }
            />

            {/* Others Page */}
            <Route path="/profile" element={<UserProfiles />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/blank" element={<Blank />} />

            {/* Forms */}
            <Route path="/form-elements" element={<FormElements />} />

            {/* Tables */}
            <Route path="/basic-tables" element={<BasicTables />} />

            {/* Ui Elements */}
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/avatars" element={<Avatars />} />
            <Route path="/badge" element={<Badges />} />
            <Route path="/buttons" element={<Buttons />} />
            <Route path="/images" element={<Images />} />
            <Route path="/videos" element={<Videos />} />

            {/* Charts */}
            <Route path="/line-chart" element={<LineChart />} />
            <Route path="/bar-chart" element={<BarChart />} />
          </Route>

          {/* Public Government Jobs (no auth, no subscription) */}
          <Route element={<AppLayout />}>
            <Route path="/government-jobs" element={<GovernmentJobsPage />} />
          </Route>

          {/* Public Auth Routes */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}
