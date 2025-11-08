
import React from 'react';
import { ReceiptIcon } from './icons/ReceiptIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { BoxIcon } from './icons/BoxIcon';
import { TemplateIcon } from './icons/TemplateIcon';

interface DashboardProps {
  onNavigate: (page: 'billing' | 'reports' | 'purchases' | 'products') => void;
  companyName: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, companyName }) => {
  
  const Card: React.FC<{
      onClick: () => void;
      icon: React.ReactNode;
      title: string;
      description: string;
      iconBgColor: string;
      focusRingColor: string;
      ariaLabel: string;
  }> = ({ onClick, icon, title, description, iconBgColor, focusRingColor, ariaLabel }) => (
    <button
      onClick={onClick}
      className={`group bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md hover:shadow-lg border border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col items-center text-center focus:outline-none focus:ring-4 ${focusRingColor} hover:-translate-y-2`}
      aria-label={ariaLabel}
    >
      <div className={`${iconBgColor} rounded-full p-4 mb-6 transition-transform duration-300 group-hover:scale-110`}>
        {icon}
      </div>
      <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">{title}</h3>
      <p className="text-gray-500 dark:text-gray-400">
        {description}
      </p>
    </button>
  );

  return (
    <div className="text-center">
      <h2 className="text-4xl font-extrabold text-gray-800 dark:text-gray-100 tracking-tight mb-4">
        Welcome to {companyName}
      </h2>
      <p className="text-lg text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
        This is your central dashboard. Select an option below to get started.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
        <Card
          onClick={() => onNavigate('billing')}
          icon={<ReceiptIcon />}
          title="Create a Bill"
          description="Generate a new invoice for sales, returns, or exchanges."
          iconBgColor="bg-royal-100 dark:bg-royal-900/50 text-royal-600 dark:text-royal-400"
          focusRingColor="focus:ring-royal-300"
          ariaLabel="Go to Billing section"
        />
         <Card
          onClick={() => onNavigate('products')}
          icon={<TemplateIcon />}
          title="Manage Products"
          description="Add, edit, and manage your product catalog and pricing."
          iconBgColor="bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400"
          focusRingColor="focus:ring-yellow-300"
          ariaLabel="Go to Products section"
        />
        <Card
          onClick={() => onNavigate('purchases')}
          icon={<BoxIcon />}
          title="Record Purchases"
          description="Add new inventory and manage your purchase history."
          iconBgColor="bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400"
          focusRingColor="focus:ring-green-300"
          ariaLabel="Go to Purchases section"
        />
        <Card
          onClick={() => onNavigate('reports')}
          icon={<ChartBarIcon />}
          title="View Reports"
          description="Analyze sales, view closing stock, and track performance."
          iconBgColor="bg-royal-100 dark:bg-royal-900/50 text-royal-600 dark:text-royal-400"
          focusRingColor="focus:ring-royal-300"
          ariaLabel="Go to Reports section"
        />
      </div>
    </div>
  );
};