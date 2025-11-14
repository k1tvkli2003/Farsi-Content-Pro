import React from 'react';
import { Mode } from '../types';
import { MODES } from '../constants';

interface ModeSelectorProps {
    selectedMode: Mode;
    onSelectMode: (mode: Mode) => void;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ selectedMode, onSelectMode }) => {
    return (
        <div className="w-full max-w-4xl bg-gray-800/50 backdrop-blur-sm rounded-xl p-2 shadow-lg">
            <div className="flex flex-wrap items-center justify-center gap-2">
                {MODES.map((mode) => (
                    <button
                        key={mode.id}
                        onClick={() => onSelectMode(mode.id)}
                        className={`
                            flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-teal-400
                            flex items-center gap-2
                            ${selectedMode === mode.id
                                ? 'bg-teal-500 text-white shadow-md'
                                : 'bg-transparent text-gray-300 hover:bg-gray-700'
                            }
                        `}
                    >
                        <mode.icon className="w-5 h-5 shrink-0" />
                        <span>{mode.title}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ModeSelector;