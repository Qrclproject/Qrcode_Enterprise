// src/pages/CheckInSelectorPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/layout/Toast';
import { getCampaignHistory } from '../services/campaignService';

export default function CheckInSelectorPage() {
  const navigate = useNavigate();
  const showToast = useToast();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <i className="fas fa-spinner fa-pulse text-3xl text-gray-400"></i>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-extrabold text-gray-800 flex items-center gap-2 mb-6">
          <i className="fas fa-check-circle text-orange-500"></i> Event Check‑In
        </h1>

        {campaigns.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
            <i className="fas fa-inbox text-4xl mb-2 block"></i>
            No campaigns found
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaigns.map((c) => (
              <div
                key={c._id}
                className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition cursor-pointer"
                onClick={() => navigate(`/check-in/${c._id}`)}
              >
                <h3 className="font-bold text-gray-800">{c.name}</h3>
                <p className="text-xs text-gray-400 mt-1">
                  {c.recipients?.length || 0} recipients ·{' '}
                  {new Date(c.createdAt).toLocaleDateString()}
                </p>
                <div className="mt-3 flex items-center gap-2">
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}