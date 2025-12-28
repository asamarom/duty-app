import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import SignupRequestPage from "./pages/SignupRequestPage";
import PendingApprovalPage from "./pages/PendingApprovalPage";
import AdminApprovalsPage from "./pages/AdminApprovalsPage";
import PersonnelPage from "./pages/PersonnelPage";
import PersonnelDetailPage from "./pages/PersonnelDetailPage";
import EquipmentPage from "./pages/EquipmentPage";
import AddEquipmentPage from "./pages/AddEquipmentPage";
import EquipmentDetailPage from "./pages/EquipmentDetailPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import UnitsPage from "./pages/UnitsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/signup-request" element={
                <ProtectedRoute requireApproval={false}>
                  <SignupRequestPage />
                </ProtectedRoute>
              } />
              <Route path="/pending-approval" element={
                <ProtectedRoute requireApproval={false}>
                  <PendingApprovalPage />
                </ProtectedRoute>
              } />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/approvals" element={<ProtectedRoute><AdminApprovalsPage /></ProtectedRoute>} />
              <Route path="/personnel" element={<ProtectedRoute><PersonnelPage /></ProtectedRoute>} />
              <Route path="/personnel/:id" element={<ProtectedRoute><PersonnelDetailPage /></ProtectedRoute>} />
              <Route path="/equipment" element={<ProtectedRoute><EquipmentPage /></ProtectedRoute>} />
              <Route path="/equipment/add" element={<ProtectedRoute><AddEquipmentPage /></ProtectedRoute>} />
              <Route path="/equipment/:id" element={<ProtectedRoute><EquipmentDetailPage /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/units" element={<ProtectedRoute><UnitsPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
