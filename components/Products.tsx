

import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { XIcon } from './icons/XIcon';
import { SearchIcon } from './icons/SearchIcon';

interface ProductsProps {
    allProducts: Product[];
    onAddProduct: (product: Omit<Product, 'id'>) => Promise<boolean>;
    onUpdateProduct: (product: Product) => Promise<boolean>;
    onDeleteProduct: (productId: string) => Promise<boolean>;
}

const ProductForm: React.FC<{
    product: Product | Omit<Product, 'id'> | null;
    onSave: (product: Product | Omit<Product, 'id'>) => void;
    onCancel: () => void;
    isSaving: boolean;
}> = ({ product, onSave, onCancel, isSaving }) => {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [size, setSize] = useState('');
    const [mrp, setMrp] = useState('');

    useEffect(() => {
        if (product) {
            setName(product.name || '');
            setCode(product.code || '');
            setSize(product.size || '');
            setMrp(String(product.mrp || ''));
        } else {
            setName(''); setCode(''); setSize(''); setMrp('');
        }
    }, [product]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const mrpValue = parseFloat(mrp);
        if (name.trim() && size.trim() && !isNaN(mrpValue) && mrpValue > 0) {
            onSave({
                ...product,
                name: name.trim().toUpperCase(),
                code: code.trim().toUpperCase(),
                size: size.trim().toUpperCase(),
                mrp: mrpValue,
            });
        } else {
            alert('Please fill all fields. MRP must be a positive number.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4 animate-fade-in" onClick={onCancel}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg animate-scale-in" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <header className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{product && 'id' in product ? 'Edit Product' : 'Add New Product'}</h2>
                        <button type="button" onClick={onCancel} className="p-2 rounded-full hover:bg-cream-50 dark:hover:bg-gray-700"><XIcon /></button>
                    </header>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="productName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Product Name</label>
                                <input id="productName" type="text" value={name} onChange={e => setName(e.target.value.toUpperCase())} className="w-full px-3 py-2 bg-cream-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" required autoFocus/>
                            </div>
                            <div>
                                <label htmlFor="productCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Product Code (Optional)</label>
                                <input id="productCode" type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())} className="w-full px-3 py-2 bg-cream-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="productSize" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Size</label>
                                <input id="productSize" type="text" value={size} onChange={e => setSize(e.target.value.toUpperCase())} className="w-full px-3 py-2 bg-cream-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" required />
                            </div>
                            <div>
                                <label htmlFor="productMrp" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">MRP (₹)</label>
                                <input id="productMrp" type="number" value={mrp} onChange={e => setMrp(e.target.value)} className="w-full px-3 py-2 bg-cream-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" required min="0" step="0.01" />
                            </div>
                        </div>
                    </div>
                    <footer className="flex justify-end p-4 border-t border-gray-200 dark:border-gray-700 bg-cream-50 dark:bg-gray-800/50">
                        <button type="submit" disabled={isSaving} className="bg-royal-600 hover:bg-royal-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-royal-300 disabled:cursor-wait">
                            {isSaving ? 'Saving...' : 'Save Product'}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
};

export const Products: React.FC<ProductsProps> = ({ allProducts, onAddProduct, onUpdateProduct, onDeleteProduct }) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleOpenForm = (product: Product | null = null) => {
        setEditingProduct(product);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingProduct(null);
    };

    const handleSaveProduct = async (productData: Product | Omit<Product, 'id'>) => {
        setIsSaving(true);
        let success = false;
        if ('id' in productData) {
            success = await onUpdateProduct(productData as Product);
        } else {
            success = await onAddProduct(productData);
        }
        setIsSaving(false);
        if (success) {
            handleCloseForm();
        }
    };

    const filteredProducts = allProducts.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.size.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">Product Catalog</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your inventory items and their default pricing.</p>
                </div>
                <button
                    onClick={() => handleOpenForm()}
                    className="inline-flex items-center justify-center gap-2 bg-royal-600 hover:bg-royal-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors shadow-sm"
                >
                    <PlusIcon /> Add New Product
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <SearchIcon />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by name, code, or size..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-80 pl-10 pr-3 py-2 bg-cream-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-royal-500 transition"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                        <thead className="bg-cream-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Product Name</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Code</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Size</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">MRP</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredProducts.map(product => (
                                <tr key={product.id} className="hover:bg-cream-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-800 dark:text-gray-200">{product.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400 font-mono">{product.code || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">{product.size}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-gray-800 dark:text-gray-200 font-semibold">₹{product.mrp.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <button onClick={() => handleOpenForm(product)} className="p-2 text-gray-500 hover:text-royal-600 dark:hover:text-royal-400 rounded-full"><PencilIcon /></button>
                                        <button onClick={() => onDeleteProduct(product.id)} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-full"><TrashIcon /></button>
                                    </td>
                                </tr>
                            ))}
                             {filteredProducts.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-10 text-gray-500 dark:text-gray-400">
                                        No products found. {allProducts.length > 0 ? "Try a different search term." : "Click 'Add New Product' to get started."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {isFormOpen && <ProductForm product={editingProduct} onSave={handleSaveProduct} onCancel={handleCloseForm} isSaving={isSaving} />}
        </div>
    );
};