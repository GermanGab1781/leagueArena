'use client';

import { useEffect, useState } from 'react';

export default function RotateCameraAlert() {
    const [showRotatePrompt, setShowRotatePrompt] = useState(false);

    useEffect(() => {
        const checkOrientation = () => {
            const isMobile = window.innerWidth <= 768;
            const isPortrait = window.matchMedia('(orientation: portrait)').matches;
            setShowRotatePrompt(isMobile && isPortrait);
        };

        checkOrientation();

        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', checkOrientation);

        return () => {
            window.removeEventListener('resize', checkOrientation);
            window.removeEventListener('orientationchange', checkOrientation);
        };
    }, []);
    return (
        <div>
            {showRotatePrompt && (
                <div className="fixed inset-0 bg-black bg-opacity-80 text-white flex items-center justify-center z-50">
                    <div className="text-center p-4">
                        <p className="text-lg font-semibold">Please rotate your device</p>
                        <p className="text-sm mt-2">This app works best in landscape mode.</p>
                    </div>
                </div>
            )}
        </div>
    )
}