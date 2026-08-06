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
      .slice(0, 10); // limit to 10 most recent
  }, [filteredCampaigns]);

  // ─── Get checked‑in count ──────────────────────────────────────
  const getCheckedInCount = (campaign) => {
    return campaign.recipients?.filter(r => r.checkedIn).length || 0;
  };

  // ─── Get total recipients ──────────────────────────────────────
  const getTotalRecipients = (campaign) => {
    return campaign.recipients?.length || 0;
  };

  // ─── Get latest scan time ──────────────────────────────────────
  const getLatestScanTime = (campaign) => {
    if (!campaign.scanHistory || campaign.scanHistory.length === 0) return null;
    const latest = campaign.scanHistory.reduce((max, s) => s.timestamp > max ? s.timestamp : max, 0);
    return latest;
  };

  // ─── Format time ───────────────────────────────────────────────
  const formatTime = (timestamp) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <i className="fas fa-spinner fa-pulse text-3xl text-gray-400"></i>
      </div>
    );
  }

  // ─── Determine which campaigns to show ────────────────────────
  const displayCampaigns = activeTab === 'recent' ? recentCampaigns : filteredCampaigns;

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-extrabold text-gray-800 flex items-center gap-2 mb-4">
          <i className="fas fa-check-circle text-orange-500"></i> Event Check‑In
        </h1>

        {/* ─── Search Bar ─────────────────────────────────────────── */}
        <div className="mb-4">
          <div className="relative">
            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search campaigns by name..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
            />
          </div>
        </div>

        {/* ─── Tabs ────────────────────────────────────────────────── */}
        <div className="flex gap-2 mb-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === 'all'
                ? 'border-b-2 border-orange-500 text-orange-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All Events ({filteredCampaigns.length})
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === 'recent'
                ? 'border-b-2 border-orange-500 text-orange-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Recent Check‑Ins ({recentCampaigns.length})
          </button>
        </div>

        {/* ─── No campaigns message ──────────────────────────────── */}
        {displayCampaigns.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
            <i className="fas fa-inbox text-4xl mb-2 block"></i>
            {activeTab === 'recent'
              ? 'No recent check‑ins found. Go scan some attendees!'
              : searchTerm
              ? 'No campaigns match your search.'
              : 'No campaigns found. Create one first.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayCampaigns.map((c) => {
              const checkedIn = getCheckedInCount(c);
              const total = getTotalRecipients(c);
              const latestScan = getLatestScanTime(c);

              return (
                <div
                  key={c._id}
                  className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition cursor-pointer"
                  onClick={() => navigate(`/check-in/${c._id}`)}
                >
                  <h3 className="font-bold text-gray-800">{c.name}</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {total} recipients · {new Date(c.createdAt).toLocaleDateString()}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        c.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : c.status === 'sending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {c.status}
                    </span>
                    <span className="text-xs text-orange-500">
                      <i className="fas fa-qrcode mr-1"></i> Scan QR
                    </span>
                    {checkedIn > 0 && (
                      <span className="text-xs text-green-600">
                        <i className="fas fa-check-circle mr-1"></i>
                        {checkedIn} checked in
                      </span>
                    )}
                    {latestScan && (
                      <span className="text-xs text-gray-400 ml-auto">
                        Last scan: {formatTime(latestScan)}
                      </span>
                    )}
                  </div>
                  {activeTab === 'recent' && latestScan && (
                    <div className="mt-2 pt-2 border-t border-gray-100 text-[10px] text-gray-400">
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