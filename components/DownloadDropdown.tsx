
import React, { useState, useRef, useEffect } from 'react';
import { DownloadIcon } from './icons/DownloadIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

interface DownloadDropdownProps {
  onExportCSV: () => void;
  onExportPDF: () => void;
}

export const DownloadDropdown: React.FC<DownloadDropdownProps> = ({ onExportCSV, onExportPDF }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center justify-center w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-cream-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-cream-50 dark:focus:ring-offset-gray-800 focus:ring-royal-500 transition-colors"
        >
          <DownloadIcon />
          <span className="mx-2">Download</span>
          <ChevronDownIcon />
        </button>
      </div>

      {isOpen && (
        <div
          className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 focus:outline-none z-10 animate-scale-in"
        >
          <div className="py-1">
            <button
              onClick={() => { onExportCSV(); setIsOpen(false); }}
              className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-cream-50 dark:hover:bg-gray-600"
            >
              Export as Excel (CSV)
            </button>
            <button
              onClick={() => { onExportPDF(); setIsOpen(false); }}
              className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-cream-50 dark:hover:bg-gray-600"
            >
              Export as PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
};