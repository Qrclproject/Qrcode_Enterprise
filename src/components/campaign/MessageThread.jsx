import { useState, useEffect } from 'react';
import { getCampaignMessages } from '../../services/campaignService';
import { useToast } from '../../hooks/useToast';

export default function MessageThread({ campaignId, phone, showHeader = true }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const toast = useToast();

  useEffect(() => {
    let isMounted = true;
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const data = await getCampaignMessages(campaignId, phone);
        if (isMounted) {
          setMessages(data.data || data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load messages');
          toast?.error?.(err.message || 'Could not fetch messages');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [campaignId, phone]);

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
        <div className="space-y-3">
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
    </div>
  );
}