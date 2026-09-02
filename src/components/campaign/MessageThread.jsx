import { useState, useEffect } from 'react';
import { getCampaignMessages, sendTextMessage } from '../../services/campaignService'; // 👈 added sendTextMessage
import { useToast } from '../../hooks/useToast';

export default function MessageThread({ campaignId, phone, showHeader = true }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const toast = useToast();

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const data = await getCampaignMessages(campaignId, phone);
      setMessages(data.data || data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load messages');
      toast?.error?.(err.message || 'Could not fetch messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetchMessages();
    const interval = setInterval(fetchMessages, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [campaignId, phone]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      await sendTextMessage(phone, newMessage.trim());
      setNewMessage('');
      await fetchMessages(); // refresh list immediately
    } catch (err) {
      toast?.error?.(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (loading && messages.length === 0) {
    return <div className="p-4 text-center text-gray-400 text-sm">Loading messages…</div>;
  }

  if (error && messages.length === 0) {
    return <div className="p-4 text-center text-red-400 text-sm">{error}</div>;
  }

  return (
    <div className="message-thread">
      {showHeader && (
        <div className="border-b border-gray-200 pb-2 mb-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Conversation {phone ? `with ${phone}` : 'All Messages'}
          </h3>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="text-center text-gray-400 text-sm py-8">
          No messages yet. Customer replies will appear here.
        </div>
      ) : (
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
          {messages.map((msg) => (
            <div
              key={msg._id || msg.whatsappMessageId}
              className={`flex ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] px-4 py-2 rounded-lg text-sm ${
                  msg.direction === 'outgoing'
                    ? 'bg-orange-100 text-gray-800 rounded-br-none'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                }`}
              >
                {msg.mediaUrl && (
                  <img
                    src={msg.mediaUrl}
                    alt="media"
                    className="max-w-full rounded mb-1"
                  />
                )}
                {msg.body && <p>{msg.body}</p>}
                <span className="block text-[10px] text-gray-400 mt-1">
                  {new Date(msg.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply input form */}
      <form onSubmit={handleSend} className="mt-4 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a reply..."
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-orange-500 outline-none"
        />
        <button
          type="submit"
          disabled={sending || !newMessage.trim()}
          className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-orange-600 transition"
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}