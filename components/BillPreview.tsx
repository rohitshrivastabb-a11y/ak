

import React, { useState, useEffect } from 'react';
import { Item, Bill } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { PencilIcon } from './icons/PencilIcon';
import { CheckIcon } from './icons/CheckIcon';
import { XIcon } from './icons/XIcon';

// FIX: Allow creditGenerated to be optional for bill previews.
interface BillPreviewProps {
  bill: Omit<Bill, 'creditGenerated'> & { creditGenerated?: number }; // creditGenerated is calculated on finalization
  onRemoveItem?: (id: string) => void;
  editingItemId?: string | null;
  setEditingItemId?: (id: string | null) => void;
  onUpdateItem?: (id: string, updatedData: { name: string; code: string; size: string; mrp: number; discountPercentage: number; quantity: number; }) => void;
}

export const BillPreview: React.FC<BillPreviewProps> = ({
  bill,
  onRemoveItem,
  editingItemId,
  setEditingItemId,
  onUpdateItem,
}) => {
  const { customerName, mobileNumber, items, showroomBrand, date, paymentMethod, address, gstNumber, id: invoiceId, transactionType, creditApplied, customInvoiceNumber } = bill;
  const [editFormData, setEditFormData] = useState({ name: '', code: '', size: '', mrp: '', discountPercentage: '', quantity: '' });
  const [editTotalValue, setEditTotalValue] = useState('0.00');

  useEffect(() => {
    if (editingItemId) {
      const itemToEdit = items.find(i => i.id === editingItemId);
      if (itemToEdit) {
        setEditFormData({
          name: itemToEdit.name,
          code: itemToEdit.code,
          size: itemToEdit.size,
          mrp: String(itemToEdit.mrp),
          discountPercentage: String(itemToEdit.discountPercentage),
          quantity: String(Math.abs(itemToEdit.quantity)), // Edit with positive quantity
        });
      }
    }
  }, [editingItemId, items]);

  useEffect(() => {
    const mrp = parseFloat(editFormData.mrp);
    const discount = parseFloat(editFormData.discountPercentage);
    const qty = parseInt(editFormData.quantity, 10);
    let perItemNet = 0;

    if (!isNaN(mrp) && mrp > 0) {
        if (!isNaN(discount) && discount >= 0 && discount <= 100) {
            const discountAmount = mrp * (discount / 100);
            perItemNet = mrp - discountAmount;
        } else {
            perItemNet = mrp;
        }
    }

    if (!isNaN(qty) && qty > 0) {
        setEditTotalValue((perItemNet * qty).toFixed(2));
    } else {
        setEditTotalValue(perItemNet.toFixed(2));
    }
  }, [editFormData.mrp, editFormData.discountPercentage, editFormData.quantity]);

  const handleSave = (id: string) => {
    const mrp = parseFloat(editFormData.mrp);
    const discount = parseFloat(editFormData.discountPercentage);
    const qty = parseInt(editFormData.quantity, 10);
    const originalItem = items.find(i => i.id === id);
    const finalQty = originalItem && originalItem.quantity < 0 ? -qty : qty; // Preserve sign

    // Item code is now optional, removed validation for it.
    if (onUpdateItem && editFormData.name.trim() && editFormData.size.trim() && !isNaN(mrp) && mrp > 0 && !isNaN(qty) && qty > 0 && !isNaN(discount) && discount >= 0 && discount <= 100) {
      onUpdateItem(id, {
        name: editFormData.name.trim().toUpperCase(),
        code: editFormData.code.trim().toUpperCase(),
        size: editFormData.size.trim().toUpperCase(),
        mrp: mrp,
        discountPercentage: discount,
        quantity: finalQty,
      });
      setEditingItemId?.(null);
    } else {
      alert('Please fill all required fields with valid values (Quantity > 0, Discount: 0-100).');
    }
  };

  const handleCancel = () => {
    setEditingItemId?.(null);
  };

  const grandTotal = items.reduce((sum, item) => sum + (item.netValue * item.quantity), 0);
  const preTaxTotal = grandTotal / 1.05;
  const totalGst = grandTotal - preTaxTotal;
  const cgst = totalGst / 2;
  const sgst = totalGst / 2;
  
  const finalPayable = grandTotal - creditApplied;
  const creditGenerated = finalPayable < 0 ? -finalPayable : bill.creditGenerated || 0;
  const amountPayable = finalPayable > 0 ? finalPayable : 0;


  const displayDate = date ? new Date(date) : new Date();
  const formattedDate = `${String(displayDate.getDate()).padStart(2, '0')}/${String(displayDate.getMonth() + 1).padStart(2, '0')}/${displayDate.getFullYear()}`;
  
  const isActionable = onRemoveItem || onUpdateItem;

  const invoiceNumber = customInvoiceNumber || invoiceId; // Use custom number if available

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 max-w-sm mx-auto font-mono text-xs printable-area animate-fade-in text-gray-800 dark:text-gray-200">
      <div className="text-center mb-2">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white">{showroomBrand || 'Mishra Collection'}</h2>
        <p className="text-gray-500 dark:text-gray-400 whitespace-pre-line text-[10px] leading-tight">{address}</p>
        {gstNumber && <p className="text-gray-500 dark:text-gray-400 font-semibold text-[10px] mt-1">GSTIN: {gstNumber}</p>}
        <p className="text-gray-500 dark:text-gray-400 uppercase text-[10px] mt-1">Tax Invoice ({transactionType})</p>
      </div>
      
      <hr className="border-dashed border-gray-300 dark:border-gray-600 my-2" />

      <div className="text-[10px] space-y-0.5 text-gray-700 dark:text-gray-300">
        <div className="flex justify-between">
          <span>Inv No: #{invoiceNumber || 'N/A'}</span>
          <span>Date: {formattedDate}</span>
        </div>
        {paymentMethod && (
           <div className="flex justify-between">
             <span>Pay Mode: {paymentMethod}</span>
           </div>
        )}
        <div className="mt-1 pt-1 border-t border-dashed border-gray-300 dark:border-gray-600">
          <p>Billed To: {customerName || 'N/A'}</p>
          <p>Mobile: {mobileNumber || 'N/A'}</p>
        </div>
      </div>

      <hr className="border-dashed border-gray-300 dark:border-gray-600 my-2" />

      {items.length > 0 ? (
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-dashed border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200">
              <th className="text-left pb-1 font-semibold">ITEM(S)</th>
              <th className="text-center pb-1 font-semibold">QTY</th>
              <th className="text-right pb-1 font-semibold">MRP</th>
              <th className="text-right pb-1 font-semibold">DISC%</th>
              <th className="text-right pb-1 font-semibold">AMOUNT</th>
              {isActionable && <th className="w-12"></th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) =>
              item.id === editingItemId && setEditingItemId && onUpdateItem ? (
                // EDIT MODE
                <tr key={item.id} className="bg-cream-50 dark:bg-gray-700/50">
                  <td colSpan={isActionable ? 6 : 5} className="p-2">
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input type="text" value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value.toUpperCase() })} className="w-full text-xs p-1 rounded border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100" placeholder="Item Name" />
                          <input type="text" value={editFormData.code} onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value.toUpperCase() })} className="w-full text-xs p-1 rounded border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100" placeholder="Item Code" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input type="text" value={editFormData.size} onChange={(e) => setEditFormData({ ...editFormData, size: e.target.value.toUpperCase() })} className="w-full text-xs p-1 rounded border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100" placeholder="Size"/>
                          <input type="number" value={editFormData.quantity} onChange={(e) => setEditFormData({ ...editFormData, quantity: e.target.value })} className="w-full text-xs p-1 rounded border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100" placeholder="Qty" min="1" />
                          <input type="number" value={editFormData.mrp} onChange={(e) => setEditFormData({ ...editFormData, mrp: e.target.value })} className="w-full text-xs p-1 rounded border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100" placeholder="MRP" min="0" />
                        </div>
                         <div className="grid grid-cols-2 gap-2">
                           <input type="number" value={editFormData.discountPercentage} onChange={(e) => setEditFormData({ ...editFormData, discountPercentage: e.target.value })} className="w-full text-xs p-1 rounded border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100" placeholder="Disc %" min="0" max="100" />
                           <div className="text-right flex items-center justify-end">
                                <span className="font-bold text-xs text-gray-800 dark:text-gray-200">₹{editTotalValue}</span>
                           </div>
                         </div>
                         <div className="flex justify-end space-x-1 pt-1">
                              <button onClick={() => handleSave(item.id)} className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 p-1 rounded-full"><CheckIcon /></button>
                              <button onClick={handleCancel} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1 rounded-full"><XIcon /></button>
                         </div>
                      </div>
                  </td>
                </tr>
              ) : (
                // VIEW MODE
                <tr key={item.id} className={`${item.quantity < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'}`}>
                    <td className="py-1 pr-1">
                        <div className="font-semibold text-gray-800 dark:text-gray-200">{index+1}. {item.name} {item.quantity < 0 && '(Return)'}</div>
                        <div className="text-gray-500 dark:text-gray-400">({item.code || 'N/A'} / {item.size})</div>
                    </td>
                    <td className="py-1 text-center align-top">{item.quantity}</td>
                    <td className="py-1 text-right align-top">{item.mrp.toFixed(2)}</td>
                    <td className="py-1 text-right align-top">{item.discountPercentage.toFixed(2)}</td>
                    <td className={`py-1 text-right align-top font-bold ${item.quantity < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'}`}>
                        {(item.netValue * item.quantity).toFixed(2)}
                    </td>
                    {isActionable && (
                        <td className="py-1 text-right align-middle pl-1">
                            <div className="flex items-center justify-end space-x-1">
                                <button onClick={() => setEditingItemId?.(item.id)} className="text-gray-500 hover:text-royal-700 dark:text-gray-400 dark:hover:text-royal-400 p-1 rounded-full transition-transform transform hover:scale-125" aria-label={`Edit ${item.name}`}><PencilIcon /></button>
                                <button onClick={() => onRemoveItem?.(item.id)} className="text-gray-500 hover:text-red-700 dark:text-gray-400 dark:hover:text-red-400 p-1 rounded-full transition-transform transform hover:scale-125" aria-label={`Remove ${item.name}`}><TrashIcon /></button>
                            </div>
                        </td>
                    )}
                </tr>
              )
            )}
          </tbody>
        </table>
      ) : (
        <p className="text-center text-gray-500 dark:text-gray-400 py-6">No items added yet.</p>
      )}

      <hr className="border-dashed border-gray-300 dark:border-gray-600 my-2" />
      
      {items.length > 0 && (
          <>
            <div className="text-[10px] space-y-0.5 text-gray-700 dark:text-gray-300">
                <div className="flex justify-between font-semibold text-gray-800 dark:text-gray-200">
                    <span>Sub Total:</span>
                    <span>{preTaxTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span>CGST @ 2.5%:</span>
                    <span>{cgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span>SGST @ 2.5%:</span>
                    <span>{sgst.toFixed(2)}</span>
                </div>
                <hr className="border-dashed border-gray-300 dark:border-gray-600 my-1" />
                <div className="flex justify-between text-xs font-bold text-gray-800 dark:text-white">
                    <span>GRAND TOTAL:</span>
                    <span>₹{grandTotal.toFixed(2)}</span>
                </div>
                {creditApplied > 0 && (
                    <div className="flex justify-between text-xs text-royal-600 dark:text-royal-400 font-bold">
                        <span>Credit Applied:</span>
                        <span>- ₹{creditApplied.toFixed(2)}</span>
                    </div>
                )}
                 <hr className="border-dashed border-gray-300 dark:border-gray-600 my-1" />
                {creditGenerated > 0 ? (
                    <div className="flex justify-between text-sm font-extrabold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 -mx-1 px-1 py-0.5 rounded">
                        <span>CREDIT GENERATED:</span>
                        <span>₹{creditGenerated.toFixed(2)}</span>
                    </div>
                ) : (
                    <div className="flex justify-between text-sm font-extrabold text-gray-800 dark:text-white bg-cream-50 dark:bg-gray-700 -mx-1 px-1 py-0.5 rounded">
                        <span>AMOUNT PAYABLE:</span>
                        <span>₹{amountPayable.toFixed(2)}</span>
                    </div>
                )}
            </div>
            <hr className="border-dashed border-gray-300 dark:border-gray-600 my-2" />
          </>
      )}

      <div className="text-center text-[10px] text-gray-500 dark:text-gray-400">
        <p>Thank you for your visit!</p>
        <p>Have a great day!</p>
      </div>
    </div>
  );
};