import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AdminModeProvider } from "@/contexts/AdminModeContext";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import AuthPage from "./pages/AuthPage";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { DataPrefetchProvider } from "@/contexts/DataPrefetchContext";
const Index = lazy(() => import("./pages/Index"));
const SignupRequestPage = lazy(() => import("./pages/SignupRequestPage"));
const PendingApprovalPage = lazy(() => import("./pages/PendingApprovalPage"));
const AdminApprovalsPage = lazy(() => import("./pages/AdminApprovalsPage"));
const AssignmentRequestsPage = lazy(() => import("./pages/AssignmentRequestsPage"));
const PersonnelPage = lazy(() => import("./pages/PersonnelPage"));
const PersonnelDetailPage = lazy(() => import("./pages/PersonnelDetailPage"));
const AddPersonnelPage = lazy(() => import("./pages/AddPersonnelPage"));
const EquipmentPage = lazy(() => import("./pages/EquipmentPage"));
const AddEquipmentPage = lazy(() => import("./pages/AddEquipmentPage"));
const EquipmentDetailPage = lazy(() => import("./pages/EquipmentDetailPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const UnitsPage = lazy(() => import("./pages/UnitsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AdminModeProvider>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <DataPrefetchProvider><BrowserRouter>
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
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
                <Route path="/assignment-requests" element={<ProtectedRoute><AssignmentRequestsPage /></ProtectedRoute>} />
                <Route path="/personnel" element={<ProtectedRoute><PersonnelPage /></ProtectedRoute>} />
                <Route path="/personnel/add" element={<ProtectedRoute><AddPersonnelPage /></ProtectedRoute>} />
                <Route path="/personnel/:id" element={<ProtectedRoute><PersonnelDetailPage /></ProtectedRoute>} />
                <Route path="/equipment" element={<ProtectedRoute><EquipmentPage /></ProtectedRoute>} />
                <Route path="/equipment/add" element={<ProtectedRoute><AddEquipmentPage /></ProtectedRoute>} />
                <Route path="/equipment/:id" element={<ProtectedRoute><EquipmentDetailPage /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                <Route path="/units" element={<ProtectedRoute><UnitsPage /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes></Suspense>
            </BrowserRouter></DataPrefetchProvider>
          </TooltipProvider>
        </LanguageProvider>
      </AdminModeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
