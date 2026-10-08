import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare, ShieldCheck } from 'lucide-react';
import { ChatMessage, User } from '../../types';
import { api } from '../../services/api';

interface RideChatModalProps {
  rideId: string;
  currentUser: User;
  onClose: () => void;
}

export const RideChatModal: React.FC<RideChatModalProps> = ({
  rideId,
  currentUser,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const res = await api.getChat(rideId);
      setMessages(res.messages || []);
    } catch (err) {
      console.error('Chat error:', err);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 1500);
    return () => clearInterval(interval);
  }, [rideId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isSending) return;

    setIsSending(true);
    try {
      await api.sendMessage(rideId, currentUser.id, currentUser.name, text.trim());
      setText('');
      await fetchMessages();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-[#0F1117] border border-[#222634] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col h-[75vh] max-h-[600px] overflow-hidden">
        {/* Header */}
        <div className="p-3.5 bg-[#161822] border-b border-[#222634] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/30 flex items-center justify-center shadow-[0_0_8px_rgba(99,102,241,0.2)]">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Ride Coordination Chat</h3>
              <p className="text-[10px] text-zinc-400">Pre-Approval & Live Transit Discussion</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#1C1F2E] text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Notice Banner */}
        <div className="bg-[#161822] border-b border-[#222634] px-3.5 py-2 text-[11px] text-zinc-300 flex items-center gap-1.5 shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-[#6366F1] shrink-0" />
          <span>Campus Verified Network: Coordinate pickup smoothly without exchanging numbers.</span>
        </div>

        {/* Messages body */}
        <div className="flex-1 p-3.5 overflow-y-auto space-y-2.5 bg-[#0F1117]">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 text-zinc-500">
              <MessageSquare className="w-8 h-8 mb-2 opacity-40 text-[#6366F1]" />
              <p className="text-xs font-semibold text-zinc-300">No messages yet.</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Send a quick message to coordinate pickup location!
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.sender_id === currentUser.id;
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[10px] text-zinc-400 mb-0.5 px-1 font-medium">
                    {isMe ? 'You' : m.sender_name}
                  </span>
                  <div
                    className={`max-w-[82%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                      isMe
                        ? 'bg-[#6366F1] text-white font-semibold rounded-br-none shadow-[0_0_10px_rgba(99,102,241,0.3)]'
                        : 'bg-[#161822] text-zinc-100 border border-[#222634] rounded-bl-none'
                    }`}
                  >
                    {m.message}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick chip responses */}
        <div className="px-3 py-1.5 bg-[#161822] border-t border-[#222634] flex gap-1.5 overflow-x-auto no-scrollbar">
          {['Near the gate', 'Reaching in 2 min', 'Ready at pickup spot'].map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setText(chip)}
              className="text-[11px] bg-[#0F1117] hover:bg-[#1C1F2E] text-zinc-300 hover:text-white px-2 py-0.5 rounded-full whitespace-nowrap border border-[#222634] transition-colors cursor-pointer"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="p-3 bg-[#161822] border-t border-[#222634] flex items-center gap-2"
        >
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message to coordinate..."
            className="flex-1 bg-[#0F1117] border border-[#222634] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#6366F1] focus:border-[#6366F1]"
          />
          <button
            type="submit"
            disabled={!text.trim() || isSending}
            className="w-8 h-8 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-40 text-white flex items-center justify-center transition-all shadow-[0_0_10px_rgba(99,102,241,0.3)] cursor-pointer"
          >
            <Send className="w-4 h-4 fill-current" />
          </button>
        </form>
      </div>
    </div>
  );
};
