import React from 'react';

export default function Spinner() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] w-full gap-4">
            <div className="relative w-16 h-16">
                {/* Outer pulsing ring */}
                <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 animate-pulse"></div>

                {/* Spinning gradient ring */}
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-500 border-r-purple-500 animate-spin"></div>

                {/* Inner static dot */}
                <div className="absolute inset-[40%] rounded-full bg-cyan-400/50 shadow-[0_0_10px_rgba(34,211,238,0.5)]"></div>
            </div>
            <div className="text-cyan-400 font-mono text-lg tracking-widest animate-pulse">
                LOADING...
            </div>
        </div>
    );
}
