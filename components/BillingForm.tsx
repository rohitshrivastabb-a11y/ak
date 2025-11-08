import React, { useState, useMemo, useRef } from 'react';
import { Item, Brand, TransactionType, Bill, CustomerCredits, Product } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { XIcon } from './icons/XIcon';
import { TagIcon } from './icons/TagIcon';
import { RefreshIcon } from './icons/RefreshIcon';
import { CashbackIcon } from './icons/CashbackIcon';
import { OriginalBillSelector } from './OriginalBillSelector';

interface BillingFormProps {
  customerName: string;
  setCustomerName: (name: string) => void;
  mobileNumber: string;
  setMobileNumber: (mobile: string) => void;
  onAddItem: (item: Omit<Item, 'id'>) => void;
  setItems: (items: Item[]) => void;
  items: Item[];
  showroomBrand: Brand;
  setShowroomBrand: (brand: Brand) => void;
  paymentMethod: 'Cash' | 'Card';
  setPaymentMethod: (method: 'Cash' | 'Card') => void;
  address: string;
  setAddress: (address: string) => void;
  gstNumber: string;
  setGstNumber: (gst: string) => void;
  billDate: string;
  setBillDate: (date: string) => void;
  isEditing: boolean;
  transactionType: TransactionType;
  setTransactionType: (type: TransactionType) => void;
  allBills: Bill[];
  customerCredits: CustomerCredits;
  creditToApply: string;
  setCreditToApply: (credit: string) => void;
  onNewBill: () => void;
  customBillNumber: string;
  setCustomBillNumber: (billNo: string) => void;
  useCustomBillNumber: boolean;
  setUseCustomBillNumber: (useCustom: boolean) => void;
  productCatalog: Product[];
}

const ErrorMessage: React.FC<{ message?: string }> = ({ message }) => {
    if (!message) return null;
    return <p className="text-red-500 text-xs mt-1 animate-fade-in">{message}</p>;
};

export const BillingForm: React.FC<BillingFormProps> = ({
  customerName,
  setCustomerName,
  mobileNumber,
  setMobileNumber,
  onAddItem,
  setItems,
  items,
  showroomBrand,
  setShowroomBrand,
  paymentMethod,
  setPaymentMethod,
  address,
  setAddress,
  gstNumber,
  setGstNumber,
  billDate,
  setBillDate,
  isEditing,
  transactionType,
  setTransactionType,
  allBills,
  customerCredits,
  creditToApply,
  setCreditToApply,
  onNewBill,
  customBillNumber,
  setCustomBillNumber,
  useCustomBillNumber,
  setUseCustomBillNumber,
  productCatalog,
}) => {
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemSize, setItemSize] = useState('');
  const [itemMrp, setItemMrp] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [discountPercentage, setDiscountPercentage] = useState<string>('');
  const [isDateInputFocused, setIsDateInputFocused] = useState(false);
  const [isBillSelectorOpen, setIsBillSelectorOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const mobileNumberRef = useRef<HTMLInputElement>(null); // Ref for mobile number input
  const itemNameRef = useRef<HTMLInputElement>(null);
  const itemSizeRef = useRef<HTMLInputElement>(null);

  const availableCredit = customerCredits[mobileNumber] || 0;

  const netValuePerItem = useMemo(() => {
    const mrp = parseFloat(itemMrp);
    const discount = parseFloat(discountPercentage);

    if (!isNaN(mrp) && mrp > 0) {
        if (!isNaN(discount) && discount >= 0 && discount <= 100) {
            const discountAmount = mrp * (discount / 100);
            return (mrp - discountAmount);
        }
        return mrp;
    }
    return 0;
  }, [itemMrp, discountPercentage]);
  
  const totalValue = useMemo(() => {
    const qty = parseInt(quantity, 10);
    if (!isNaN(netValuePerItem) && !isNaN(qty) && qty > 0) {
      return (netValuePerItem * qty);
    }
    return netValuePerItem;
  }, [netValuePerItem, quantity]);

  const validateItem = (): boolean => {
    const newErrors: Record<string, string> = {};
    const mrp = parseFloat(itemMrp);
    const qty = parseInt(quantity, 10);
    const discount = parseFloat(discountPercentage);

    if (!itemName.trim()) newErrors.itemName = 'Item name is required.';
    if (!itemSize.trim()) newErrors.itemSize = 'Size is required.';
    if (isNaN(mrp) || mrp <= 0) newErrors.itemMrp = 'MRP must be a positive number.';
    if (isNaN(qty) || qty <= 0) newErrors.quantity = 'Quantity must be a positive number.';
    if (discountPercentage.trim() && (isNaN(discount) || discount < 0 || discount > 100)) {
        newErrors.discountPercentage = 'Discount must be between 0 and 100.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddItemClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateItem()) {
        return;
    }

    onAddItem({
        code: itemCode.toUpperCase(),
        name: itemName.toUpperCase(),
        size: itemSize.toUpperCase(),
        mrp: parseFloat(itemMrp),
        quantity: parseInt(quantity, 10),
        discountPercentage: parseFloat(discountPercentage) || 0,
        netValue: netValuePerItem,
    });
    setItemCode('');
    setItemName('');
    setItemSize('');
    setItemMrp('');
    setQuantity('1');
    setDiscountPercentage('');
    setErrors({});
    itemNameRef.current?.focus();
  };

  const handleReturnedItemsSelected = (returnedItems: Item[]) => {
    setItems([...items, ...returnedItems]);
    setIsBillSelectorOpen(false);
  };
  
  const formatDateForDisplay = (isoDate: string): string => {
    if (!isoDate || isoDate.split('-').length < 3) return '';
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  };

  const TransactionButton: React.FC<{ type: TransactionType, icon: React.ReactNode, label: string }> = ({ type, icon, label }) => (
    <button
        type="button"
        onClick={() => setTransactionType(type)}
        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-md transition-all duration-200 border-2 ${transactionType === type ? 'bg-royal-600 text-white border-royal-600 shadow-md' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-cream-50 dark:hover:bg-gray-600'}`}
    >
        {icon}
        <span>{label}</span>
    </button>
  );

  const handleCustomerNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      mobileNumberRef.current?.focus();
    }
  };

  const handleItemNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setItemName(value);
    if (value.length > 1) {
      const filtered = productCatalog.filter(product =>
        product.name.toUpperCase().includes(value) || product.code.toUpperCase().includes(value)
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (product: Product) => {
    setItemName(product.name);
    setItemCode(product.code);
    setItemSize(product.size);
    setItemMrp(String(product.mrp));
    setShowSuggestions(false);
    itemSizeRef.current?.focus();
  };

  return (
    <>
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md space-y-6 border border-gray-200 dark:border-gray-700 animate-fade-in-up">
      <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-600 pb-3">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{isEditing ? 'Edit Transaction' : 'Create New Transaction'}</h2>
         {(isEditing || items.length > 0 || customerName || mobileNumber) && (
            <button
                type="button"
                onClick={onNewBill}
                className="flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                aria-label={isEditing ? 'Cancel Edit' : 'Start New Bill'}
            >
                {isEditing ? <XIcon /> : <PlusIcon />}
                <span>{isEditing ? 'Cancel Edit' : 'Start New Bill'}</span>
            </button>
        )}
      </div>
      
      {/* Transaction Type */}
      <div className="space-y-2">
         <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200">Transaction Type</h3>
         <div className="flex gap-2">
            <TransactionButton type="Sale" icon={<TagIcon />} label="Sale" />
            <TransactionButton type="Exchange" icon={<RefreshIcon />} label="Exchange" />
            <TransactionButton type="Return" icon={<CashbackIcon />} label="Return" />
         </div>
      </div>
      
      {(transactionType === 'Exchange' || transactionType === 'Return') && (
        <div className="p-4 bg-cream-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
            <button onClick={() => setIsBillSelectorOpen(true)} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300">
                Find Original Bill for {transactionType}
            </button>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200">Invoice Details</h3>
         <div>
          <label htmlFor="billDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Invoice Date</label>
          <input
            type={isDateInputFocused ? 'date' : 'text'}
            id="billDate"
            value={isDateInputFocused ? billDate : formatDateForDisplay(billDate)}
            onFocus={() => setIsDateInputFocused(true)}
            onBlur={() => setIsDateInputFocused(false)}
            onChange={(e) => setBillDate(e.target.value)}
            className="w-full px-3 py-2 bg-cream-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-royal-500 focus:border-royal-500 transition text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            placeholder="DD/MM/YYYY"
          />
        </div>
        {/* Custom Bill Number Option */}
        <div className="mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
                <input
                    type="checkbox"
                    checked={useCustomBillNumber}
                    onChange={(e) => {
                        setUseCustomBillNumber(e.target.checked);
                        if (!e.target.checked) setCustomBillNumber(''); // Clear custom number if unchecked
                    }}
                    className="h-4 w-4 text-royal-600 border-gray-300 focus:ring-royal-500"
                />
                <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">Use Custom Invoice Number</span>
            </label>
            {useCustomBillNumber && (
                <div className="mt-2">
                    <input
                        type="text"
                        id="customBillNumber"
                        value={customBillNumber}
                        onChange={(e) => setCustomBillNumber(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 bg-cream-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-royal-500 focus:border-royal-500 transition text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        placeholder="Enter custom invoice number"
                    />
                </div>
            )}
        </div>
        <div>
          <label htmlFor="showroomBrand" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Brand Name</label>
          <select
            id="showroomBrand"
            value={showroomBrand}
            onChange={(e) => setShowroomBrand(e.target.value as Brand)}
            className="w-full px-3 py-2 bg-cream-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-royal-500 focus:border-royal-500 transition text-gray-900 dark:text-gray-100"
          >
            {Object.values(Brand).map(brand => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="gstNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">GST Number (Optional)</label>
          <input
            type="text"
            id="gstNumber"
            value={gstNumber}
            onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
            className="w-full px-3 py-2 bg-cream-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-royal-500 focus:border-royal-500 transition text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            placeholder="Enter Company GSTIN"
          />
        </div>
         <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Address</label>
          <textarea
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 bg-cream-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-royal-500 focus:border-royal-500 transition text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            placeholder="Enter brand address for invoice"
          />
        </div>
      </div>
      
      <div className="space-y-4 border-t border-gray-200 dark:border-gray-600 pt-6">
        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200">Customer Details</h3>
        <div>
          <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name</label>
          <input
            type="text"
            id="customerName"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value.toUpperCase())}
            onKeyDown={handleCustomerNameKeyDown} // Add onKeyDown handler here
            className="w-full px-3 py-2 bg-cream-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-royal-500 focus:border-royal-500 transition text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            placeholder="Enter customer's name"
          />
        </div>
        <div>
          <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Mobile Number</label>
          <input
            type="tel"
            id="mobileNumber"
            ref={mobileNumberRef} // Attach ref to mobile number input
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value.toUpperCase())}
            className="w-full px-3 py-2 bg-cream-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-royal-500 focus:border-royal-500 transition text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            placeholder="Enter mobile number"
          />
        </div>
        {availableCredit > 0 && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg">
                <p className="text-sm font-medium text-green-800 dark:text-green-300">Available Credit: <span className="font-bold text-lg">₹{availableCredit.toFixed(2)}</span></p>
                <div className="mt-2 flex gap-2">
                    <input
                        type="number"
                        value={creditToApply}
                        onChange={(e) => setCreditToApply(e.target.value)}
                        max={availableCredit}
                        min="0"
                        placeholder="Amount to apply"
                        className="flex-grow w-full px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
                    />
                    <button onClick={() => setCreditToApply(String(Math.min(availableCredit, items.reduce((sum, item) => sum + (item.netValue * item.quantity), 0))))} className="bg-green-600 text-white font-semibold py-1.5 px-3 rounded-md text-sm hover:bg-green-700">Apply Max</button>
                </div>
            </div>
        )}
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Payment Method</label>
            <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="radio"
                        name="paymentMethod"
                        value="Cash"
                        checked={paymentMethod === 'Cash'}
                        onChange={() => setPaymentMethod('Cash')}
                        className="h-4 w-4 text-royal-600 border-gray-300 focus:ring-royal-500"
                    />
                    <span className="text-sm text-gray-800 dark:text-gray-200">Cash</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="radio"
                        name="paymentMethod"
                        value="Card"
                        checked={paymentMethod === 'Card'}
                        onChange={() => setPaymentMethod('Card')}
                        className="h-4 w-4 text-royal-600 border-gray-300 focus:ring-royal-500"
                    />
                    <span className="text-sm text-gray-800 dark:text-gray-200">Card</span>
                </label>
            </div>
        </div>
      </div>

      {transactionType !== 'Return' && (
      <form onSubmit={handleAddItemClick} className="space-y-4 border-t border-gray-200 dark:border-gray-600 pt-6">
        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200">Add Item</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="itemName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Item Name / Code</label>
              <div className="relative">
                <input
                  type="text"
                  id="itemName"
                  ref={itemNameRef}
                  value={itemName}
                  onChange={handleItemNameChange}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} // Delay to allow click
                  autoComplete="off"
                  className="w-full px-3 py-2 bg-cream-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-royal-500 focus:border-royal-500 transition text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  placeholder="e.g., T-Shirt"
                />
                {showSuggestions && (
                  <ul className="absolute z-10 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
                    {suggestions.map((product) => (
                      <li
                        key={product.id}
                        onMouseDown={() => handleSuggestionClick(product)} // use onMouseDown to fire before onBlur
                        className="px-3 py-2 cursor-pointer hover:bg-cream-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
                      >
                        {product.name} <span className="text-xs text-gray-500">({product.code} / {product.size} / ₹{product.mrp})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <ErrorMessage message={errors.itemName} />
            </div>
             <div>
              <label htmlFor="itemCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Item Code (Auto-filled)</label>
              <input
                type="text"
                id="itemCode"
                value={itemCode}
                onChange={(e) => setItemCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-cream-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-royal-500 focus:border-royal-500 transition text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                placeholder="e.g., TSHIRT01"
              />
              <ErrorMessage message={errors.itemCode} />
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="itemSize" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Size</label>
              <input
                type="text"
                id="itemSize"
                ref={itemSizeRef}
                value={itemSize}
                onChange={(e) => setItemSize(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-cream-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-royal-500 focus:border-royal-500 transition text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                placeholder="e.g., M, L, XL, 40"
              />
              <ErrorMessage message={errors.itemSize} />
            </div>
            <div>
                <label htmlFor="itemMrp" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">MRP (₹)</label>
                <input
                    type="number"
                    id="itemMrp"
                    value={itemMrp}
                    onChange={(e) => setItemMrp(e.target.value)}
                    className="w-full px-3 py-2 bg-cream-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-royal-500 focus:border-royal-500 transition text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    placeholder="Enter MRP"
                    step="0.01"
                    min="0"
                />
                <ErrorMessage message={errors.itemMrp} />
            </div>
        </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Quantity</label>
              <input
                  type="number"
                  id="quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 bg-cream-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-royal-500 focus:border-royal-500 transition text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  placeholder="e.g., 1"
                  step="1"
                  min="1"
              />
              <ErrorMessage message={errors.quantity} />
            </div>
            <div>
                <label htmlFor="discountPercentage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Discount (%)</label>
                <input
                    type="number"
                    id="discountPercentage"
                    value={discountPercentage}
                    onChange={(e) => setDiscountPercentage(e.target.value)}
                    className="w-full px-3 py-2 bg-cream-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-royal-500 focus:border-royal-500 transition text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    placeholder="e.g., 10"
                    step="0.01"
                    min="0"
                    max="100"
                />
                <ErrorMessage message={errors.discountPercentage} />
            </div>
        </div>
         <div className="pt-2 flex justify-between items-baseline">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Net Value: <span className="font-bold text-lg text-green-600 dark:text-green-400">₹{totalValue.toFixed(2)}</span></p>
            <p className="text-xs text-gray-500 dark:text-gray-400">(per item: ₹{netValuePerItem.toFixed(2)})</p>
         </div>
        <button type="submit" className="w-full flex items-center justify-center gap-2 bg-royal-600 hover:bg-royal-700 text-white font-bold py-2.5 px-4 rounded-lg transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-royal-300">
          <PlusIcon />
          Add Item to Bill
        </button>
      </form>
      )}
    </div>
    {isBillSelectorOpen && (
        <OriginalBillSelector
            allBills={allBills}
            onClose={() => setIsBillSelectorOpen(false)}
            onSelect={handleReturnedItemsSelected}
        />
    )}
    </>
  );
};