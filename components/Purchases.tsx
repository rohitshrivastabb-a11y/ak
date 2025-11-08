

import React, { useState } from 'react';
import { Purchase, PurchasedItem } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';

interface PurchasesProps {
  allPurchases: Purchase[];
  onAddPurchase: (purchase: Omit<Purchase, 'id'>) => void;
}

const SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL', '7XL'];

const ErrorMessage: React.FC<{ message?: string }> = ({ message }) => {
    if (!message) return null;
    return <p className="text-red-500 text-xs mt-1 animate-fade-in">{message}</p>;
};

export const Purchases: React.FC<PurchasesProps> = ({ allPurchases, onAddPurchase }) => {
  const [supplier, setSupplier] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<Omit<PurchasedItem, 'id'>[]>([]);

  // State for the item entry form
  const [itemName, setItemName] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [itemValue, setItemValue] = useState('');
  const [sizeQuantities, setSizeQuantities] = useState<Record<string, string>>(
    Object.fromEntries(SIZES.map(size => [size, ''])
  ));
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAddItems = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!itemName.trim()) newErrors.itemName = 'Item name is required.';
    if (!itemValue || parseFloat(itemValue) <= 0) newErrors.itemValue = 'Value must be a positive number.';

    const quantitiesEntered = Object.values(sizeQuantities).some(q => q && parseInt(String(q), 10) > 0);
    if (!quantitiesEntered) {
      newErrors.sizes = 'Please enter a quantity for at least one size.';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    const newItems: Omit<PurchasedItem, 'id'>[] = SIZES
      .map(size => {
        const quantity = parseInt(sizeQuantities[size] || '0', 10);
        if (quantity > 0) {
          return {
            name: itemName.trim().toUpperCase(),
            code: itemCode.trim().toUpperCase(),
            size: size,
            quantity: quantity,
            value: parseFloat(itemValue),
          };
        }
        return null;
      })
      .filter((item): item is Omit<PurchasedItem, 'id'> => item !== null);

    setItems(prevItems => [...prevItems, ...newItems]);

    // Reset form
    setItemName('');
    setItemCode('');
    setItemValue('');
    setSizeQuantities(Object.fromEntries(SIZES.map(size => [size, ''])));
    setErrors({});
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleRecordPurchase = () => {
    if (items.length === 0) {
      alert('Please add at least one item to the purchase.');
      return;
    }

    onAddPurchase({
      date: new Date(date).getTime(),
      supplier: supplier.trim() || undefined,
      items: items.map((item, index) => ({ ...item, id: String(Date.now() + index) })),
    });

    // Reset main form
    setSupplier('');
    setDate(new Date().toISOString().split('T')[0]);
    setItems([]);
  };
  
  // FIX: Explicitly set the generic type for `reduce` to `number` to address a type inference issue where the result was 'unknown'.
  const totalItemQuantityInForm: number = Object.values(sizeQuantities).reduce<number>((sum, q) => sum + (Number(q) || 0), 0);
  const totalItemValueInForm: number = totalItemQuantityInForm * (parseFloat(itemValue || '0') || 0);

  const totalPurchaseValue: number = items.reduce((sum, item) => sum + item.value * item.quantity, 0);

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">Manage Purchases</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 space-y-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-600 pb-3">Record New Purchase</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
              <label htmlFor="purchaseDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Purchase Date</label>
              <input type="date" id="purchaseDate" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 bg-cream-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-royal-500"/>
            </div>
            <div>
              <label htmlFor="supplier" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Supplier (Optional)</label>
              <input type="text" id="supplier" value={supplier} onChange={e => setSupplier(e.target.value)} className="w-full px-3 py-2 bg-cream-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-royal-500" placeholder="e.g., ABC Textiles"/>
            </div>
          </div>

          <form onSubmit={handleAddItems} className="space-y-4 border-t border-gray-200 dark:border-gray-600 pt-6">
             <h4 className="text-lg font-medium text-gray-700 dark:text-gray-200">Enter Item Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <label htmlFor="itemName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Item Name</label>
                    <input type="text" value={itemName} onChange={e => setItemName(e.target.value.toUpperCase())} className="w-full px-3 py-2 bg-cream-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" placeholder="e.g., Top" />
                    <ErrorMessage message={errors.itemName} />
                  </div>
                   <div className="md:col-span-1">
                    <label htmlFor="itemCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Item Code (Optional)</label>
                    <input type="text" value={itemCode} onChange={e => setItemCode(e.target.value.toUpperCase())} className="w-full px-3 py-2 bg-cream-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" placeholder="e.g., TOP01" />
                  </div>
                  <div className="md:col-span-1">
                    <label htmlFor="itemValue" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Cost per Item (₹)</label>
                    <input type="number" value={itemValue} onChange={e => setItemValue(e.target.value)} className="w-full px-3 py-2 bg-cream-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" placeholder="e.g., 250.00" min="0" step="0.01" />
                    <ErrorMessage message={errors.itemValue} />
                  </div>
              </div>

              <div className="pt-4">
                <h4 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">Enter Quantity by Size</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {SIZES.map(size => (
                    <div key={size}>
                      <label htmlFor={`size-${size}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 text-center">{size}</label>
                      <input
                        type="number"
                        id={`size-${size}`}
                        value={sizeQuantities[size] || ''}
                        onChange={e => setSizeQuantities(prev => ({ ...prev, [size]: e.target.value }))}
                        className="w-full text-center px-2 py-2 bg-cream-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"
                        placeholder="0"
                        min="0"
                      />
                    </div>
                  ))}
                </div>
                <ErrorMessage message={errors.sizes} />
              </div>

              <div className="pt-4 flex justify-between items-center bg-cream-50 dark:bg-gray-700/50 p-3 rounded-lg">
                 <div className="text-sm">
                    <p className="font-semibold text-gray-800 dark:text-gray-100">Total for this item:</p>
                    <p className="text-gray-600 dark:text-gray-300">{totalItemQuantityInForm} pieces</p>
                 </div>
                 <p className="font-bold text-xl text-green-600 dark:text-green-400">₹{totalItemValueInForm.toFixed(2)}</p>
              </div>

              <button type="submit" className="w-full flex items-center justify-center gap-2 bg-royal-600 hover:bg-royal-700 text-white font-bold py-2.5 px-4 rounded-lg transition-all duration-300">
                <PlusIcon /> Add Items to Purchase
              </button>
          </form>
        </div>

        <div className="lg:col-span-5 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex flex-col">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-600 pb-3 mb-4">Current Purchase Cart</h3>
          <div className="flex-grow overflow-y-auto -mr-3 pr-3">
            {items.length > 0 ? (
              <ul className="divide-y divide-y-200 dark:divide-gray-600">
                {items.map((item, index) => (
                  <li key={index} className="py-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{item.name} <span className="text-gray-500 dark:text-gray-400 font-normal">({item.size})</span></p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{item.code || 'No Code'} &middot; {item.quantity} x ₹{item.value.toFixed(2)} = <span className="font-semibold text-gray-700 dark:text-gray-300">₹{(item.value * item.quantity).toFixed(2)}</span></p>
                    </div>
                    <button onClick={() => handleRemoveItem(index)} className="text-red-500 hover:text-red-700 p-1 rounded-full"><TrashIcon /></button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-center text-gray-500 dark:text-gray-400">No items added yet.</p>
              </div>
            )}
          </div>
          <div className="border-t border-gray-200 dark:border-gray-600 mt-4 pt-4 space-y-4">
             <div className="flex justify-between text-lg font-bold text-gray-800 dark:text-white">
                <span>Total Value:</span>
                <span>₹{totalPurchaseValue.toFixed(2)}</span>
             </div>
             <button onClick={handleRecordPurchase} disabled={items.length === 0} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 disabled:bg-green-300 disabled:cursor-not-allowed">
                Record Purchase
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 p-6 border-b border-gray-200 dark:border-gray-600">Purchase History</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
            <thead className="bg-cream-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Items</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Value</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {[...allPurchases].sort((a,b) => b.date - a.date).map(purchase => {
                const totalValue: number = purchase.items.reduce((sum: number, item: PurchasedItem): number => sum + item.value * item.quantity, 0);
                return (
                  <tr key={purchase.id} className="hover:bg-cream-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">{new Date(purchase.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-gray-200 font-medium">{purchase.supplier || 'N/A'}</td>
                    <td className="px-6 py-4">
                        <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                            {purchase.items.map(item => (
                                <li key={item.id}>{item.name} ({item.code || 'N/A'} / {item.size}) - {item.quantity} pcs</li>
                            ))}
                        </ul>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-gray-800 dark:text-gray-200 font-bold font-mono">₹{totalValue.toFixed(2)}</td>
                  </tr>
                );
              })}
              {allPurchases.length === 0 && (
                <tr>
                    <td colSpan={4} className="text-center py-10 text-gray-500 dark:text-gray-400">No purchase history found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};