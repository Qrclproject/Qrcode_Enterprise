import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './store/AppProvider';
import { AuthProvider } from './store/AuthContext';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CampaignBuilderPage from './pages/CampaignBuilderPage';
import SentHistoryPage from './pages/SentHistoryPage';
import TemplatesPage from './pages/TemplatesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import DataDeletionPage from './pages/DataDeletionPage';
import DesignsPage from './pages/DesignsPage';
import SpreadsheetEditorPage from './pages/SpreadsheetEditorPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import VariantEditPage from './pages/VariantEditPage';
export default function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const toggleMobileMenu = () => setMobileMenuOpen((prev) => !prev);

  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            {/* Auth pages – no sidebar/header */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
<Route path="/privacy" element={<PrivacyPolicyPage />} />
<Route path="/data-deletion" element={<DataDeletionPage />} />
<Route path="/terms" element={<TermsOfServicePage />} />
            {/* App pages – with sidebar/header, protected */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <div className="flex h-screen overflow-hidden text-gray-800">
                    <div
                      className={`fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
                        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                      }`}
                    >
                      <Sidebar onCloseMobile={() => setMobileMenuOpen(false)} />
                    </div>
                    
                    {mobileMenuOpen && (
                      <div
                        className="fixed inset-0 bg-black/50 z-20 lg:hidden"
                        onClick={() => setMobileMenuOpen(false)}
                      />
                    )}
                    <main className="flex-1 flex flex-col h-screen overflow-hidden">
                      <Header onToggleMobileMenu={toggleMobileMenu} />
                      <Routes>
                     <Route path="/spreadsheet-editor" element={<SpreadsheetEditorPage />} />


<Route path="/templates/:templateId/variants/:variantIndex" element={<VariantEditPage />} />
                        <Route path="/" element={<CampaignBuilderPage />} />
                        <Route path="/history" element={<SentHistoryPage />} />
                        <Route path="/templates" element={<TemplatesPage />} />
                        <Route path="/analytics" element={<AnalyticsPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="/designs" element={<DesignsPage />} />
                      </Routes>
                    </main>
                  </div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
}