import React, { useState, useEffect } from 'react';

const GoogleIcon: React.FC = () => (
    <svg className="w-5 h-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
        <path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 110.3 512 0 401.7 0 265.2 0 128.5 110.3 19.2 244 19.2c71.2 0 130.2 27.7 175.1 70.3l-63.1 61.9c-37.5-36.2-87.1-55.2-141.2-55.2-106.1 0-192.3 85.6-192.3 191.1 0 105.5 86.1 191.2 192.3 191.2 120.3 0 165.8-95.8 169.8-140.2H244v-81.8h244z"></path>
    </svg>
);

interface LoginProps {
  apiBaseUrl: string;
}

export const Login: React.FC<LoginProps> = ({ apiBaseUrl }) => {
    const [clientId, setClientId] = useState<string | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        // Fetch the Client ID from the backend to keep it secure
        const fetchClientId = async () => {
            try {
                const response = await fetch(`${apiBaseUrl}/api/auth/google-client-id`);
                if (!response.ok) throw new Error('Could not fetch Google Client ID.');
                const data = await response.json();
                setClientId(data.clientId);
            } catch (err) {
                setError('Could not connect to the server to start login process. Please ensure the backend is running.');
            }
        };
        fetchClientId();
    }, [apiBaseUrl]);

    const handleLogin = () => {
        if (!clientId) {
            setError('Google Client ID is not configured on the server. Cannot initiate login.');
            return;
        }
        
        const redirectUri = window.location.origin;
        const googleAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
        
        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: 'openid profile email',
            access_type: 'offline',
            prompt: 'consent'
        });

        window.location.href = `${googleAuthUrl}?${params.toString()}`;
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-cream-50 dark:bg-gray-900">
            <div className="w-full max-w-sm p-8 space-y-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl text-center animate-scale-in">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                        Welcome
                    </h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        Please sign in to continue.
                    </p>
                </div>
                
                {error ? (
                    <p className="text-red-500 text-sm">{error}</p>
                ) : (
                    <button
                        onClick={handleLogin}
                        disabled={!clientId}
                        className="w-full inline-flex items-center justify-center py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-md font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-cream-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-royal-500 transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-wait"
                    >
                        <GoogleIcon />
                        <span className="ml-3">{clientId ? 'Sign in with Google' : 'Loading...'}</span>
                    </button>
                )}
            </div>
        </div>
    );
};
