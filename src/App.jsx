import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './store/AppProvider';
import { AuthProvider } from './store/AuthContext';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CampaignBuilderPage from './pages/CampaignBuilderPage';
import SentHistoryPage from './pages/SentHistoryPage';
import NoAccessPage from './pages/NoAccessPage';
import TemplatesPage from './pages/TemplatesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import DesignsPage from './pages/DesignsPage';
import DataDeletionPage from './pages/DataDeletionPage';
import SpreadsheetEditorPage from './pages/SpreadsheetEditorPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import VariantEditPage from './pages/VariantEditPage';
import CheckInSelectorPage from './pages/CheckInSelectorPage';
import CheckInPage from './pages/CheckInPage';
import CampaignDetailPage from './pages/CampaignDetailPage';
import ScanHistoryPage from './pages/ScanHistoryPage';
import AddRecipientsPage from './pages/AddRecipientsPage';
import ExcelTestPage from './pages/ExcelTestPage';
import MediaLibraryPage from './pages/MediaLibraryPage';
import MessageLogsPage from './pages/MessageLogsPage';   // 👈 NEW import

export default function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const toggleMobileMenu = () => setMobileMenuOpen((prev) => !prev);

  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/data-deletion" element={<DataDeletionPage />} />
            <Route path="/terms" element={<TermsOfServicePage />} />

            {/* Protected routes with layout */}
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
                    <main className="flex-1 flex flex-col h-screen overflow-hidden main-content-gradient">
                      <Header onToggleMobileMenu={toggleMobileMenu} />
                      <div className="flex-1 overflow-y-auto main-content-padding">
                        <Routes>
                          <Route path="/campaigns/:campaignId/add-recipients" element={<AddRecipientsPage />} />
                          <Route path="/media" element={<MediaLibraryPage />} />
                          <Route path="/" element={<CampaignBuilderPage />} />
                          <Route path="/excel-test" element={<ExcelTestPage />} />
                          <Route path="/history" element={<SentHistoryPage />} />
                          <Route path="/templates" element={<TemplatesPage />} />
                          <Route path="/analytics" element={<AnalyticsPage />} />
                          <Route path="/settings" element={<SettingsPage />} />
                          <Route path="/designs" element={<DesignsPage />} />
                          <Route path="/check-in" element={<CheckInSelectorPage />} />
                          <Route path="/check-in/:campaignId" element={<CheckInPage />} />
                          <Route path="/campaigns/:campaignId" element={<CampaignDetailPage />} />
                          <Route path="/campaigns/:campaignId/scan-history" element={<ScanHistoryPage />} />
                          <Route path="/campaigns/:campaignId/logs" element={<MessageLogsPage />} /> {/* 👈 NEW route */}
                          <Route path="/spreadsheet-editor" element={<SpreadsheetEditorPage />} />
                          <Route path="/templates/:templateId/variants/:variantIndex" element={<VariantEditPage />} />
                          <Route path="/no-access" element={<NoAccessPage />} />
                        </Routes>
                      </div>
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