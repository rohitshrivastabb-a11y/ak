



import React, { useState, useMemo } from 'react';
import { Bill, Item } from '../types';
import { XIcon } from './icons/XIcon';
import { SearchIcon } from './icons/SearchIcon';

interface OriginalBillSelectorProps {
  allBills: Bill[];
  onClose: () => void;
  onSelect: (returnedItems: Item[]) => void;
}

export const OriginalBillSelector: React.FC<OriginalBillSelectorProps> = ({ allBills, onClose, onSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [itemsToReturn, setItemsToReturn] = useState<Record<string, boolean>>({});

  const filteredBills = useMemo(() => {
    if (!searchQuery.trim()) return allBills;
    const lowerQuery = searchQuery.toLowerCase();
    return allBills.filter(bill => 
      String(bill.id).includes(lowerQuery) ||
      bill.customerName.toLowerCase().includes(lowerQuery) ||
      bill.mobileNumber.includes(lowerQuery)
    ).sort((a,b) => b.date - a.date);
  }, [searchQuery, allBills]);

  const handleItemToggle = (itemId: string) => {
    setItemsToReturn(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleConfirmReturn = () => {
    if (!selectedBill) return;
    const returnedItems = selectedBill.items
      .filter(item => itemsToReturn[item.id])
      .map(item => ({
        ...item,
        quantity: -Math.abs(item.quantity), // Ensure quantity is negative
        id: String(Date.now() + Math.random()), // New unique ID
      }));
    onSelect(returnedItems);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
        <header className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Select Original Bill</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-cream-50 dark:hover:bg-gray-700"><XIcon /></button>
        </header>

        <div className="p-4">
            {!selectedBill ? (
                <>
                    <div className="relative mb-4">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <SearchIcon />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-3 py-2 bg-cream-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
                            placeholder="Search by Bill ID, Customer Name, or Mobile..."
                        />
                    </div>
                    <div className="overflow-y-auto max-h-[60vh]">
                        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredBills.map(bill => (
                                <li key={bill.id} onClick={() => setSelectedBill(bill)} className="p-3 hover:bg-cream-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                                    <p className="font-semibold text-gray-800 dark:text-gray-200">Bill #{bill.id} - {bill.customerName}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{bill.mobileNumber} - {new Date(bill.date).toLocaleDateString()}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                </>
            ) : (
                <div>
                    <button onClick={() => setSelectedBill(null)} className="text-sm text-royal-600 hover:underline mb-2">&larr; Back to search</button>
                    <h3 className="font-semibold text-lg mb-2 text-gray-800 dark:text-gray-200">Select items to return from Bill #{selectedBill.id}</h3>
                    <div className="overflow-y-auto max-h-[55vh] border border-gray-200 dark:border-gray-700 rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                             <thead className="bg-cream-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-2 w-10"></th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Item</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Qty</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Net Value</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {selectedBill.items.map(item => (
                                <tr key={item.id}>
                                    <td className="px-4 py-3">
                                        <input type="checkbox" checked={!!itemsToReturn[item.id]} onChange={() => handleItemToggle(item.id)} className="h-5 w-5 rounded border-gray-300 text-royal-600 focus:ring-royal-500" />
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-gray-900 dark:text-gray-200">{item.name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{item.code}</p>
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300 font-mono">{item.quantity}</td>
                                    <td className="px-4 py-3 text-right text-sm text-gray-800 dark:text-gray-200 font-semibold font-mono">₹{(item.netValue * item.quantity).toFixed(2)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>

        <footer className="flex justify-end p-4 border-t border-gray-200 dark:border-gray-700 bg-cream-50 dark:bg-gray-800/50">
          <button onClick={handleConfirmReturn} disabled={!selectedBill || Object.values(itemsToReturn).every(v => !v)} className="bg-royal-600 hover:bg-royal-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 disabled:bg-royal-300 disabled:cursor-not-allowed">
            Confirm Selection
          </button>
        </footer>
      </div>
    </div>
  );
};