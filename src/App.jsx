import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import AdminLayout from "./components/admin/AdminLayout";
import FarmAssistant from "./components/FarmAssistant";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminHealthChecks from "./pages/AdminHealthChecks";
import AdminLogin from "./pages/AdminLogin";
import AdminOverview from "./pages/AdminOverview";
import AdminUsers from "./pages/AdminUsers";
import CropRecommendation from "./pages/CropRecommendation";
import DiseaseDetection from "./pages/DiseaseDetection";
import FertilizerRecommendation from "./pages/FertilizerRecommendation";
import History from "./pages/History";
import HistoryDetail from "./pages/HistoryDetail";
import Home from "./pages/Home";
import IrrigationRecommendation from "./pages/IrrigationRecommendation";
import Login from "./pages/Login";
import Register from "./pages/Register";
import YieldPrediction from "./pages/YieldPrediction";
import { useAuth } from "./context/AuthContext";

// Sign-in pages aren't useful once signed in -- go straight to the app.
function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner" />;
  return user ? <Navigate to="/disease-detection" replace /> : children;
}

export default function App() {
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = location.pathname.startsWith("/admin");
  const showAppNavbar = !["/", "/login", "/register"].includes(location.pathname) && !isAdmin;

  return (
    <>
      {showAppNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/login"
          element={
            <GuestOnly>
              <Login />
            </GuestOnly>
          }
        />
        <Route
          path="/register"
          element={
            <GuestOnly>
              <Register />
            </GuestOnly>
          }
        />
        <Route
          path="/disease-detection"
          element={
            <ProtectedRoute>
              <DiseaseDetection />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history/:id"
          element={
            <ProtectedRoute>
              <HistoryDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/crop-recommendation"
          element={
            <ProtectedRoute>
              <CropRecommendation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/fertilizer-recommendation"
          element={
            <ProtectedRoute>
              <FertilizerRecommendation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/irrigation-recommendation"
          element={
            <ProtectedRoute>
              <IrrigationRecommendation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/yield-prediction"
          element={
            <ProtectedRoute>
              <YieldPrediction />
            </ProtectedRoute>
          }
        />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <AdminLayout />
            </AdminProtectedRoute>
          }
        >
          <Route index element={<AdminOverview />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="health-checks" element={<AdminHealthChecks />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {user && !isAdmin && <FarmAssistant key={user.id} />}
    </>
  );
}
