'use client';

import { useMemo, useRef, useState } from 'react';
import { Button, Input, Spin } from 'antd';
import { CloseOutlined, CustomerServiceOutlined, SendOutlined } from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';

type ChatMessage = {
  role: 'bot' | 'user';
  content: string;
};

interface ChatbotResponse {
  answer: string;
  suggestions?: string[];
}

const defaultSuggestions = [
  'Trận sắp tới khi nào?',
  'Còn bao nhiêu vé?',
  'Giá từng khán đài?',
  'Nhà tài trợ gồm những ai?',
];

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(defaultSuggestions);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'bot',
      content: 'Xin chào! Mình là trợ lý SLNA Ticketing. Mình có thể tra dữ liệu mới nhất trong hệ thống về lịch đấu, kết quả, giá và số vé còn lại, nhà tài trợ, thanh toán, CCCD hoặc tài khoản.',
    },
  ]);
  const listRef = useRef<HTMLDivElement>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  const scrollToBottom = () => {
    window.setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }), 50);
  };

  const ask = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    setMessages((current) => [...current, { role: 'user', content: trimmed }]);
    setInput('');
    setLoading(true);
    scrollToBottom();

    try {
      const response = await axiosClient.post<ChatbotResponse>('/chatbot/ask', { question: trimmed });
      setMessages((current) => [...current, { role: 'bot', content: response.answer }]);
      if (response.suggestions?.length) setSuggestions(response.suggestions);
    } catch {
      setMessages((current) => [...current, {
        role: 'bot',
        content: 'Mình chưa thể trả lời lúc này. Bạn thử hỏi lại sau hoặc vào mục Liên hệ để được hỗ trợ nhé.',
      }]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[200] font-montserrat">
      {open && (
        <div className="mb-4 w-[350px] overflow-hidden rounded-[28px] border border-blue-100 bg-white shadow-2xl shadow-blue-900/20">
          <div className="flex items-center justify-between bg-[#003078] px-5 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#edbb00] text-[#003078]">
                <CustomerServiceOutlined />
              </div>
              <div>
                <p className="m-0 text-sm font-black uppercase">Trợ lý SLNA</p>
                <p className="m-0 text-[10px] text-blue-100">Hỗ trợ thông tin vé & CLB</p>
              </div>
            </div>
            <Button type="text" icon={<CloseOutlined />} className="text-white hover:!bg-white/10 hover:!text-white" onClick={() => setOpen(false)} />
          </div>

          <div ref={listRef} className="max-h-[360px] space-y-3 overflow-y-auto bg-gray-50 p-4">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[86%] whitespace-pre-line rounded-2xl px-4 py-3 text-xs leading-5 ${
                  message.role === 'user'
                    ? 'bg-[#003078] font-bold text-white'
                    : 'border border-gray-100 bg-white text-gray-700 shadow-sm'
                }`}>
                  {message.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                <Spin size="small" /> Đang trả lời...
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 bg-white p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {suggestions.slice(0, 4).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => ask(suggestion)}
                  className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-bold text-[#003078] hover:bg-[#edbb00]"
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onPressEnter={() => ask(input)}
                placeholder="Nhập câu hỏi..."
                maxLength={500}
                className="rounded-xl"
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                disabled={!canSend}
                onClick={() => ask(input)}
                className="rounded-xl bg-[#003078]"
              />
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-[#edbb00] text-2xl text-[#003078] shadow-2xl shadow-blue-900/30 transition-transform hover:scale-105"
        aria-label="Mở chatbot SLNA"
      >
        <CustomerServiceOutlined />
      </button>
    </div>
  );
}
