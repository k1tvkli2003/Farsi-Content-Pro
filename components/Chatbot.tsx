import React, { useEffect, useRef, useState } from 'react';
import { sendChatMessageStream } from '../services/geminiService';
import { ChatMessage } from '../types';

const SUGGESTION_START_MARKER = '---متن پیشنهادی شروع---';
const SUGGESTION_END_MARKER = '---متن پیشنهادی پایان---';

interface ParsedAssistantMessage {
    before: string;
    suggestion: string | null;
    after: string;
}

function parseAssistantMessage(content: string): ParsedAssistantMessage {
    const start = content.indexOf(SUGGESTION_START_MARKER);
    if (start === -1) {
        return { before: content, suggestion: null, after: '' };
    }

    const end = content.indexOf(SUGGESTION_END_MARKER, start + SUGGESTION_START_MARKER.length);
    const before = content.slice(0, start).trimEnd();
    if (end === -1) {
        const suggestionPartial = content.slice(start + SUGGESTION_START_MARKER.length).trim();
        return { before, suggestion: suggestionPartial, after: '' };
    }

    const suggestion = content
        .slice(start + SUGGESTION_START_MARKER.length, end)
        .trim();
    const after = content.slice(end + SUGGESTION_END_MARKER.length).trimStart();

    return { before, suggestion, after };
}

interface ChatbotProps {
    onClose: () => void;
}

const Chatbot: React.FC<ChatbotProps> = ({ onClose }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [streamingMessage, setStreamingMessage] = useState<string>('');
    const [isExpanded, setIsExpanded] = useState<boolean>(false);
    const [isThinkingMode, setIsThinkingMode] = useState<boolean>(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, streamingMessage]);

    const handleCopy = async (text: string) => {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
            }
        } catch (err) {
            console.error('Copy to clipboard failed:', err);
        }
    };

    const handleNewChat = () => {
        setMessages([]);
        setStreamingMessage('');
        setIsExpanded(false);
    };

    const handleRetryMessage = async (messageIndex: number) => {
        if (isLoading || messageIndex < 1) return;

        // Get all messages up to (but not including) the assistant message at messageIndex
        const conversationHistory = messages.slice(0, messageIndex);
        
        // Remove the failed/unwanted assistant response and any messages after it
        setMessages(conversationHistory);
        setStreamingMessage('');
        setIsLoading(true);

        try {
            const response = await sendChatMessageStream(
                conversationHistory,
                (chunk) => {
                    setStreamingMessage(chunk);
                },
                isThinkingMode
            );

            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: response
            };

            setMessages(prev => [...prev, assistantMessage]);
            setStreamingMessage('');
        } catch (error: any) {
            console.error('Chat retry error:', error);
            const errorMessage: ChatMessage = {
                role: 'assistant',
                content: `متأسفانه خطایی رخ داد: ${error?.message || 'خطای ناشناخته'}`
            };
            setMessages(prev => [...prev, errorMessage]);
            setStreamingMessage('');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = async () => {
        if (!inputText.trim() || isLoading) return;

        // Expand chat on first message
        if (messages.length === 0) {
            setIsExpanded(true);
        }

        const userMessage: ChatMessage = {
            role: 'user',
            content: inputText.trim()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputText('');
        setIsLoading(true);
        setStreamingMessage('');

        try {
            const response = await sendChatMessageStream(
                [...messages, userMessage],
                (chunk) => {
                    setStreamingMessage(chunk);
                },
                isThinkingMode
            );

            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: response
            };

            setMessages(prev => [...prev, assistantMessage]);
            setStreamingMessage('');
        } catch (error: any) {
            console.error('Chat error:', error);
            const errorMessage: ChatMessage = {
                role: 'assistant',
                content: `متأسفانه خطایی رخ داد: ${error?.message || 'خطای ناشناخته'}`
            };
            setMessages(prev => [...prev, errorMessage]);
            setStreamingMessage('');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="bg-gray-800/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-700 flex flex-col transition-all duration-300">
            {/* Expanded Messages Area */}
            {isExpanded && messages.length > 0 && (
                <div className="border-b border-gray-700">
                    <div className="flex items-center justify-between px-3 py-2 text-[11px] text-gray-400">
                        <span>مکالمه با امیرکیوان</span>
                        <button
                            type="button"
                            onClick={handleNewChat}
                            className="text-teal-300 hover:text-teal-100 border border-teal-500/40 rounded px-2 py-0.5"
                        >
                            شروع چت جدید
                        </button>
                    </div>
                    <div className="h-[320px] overflow-y-auto px-3 pb-3 space-y-3">
                        {messages.map((message, index) => {
                            const isUser = message.role === 'user';
                            const parsed = !isUser ? parseAssistantMessage(message.content) : null;

                            return (
                                <div
                                    key={index}
                                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                                >
                                    {isUser ? (
                                        <div
                                            className="max-w-[85%] rounded-lg px-3 py-2 bg-teal-600 text-white"
                                            dir="rtl"
                                        >
                                            <p className="whitespace-pre-wrap text-xs leading-relaxed mt-1">{message.content}</p>
                                        </div>
                                    ) : (
                                        <div className="max-w-[85%] space-y-2" dir="rtl">
                                            <div className="flex items-start gap-2">
                                                <div className="flex-1 space-y-2">
                                                    {parsed?.before && (
                                                        <div className="rounded-lg px-3 py-2 bg-gray-700 text-gray-200">
                                                            <p className="whitespace-pre-wrap text-xs leading-relaxed mt-1">{parsed.before}</p>
                                                        </div>
                                                    )}

                                            {parsed?.suggestion && (
                                                <div className="relative rounded-lg px-3 py-2 bg-gray-800 text-gray-100 border border-teal-500/40">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopy(parsed.suggestion || '')}
                                                        className="absolute top-1 left-1 text-[10px] text-teal-300 hover:text-teal-100 bg-gray-900/80 rounded px-1 py-0.5 border border-teal-500/40"
                                                        title="کپی متن پیشنهادی"
                                                    >
                                                        کپی
                                                    </button>
                                                    <p className="whitespace-pre-wrap text-xs leading-relaxed mt-1">{parsed.suggestion}</p>
                                                </div>
                                            )}

                                                    {parsed?.after && (
                                                        <div className="rounded-lg px-3 py-2 bg-gray-700 text-gray-200">
                                                            <p className="whitespace-pre-wrap text-xs leading-relaxed mt-1">{parsed.after}</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleRetryMessage(index)}
                                                    disabled={isLoading}
                                                    className="flex-shrink-0 p-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-teal-400 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                                                    title="تلاش مجدد"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Streaming message */}
                        {streamingMessage && (
                            <div className="flex justify-start">
                                {(() => {
                                    const parsed = parseAssistantMessage(streamingMessage);
                                    return (
                                        <div className="max-w-[85%] space-y-2" dir="rtl">
                                            {parsed.before && (
                                                <div className="rounded-lg px-3 py-2 bg-gray-700 text-gray-200">
                                                    <p className="whitespace-pre-wrap text-xs leading-relaxed mt-1">{parsed.before}</p>
                                                </div>
                                            )}

                                            {parsed.suggestion && (
                                                <div className="relative rounded-lg px-3 py-2 bg-gray-800 text-gray-100 border border-teal-500/40">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopy(parsed.suggestion || '')}
                                                        className="absolute top-1 left-1 text-[10px] text-teal-300 hover:text-teal-100 bg-gray-900/80 rounded px-1 py-0.5 border border-teal-500/40"
                                                        title="کپی متن پیشنهادی"
                                                    >
                                                        کپی
                                                    </button>
                                                    <p className="whitespace-pre-wrap text-xs leading-relaxed mt-1">{parsed.suggestion}</p>
                                                    <span className="inline-block w-1.5 h-3 bg-teal-400 animate-pulse ml-1" />
                                                </div>
                                            )}

                                            {!parsed.suggestion && (
                                                <div className="relative rounded-lg px-3 py-2 bg-gray-700 text-gray-200 border border-teal-500/40">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopy(streamingMessage)}
                                                        className="absolute top-1 left-1 text-[10px] text-teal-300 hover:text-teal-100 bg-gray-900/80 rounded px-1 py-0.5 border border-teal-500/40"
                                                        title="کپی این متن"
                                                    >
                                                        کپی
                                                    </button>
                                                    <p className="whitespace-pre-wrap text-xs leading-relaxed mt-1">{streamingMessage}</p>
                                                    <span className="inline-block w-1.5 h-3 bg-teal-400 animate-pulse ml-1" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                </div>
            )}

            {/* Compact Input (Always at bottom) */}
            <div className="p-3">
                <div className="flex gap-2 items-center">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="سوال خود را بپرسید..."
                        className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        dir="rtl"
                        disabled={isLoading}
                        onFocus={() => messages.length > 0 && setIsExpanded(true)}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!inputText.trim() || isLoading}
                        className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg p-2 transition-all duration-200 flex-shrink-0"
                        title="ارسال"
                    >
                        {isLoading ? (
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        )}
                    </button>
                    {messages.length > 0 && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-gray-400 hover:text-white transition-colors p-2"
                            title={isExpanded ? 'بستن مکالمه' : 'باز کردن مکالمه'}
                        >
                            <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors p-2"
                        title="بستن چت"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-700">
                    <div className="flex items-center justify-between gap-3" dir="rtl">
                        <div className="flex items-center gap-2">
                            <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-teal-500/20 to-cyan-600/20 rounded flex items-center justify-center">
                                <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                            </div>
                            <span className="text-xs text-gray-300 font-medium">تفکر عمیق</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isThinkingMode}
                                onChange={() => setIsThinkingMode(prev => !prev)}
                                className="sr-only peer"
                                aria-label="تفکر عمیق در چت"
                            />
                            <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-500/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-teal-500 peer-checked:to-cyan-600"></div>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Chatbot;