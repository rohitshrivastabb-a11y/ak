
import React, { useState } from 'react';

interface CreateProfileProps {
  onCreateProfile: (companyName: string) => void;
}

export const CreateProfile: React.FC<CreateProfileProps> = ({ onCreateProfile }) => {
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (companyName.trim() === '') {
      setError('Company name cannot be empty.');
      return;
    }
    onCreateProfile(companyName.trim());
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-cream-50 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl text-center animate-scale-in">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
            Create Your Company Profile
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Enter the name of your company to set up your POS system.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="companyName" className="sr-only">Company Name</label>
            <input
              id="companyName"
              name="companyName"
              type="text"
              autoFocus
              required
              value={companyName}
              onChange={(e) => {
                setCompanyName(e.target.value.toUpperCase());
                if (error) setError('');
              }}
              className="w-full px-4 py-3 bg-cream-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-royal-500 focus:border-royal-500 transition text-gray-900 dark:text-gray-100 text-center text-lg"
              placeholder="e.g., Mishra Collection"
            />
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>

          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-lg font-bold text-white bg-royal-600 hover:bg-royal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-royal-500 transition-all duration-300 transform hover:scale-105 active:scale-95"
            >
              Save & Continue
            </button>
          </div>
        </form>

        <p className="text-xs text-gray-500 dark:text-gray-400 pt-4">
          This is a one-time setup. The name will be used to brand your application.
        </p>
      </div>
    </div>
  );
};