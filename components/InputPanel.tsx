import React from 'react';
import { ModeOption, PromptTagGroup } from '../types';

interface InputPanelProps {
    inputText: string;
    onInputChange: (value: string) => void;
    onGenerate: () => void;
    isLoading: boolean;
    modeConfig: ModeOption;
    tagGroups: PromptTagGroup[];
    selectedTags: string[];
    onToggleTag: (tagId: string) => void;
}

const InputPanel: React.FC<InputPanelProps> = ({
    inputText,
    onInputChange,
    onGenerate,
    isLoading,
    modeConfig,
    tagGroups,
    selectedTags,
    onToggleTag,
}) => {
    return (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 shadow-2xl h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <modeConfig.icon className="w-6 h-6 text-teal-400" />
                    <h2 className="text-xl font-bold text-white">{modeConfig.title}</h2>
                </div>
            </div>
            <p className="text-gray-400 mb-4 text-sm" dir="rtl">{modeConfig.description}</p>
            <textarea
                value={inputText}
                onChange={(e) => onInputChange(e.target.value)}
                placeholder={modeConfig.placeholder}
                dir="rtl"
                className="w-full flex-grow bg-gray-900 border border-gray-700 rounded-lg p-4 text-gray-200 focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition resize-none text-base text-right"
            />
            
            {/* Tag Selection */}
            {tagGroups.length > 0 && (
                <div className="mt-4 space-y-3" dir="rtl">
                    <div className="text-sm text-gray-400 font-medium">سفارشی‌سازی پرامپت:</div>
                    {tagGroups.map(group => (
                        <div key={group.id} className="space-y-2">
                            <div className="text-xs text-teal-300 font-medium">{group.label}</div>
                            <div className="flex flex-wrap gap-2">
                                {group.tags.map(tag => {
                                    const isSelected = selectedTags.includes(tag.id);
                                    return (
                                        <button
                                            key={tag.id}
                                            onClick={() => onToggleTag(tag.id)}
                                            title={tag.description}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                                                isSelected
                                                    ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/30'
                                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                            }`}
                                        >
                                            {tag.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-end gap-4">
                <button
                    onClick={onGenerate}
                    disabled={isLoading}
                    className="w-full sm:w-auto bg-gradient-to-r from-teal-500 to-sky-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:scale-105 transform transition-all duration-200 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            در حال پردازش...
                        </>
                    ) : 'تولید کن'}
                </button>
            </div>
        </div>
    );
};

export default InputPanel;