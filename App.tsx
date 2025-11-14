import React, { useCallback, useEffect, useState } from 'react';
import Chatbot from './components/Chatbot';
import Header from './components/Header';
import InputPanel from './components/InputPanel';
import ModeSelector from './components/ModeSelector';
import OutputPanel from './components/OutputPanel';
import { MODES, MODE_TAGS } from './constants';
import { generateContent, generateContentStream, generatePersonalMessage, healthCheckAllApiKeys, refineContentStream } from './services/geminiService';
import { Mode, OutputData, PromptTag } from './types';

const App: React.FC = () => {
    const [selectedMode, setSelectedMode] = useState<Mode>(Mode.GENERATE_HEADLINES);
    const [inputText, setInputText] = useState<string>('');
    const [outputData, setOutputData] = useState<OutputData | null>(null);
    const [partialOutput, setPartialOutput] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [showChat, setShowChat] = useState<boolean>(false);
    const [isRefining, setIsRefining] = useState<boolean>(false);
    const [isThinkingMode, setIsThinkingMode] = useState<boolean>(false);
    const [welcomeMessage, setWelcomeMessage] = useState<string>('');
    const [headerSubtitle, setHeaderSubtitle] = useState<string>('');
    const [showWelcomePopup, setShowWelcomePopup] = useState<boolean>(false);
    const [hasWorkingApi, setHasWorkingApi] = useState<boolean>(true);
    const [showApiErrorPopup, setShowApiErrorPopup] = useState<boolean>(false);
    const [selectedTagsByMode, setSelectedTagsByMode] = useState<Record<Mode, string[]>>({
        [Mode.GENERATE_HEADLINES]: [],
        [Mode.FIND_POEMS]: [],
        [Mode.WRITE_ARTICLE]: [],
        [Mode.REWRITE_TEXT]: [],
        [Mode.FIND_PROVERBS]: [],
    });
    const [lastGenerateParams, setLastGenerateParams] = useState<{mode: Mode, inputText: string, selectedTags: PromptTag[]} | null>(null);

    const activeModeConfig = MODES.find(m => m.id === selectedMode) || MODES[0];
    const activeModeTags = MODE_TAGS[selectedMode];
    const activeSelectedTags = selectedTagsByMode[selectedMode] || [];
    const thinkingSupported = activeModeConfig.supportsThinkingMode;

    // Run API health check and generate welcome message / subtitle on mount
    useEffect(() => {
        let isMounted = true;

        const initialize = async () => {
            try {
                // 1) Health check all API keys once at startup
                const { healthyCount, totalCount } = await healthCheckAllApiKeys();
                if (!isMounted) return;
                if (totalCount === 0 || healthyCount === 0) {
                    // No usable API keys – show friendly global popup and skip AI-based welcome
                    setHasWorkingApi(false);
                    setShowApiErrorPopup(true);
                    setWelcomeMessage('باباجون سلام! الان هیچ‌کدوم از کلیدهای هوش مصنوعی من کار نمی‌کنن، ولی خود سایت بازه.');
                    setHeaderSubtitle('الان دستم برای هوش مصنوعی بسته‌ست؛ به‌محض این‌که کلیدهای جدید تنظیم کنم، دوباره راه می‌افتیم.');
                    return;
                }

                setHasWorkingApi(true);

                // 2) If we have at least one working key, generate welcome + subtitle using AI
                const [welcome, subtitle] = await Promise.all([
                    generatePersonalMessage('welcome'),
                    generatePersonalMessage('subtitle')
                ]);
                if (!isMounted) return;
                setWelcomeMessage(welcome);
                setHeaderSubtitle(subtitle);
                // Show welcome popup after UI is rendered
                setTimeout(() => setShowWelcomePopup(true), 100);
            } catch (error) {
                console.error('Failed to initialize API health or welcome messages:', error);
                if (!isMounted) return;
                setHasWorkingApi(false);
                setShowApiErrorPopup(true);
                setWelcomeMessage('باباجون سلام! فعلاً هوش مصنوعی من قهر کرده و جواب نمی‌ده، ولی خود صفحه در دسترسه.');
                setHeaderSubtitle('اگر این وضعیت ادامه داشت، به امیرکیوان بگو تا کلیدها را چک کند.');
            }
        };

        initialize();
        return () => {
            isMounted = false;
        };
    }, []);

    const handleToggleTag = useCallback((tagId: string) => {
        setSelectedTagsByMode(prev => {
            const currentTags = prev[selectedMode] || [];
            const newTags = currentTags.includes(tagId)
                ? currentTags.filter(id => id !== tagId)
                : [...currentTags, tagId];
            return { ...prev, [selectedMode]: newTags };
        });
    }, [selectedMode]);

    const handleGenerate = useCallback(async () => {
        if (!inputText.trim()) {
            setError('لطفا متنی را برای شروع وارد کنید.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setOutputData(null);
        setPartialOutput('');
        
        // Build selected tags array from IDs
        const selectedTagObjects: PromptTag[] = [];
        const currentTagIds = selectedTagsByMode[selectedMode] || [];
        for (const tagGroup of activeModeTags) {
            for (const tag of tagGroup.tags) {
                if (currentTagIds.includes(tag.id)) {
                    selectedTagObjects.push(tag);
                }
            }
        }
        
        // Store params for retry
        setLastGenerateParams({
            mode: selectedMode,
            inputText,
            selectedTags: selectedTagObjects
        });
        
        try {
            // Use streaming for text-based modes
            if (selectedMode === Mode.WRITE_ARTICLE || selectedMode === Mode.REWRITE_TEXT) {
                const result = await generateContentStream(
                    {
                        mode: selectedMode,
                        inputText,
                        isThinkingMode,
                        useSearchGrounding: activeModeConfig.supportsSearchGrounding,
                        selectedTags: selectedTagObjects.length > 0 ? selectedTagObjects : undefined,
                    } as any,
                    (chunk) => {
                        setPartialOutput(chunk);
                    }
                );
                setOutputData(result);
                setPartialOutput('');
            } else {
                // For JSON modes, use non-streaming
                const result = await generateContent({
                    mode: selectedMode,
                    inputText,
                    isThinkingMode,
                    useSearchGrounding: activeModeConfig.supportsSearchGrounding,
                    selectedTags: selectedTagObjects.length > 0 ? selectedTagObjects : undefined,
                } as any);
                setOutputData(result);
            }
        } catch (e: any) {
            const message = e.message || 'یک خطای ناشناخته رخ داد.';
            setError(message);

            // If both primary و مدل fallback (flash) جواب ندادند یا هیچ کلید فعالی نداریم،
            // پاپ‌آپ عدم دسترسی به هوش مصنوعی را هم نشان بده.
            if (message.includes('هیچ کلید API') || message.includes('در حال حاضر هیچ کلید API فعالی') || message.includes('کلیدهای هوش مصنوعی')) {
                setHasWorkingApi(false);
                setShowApiErrorPopup(true);
            }
        } finally {
            setIsLoading(false);
        }
    }, [selectedMode, inputText, activeModeConfig, selectedTagsByMode, activeModeTags, isThinkingMode]);

    const handleRetry = useCallback(async () => {
        if (!lastGenerateParams) return;
        
        setIsLoading(true);
        setError(null);
        setOutputData(null);
        setPartialOutput('');
        
        const { mode, inputText: retryInput, selectedTags } = lastGenerateParams;
        
        try {
            // Use streaming for text-based modes
            if (mode === Mode.WRITE_ARTICLE || mode === Mode.REWRITE_TEXT) {
                const result = await generateContentStream(
                    {
                        mode,
                        inputText: retryInput,
                        isThinkingMode,
                        useSearchGrounding: MODES.find(m => m.id === mode)?.supportsSearchGrounding || false,
                        selectedTags: selectedTags.length > 0 ? selectedTags : undefined,
                    } as any,
                    (chunk) => {
                        setPartialOutput(chunk);
                    }
                );
                setOutputData(result);
                setPartialOutput('');
            } else {
                // For JSON modes, use non-streaming
                const result = await generateContent({
                    mode,
                    inputText: retryInput,
                    isThinkingMode,
                    useSearchGrounding: MODES.find(m => m.id === mode)?.supportsSearchGrounding || false,
                    selectedTags: selectedTags.length > 0 ? selectedTags : undefined,
                } as any);
                setOutputData(result);
            }
        } catch (e: any) {
            const message = e.message || 'یک خطای ناشناخته رخ داد.';
            setError(message);

            if (message.includes('هیچ کلید API') || message.includes('در حال حاضر هیچ کلید API فعالی') || message.includes('کلیدهای هوش مصنوعی')) {
                setHasWorkingApi(false);
                setShowApiErrorPopup(true);
            }
        } finally {
            setIsLoading(false);
        }
    }, [lastGenerateParams, isThinkingMode]);

    const handleRefine = useCallback(async (refinementPrompt: string) => {
        if (!outputData || typeof outputData !== 'string') return;
        if (!refinementPrompt.trim()) {
            setError('لطفا دستور اصلاح را وارد کنید.');
            return;
        }

        setIsRefining(true);
        setError(null);
        setPartialOutput('');

        try {
            const result = await refineContentStream(
                {
                    originalInput: inputText,
                    currentOutput: outputData,
                    refinementInstruction: refinementPrompt,
                },
                (chunk) => {
                    setPartialOutput(chunk);
                }
            );
            setOutputData(result);
            setPartialOutput('');
        } catch (e: any) {
            const message = e.message || 'خطا در اصلاح متن.';
            setError(message);

            if (message.includes('هیچ کلید API') || message.includes('در حال حاضر هیچ کلید API فعالی') || message.includes('کلیدهای هوش مصنوعی')) {
                setHasWorkingApi(false);
                setShowApiErrorPopup(true);
            }
        } finally {
            setIsRefining(false);
        }
    }, [outputData, inputText]);

    const handleModeChange = (mode: Mode) => {
        setSelectedMode(mode);
        setInputText('');
        setOutputData(null);
        setPartialOutput('');
        setError(null);
        // Keep tag selections when switching modes
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col items-center p-4 selection:bg-teal-300 selection:text-teal-900">
            <Header subtitle={headerSubtitle} />

                    {/* Global popup when no API key is working */}
                    {showApiErrorPopup && (
                        <div
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                            onClick={() => setShowApiErrorPopup(false)}
                        >
                            <div
                                className="bg-gray-800 border border-rose-500/60 rounded-2xl p-8 max-w-md w-full shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="text-center space-y-4" dir="rtl">
                                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-rose-500 to-orange-400 rounded-full flex items-center justify-center text-white">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 9v3m0 4h.01M4.293 17.293A8 8 0 1119.707 6.707 8 8 0 014.293 17.293z"
                                            />
                                        </svg>
                                    </div>
                                    <p className="text-lg text-gray-100 leading-relaxed">
                                        باباجون عزیز، الان هیچ‌کدوم از کلیدهای هوش مصنوعی من جواب نمی‌دن، برای همین فعلاً نمی‌تونم برات محتوا تولید کنم.
                                    </p>
                                    <p className="text-sm text-gray-400">
                                        به‌محض این‌که امیرکیوان کلیدهای جدید رو تنظیم کنه، همه‌چیز دوباره راه می‌افته. اگر خواستی، بعداً یه سر دیگه بهم بزن یا صفحه رو رفرش کن.
                                    </p>
                                    <button
                                        onClick={() => setShowApiErrorPopup(false)}
                                        className="mt-2 w-full bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white rounded-lg py-2 px-4 transition-all duration-200 font-medium"
                                    >
                                        باشه، اشکالی نداره
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
					
                    {/* Welcome Popup */}
                    {showWelcomePopup && hasWorkingApi && (
                        <div
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                            onClick={() => setShowWelcomePopup(false)}
                        >
                            <div
                                className="bg-gray-800 border border-teal-500/50 rounded-2xl p-8 max-w-md w-full shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="text-center space-y-4">
                                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-teal-500 to-cyan-600 rounded-full flex items-center justify-center">
                                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                                            />
                                        </svg>
                                    </div>
                                    <p className="text-lg text-gray-200 leading-relaxed" dir="rtl">
                                        {welcomeMessage}
                                    </p>
                                    <button
                                        onClick={() => setShowWelcomePopup(false)}
                                        className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white rounded-lg py-2 px-4 transition-all duration-200 font-medium"
                                    >
                                        ممنونم امیرکیوان عزیز
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Thinking Mode Toggle */}
                    <div className="w-full max-w-7xl mb-4">
                        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 backdrop-blur-sm">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 flex-1" dir="rtl">
                                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center shadow-lg">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                            />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-sm font-semibold text-gray-100">حالت تفکر عمیق</h3>
                                            {!thinkingSupported && (
                                                <span className="text-[10px] px-2 py-0.5 bg-gray-700 text-gray-400 rounded-full">
                                                    غیرفعال برای این حالت
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400">برای پاسخ‌های دقیق‌تر و تحلیلی‌تر فعال کنید</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isThinkingMode && thinkingSupported}
                                        onChange={() => thinkingSupported && setIsThinkingMode(prev => !prev)}
                                        disabled={!thinkingSupported}
                                        className="sr-only peer"
                                        aria-label="حالت تفکر عمیق"
                                    />
                                    <div
                                            className={`w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-500 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-teal-500 peer-checked:to-cyan-600 ${
                                            !thinkingSupported ? 'opacity-40 cursor-not-allowed' : ''
                                        }`}
                                    ></div>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Chat Toggle Button */}
                    <button
                        onClick={() => setShowChat(!showChat)}
                        className="fixed bottom-6 left-6 z-50 bg-teal-600 hover:bg-teal-700 text-white rounded-full p-3 shadow-lg transition-all duration-200"
                        title={showChat ? 'بستن چت' : 'باز کردن چت با Gemini'}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                            />
                        </svg>
                    </button>

                    <ModeSelector selectedMode={selectedMode} onSelectMode={handleModeChange} />

                    <main className="w-full max-w-7xl flex flex-col lg:flex-row gap-8 mt-8 flex-grow">
                        <div className="w-full lg:w-1/2 flex flex-col">
                            <InputPanel
                                inputText={inputText}
                                onInputChange={setInputText}
                                onGenerate={handleGenerate}
                                isLoading={isLoading}
                                modeConfig={activeModeConfig}
                                tagGroups={activeModeTags}
                                selectedTags={activeSelectedTags}
                                onToggleTag={handleToggleTag}
                            />
                        </div>
                        <div className="w-full lg:w-1/2 flex flex-col">
                            <OutputPanel
                                outputData={outputData}
                                partialOutput={partialOutput}
                                isLoading={isLoading}
                                error={error}
                                mode={selectedMode}
                                onRefine={handleRefine}
                                isRefining={isRefining}
                                onRetry={handleRetry}
                            />
                        </div>
                    </main>

                    {/* Chatbot Panel */}
                    <div
                        className={`fixed bottom-20 left-6 z-40 w-80 max-w-[calc(100vw-3rem)] transform transition-all duration-200 ${
                            showChat ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'
                        }`}
                    >
                        <Chatbot onClose={() => setShowChat(false)} />
                    </div>
        </div>
    );
};

export default App;