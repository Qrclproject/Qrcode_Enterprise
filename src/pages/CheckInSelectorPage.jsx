import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/layout/Toast';
import { getCampaignHistory } from '../services/campaignService';

export default function CheckInSelectorPage() {
  const navigate = useNavigate();
  const showToast = useToast();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'recent'

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const res = await getCampaignHistory({ limit: 100 });
        const data = res.data || res;
        setCampaigns(data.campaigns || []);
      } catch (err) {
        showToast('error', 'Failed to load campaigns', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaigns();
  }, [showToast]);

  // ─── Filter campaigns by search term ──────────────────────────
  const filteredCampaigns = useMemo(() => {
    if (!searchTerm.trim()) return campaigns;
    const s = searchTerm.toLowerCase();
    return campaigns.filter(c => c.name?.toLowerCase().includes(s));
  }, [campaigns, searchTerm]);

  // ─── Get recent check‑ins (campaigns with scan history, sorted by most recent scan) ──
  const recentCampaigns = useMemo(() => {
    return filteredCampaigns
      .filter(c => c.scanHistory && c.scanHistory.length > 0)
      .sort((a, b) => {
        const aLatest = a.scanHistory.reduce((max, s) => s.timestamp > max ? s.timestamp : max, 0);
        const bLatest = b.scanHistory.reduce((max, s) => s.timestamp > max ? s.timestamp : max, 0);
        return bLatest - aLatest;
      })
      .slice(0, 10);
  }, [filteredCampaigns]);

  // ─── Helpers ────────────────────────────────────────────────────
  const getCheckedInCount = (campaign) => campaign.recipients?.filter(r => r.checkedIn).length || 0;
  const getTotalRecipients = (campaign) => campaign.recipients?.length || 0;

  const getLatestScanTime = (campaign) => {
    if (!campaign.scanHistory || campaign.scanHistory.length === 0) return null;
    return campaign.scanHistory.reduce((max, s) => s.timestamp > max ? s.timestamp : max, 0);
  };

  const formatTime = (timestamp) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-orange-50/30">
        <i className="fas fa-spinner fa-pulse text-3xl text-gray-400"></i>
      </div>
    );
  }

  const displayCampaigns = activeTab === 'recent' ? recentCampaigns : filteredCampaigns;

  return (
    <div className="flex-1 overflow-y-auto p-5 bg-gradient-to-br from-gray-50 via-white to-orange-50/30">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-5 shadow-lg shadow-orange-200/50">
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <i className="fas fa-check-circle"></i> Event Check‑In
          </h1>
          <p className="text-orange-100 text-sm mt-1">
            Select a campaign to start scanning attendee QR codes.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search campaigns by name..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white shadow-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-shadow"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-5 py-2.5 text-sm font-semibold rounded-full transition-all ${
              activeTab === 'all'
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-200'
                : 'bg-white text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-300'
            }`}
          >
            All Events ({filteredCampaigns.length})
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`px-5 py-2.5 text-sm font-semibold rounded-full transition-all ${
              activeTab === 'recent'
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-200'
                : 'bg-white text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-300'
            }`}
          >
            Recent Check‑Ins ({recentCampaigns.length})
          </button>
        </div>

        {/* No campaigns */}
        {displayCampaigns.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400 shadow-sm">
            <i className="fas fa-inbox text-4xl mb-2 block"></i>
            {activeTab === 'recent'
              ? 'No recent check‑ins found. Go scan some attendees!'
              : searchTerm
              ? 'No campaigns match your search.'
              : 'No campaigns found. Create one first.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {displayCampaigns.map((c) => {
              const checkedIn = getCheckedInCount(c);
              const total = getTotalRecipients(c);
              const latestScan = getLatestScanTime(c);
              const checkInPercentage = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

              return (
                <div
                  key={c._id}
                  onClick={() => navigate(`/check-in/${c._id}`)}
                  className="group bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-lg hover:border-orange-200 transition-all duration-200 cursor-pointer flex flex-col"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-800 group-hover:text-orange-700 transition-colors">
                      {c.name}
                    </h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        c.status === 'completed'
                          ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200'
                          : c.status === 'sending'
                          ? 'bg-gradient-to-r from-yellow-50 to-amber-50 text-yellow-700 border border-yellow-200'
                          : 'bg-gray-100 text-gray-500 border border-gray-200'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>

                  <p className="text-xs text-gray-400 mb-3">
                    {total} recipients · {new Date(c.createdAt).toLocaleDateString()}
                  </p>

                  {/* Check-in progress */}
                  {total > 0 && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Check‑in progress</span>
                        <span className="font-semibold text-orange-600">{checkedIn}/{total} ({checkInPercentage}%)</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all duration-500"
                          style={{ width: `${checkInPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Actions / meta */}
                  <div className="mt-auto flex items-center gap-3 text-xs">
                    <span className="text-orange-500 font-medium">
                      <i className="fas fa-qrcode mr-1"></i> Scan QR
                    </span>
                    {latestScan && (
                      <span className="text-gray-400 ml-auto">
                        <i className="fas fa-clock mr-1"></i>
                        Last scan: {formatTime(latestScan)}
                      </span>
                    )}
                  </div>

                  {/* Recent extra */}
                  {activeTab === 'recent' && latestScan && (
                    <div className="mt-3 pt-3 border-t border-gray-100 text-[10px] text-gray-400">
                      <i className="fas fa-clock mr-1"></i>
                      Most recent: {formatTime(latestScan)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}