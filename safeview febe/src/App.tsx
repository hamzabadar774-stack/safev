import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import AlertsPage from "./pages/Alerts";
import DevicesPage from "./pages/Devices";
import IncidentsPage from "./pages/Incidents";
import LogsPage from "./pages/Logs";
import ReportsPage from "./pages/Reports";
import SettingsPage from "./pages/Settings";
import OAuthConsent from "./pages/OAuthConsent";
import AppLayout from "@/layouts/AppLayout";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ThemeProvider } from "@/hooks/useTheme";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
   <ThemeProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/devices" element={<DevicesPage />} />
              <Route path="/incidents" element={<IncidentsPage />} />
              <Route path="/logs" element={<LogsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
   </ThemeProvider>
  </QueryClientProvider>
);

export default App;
