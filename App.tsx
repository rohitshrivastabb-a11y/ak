
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { BillingForm } from './components/BillingForm';
import { BillPreview } from './components/BillPreview';
import { Reports } from './components/Reports';
import { Item, Bill, Brand, TransactionType, CustomerCredits, Purchase, User, Product } from './types';
import { ReceiptIcon } from './components/icons/ReceiptIcon';
import { ChartBarIcon } from './components/icons/ChartBarIcon';
import { Dashboard } from './components/Dashboard';
import { HomeIcon } from './components/icons/HomeIcon';
import { SunIcon } from './components/icons/SunIcon';
import { MoonIcon } from './components/icons/MoonIcon';
import { Purchases } from './components/Purchases';
import { BoxIcon } from './components/icons/BoxIcon';
import { Clock } from './components/Clock';
import { Login } from './components/Login';
import { LogoutIcon } from './components/icons/LogoutIcon';
import { CreateProfile } from './components/CreateProfile';
import { Products } from './components/Products';
import { TemplateIcon } from './components/icons/TemplateIcon';

type AppState = 'loading' | 'create_profile' | 'logged_out' | 'main' | 'error';
const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:5001';

type Page = 'dashboard' | 'billing' | 'reports' | 'purchases' | 'products';

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('authToken');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) { // Token is invalid or expired
        localStorage.removeItem('authToken');
        window.location.reload(); // Force re-login
        throw new Error('Session expired. Please log in again.');
    }
    return response;
};

const Loader: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col justify-center items-center min-h-screen bg-cream-100 dark:bg-gray-900">
    <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-royal-600 dark:border-royal-400"></div>
    <p className="mt-4 text-lg font-semibold text-gray-700 dark:text-gray-300">{message}</p>
  </div>
);

const incrementInvoiceNumber = (invoice: string): string => {
  if (!invoice) return '1';
  const match = invoice.match(/^(.*?)(\d+)$/);
  if (match) {
    const prefix = match[1];
    const numberStr = match[2];
    const nextNumber = parseInt(numberStr, 10) + 1;
    const nextNumberStr = String(nextNumber).padStart(numberStr.length, '0');
    return `${prefix}${nextNumberStr}`;
  }
  return invoice;
};

const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const App: React.FC = () => {
  const defaultAddress = "SQUIREHOOD, MACCHAR CHAURAHA\nSTATION ROAD ORAI - 285001";
  
  // App State
  const [appState, setAppState] = useState<AppState>('loading');
  const [user, setUser] = useState<User | null>(null);
  
  // Data State
  const [allBills, setAllBills] = useState<Bill[]>([]);
  const [allPurchases, setAllPurchases] = useState<Purchase[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [customerCredits, setCustomerCredits] = useState<CustomerCredits>({});
  const [companyName, setCompanyName] = useState<string>(''); 

  // UI/Form State
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Billing Form State
  const [customerName, setCustomerName] = useState<string>('');
  const [mobileNumber, setMobileNumber] = useState<string>('');
  const [address, setAddress] = useState<string>(defaultAddress);
  const [billDate, setBillDate] = useState<string>(getTodayDateString());
  const [showroomBrand, setShowroomBrand] = useState<Brand>(Brand.Squirehood);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card'>('Cash');
  const [items, setItems] = useState<Item[]>([]);
  const [isBillGenerated, setIsBillGenerated] = useState<boolean>(false);
  const [generatedBills, setGeneratedBills] = useState<Bill[] | null>(null);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [transactionType, setTransactionType] = useState<TransactionType>('Sale');
  const [creditToApply, setCreditToApply] = useState<string>('');
  const [finalizeError, setFinalizeError] = useState<string>('');
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);
  const [customBillNumber, setCustomBillNumber] = useState<string>('');
  const [useCustomBillNumber, setUseCustomBillNumber] = useState<boolean>(false);
  const [gstNumber, setGstNumber] = useState<string>('');
  const [lastCustomInvNo, setLastCustomInvNo] = useState<string>('');

  const isInitialLoad = useRef(true);

  const loadAppData = useCallback(async () => {
    try {
        const [billsRes, purchasesRes, creditsRes, productsRes] = await Promise.all([
            fetchWithAuth(`${API_BASE_URL}/api/bills`),
            fetchWithAuth(`${API_BASE_URL}/api/purchases`),
            fetchWithAuth(`${API_BASE_URL}/api/customer-credits`),
            fetchWithAuth(`${API_BASE_URL}/api/products`)
        ]);

        if (!billsRes.ok || !purchasesRes.ok || !creditsRes.ok || !productsRes.ok) {
            throw new Error('Failed to load data from the server.');
        }

        const billsData = await billsRes.json();
        const purchasesData = await purchasesRes.json();
        const creditsData = await creditsRes.json();
        const productsData = await productsRes.json();
        
        setAllBills(billsData);
        setAllPurchases(purchasesData);
        setCustomerCredits(creditsData);
        setAllProducts(productsData);
        setAppState('main');
    } catch (e: any) {
        console.error("Failed to load data from backend", e);
        setFinalizeError(e.message || 'An unexpected error occurred.');
        // Don't set state to 'error' on data load fail, just show error in context
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
    setAppState('logged_out');
  };

  const handleCreateProfile = (name: string) => {
    localStorage.setItem('companyName', name);
    setCompanyName(name);
    setAppState('logged_out');
  };


  useEffect(() => {
    const initializeApp = async () => {
        const savedCompanyName = localStorage.getItem('companyName');
        if (!savedCompanyName) {
            setAppState('create_profile');
            return;
        }
        setCompanyName(savedCompanyName);

        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const token = localStorage.getItem('authToken');

        try {
            if (code) {
                // We have a code from Google, exchange it for a token
                const response = await fetch(`${API_BASE_URL}/api/auth/google/callback`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code }),
                });

                if (!response.ok) throw new Error('Authentication failed.');

                const { token: newToken, user: newUser } = await response.json();
                localStorage.setItem('authToken', newToken);
                setUser(newUser);
                
                // Clean the URL
                window.history.replaceState({}, document.title, "/");
                
                await loadAppData();

            } else if (token) {
                // We have a token, let's verify it
                const response = await fetchWithAuth(`${API_BASE_URL}/api/auth/me`);
                if (!response.ok) throw new Error('Session validation failed.');

                const currentUser = await response.json();
                setUser(currentUser);
                await loadAppData();
            
            } else {
                setAppState('logged_out');
            }
        } catch (error) {
            console.error('Authentication process failed:', error);
            localStorage.removeItem('authToken');
            setAppState('logged_out');
        }
    };
    initializeApp();
  }, [loadAppData]);


  useEffect(() => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'dark') setTheme('dark');
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);
  
  const derivedItemCatalog = useMemo(() => {
    const seen = new Set<string>();
    const catalog: { name: string, code: string, mrp: number }[] = [];

    allProducts.forEach(product => {
      const normalizedName = product.name.trim().toUpperCase();
      if (normalizedName && !seen.has(normalizedName)) {
        seen.add(normalizedName);
        catalog.push({ name: product.name, code: product.code, mrp: product.mrp });
      }
    });

    return catalog.sort((a, b) => a.name.localeCompare(b.name));
  }, [allProducts]);

  // --- Handlers ---
  const handleThemeToggle = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleAddItem = useCallback((item: Omit<Item, 'id'>) => {
    setItems(prev => [...prev, { ...item, id: String(Date.now() + Math.random()) }]);
  }, []);

  const handleRemoveItem = useCallback((id: string) => {
    if (editingItemId === id) setEditingItemId(null);
    setItems(prev => prev.filter(item => item.id !== id));
  }, [editingItemId]);

  const handleUpdateItem = useCallback((id: string, updatedData: Omit<Item, 'id' | 'netValue'>) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, ...updatedData };
        const discountAmount = updatedItem.mrp * (updatedItem.discountPercentage / 100);
        updatedItem.netValue = updatedItem.mrp - discountAmount;
        return updatedItem;
      }
      return item;
    }));
    setEditingItemId(null);
  }, []);

  const handleNewBill = useCallback(() => {
    setCustomerName(''); setMobileNumber(''); setShowroomBrand(Brand.Squirehood);
    setPaymentMethod('Cash'); setItems([]); setIsBillGenerated(false);
    setGeneratedBills(null); setEditingBillId(null); setEditingItemId(null);
    setAddress(defaultAddress); setBillDate(getTodayDateString());
    setTransactionType('Sale'); setCreditToApply(''); setFinalizeError('');

    if (lastCustomInvNo) {
        setCustomBillNumber(incrementInvoiceNumber(lastCustomInvNo));
        setUseCustomBillNumber(true);
    } else {
        setCustomBillNumber('');
        setUseCustomBillNumber(false);
    }
  }, [lastCustomInvNo]);

  const handleAddPurchase = async (purchase: Omit<Purchase, 'id'>) => {
    const newPurchaseData = { ...purchase, id: String(Date.now()) };
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/purchases`, {
        method: 'POST',
        body: JSON.stringify(newPurchaseData),
      });
      if (!response.ok) throw new Error('Failed to save purchase.');
      const savedPurchase = await response.json();
      setAllPurchases(prev => [savedPurchase, ...prev]);
      alert('Purchase recorded successfully!');
    } catch (error) {
        console.error(error);
        alert('Error: Could not record purchase.');
    }
  };
  
  const handleAddProduct = async (product: Omit<Product, 'id'>): Promise<boolean> => {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/products`, {
            method: 'POST',
            body: JSON.stringify(product),
        });
        if (!response.ok) throw new Error('Failed to save product.');
        const savedProduct = await response.json();
        setAllProducts(prev => [savedProduct, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
        return true;
    } catch (error) {
        console.error(error);
        alert('Error: Could not add product.');
        return false;
    }
  };

  const handleUpdateProduct = async (product: Product): Promise<boolean> => {
      try {
          const response = await fetchWithAuth(`${API_BASE_URL}/api/products/${product.id}`, {
              method: 'PUT',
              body: JSON.stringify(product),
          });
          if (!response.ok) throw new Error('Failed to update product.');
          const updatedProduct = await response.json();
          setAllProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p).sort((a, b) => a.name.localeCompare(b.name)));
          return true;
      } catch (error) {
          console.error(error);
          alert('Error: Could not update product.');
          return false;
      }
  };

  const handleDeleteProduct = async (productId: string): Promise<boolean> => {
      if (!window.confirm("Are you sure you want to delete this product from the catalog?")) return false;
      try {
          const response = await fetchWithAuth(`${API_BASE_URL}/api/products/${productId}`, {
              method: 'DELETE',
          });
          if (!response.ok) throw new Error('Failed to delete product.');
          setAllProducts(prev => prev.filter(p => p.id !== productId));
          return true;
      } catch (error) {
          console.error(error);
          alert('Error: Could not delete product.');
          return false;
      }
  };

  const processAndFinalizeBill = async (isUpdate: boolean) => {
    setFinalizeError('');
    setIsFinalizing(true);
    if (!customerName.trim() || !mobileNumber.trim() || items.length === 0) {
      setFinalizeError("Customer Name, Mobile Number, and at least one item are required.");
      setIsFinalizing(false);
      return;
    }

    setEditingItemId(null);
    const billTotal = items.reduce((sum, item) => sum + item.netValue * item.quantity, 0);
    const creditToApplyNum = parseFloat(creditToApply) || 0;
    
    let newCredits = { ...customerCredits };
    const currentCredit = newCredits[mobileNumber] || 0;
    let finalPayable = billTotal - creditToApplyNum;
    let creditGenerated = finalPayable < 0 ? -finalPayable : 0;
    const newCreditValue = (currentCredit - creditToApplyNum) + creditGenerated;
    newCredits[mobileNumber] = newCreditValue;

    const billId = isUpdate && editingBillId ? editingBillId : String(Date.now());
    const billData: Bill = {
      id: billId,
      customerName, mobileNumber, items, date: new Date(billDate).getTime(), showroomBrand,
      paymentMethod: finalPayable > 0 ? paymentMethod : 'Cash', address, gstNumber,
      transactionType, originalBillId: transactionType !== 'Sale' ? items.find(i => i.quantity < 0)?.id : undefined,
      creditApplied: creditToApplyNum, creditGenerated, customInvoiceNumber: useCustomBillNumber ? customBillNumber.trim() : undefined,
    };
    
    try {
        const url = isUpdate ? `${API_BASE_URL}/api/bills/${billId}` : `${API_BASE_URL}/api/bills`;
        const method = isUpdate ? 'PUT' : 'POST';

        const billResponse = await fetchWithAuth(url, {
            method,
            body: JSON.stringify(billData),
        });
        if (!billResponse.ok) throw new Error('Failed to save bill.');

        const creditsResponse = await fetchWithAuth(`${API_BASE_URL}/api/customer-credits/sync`, {
            method: 'POST',
            body: JSON.stringify(newCredits),
        });
        if (!creditsResponse.ok) throw new Error('Failed to sync customer credits.');


      if (isUpdate && editingBillId) {
          setAllBills(prev => prev.map(b => b.id === editingBillId ? billData : b));
      } else {
          setAllBills(prev => [billData, ...prev]);
      }
      
      setGeneratedBills([billData]);
      setCustomerCredits(newCredits);
      if (useCustomBillNumber && customBillNumber.trim()) {
          setLastCustomInvNo(customBillNumber.trim());
      }
      setIsBillGenerated(true); setEditingBillId(null); setCreditToApply('');
    } catch (error) {
        console.error(error);
        setFinalizeError("Error: Could not save the transaction to the server.");
    } finally {
        setIsFinalizing(false);
    }
  };

  const handleGenerateBill = () => processAndFinalizeBill(false);
  const handleUpdateBill = () => processAndFinalizeBill(true);
  
  const handleStartEdit = (billId: string) => {
    const billToEdit = allBills.find(b => b.id === billId);
    if (billToEdit) {
      setCustomerName(billToEdit.customerName); setMobileNumber(billToEdit.mobileNumber);
      setShowroomBrand(billToEdit.showroomBrand); setPaymentMethod(billToEdit.paymentMethod);
      setItems(billToEdit.items); setAddress(billToEdit.address || defaultAddress);
      setGstNumber(billToEdit.gstNumber || '');
      setBillDate(new Date(billToEdit.date).toISOString().split('T')[0]);
      setEditingBillId(billId); setTransactionType(billToEdit.transactionType);
      setCreditToApply(String(billToEdit.creditApplied));
      setCustomBillNumber(billToEdit.customInvoiceNumber || '');
      setUseCustomBillNumber(!!billToEdit.customInvoiceNumber);
      setCurrentPage('billing'); setIsBillGenerated(false); setGeneratedBills(null);
      setEditingItemId(null); setFinalizeError('');
    }
  };

  const handleDeleteBill = async (billId: string) => {
    const billToDelete = allBills.find(b => b.id === billId);
    if (!billToDelete) return;

    if (window.confirm(`Are you sure you want to permanently delete Bill #${billToDelete.customInvoiceNumber || billId}?`)) {
      try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/bills/${billId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete bill.');

        let newCredits = { ...customerCredits };
        if (billToDelete.creditApplied > 0 || billToDelete.creditGenerated > 0) {
          const mobile = billToDelete.mobileNumber;
          const currentCredit = newCredits[mobile] || 0;
          const updatedCredit = (currentCredit + billToDelete.creditApplied) - billToDelete.creditGenerated;
          newCredits[mobile] = updatedCredit;
          if (updatedCredit < 0.001) delete newCredits[mobile];

          const creditsResponse = await fetchWithAuth(`${API_BASE_URL}/api/customer-credits/sync`, {
            method: 'POST',
            body: JSON.stringify(newCredits),
          });
          if (!creditsResponse.ok) throw new Error('Failed to sync customer credits after deletion.');
        }
        
        setAllBills(prev => prev.filter(b => b.id !== billId));
        setCustomerCredits(newCredits);

      } catch (error) {
          console.error(error);
          alert("Error: Could not delete bill.");
      }
    }
  };
  
  const handleImportData = (data: {bills: Bill[], credits: CustomerCredits, purchases: Purchase[]}) => {
    if (window.confirm("This will overwrite all current data. Are you sure?")) {
        setAllBills(data.bills || []);
        setCustomerCredits(data.credits || {});
        setAllPurchases(data.purchases || []);
        alert("Data imported locally. A full sync feature to the backend is required for persistence.");
    }
  };

  const navigateTo = (page: Page) => {
    if (currentPage === page) return;
    setCurrentPage(page);
  };
  
  const NavLink: React.FC<{ page: Page, children: React.ReactNode }> = ({ page, children }) => (
     <button onClick={() => navigateTo(page)} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${currentPage === page ? 'text-royal-700 dark:text-royal-400 font-semibold' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}>
       {children}
     </button>
  );

  // --- Render Logic ---
  const renderContent = () => {
    switch(appState) {
        case 'loading':
            return <Loader message="Initializing..." />;
        case 'create_profile':
            return <CreateProfile onCreateProfile={handleCreateProfile} />;
        case 'logged_out':
            return <Login apiBaseUrl={API_BASE_URL} />;
        case 'error':
             return (
              <div className="flex flex-col justify-center items-center min-h-screen bg-cream-100 dark:bg-gray-900 p-4">
                  <div className="w-full max-w-lg p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg text-center">
                    <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">An Error Occurred</h2>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">Something went wrong. Please try refreshing the page.</p>
                    <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 font-mono">{finalizeError}</p>
                  </div>
              </div>
            );
        case 'main':
             return (
                <div className="min-h-screen font-sans pb-24 md:pb-0 text-gray-800 dark:text-gray-200">
                <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-6">
                        <h1 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">{companyName}</h1>
                        <nav className="hidden md:flex items-center space-x-2">
                            <NavLink page="dashboard"><HomeIcon /><span>Dashboard</span></NavLink>
                            <NavLink page="billing"><ReceiptIcon /><span>Billing</span></NavLink>
                            <NavLink page="products"><TemplateIcon /><span>Products</span></NavLink>
                            <NavLink page="purchases"><BoxIcon /><span>Purchases</span></NavLink>
                            <NavLink page="reports"><ChartBarIcon /><span>Reports</span></NavLink>
                        </nav>
                        </div>
                        <div className="flex items-center space-x-3">
                            {user && (
                               <div className="flex items-center space-x-3">
                                  <img src={user.profilePicture} alt={user.name} className="h-8 w-8 rounded-full" />
                                  <span className="hidden sm:inline text-sm font-medium text-gray-700 dark:text-gray-300">{user.name}</span>
                                  <button onClick={handleLogout} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-cream-50 dark:hover:bg-gray-700" aria-label="Logout">
                                      <LogoutIcon />
                                  </button>
                               </div>
                            )}
                            <button onClick={handleThemeToggle} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-cream-50 dark:hover:bg-gray-700" aria-label="Toggle theme">
                                {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                            </button>
                        </div>
                    </div>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up" key={currentPage}>
                    {currentPage === 'dashboard' && <Dashboard onNavigate={navigateTo} companyName={companyName || ''} />}
                    {currentPage === 'billing' && (
                    isBillGenerated && generatedBills ? (
                        <div className="text-center space-y-6 animate-fade-in">
                            <div className="max-w-md mx-auto bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4 rounded-md print-hidden">
                                <h2 className="text-xl font-bold text-green-800 dark:text-green-300">Transaction Finalized Successfully!</h2>
                            </div>
                            <div className="max-w-sm mx-auto" id="bill-to-print">
                                <BillPreview bill={generatedBills[0]}/>
                            </div>
                            <div className="flex flex-wrap justify-center gap-4 print-hidden">
                                <button onClick={handleNewBill} className="bg-royal-600 hover:bg-royal-700 text-white font-bold py-3 px-6 rounded-lg">Create New Bill</button>
                                <button onClick={() => window.print()} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg">Print Bill</button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-5">
                            <BillingForm
                            customerName={customerName} setCustomerName={setCustomerName} mobileNumber={mobileNumber} setMobileNumber={setMobileNumber}
                            onAddItem={handleAddItem} showroomBrand={showroomBrand} setShowroomBrand={setShowroomBrand} paymentMethod={paymentMethod}
                            setPaymentMethod={setPaymentMethod} address={address} setAddress={setAddress} gstNumber={gstNumber} setGstNumber={setGstNumber}
                            billDate={billDate} setBillDate={setBillDate} isEditing={!!editingBillId} transactionType={transactionType}
                            setTransactionType={setTransactionType} setItems={setItems} allBills={allBills} customerCredits={customerCredits}
                            creditToApply={creditToApply} setCreditToApply={setCreditToApply} items={items} onNewBill={handleNewBill}
                            customBillNumber={customBillNumber} setCustomBillNumber={setCustomBillNumber} useCustomBillNumber={useCustomBillNumber}
                            setUseCustomBillNumber={setUseCustomBillNumber}
                            productCatalog={allProducts}
                            />
                        </div>
                        <div className="lg:col-span-7">
                            <BillPreview
                                bill={{ customerName, mobileNumber, items, showroomBrand, paymentMethod, address, gstNumber,
                                    date: new Date(billDate).getTime(), id: editingBillId ?? 'preview-id', transactionType: transactionType,
                                    creditApplied: parseFloat(creditToApply) || 0, creditGenerated: 0, customInvoiceNumber: useCustomBillNumber ? customBillNumber.trim() : undefined,
                                }}
                                onRemoveItem={handleRemoveItem} editingItemId={editingItemId} setEditingItemId={setEditingItemId} onUpdateItem={handleUpdateItem}
                            />
                            {finalizeError && <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-center">{finalizeError}</div>}
                            {items.length > 0 && !editingItemId && (
                                <button 
                                    onClick={editingBillId ? handleUpdateBill : handleGenerateBill}
                                    disabled={isFinalizing}
                                    className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white font-bold py-3 text-lg rounded-lg transition-opacity disabled:opacity-75 disabled:cursor-wait">
                                    {isFinalizing ? 'Saving...' : (editingBillId ? 'Update Transaction' : 'Generate & Finalize Transaction')}
                                </button>
                            )}
                        </div>
                        </div>
                    )
                    )}
                    {currentPage === 'products' && <Products allProducts={allProducts} onAddProduct={handleAddProduct} onUpdateProduct={handleUpdateProduct} onDeleteProduct={handleDeleteProduct} />}
                    {currentPage === 'purchases' && <Purchases allPurchases={allPurchases} onAddPurchase={handleAddPurchase} />}
                    {currentPage === 'reports' && <Reports bills={allBills} customerCredits={customerCredits} allPurchases={allPurchases} onImportData={handleImportData} onEditBill={handleStartEdit} onDeleteBill={handleDeleteBill} />}
                </main>

                <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t grid grid-cols-5 md:hidden z-50">
                    <button onClick={() => navigateTo('dashboard')} className={`flex flex-col items-center p-3 w-full ${currentPage === 'dashboard' ? 'text-royal-600 bg-royal-50' : 'text-gray-500'}`}><HomeIcon /><span className="text-xs mt-1">Dashboard</span></button>
                    <button onClick={() => navigateTo('billing')} className={`flex flex-col items-center p-3 w-full ${currentPage === 'billing' ? 'text-royal-600 bg-royal-50' : 'text-gray-500'}`}><ReceiptIcon /><span className="text-xs mt-1">Billing</span></button>
                    <button onClick={() => navigateTo('products')} className={`flex flex-col items-center p-3 w-full ${currentPage === 'products' ? 'text-royal-600 bg-royal-50' : 'text-gray-500'}`}><TemplateIcon /><span className="text-xs mt-1">Products</span></button>
                    <button onClick={() => navigateTo('purchases')} className={`flex flex-col items-center p-3 w-full ${currentPage === 'purchases' ? 'text-royal-600 bg-royal-50' : 'text-gray-500'}`}><BoxIcon /><span className="text-xs mt-1">Purchases</span></button>
                    <button onClick={() => navigateTo('reports')} className={`flex flex-col items-center p-3 w-full ${currentPage === 'reports' ? 'text-royal-600 bg-royal-50' : 'text-gray-500'}`}><ChartBarIcon /><span className="text-xs mt-1">Reports</span></button>
                </div>
                <Clock />
                </div>
            );
        default:
             return <Loader message="Initializing..." />;
    }
  };

  return <>{renderContent()}</>;
};

export default App;