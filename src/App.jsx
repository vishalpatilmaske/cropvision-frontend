import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import FarmAssistant from "./components/FarmAssistant";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLogin from "./pages/AdminLogin";
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

const ADMIN_PATHS = ["/admin/login", "/admin/users"];

// Sign-in pages aren't useful once signed in -- go straight to the app.
function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner" />;
  return user ? <Navigate to="/disease-detection" replace /> : children;
}

export default function App() {
  const location = useLocation();
  const { user } = useAuth();
  const showAppNavbar =
    !["/", "/login", "/register"].includes(location.pathname) &&
    !ADMIN_PATHS.includes(location.pathname);

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
        <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/users"
          element={
            <AdminProtectedRoute>
              <AdminUsers />
            </AdminProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {user && !location.pathname.startsWith("/admin") && <FarmAssistant key={user.id} />}
    </>
  );
}
