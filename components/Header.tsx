import React from 'react';
import { SparkleIcon } from './icons';

interface HeaderProps {
    subtitle?: string;
}

const Header: React.FC<HeaderProps> = ({ subtitle }) => {
    return (
        <header className="w-full max-w-7xl text-center mb-6">
            <div className="flex items-center justify-center gap-3">
                <SparkleIcon className="w-10 h-10 text-teal-400" />
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-teal-300 to-sky-400 text-transparent bg-clip-text">
                    Farsi Content Pro
                </h1>
            </div>
            <p className="text-gray-400 mt-2 text-lg" dir="rtl">
                {subtitle || 'ابزار هوشمند شما برای تولید و بهینه‌سازی محتوای فارسی'}
            </p>
        </header>
    );
};

export default Header;
