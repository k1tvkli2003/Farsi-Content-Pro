import React, { useEffect, useState } from 'react';
import { Mode, OutputData, PoemSuggestion, ProverbSuggestion } from '../types';
import { CheckIcon, CopyIcon } from './icons';

interface OutputPanelProps {
    outputData: OutputData | null;
    partialOutput: string;
    isLoading: boolean;
    error: string | null;
    mode: Mode;
    onRefine?: (refinementPrompt: string) => void;
    isRefining?: boolean;
    onRetry?: () => void;
}

const LoadingSkeleton: React.FC = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
        <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-700 border-t-teal-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-cyan-500 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
        </div>
        <div className="text-center space-y-2" dir="rtl">
            <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 text-teal-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <p className="text-teal-400 font-medium">در حال تولید محتوا...</p>
            </div>
            <p className="text-sm text-gray-400">لطفاً صبر کنید</p>
        </div>
        <div className="w-full max-w-xs">
            <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-500 rounded-full animate-pulse" style={{width: '60%', animation: 'loading-bar 2s ease-in-out infinite'}}></div>
            </div>
        </div>
        <style>{`
            @keyframes loading-bar {
                0%, 100% { transform: translateX(-100%); }
                50% { transform: translateX(100%); }
            }
        `}</style>
    </div>
);

const CopyButtonForItem: React.FC<{ textToCopy: string }> = ({ textToCopy }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy);
            setCopied(true);
        }
    };

    useEffect(() => {
        if (copied) {
            const timer = setTimeout(() => setCopied(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [copied]);

    return (
        <button
            onClick={handleCopy}
            className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 transition-all duration-200 disabled:opacity-50 shrink-0"
            title="کپی"
        >
            {copied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <CopyIcon className="w-4 h-4" />}
        </button>
    );
};

const OutputPanel: React.FC<OutputPanelProps> = ({ 
    outputData, 
    partialOutput, 
    isLoading, 
    error, 
    mode, 
    onRefine, 
    isRefining,
    onRetry
}) => {
    const [refinementPrompt, setRefinementPrompt] = useState<string>('');
    const [showRefinement, setShowRefinement] = useState<boolean>(false);

    // Check if mode supports refinement (text-based modes only)
    const supportsRefinement = mode === Mode.WRITE_ARTICLE || mode === Mode.REWRITE_TEXT;

    const renderContent = () => {
        // Show partial output during loading for text modes
        if (isLoading && partialOutput) {
            return (
                <div className="relative">
                    <p className="whitespace-pre-wrap" dir="rtl">{partialOutput}</p>
                    <div className="mt-4 flex items-center gap-2 text-teal-400 text-sm" dir="rtl">
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span className="font-medium">در حال تولید...</span>
                    </div>
                </div>
            );
        }
        
        if (isLoading) return <LoadingSkeleton />;
        if (error) {
            return (
                <div className="space-y-4" dir="rtl">
                    <div className="text-red-400 bg-red-900/50 p-4 rounded-lg text-center">{error}</div>
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-lg py-2 px-4 transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            تلاش مجدد
                        </button>
                    )}
                </div>
            );
        }
        if (!outputData) return <div className="text-gray-500 text-center" dir="rtl">خروجی در اینجا نمایش داده می‌شود...</div>;

        if (Array.isArray(outputData) && outputData.length > 0) {
            // Headlines
            if (typeof outputData[0] === 'string') {
                return (
                    <ul className="space-y-3" dir="rtl">
                        {(outputData as string[]).map((item, index) => (
                            <li key={index} className="text-gray-300 bg-gray-900/50 p-3 rounded-md flex justify-between items-center gap-2">
                                <span className="flex-grow">{item}</span>
                                <CopyButtonForItem textToCopy={item} />
                            </li>
                        ))}
                    </ul>
                );
            }
            // Proverbs
            if ('proverb' in outputData[0]) {
                return (
                    <div className="space-y-4" dir="rtl">
                        {(outputData as ProverbSuggestion[]).map((proverb, index) => {
                            const textToCopy = proverb.proverb;
                            return (
                                <div key={index} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                    <div className="flex justify-between items-start gap-2">
                                        <h4 className="font-bold text-teal-400 text-lg flex-grow">"{proverb.proverb}"</h4>
                                        <CopyButtonForItem textToCopy={textToCopy} />
                                    </div>
                                    <p className="mt-2"><strong className="text-gray-400">معنی:</strong> {proverb.meaning}</p>
                                    <p className="mt-1"><strong className="text-gray-400">کاربرد:</strong> {proverb.usage}</p>
                                </div>
                            );
                        })}
                    </div>
                );
            }
            // Poems
            if ('poem' in outputData[0]) {
                 return (
                    <div className="space-y-4" dir="rtl">
                        {(outputData as PoemSuggestion[]).map((poem, index) => {
                            const textToCopy = `"${poem.poem}"\n- ${poem.poet}`;
                            return (
                                 <div key={index} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                    <div className="flex justify-between items-start gap-2">
                                         <blockquote className="flex-grow">
                                            <p className="whitespace-pre-wrap italic text-gray-300">"{poem.poem}"</p>
                                            <footer className="text-right text-teal-400 mt-2">- {poem.poet}</footer>
                                        </blockquote>
                                        <CopyButtonForItem textToCopy={textToCopy} />
                                    </div>
                                    <p className="mt-2"><strong className="text-gray-400">معنی:</strong> {poem.meaning}</p>
                                    <p className="mt-1"><strong className="text-gray-400">کاربرد:</strong> {poem.usage}</p>
                                </div>
                            );
                        })}
                    </div>
                );
            }
        }
        if (typeof outputData === 'string') {
            return <p className="whitespace-pre-wrap" dir="rtl">{outputData}</p>;
        }
        return null;
    };

    const handleRefinementSubmit = () => {
        if (onRefine && refinementPrompt.trim()) {
            onRefine(refinementPrompt);
            setRefinementPrompt('');
            setShowRefinement(false);
        }
    };

    return (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 shadow-2xl h-full flex flex-col">
            <h2 className="text-xl font-bold text-white mb-4">خروجی</h2>
            <div className="flex-grow bg-gray-900 border border-gray-700 rounded-lg p-4 text-gray-200 overflow-y-auto text-right">
                {/* Show partial output during refinement */}
                {isRefining && partialOutput ? (
                    <div className="relative">
                        <p className="whitespace-pre-wrap" dir="rtl">{partialOutput}</p>
                        <div className="mt-2 text-teal-400 text-sm animate-pulse" dir="rtl">در حال اصلاح...</div>
                    </div>
                ) : (
                    renderContent()
                )}
            </div>

            {/* Refinement Panel */}
            {supportsRefinement && outputData && typeof outputData === 'string' && !isLoading && (
                <div className="mt-4 border-t border-gray-700 pt-4">
                    {!showRefinement ? (
                        <button
                            onClick={() => setShowRefinement(true)}
                            className="w-full bg-teal-600/20 hover:bg-teal-600/30 text-teal-400 border border-teal-600/50 rounded-lg py-2 px-4 transition-all duration-200 text-sm font-medium"
                            dir="rtl"
                        >
                            ✨ اصلاح یا تغییر متن
                        </button>
                    ) : (
                        <div className="space-y-3" dir="rtl">
                            <label className="block text-sm text-gray-400">
                                دستور اصلاح خود را وارد کنید:
                            </label>
                            <textarea
                                value={refinementPrompt}
                                onChange={(e) => setRefinementPrompt(e.target.value)}
                                placeholder="مثال: این متن را کمی صمیمی‌تر کن، یا: متن را طولانی‌تر کن و جزئیات بیشتری اضافه کن"
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[80px] resize-none"
                                dir="rtl"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleRefinementSubmit}
                                    disabled={isRefining || !refinementPrompt.trim()}
                                    className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg py-2 px-4 transition-all duration-200 text-sm font-medium"
                                >
                                    {isRefining ? 'در حال اصلاح...' : 'اعمال تغییرات'}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowRefinement(false);
                                        setRefinementPrompt('');
                                    }}
                                    disabled={isRefining}
                                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-gray-300 rounded-lg transition-all duration-200 text-sm"
                                >
                                    انصراف
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default OutputPanel;