import { useState, useEffect, useCallback, memo } from 'react';
import {
  getCampaignMessages,
  sendTextMessage,
  sendImageMessage,
  uploadCampaignHeader,
} from '../../services/campaignService';
import { useToast } from '../../hooks/useToast';

// Message bubble component (memoized for performance)
const MessageBubble = memo(({ msg }) => {
  const isOutgoing = msg.direction === 'outgoing';
  return (
    <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} items-end gap-2`}>
      {!isOutgoing && (
        <div className="w-6 h-6 rounded-full bg-gray-300 flex-shrink-0 flex items-center justify-center text-[10px] text-white">
          C
        </div>
      )}
      <div
        className={`max-w-[80%] px-4 py-2 rounded-2xl shadow-sm ${
          isOutgoing
            ? 'bg-emerald-600 text-white rounded-br-sm'
            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
        }`}
      >
        {msg.mediaUrl && (
          <div className="mb-1 -mx-2 -mt-2 rounded-t-2xl overflow-hidden">
            <img
              src={msg.mediaUrl}
              alt="media"
              loading="lazy"
              className="max-w-full h-auto"
              onError={(e) => {
                e.target.parentElement.style.display = 'none';
              }}
            />
          </div>
        )}
        {msg.body && <p className="whitespace-pre-wrap break-words">{msg.body}</p>}
        <div
          className={`text-[10px] mt-1 flex items-center gap-1 ${
            isOutgoing ? 'text-emerald-100' : 'text-gray-400'
          }`}
        >
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {isOutgoing && <i className="fas fa-check-double text-[9px]"></i>}
        </div>
      </div>
      {isOutgoing && (
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex-shrink-0 flex items-center justify-center text-[10px] text-white">
          B
        </div>
      )}
    </div>
  );
});

export default function MessageThread({ campaignId, phone, showHeader = true }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [sendingImage, setSendingImage] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);
  const toast = useToast();

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCampaignMessages(campaignId, { phone });
      setMessages(data.data || data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load messages');
      toast?.error?.(err.message || 'Could not fetch messages');
    } finally {
      setLoading(false);
    }
  }, [campaignId, phone, toast]);

  useEffect(() => {
    let isMounted = true;
    fetchMessages();
    const interval = setInterval(fetchMessages, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [fetchMessages]);

  const handleSendText = async (e) => {
    e.preventDefault();
    const textToSend = newMessage.trim();
    if (!textToSend || sending) return;
    
    // Clear input immediately and set sending state
    setNewMessage('');
    setSending(true);
    try {
      await sendTextMessage(phone, textToSend);
      await fetchMessages();
    } catch (err) {
      toast?.error?.(err.message || 'Failed to send message');
      // Optionally restore the message if failed? We'll keep it cleared per request.
    } finally {
      setSending(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };

  const handleSendImage = async () => {
    if (!selectedFile || sendingImage || uploadingImage) return;

    // Clear the selected file/preview immediately
    const fileToSend = selectedFile;
    setSelectedFile(null);
    setPreviewUrl(null);

    setUploadingImage(true);
    try {
      const uploadRes = await uploadCampaignHeader(fileToSend);
      const imageUrl = uploadRes.data?.url || uploadRes.url;
      if (!imageUrl) throw new Error('Upload failed, no URL returned');

      setUploadingImage(false);
      setSendingImage(true);
      await sendImageMessage(phone, imageUrl, '');
      await fetchMessages();
      toast?.success?.('Image sent', 'Your image has been sent.');
    } catch (err) {
      toast?.error?.(err.message || 'Failed to send image');
    } finally {
      setUploadingImage(false);
      setSendingImage(false);
    }
  };

  // Group messages by date for separators
  const groupedMessages = [];
  let lastDate = null;
  const visibleMessages = messages.slice(-visibleCount);
  visibleMessages.forEach((msg) => {
    const date = new Date(msg.timestamp).toDateString();
    if (date !== lastDate) {
      groupedMessages.push({ type: 'date', date: msg.timestamp });
      lastDate = date;
    }
    groupedMessages.push({ type: 'message', msg });
  });

  return (
    <div className="message-thread bg-gradient-to-b from-gray-50 to-white rounded-xl overflow-hidden flex flex-col">
      {/* Header */}
      {showHeader && (
        <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold">
            {phone ? phone.charAt(0) : 'C'}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-800 truncate">
              {phone ? `+${phone}` : 'All Messages'}
            </h3>
            <p className="text-xs text-gray-400">WhatsApp Conversation</p>
          </div>
          <button
            onClick={fetchMessages}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-400"
            title="Refresh messages"
          >
            <i className="fas fa-sync-alt text-sm"></i>
          </button>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-[300px] max-h-[55vh]">
        {messages.length > visibleCount && (
          <div className="text-center">
            <button
              onClick={() => setVisibleCount(prev => prev + 50)}
              className="text-xs text-emerald-600 hover:underline"
            >
              Load previous messages
            </button>
          </div>
        )}
        {loading && messages.length === 0 ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        ) : error && messages.length === 0 ? (
          <div className="text-center py-10 text-red-500 text-sm">Failed to load messages</div>
        ) : groupedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <i className="fas fa-comments text-4xl mb-2"></i>
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Start the conversation below</p>
          </div>
        ) : (
          groupedMessages.map((item, index) => {
            if (item.type === 'date') {
              return (
                <div key={`date-${index}`} className="flex justify-center my-2">
                  <span className="text-[10px] bg-gray-200/70 text-gray-600 px-3 py-1 rounded-full">
                    {new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              );
            }
            return <MessageBubble key={item.msg._id || item.msg.whatsappMessageId} msg={item.msg} />;
          })
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 bg-white p-3">
        {/* Selected image preview */}
        {previewUrl && (
          <div className="mb-2 flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
            <img src={previewUrl} alt="Preview" className="w-16 h-16 object-cover rounded" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{selectedFile?.name}</p>
              <p className="text-[10px] text-gray-400">Ready to send</p>
            </div>
            <button
              onClick={() => {
                setSelectedFile(null);
                setPreviewUrl(null);
              }}
              className="text-red-500 hover:text-red-700 p-1"
              title="Remove image"
            >
              <i className="fas fa-times-circle"></i>
            </button>
          </div>
        )}

        {/* Text input */}
        <form onSubmit={handleSendText} className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              rows="1"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendText(e);
                }
              }}
              placeholder="Type a message..."
              className="w-full resize-none border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none pr-10"
            />
            <label
              htmlFor="image-upload"
              className="absolute right-2 bottom-2 text-gray-400 hover:text-emerald-600 cursor-pointer"
              title="Attach image"
            >
              <i className="fas fa-paperclip text-sm"></i>
            </label>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <button
            type="submit"
            disabled={sending || !newMessage.trim() || uploadingImage || sendingImage}
            className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-full disabled:opacity-50 transition"
            title="Send message"
          >
            {sending ? <i className="fas fa-spinner fa-spin text-sm"></i> : <i className="fas fa-paper-plane text-sm"></i>}
          </button>
        </form>

        {/* Send image button (if preview exists) */}
        {previewUrl && (
          <button
            onClick={handleSendImage}
            disabled={uploadingImage || sendingImage}
            className="mt-2 w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition"
          >
            {uploadingImage ? 'Uploading...' : sendingImage ? 'Sending...' : 'Send Image'}
          </button>
        )}
      </div>
    </div>
  );
}