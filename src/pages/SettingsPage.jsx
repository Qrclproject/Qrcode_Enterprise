import { useState, useEffect } from 'react';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import ToggleSwitch from '../components/common/ToggleSwitch';
import { useToast } from '../components/layout/Toast';
import { getSettings, updateSettings } from '../services/settingsService';
import { getAgents, createAgent, updateAgent, deleteAgent } from '../services/authService';
import api from '../services/api';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('api');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const showToast = useToast();

  // ─── Settings state ─────────────────────────────────────────────
  const [settings, setSettings] = useState({
    apiCredentials: { phoneNumberId: '', accessToken: '', webhookToken: '' },
    businessProfile: { displayName: '', description: '', logoUrl: '' },
    messageDefaults: { language: 'en', senderName: '', autoAttachQr: true, readReceipts: true, deliveryDelay: 0, retryAttempts: 3 },
    notificationPrefs: { campaignCompleted: true, deliveryFailures: true, weeklySummary: false, email: '' },
    passcode: '',
  });

  // ─── Passcode ────────────────────────────────────────────────────
  const [isPasscodeSet, setIsPasscodeSet] = useState(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [isPasscodeVerified, setIsPasscodeVerified] = useState(false);

  // ─── Agents ──────────────────────────────────────────────────────
  const [agents, setAgents] = useState([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [agentForm, setAgentForm] = useState({ email: '', name: '', password: '', permissions: [] });

  const permissionOptions = [
    { key: 'campaigns', label: 'Campaign Builder' },
    { key: 'history', label: 'Sent History' },
    { key: 'templates', label: 'Templates' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'designs', label: 'Designs' },
    { key: 'checkin', label: 'Check‑In' },
  ];

  // ─── Fetch agents ──────────────────────────────────────────────
  const fetchAgents = async () => {
    setLoadingAgents(true);
    try {
      const res = await getAgents();
      // ✅ res is already unwrapped: { success: true, data: [...] }
      setAgents(res.data || []);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
      showToast('error', 'Failed to load agents', err.message);
    } finally {
      setLoadingAgents(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'agents') {
      fetchAgents();
    }
  }, [activeTab]);

  // ─── Fetch settings ─────────────────────────────────────────────
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const res = await getSettings();
        const data = res?.data || res;
        setSettings(prev => ({
          ...prev,
          ...data,
          apiCredentials: { ...prev.apiCredentials, ...(data.apiCredentials || {}) },
          businessProfile: { ...prev.businessProfile, ...(data.businessProfile || {}) },
          messageDefaults: { ...prev.messageDefaults, ...(data.messageDefaults || {}) },
          notificationPrefs: { ...prev.notificationPrefs, ...(data.notificationPrefs || {}) },
          passcode: data.passcode || '',
        }));
        const hasPasscode = data.passcode && data.passcode.length > 0;
        setIsPasscodeSet(hasPasscode);
        if (hasPasscode && !isPasscodeVerified) setShowPasscodeModal(true);
      } catch (err) {
        showToast('error', 'Failed to load settings', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // ─── Save ──────────────────────────────────────────────────────
  const handleSave = async (section) => {
    setSaving(true);
    try {
      await updateSettings(settings);
      showToast('success', 'Settings Saved', `${section} updated.`);
    } catch (err) {
      showToast('error', 'Save failed', err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateNested = (category, field, value) => {
    setSettings(prev => ({ ...prev, [category]: { ...prev[category], [field]: value } }));
  };

  // ─── Passcode ────────────────────────────────────────────────────
  const verifyPasscode = () => {
    if (passcodeInput === settings.passcode) {
      setIsPasscodeVerified(true);
      setShowPasscodeModal(false);
      setPasscodeError('');
      setPasscodeInput('');
    } else {
      setPasscodeError('Incorrect passcode. Please try again.');
    }
  };

  const resetPasscode = async () => {
    if (!window.confirm('This will reset the passcode. Do you want to continue?')) return;
    try {
      await updateSettings({ passcode: '' });
      setSettings(prev => ({ ...prev, passcode: '' }));
      setIsPasscodeSet(false);
      setIsPasscodeVerified(false);
      showToast('success', 'Passcode Reset', 'Passcode removed.');
    } catch (err) {
      showToast('error', 'Reset failed', err.message);
    }
  };

  const changePasscode = async (newPasscode) => {
    if (!newPasscode || newPasscode.length < 4) {
      showToast('warning', 'Invalid Passcode', 'Passcode must be at least 4 characters.');
      return;
    }
    try {
      await updateSettings({ passcode: newPasscode });
      setSettings(prev => ({ ...prev, passcode: newPasscode }));
      setIsPasscodeSet(true);
      setIsPasscodeVerified(true);
      showToast('success', 'Passcode Set', 'New passcode active.');
    } catch (err) {
      showToast('error', 'Failed to set passcode', err.message);
    }
  };

  // ─── Agent CRUD ──────────────────────────────────────────────────
  const handleAgentSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { name: agentForm.name, permissions: agentForm.permissions };
      if (editingAgent) {
        if (agentForm.password && agentForm.password.length >= 6) {
          payload.password = agentForm.password;
        }
        await updateAgent(editingAgent._id, payload);
        showToast('success', 'Agent updated', `${agentForm.name} updated.`);
      } else {
        await createAgent({ ...agentForm, password: agentForm.password });
        showToast('success', 'Agent created', `${agentForm.name} added.`);
      }
      setShowAgentModal(false);
      fetchAgents();
    } catch (err) {
      showToast('error', 'Failed to save agent', err.response?.data?.message || err.message);
    }
  };

  const openAgentModal = (agent = null) => {
    if (agent) {
      setEditingAgent(agent);
      setAgentForm({ email: agent.email, name: agent.name, password: '', permissions: agent.permissions });
    } else {
      setEditingAgent(null);
      setAgentForm({ email: '', name: '', password: '', permissions: [] });
    }
    setShowAgentModal(true);
  };

  // ─── Test connection ────────────────────────────────────────────
  const testConnection = () => showToast('info', 'Testing...', 'Connection successful.');
  const copyWebhookUrl = () => {
    navigator.clipboard.writeText('https://qrcode-enterprise-backend.onrender.com/api/whatsapp/webhook');
    showToast('success', 'Copied', 'Webhook URL copied.');
  };

  const clearStorage = async () => {
    if (!window.confirm('Delete all QR images from Cloudinary? This cannot be undone.')) return;
    setSaving(true);
    try {
      const res = await api.post('/settings/clear-storage');
      showToast('success', 'Storage cleared', `${res.data?.deleted || 0} images deleted.`);
    } catch (err) {
      showToast('error', 'Failed to clear storage', err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <i className="fas fa-spinner fa-pulse text-3xl text-gray-400"></i>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
          <i className="fas fa-cog text-orange-500"></i> Settings
        </h1>

        {/* ─── Passcode notice ────────────────────────────────────── */}
        {!isPasscodeSet && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-700 flex items-center gap-2">
            <i className="fas fa-lock-open"></i>
            <span>
              No passcode set. Go to the <strong>Passcode</strong> tab to add one for extra security.
            </span>
          </div>
        )}

        {/* ─── Tabs ────────────────────────────────────────────────── */}
        <div className="flex border-b border-gray-200 gap-6 text-sm overflow-x-auto">
          <button onClick={() => setActiveTab('api')} className={`pb-2 px-1 flex items-center gap-2 whitespace-nowrap ${activeTab === 'api' ? 'border-b-2 border-orange-600 text-orange-600 font-semibold' : 'text-gray-500'}`}>
            <i className="fas fa-key"></i> API
          </button>
          <button onClick={() => setActiveTab('profile')} className={`pb-2 px-1 flex items-center gap-2 whitespace-nowrap ${activeTab === 'profile' ? 'border-b-2 border-orange-600 text-orange-600 font-semibold' : 'text-gray-500'}`}>
            <i className="fas fa-building"></i> Profile
          </button>
          <button onClick={() => setActiveTab('defaults')} className={`pb-2 px-1 flex items-center gap-2 whitespace-nowrap ${activeTab === 'defaults' ? 'border-b-2 border-orange-600 text-orange-600 font-semibold' : 'text-gray-500'}`}>
            <i className="fas fa-comment-dots"></i> Defaults
          </button>
          <button onClick={() => setActiveTab('notifications')} className={`pb-2 px-1 flex items-center gap-2 whitespace-nowrap ${activeTab === 'notifications' ? 'border-b-2 border-orange-600 text-orange-600 font-semibold' : 'text-gray-500'}`}>
            <i className="fas fa-bell"></i> Notifications
          </button>
          <button onClick={() => setActiveTab('passcode')} className={`pb-2 px-1 flex items-center gap-2 whitespace-nowrap ${activeTab === 'passcode' ? 'border-b-2 border-orange-600 text-orange-600 font-semibold' : 'text-gray-500'}`}>
            <i className="fas fa-lock"></i> Passcode
          </button>
          <button onClick={() => setActiveTab('agents')} className={`pb-2 px-1 flex items-center gap-2 whitespace-nowrap ${activeTab === 'agents' ? 'border-b-2 border-orange-600 text-orange-600 font-semibold' : 'text-gray-500'}`}>
            <i className="fas fa-users-cog"></i> Agents
          </button>
          <button onClick={() => setActiveTab('storage')} className={`pb-2 px-1 flex items-center gap-2 whitespace-nowrap ${activeTab === 'storage' ? 'border-b-2 border-orange-600 text-orange-600 font-semibold' : 'text-gray-500'}`}>
            <i className="fas fa-trash-alt"></i> Storage
          </button>
          <button onClick={() => setActiveTab('danger')} className={`pb-2 px-1 flex items-center gap-2 whitespace-nowrap text-red-500`}>
            <i className="fas fa-exclamation-triangle"></i> Danger
          </button>
        </div>

        {/* ─── API Tab ─────────────────────────────────────────────── */}
        {activeTab === 'api' && (
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-bold text-gray-700 mb-1">WhatsApp Cloud API Credentials</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500">Phone Number ID</label>
                  <input type="text" value={settings.apiCredentials.phoneNumberId} onChange={(e) => updateNested('apiCredentials', 'phoneNumberId', e.target.value)} className="w-full mt-1 border border-gray-200 rounded-lg p-2 text-sm font-mono" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Access Token</label>
                  <input type="password" value={settings.apiCredentials.accessToken} onChange={(e) => updateNested('apiCredentials', 'accessToken', e.target.value)} className="w-full mt-1 border border-gray-200 rounded-lg p-2 text-sm font-mono" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Webhook Verify Token</label>
                  <input type="text" value={settings.apiCredentials.webhookToken} onChange={(e) => updateNested('apiCredentials', 'webhookToken', e.target.value)} className="w-full mt-1 border border-gray-200 rounded-lg p-2 text-sm font-mono" />
                </div>
                <div className="flex gap-3">
                  <Button icon="plug" variant="outline" onClick={testConnection}>Test Connection</Button>
                  <Button icon="save" onClick={() => handleSave('API')} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-bold text-gray-700">Webhook URL</h2>
              <div className="flex items-center gap-2 mt-2">
                <code className="bg-gray-100 px-3 py-2 rounded-lg text-xs flex-1">https://qrclbackendevent.onrender.com/api/whatsapp/webhook</code>
                <button onClick={copyWebhookUrl} className="text-gray-400 hover:text-orange-600"><i className="far fa-copy"></i></button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Profile Tab ────────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-bold text-gray-700 mb-3">Business Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500">Display Name</label>
                <input type="text" value={settings.businessProfile.displayName} onChange={(e) => updateNested('businessProfile', 'displayName', e.target.value)} className="w-full mt-1 border border-gray-200 rounded-lg p-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Description</label>
                <textarea value={settings.businessProfile.description} onChange={(e) => updateNested('businessProfile', 'description', e.target.value)} className="w-full mt-1 border border-gray-200 rounded-lg p-2 text-sm" rows="2" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Logo URL</label>
                <input type="text" value={settings.businessProfile.logoUrl} onChange={(e) => updateNested('businessProfile', 'logoUrl', e.target.value)} className="w-full mt-1 border border-gray-200 rounded-lg p-2 text-sm" />
              </div>
              <Button onClick={() => handleSave('Profile')} icon="save" disabled={saving}>{saving ? 'Saving…' : 'Save Profile'}</Button>
            </div>
          </div>
        )}

        {/* ─── Defaults Tab ───────────────────────────────────────── */}
        {activeTab === 'defaults' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
            <h2 className="font-bold text-gray-700">Message Defaults</h2>
            <div>
              <label className="text-xs font-semibold text-gray-500">Default Language</label>
              <select value={settings.messageDefaults.language} onChange={(e) => updateNested('messageDefaults', 'language', e.target.value)} className="w-full mt-1 border border-gray-200 rounded-lg p-2 text-sm">
                <option value="en">en (English)</option>
                <option value="fr">fr (French)</option>
                <option value="ar">ar (Arabic)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Sender Name</label>
              <input type="text" value={settings.messageDefaults.senderName} onChange={(e) => updateNested('messageDefaults', 'senderName', e.target.value)} className="w-full mt-1 border border-gray-200 rounded-lg p-2 text-sm" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs">Auto-attach QR code</span>
              <ToggleSwitch checked={settings.messageDefaults.autoAttachQr} onChange={(checked) => updateNested('messageDefaults', 'autoAttachQr', checked)} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs">Send read receipts</span>
              <ToggleSwitch checked={settings.messageDefaults.readReceipts} onChange={(checked) => updateNested('messageDefaults', 'readReceipts', checked)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Delivery Delay (seconds)</label>
              <input type="number" value={settings.messageDefaults.deliveryDelay} onChange={(e) => updateNested('messageDefaults', 'deliveryDelay', Number(e.target.value))} className="w-24 mt-1 border border-gray-200 rounded-lg p-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Retry Attempts</label>
              <input type="number" value={settings.messageDefaults.retryAttempts} onChange={(e) => updateNested('messageDefaults', 'retryAttempts', Number(e.target.value))} className="w-24 mt-1 border border-gray-200 rounded-lg p-2 text-sm" />
            </div>
            <Button onClick={() => handleSave('Defaults')} icon="save" disabled={saving}>{saving ? 'Saving…' : 'Save Defaults'}</Button>
          </div>
        )}

        {/* ─── Notifications Tab ───────────────────────────────────── */}
        {activeTab === 'notifications' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
            <h2 className="font-bold text-gray-700">Notification Preferences</h2>
            <div className="flex items-center justify-between">
              <span className="text-xs">Campaign Completed</span>
              <ToggleSwitch checked={settings.notificationPrefs.campaignCompleted} onChange={(checked) => updateNested('notificationPrefs', 'campaignCompleted', checked)} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs">Delivery Failures</span>
              <ToggleSwitch checked={settings.notificationPrefs.deliveryFailures} onChange={(checked) => updateNested('notificationPrefs', 'deliveryFailures', checked)} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs">Weekly Summary</span>
              <ToggleSwitch checked={settings.notificationPrefs.weeklySummary} onChange={(checked) => updateNested('notificationPrefs', 'weeklySummary', checked)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Notification Email</label>
              <input type="email" value={settings.notificationPrefs.email} onChange={(e) => updateNested('notificationPrefs', 'email', e.target.value)} className="w-full mt-1 border border-gray-200 rounded-lg p-2 text-sm" />
            </div>
            <Button onClick={() => handleSave('Notifications')} icon="save" disabled={saving}>{saving ? 'Saving…' : 'Save Preferences'}</Button>
          </div>
        )}

        {/* ─── Passcode Tab ────────────────────────────────────────── */}
        {activeTab === 'passcode' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
            <h2 className="font-bold text-gray-700 flex items-center gap-2">
              <i className="fas fa-lock text-orange-500"></i> Passcode Protection
            </h2>
            <p className="text-xs text-gray-500">
              Set a passcode to protect access to this settings page. You will be prompted for it each time you visit Settings.
            </p>
            <div>
              <label className="text-xs font-semibold text-gray-500">
                {settings.passcode ? 'Change Passcode' : 'Set Passcode'}
              </label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="password"
                  placeholder="Enter new passcode (min 4 characters)"
                  className="flex-1 border border-gray-200 rounded-lg p-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                  id="newPasscode"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = e.target.value;
                      if (val.length >= 4) {
                        changePasscode(val);
                        e.target.value = '';
                      } else {
                        showToast('warning', 'Too short', 'Passcode must be at least 4 characters.');
                      }
                    }
                  }}
                />
                <Button
                  variant="primary"
                  onClick={() => {
                    const input = document.getElementById('newPasscode');
                    const val = input.value;
                    if (val.length >= 4) {
                      changePasscode(val);
                      input.value = '';
                    } else {
                      showToast('warning', 'Too short', 'Passcode must be at least 4 characters.');
                    }
                  }}
                >
                  {settings.passcode ? 'Update' : 'Set'}
                </Button>
              </div>
            </div>
            {settings.passcode && (
              <div>
                <Button variant="danger" onClick={resetPasscode} icon="trash-alt">
                  Remove Passcode
                </Button>
                <p className="text-[10px] text-gray-400 mt-1">
                  This will permanently remove the passcode protection.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ─── Agents Tab ───────────────────────────────────────────── */}
        {activeTab === 'agents' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-gray-700 flex items-center gap-2">
                <i className="fas fa-users-cog text-orange-500"></i> Agent Management
              </h2>
              <Button icon="plus" onClick={() => openAgentModal()}>Add Agent</Button>
            </div>
            <p className="text-xs text-gray-500">Create agent accounts and assign page permissions. Agents cannot access Settings.</p>

            {loadingAgents ? (
              <div className="flex justify-center py-10"><i className="fas fa-spinner fa-pulse text-xl text-gray-400"></i></div>
            ) : agents.length === 0 ? (
              <div className="text-center py-10 text-gray-400">No agents created yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Email</th>
                      <th className="px-4 py-2 text-left">Permissions</th>
                      <th className="px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map(agent => (
                      <tr key={agent._id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">{agent.name}</td>
                        <td className="px-4 py-2">{agent.email}</td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap gap-1">
                            {agent.permissions.map(p => {
                              const label = permissionOptions.find(opt => opt.key === p)?.label || p;
                              return <span key={p} className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{label}</span>;
                            })}
                            {agent.permissions.length === 0 && <span className="text-gray-400 text-xs">No permissions</span>}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right space-x-2">
                          <button onClick={() => openAgentModal(agent)} className="text-blue-600 hover:underline text-xs">Edit</button>
                          <button
                            onClick={async () => {
                              if (!window.confirm('Delete this agent?')) return;
                              try {
                                await deleteAgent(agent._id);
                                showToast('success', 'Deleted', 'Agent removed.');
                                fetchAgents();
                              } catch (err) {
                                showToast('error', 'Delete failed', err.message);
                              }
                            }}
                            className="text-red-600 hover:underline text-xs"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── Storage Tab ────────────────────────────────────────── */}
        {activeTab === 'storage' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-bold text-gray-700 mb-3">Cloudinary Storage</h2>
            <p className="text-xs text-gray-500 mb-4">This will permanently delete all QR code images stored on Cloudinary.</p>
            <Button variant="danger" onClick={clearStorage} disabled={saving}>
              {saving ? 'Deleting…' : 'Clear All QR Images'}
            </Button>
          </div>
        )}

        {/* ─── Danger Tab ─────────────────────────────────────────── */}
        {activeTab === 'danger' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <h2 className="font-bold text-red-700">Danger Zone</h2>
            <p className="text-xs text-red-600 mb-3">Irreversible actions.</p>
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-red-100">
                <div><p className="text-sm font-medium">Reset All Settings</p><p className="text-xs text-gray-500">Restore defaults</p></div>
                <Button variant="danger" onClick={() => showToast('warning', 'Action', 'Demo only.')}>Reset</Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Agent Modal ───────────────────────────────────────────── */}
      <Modal isOpen={showAgentModal} onClose={() => setShowAgentModal(false)} title={editingAgent ? 'Edit Agent' : 'New Agent'} size="max-w-md">
        <form onSubmit={handleAgentSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500">Name</label>
            <input
              type="text"
              value={agentForm.name}
              onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })}
              className="w-full mt-1 border border-gray-200 rounded-lg p-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Email</label>
            <input
              type="email"
              value={agentForm.email}
              onChange={(e) => setAgentForm({ ...agentForm, email: e.target.value })}
              className="w-full mt-1 border border-gray-200 rounded-lg p-2 text-sm"
              required={!editingAgent}
              disabled={!!editingAgent}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">
              {editingAgent ? 'New Password (optional)' : 'Password'}
            </label>
            <input
              type="password"
              value={agentForm.password}
              onChange={(e) => setAgentForm({ ...agentForm, password: e.target.value })}
              className="w-full mt-1 border border-gray-200 rounded-lg p-2 text-sm"
              placeholder={editingAgent ? 'Leave blank to keep current' : 'Min 6 characters'}
              minLength={6}
              required={!editingAgent}
            />
            {editingAgent && (
              <p className="text-[10px] text-gray-400 mt-1">Only fill this in if you want to change the password.</p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Page Permissions</label>
            <div className="flex flex-wrap gap-3">
              {permissionOptions.map(opt => (
                <label key={opt.key} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={agentForm.permissions.includes(opt.key)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setAgentForm({ ...agentForm, permissions: [...agentForm.permissions, opt.key] });
                      } else {
                        setAgentForm({ ...agentForm, permissions: agentForm.permissions.filter(p => p !== opt.key) });
                      }
                    }}
                    className="rounded"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setShowAgentModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">{editingAgent ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {/* ─── Passcode Verification Modal ───────────────────────────── */}
      <Modal isOpen={showPasscodeModal} onClose={() => {}} title="Enter Passcode" size="max-w-md">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">This page is protected. Please enter your passcode to continue.</p>
          <input
            type="password"
            value={passcodeInput}
            onChange={(e) => { setPasscodeInput(e.target.value); setPasscodeError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') verifyPasscode(); }}
            placeholder="Enter passcode"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
            autoFocus
          />
          {passcodeError && <p className="text-xs text-red-500">{passcodeError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => window.history.back()}>Cancel</Button>
            <Button variant="primary" onClick={verifyPasscode}>Unlock</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}