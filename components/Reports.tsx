import React, { useState, useMemo } from 'react';
import { Bill, CustomerCredits, Purchase, Item, PurchasedItem } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';
import { UploadIcon } from './icons/UploadIcon';
import { GoogleGenAI } from "@google/genai";
import { PencilIcon } from './icons/PencilIcon';
import { SearchIcon } from './icons/SearchIcon';
import { TrashIcon } from './icons/TrashIcon';

interface ItemWiseReportRow {
  date: string;
  billNo: string;
  customer: string;
  itemDetails: string;
  qty: number;
  mrp: number;
  discPerc: number;
  netValue: number;
  preGst: number;
  cgstPerc: number;
  cgstAmount: number;
  sgstPerc: number;
  sgstAmount: number;
  billRef: Bill;
}

interface ItemWiseReportTotals {
  qty: number;
  mrp: number;
  netValue: number;
  preGst: number;
  cgstAmount: number;
  sgstAmount: number;
}

interface BillWiseReportRow {
    date: string;
    billNo: string;
    customer: string;
    cardPayment: number;
    cashPayment: number;
    totalAmount: number;
    billRef: Bill;
}

interface BillWiseReportTotals {
    cardPayment: number;
    cashPayment: number;
    totalAmount: number;
    totalBills: number;
}

interface ClosingStockItem {
    purchaseDate: string;
    supplier: string;
    itemName: string;
    itemCode: string;
    size: string;
    quantity: number;
    mrp: number | 'N/A';
    totalValue: number;
}


const SparklesIcon: React.FC = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className="h-5 w-5" 
    viewBox="0 0 20 20" 
    fill="currentColor">
    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1h1a1 1 0 010 2h-1v1a1 1 0 01-2 0V6H8a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 010 2h-1v1a1 1 0 01-2 0v-1H8a1 1 0 010-2h1v-1a1 1 0 011-1zM4 9a1 1 0 011 1v1h1a1 1 0 010 2H5v1a1 1 0 01-2 0v-1H3a1 1 0 010-2h1v-1a1 1 0 011-1zm10 0a1 1 0 011 1v1h1a1 1 0 010 2h-1v1a1 1 0 01-2 0v-1h-1a1 1 0 010-2h1v-1a1 1 0 011-1z" clipRule="evenodd" />
  </svg>
);

const Highlight: React.FC<{ text: string | number; highlight: string }> = ({ text, highlight }) => {
  const textStr = String(text);
  if (!highlight.trim() || !textStr) {
    return <span>{textStr}</span>;
  }
  const parts = textStr.split(new RegExp(`(${highlight})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-500/50 rounded-sm text-gray-800 dark:text-gray-100 px-0.5 py-px">{part}</mark>
        ) : (
          part
        )
      )}
    </span>
  );
};

interface ReportsProps {
  bills: Bill[];
  allPurchases: Purchase[];
  customerCredits: CustomerCredits;
  onImportData: (data: {bills: Bill[], credits: CustomerCredits, purchases: Purchase[]}) => void;
  onEditBill: (billId: string) => void;
  onDeleteBill: (billId: string) => void;
}

const arrayToCSV = (data: Record<string, any>[]): string => {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
        const values = headers.map(header => {
            const val = row[header];
            const escaped = (val === null || val === undefined) ? '' : ('' + val).replace(/"/g, '""');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }
    return csvRows.join('\n');
};

const downloadCSV = (csvString: string, filename: string) => {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

export const Reports: React.FC<ReportsProps> = ({ bills, allPurchases, customerCredits, onImportData, onEditBill, onDeleteBill }) => {
  const getTodayDateString = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [startDate, setStartDate] = useState<string>(getTodayDateString());
  const [endDate, setEndDate] = useState<string>(getTodayDateString());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [analysis, setAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string>('');
  const [reportView, setReportView] = useState<'itemWise' | 'billWise' | 'dayWise' | 'customerCredits' | 'closingStock'>('itemWise');
  const [summaryGrouping, setSummaryGrouping] = useState<'day' | 'week' | 'month'>('day');


  const dateFilteredBills = useMemo(() => {
    if (!startDate && !endDate) return bills;
    const start = startDate ? new Date(`${startDate}T00:00:00`).getTime() : 0;
    const end = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : Date.now();
    return bills.filter(bill => bill.date >= start && bill.date <= end);
  }, [bills, startDate, endDate]);

  const itemWiseReportData = useMemo((): ItemWiseReportRow[] => {
    const flatData: ItemWiseReportRow[] = dateFilteredBills.flatMap(bill =>
        bill.items.map((item: Item): ItemWiseReportRow => {
            const netValue: number = item.netValue * item.quantity;
            const mrpTotal: number = item.mrp * item.quantity;
            const preGst: number = netValue / 1.05;
            const gst: number = netValue - preGst;
            const cgst: number = gst / 2;
            const sgst: number = gst / 2;

            return {
                date: new Date(bill.date).toLocaleDateString(),
                billNo: bill.customInvoiceNumber || bill.id,
                customer: `${bill.customerName} (${bill.mobileNumber})`,
                itemDetails: `${item.name} (${item.code || 'N/A'} / ${item.size})`,
                qty: item.quantity,
                mrp: mrpTotal,
                discPerc: item.discountPercentage,
                netValue: netValue,
                preGst: preGst,
                cgstPerc: 2.5, 
                cgstAmount: cgst,
                sgstPerc: 2.5,
                sgstAmount: sgst,
                billRef: bill,
            };
        })
    );
    
    if (!searchQuery.trim()) {
        return flatData.sort((a, b) => a.billNo.localeCompare(b.billNo));
    }
    
    const lowercasedQuery = searchQuery.toLowerCase();
    return flatData.filter(row => 
        String(row.billNo).toLowerCase().includes(lowercasedQuery) ||
        row.customer.toLowerCase().includes(lowercasedQuery) ||
        row.itemDetails.toLowerCase().includes(lowercasedQuery)
    ).sort((a, b) => a.billNo.localeCompare(b.billNo));

  }, [dateFilteredBills, searchQuery]);

  const itemWiseReportTotals = useMemo((): ItemWiseReportTotals | null => {
      if (reportView !== 'itemWise') return null;
      return itemWiseReportData.reduce((acc: ItemWiseReportTotals, row: ItemWiseReportRow): ItemWiseReportTotals => {
          acc.qty += row.qty;
          acc.mrp += row.mrp;
          acc.netValue += row.netValue;
          acc.preGst += row.preGst;
          acc.cgstAmount += row.cgstAmount;
          acc.sgstAmount += row.sgstAmount;
          return acc;
      }, { qty: 0, mrp: 0, netValue: 0, preGst: 0, cgstAmount: 0, sgstAmount: 0 });
  }, [itemWiseReportData, reportView]);
  
  const billWiseReportData = useMemo((): BillWiseReportRow[] => {
      const billData = dateFilteredBills.map((bill: Bill): BillWiseReportRow => {
        const grandTotal = bill.items.reduce((sum: number, item: Item) => sum + (item.netValue * item.quantity), 0);
        const finalPayable = grandTotal - bill.creditApplied;
        const amountPayable = finalPayable > 0 ? finalPayable : 0;
        
        return {
          date: new Date(bill.date).toLocaleDateString(),
          billNo: bill.customInvoiceNumber || bill.id,
          customer: `${bill.customerName} (${bill.mobileNumber})`,
          cardPayment: bill.paymentMethod === 'Card' ? amountPayable : 0,
          cashPayment: bill.paymentMethod === 'Cash' ? amountPayable : 0,
          totalAmount: grandTotal,
          billRef: bill,
        };
      });

      if (!searchQuery.trim()) {
        return billData.sort((a, b) => a.billNo.localeCompare(b.billNo));
      }
      
      const lowercasedQuery = searchQuery.toLowerCase();
      return billData.filter(row => 
        String(row.billNo).toLowerCase().includes(lowercasedQuery) ||
        row.customer.toLowerCase().includes(lowercasedQuery)
      ).sort((a, b) => a.billNo.localeCompare(b.billNo));
  }, [dateFilteredBills, searchQuery]);

  const billWiseReportTotals = useMemo((): BillWiseReportTotals | null => {
    if (reportView !== 'billWise') return null;

    const paymentTotals = billWiseReportData.reduce((acc: Omit<BillWiseReportTotals, 'totalBills'>, row: BillWiseReportRow): Omit<BillWiseReportTotals, 'totalBills'> => {
        acc.cardPayment += row.cardPayment;
        acc.cashPayment += row.cashPayment;
        acc.totalAmount += row.totalAmount;
        return acc;
    }, { cardPayment: 0, cashPayment: 0, totalAmount: 0 });

    return {
        ...paymentTotals,
        totalBills: billWiseReportData.length,
    }
  }, [billWiseReportData, reportView]);

    const customerCreditsReportData = useMemo(() => {
    const creditData = Object.entries(customerCredits)
      .map(([mobileNumber, credit]) => {
        const customerBill = bills.find(b => b.mobileNumber === mobileNumber);
        const customerName = customerBill ? customerBill.customerName : 'N/A';
        
        const lastTransaction = bills
            .filter(b => b.mobileNumber === mobileNumber && (b.creditApplied > 0 || b.creditGenerated > 0))
            .sort((a, b) => Number(b.date) - Number(a.date))[0];

        return {
          customerName,
          mobileNumber,
          credit,
          lastTransactionBillNo: lastTransaction ? (lastTransaction.customInvoiceNumber || lastTransaction.id) : 'N/A'
        };
      });

    if (!searchQuery.trim()) {
      return creditData.sort((a, b) => Number(b.credit) - Number(a.credit));
    }
    
    const lowercasedQuery = searchQuery.toLowerCase();
    return creditData.filter(row => 
      row.customerName.toLowerCase().includes(lowercasedQuery) ||
      row.mobileNumber.toLowerCase().includes(lowercasedQuery) ||
      String(row.lastTransactionBillNo).toLowerCase().includes(lowercasedQuery)
    ).sort((a, b) => Number(b.credit) - Number(a.credit));
  }, [customerCredits, bills, searchQuery]);

  const dayWiseSummaryData = useMemo(() => {
    const getStartOfWeek = (d: Date) => {
        const date = new Date(d);
        const day = date.getDay();
        const diff = date.getDate() - day;
        const startOfWeek = new Date(date.setDate(diff));
        startOfWeek.setHours(0, 0, 0, 0);
        return startOfWeek;
    };

    const getStartOfMonth = (d: Date) => {
        const date = new Date(d);
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);
        return startOfMonth;
    };

    const salesByPeriod: Record<string, { total: number; count: number; startDate: Date; }> = {};
    
    dateFilteredBills.forEach(bill => {
        const billDate = new Date(bill.date);
        let periodStartDate: Date;

        if (summaryGrouping === 'week') {
            periodStartDate = getStartOfWeek(billDate);
        } else if (summaryGrouping === 'month') {
            periodStartDate = getStartOfMonth(billDate);
        } else {
            periodStartDate = new Date(billDate);
            periodStartDate.setHours(0, 0, 0, 0);
        }

        const key = periodStartDate.toISOString();
        if (!salesByPeriod[key]) {
            salesByPeriod[key] = { total: 0, count: 0, startDate: periodStartDate };
        }
        const billTotal = bill.items.reduce((sum: number, item: Item) => sum + item.netValue * item.quantity, 0);
        salesByPeriod[key].total += billTotal;
        salesByPeriod[key].count += 1;
    });

    return Object.values(salesByPeriod).map(({ total, count, startDate }) => {
        let endDate: Date;
        if (summaryGrouping === 'week') {
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
        } else if (summaryGrouping === 'month') {
            endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
        } else {
            endDate = startDate;
        }
        return {
            startDate,
            endDate,
            total,
            count
        };
    }).sort((a,b) => b.startDate.getTime() - a.startDate.getTime());
  }, [dateFilteredBills, summaryGrouping]);

  const closingStockReportData = useMemo((): ClosingStockItem[] => {
    interface StockItem {
      name: string;
      code: string;
      size: string;
      quantity: number;
      value: number;
      lastPurchaseDate: number;
      supplier?: string;
    }

    const stockMap: Record<string, StockItem> = {};

    allPurchases.forEach(purchase => {
        purchase.items.forEach((item: PurchasedItem) => {
            const key = `${item.code}-${item.size}`;
            if (stockMap[key]) {
                const stockItem = stockMap[key];
                stockItem.quantity += item.quantity;
                if (purchase.date > stockItem.lastPurchaseDate) {
                    stockItem.lastPurchaseDate = purchase.date;
                    stockItem.supplier = purchase.supplier;
                }
            } else {
                stockMap[key] = {
                    name: item.name,
                    code: item.code,
                    size: item.size,
                    quantity: item.quantity,
                    value: item.value,
                    lastPurchaseDate: purchase.date,
                    supplier: purchase.supplier,
                };
            }
        });
    });

    const mrpLookup: Record<string, number> = {};
    bills.forEach(bill => {
        bill.items.forEach((item: Item) => {
            const key = `${item.code}-${item.size}`;
            const stockItem = stockMap[key];
            if (stockItem) {
                stockItem.quantity -= item.quantity;
            }
            mrpLookup[item.code] = item.mrp;
        });
    });

    const stockData = Object.values(stockMap)
      .filter(item => item.quantity > 0)
      .map((item: StockItem): ClosingStockItem => ({
          purchaseDate: new Date(item.lastPurchaseDate).toLocaleDateString(),
          supplier: item.supplier || 'N/A',
          itemName: item.name,
          itemCode: item.code,
          size: item.size,
          quantity: item.quantity,
          mrp: mrpLookup[item.code] || 'N/A',
          totalValue: item.quantity * item.value,
      }));

     if (!searchQuery.trim()) {
        return stockData;
    }
    
    const lowercasedQuery = searchQuery.toLowerCase();
    return stockData.filter(row => 
        String(row.supplier).toLowerCase().includes(lowercasedQuery) ||
        row.itemName.toLowerCase().includes(lowercasedQuery) ||
        row.itemCode.toLowerCase().includes(lowercasedQuery) ||
        row.size.toLowerCase().includes(lowercasedQuery) ||
        String(row.mrp).toLowerCase().includes(lowercasedQuery)
    );
  }, [allPurchases, bills, searchQuery]);

  const closingStockTotals = useMemo(() => {
    return closingStockReportData.reduce((acc, item) => {
        acc.totalValue += Number(item.totalValue) || 0;
        acc.totalQuantity += item.quantity;
        return acc;
    }, { totalValue: 0, totalQuantity: 0 });
  }, [closingStockReportData]);


  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysis('');
    setAnalysisError('');

    const reportDataForAI = itemWiseReportData.map(row => ({
      date: row.date,
      item: row.itemDetails,
      quantity: row.qty,
      net_value: row.netValue
    }));

    if (reportDataForAI.length < 5) {
        setAnalysisError("Not enough data to perform a meaningful analysis. Please select a larger date range or generate more sales.");
        setIsAnalyzing(false);
        return;
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Analyze the following sales data from a clothing store. Provide a brief summary of key trends, top-selling items, and actionable insights. Format the response as simple HTML with paragraphs, bold tags for emphasis, and unordered lists. Do not include any markdown like '#' or '*'. Data: ${JSON.stringify(reportDataForAI)}`
        });

        setAnalysis(response.text);
    } catch (error) {
        console.error("AI analysis failed:", error);
        setAnalysisError("Failed to analyze data. The AI model may be temporarily unavailable.");
    } finally {
        setIsAnalyzing(false);
    }
  };
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target?.result;
            if (typeof text !== 'string') {
                throw new Error("File content is not readable text.");
            }
            const data = JSON.parse(text);
            
            if (data && Array.isArray(data.bills) && typeof data.credits === 'object' && data.credits !== null && Array.isArray(data.purchases)) {
                onImportData(data);
            } else {
                alert('Import failed: Invalid file format. The file must contain "bills", "credits", and "purchases" properties.');
            }
        } catch (error) {
            console.error("Failed to parse imported file:", error);
            alert("Import failed: The selected file is not a valid JSON backup file.");
        }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleDownloadBackup = () => {
    const backupData = {
      bills,
      credits: customerCredits,
      purchases: allPurchases
    };
    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `showroom_backup_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const handleDownloadCSV = () => {
    const dateSuffix = `${startDate || 'start'}_to_${endDate || 'today'}`;
    
    if (reportView === 'itemWise') {
        if (itemWiseReportData.length === 0) { alert("No data to download."); return; }
        const csvData = itemWiseReportData.map(row => ({
            'Date': row.date, 'Bill No.': String(row.billNo), 'Customer': row.customer, 'Item Details': row.itemDetails,
            'Qty': row.qty, 'MRP': row.mrp.toFixed(2), 'Disc %': row.discPerc.toFixed(2), 'Net Value': row.netValue.toFixed(2),
            'Pre-GST': row.preGst.toFixed(2), 'CGST %': row.cgstPerc.toFixed(1) + '%', 
            'CGST Amount': row.cgstAmount.toFixed(2), 'SGST %': row.sgstPerc.toFixed(1) + '%',
            'SGST Amount': row.sgstAmount.toFixed(2),
        }));
        if(itemWiseReportTotals) {
          csvData.push({
              'Date': 'GRAND TOTAL', 'Bill No.': '', 'Customer': '', 'Item Details': '', 'Qty': itemWiseReportTotals.qty,
              'MRP': itemWiseReportTotals.mrp.toFixed(2), 'Disc %': '', 'Net Value': itemWiseReportTotals.netValue.toFixed(2),
              'Pre-GST': itemWiseReportTotals.preGst.toFixed(2), 'CGST %': '', 'CGST Amount': itemWiseReportTotals.cgstAmount.toFixed(2),
              'SGST %': '',
              'SGST Amount': itemWiseReportTotals.sgstAmount.toFixed(2),
          });
        }
        downloadCSV(arrayToCSV(csvData), `item_wise_report_${dateSuffix}.csv`);
    } else if (reportView === 'billWise') {
        if (billWiseReportData.length === 0) { alert("No data to download."); return; }
        const csvData = billWiseReportData.map(row => ({
            'Date': row.date,
            'Bill No.': String(row.billNo),
            'Customer': row.customer,
            'Card Payment': row.cardPayment.toFixed(2),
            'Cash Payment': row.cashPayment.toFixed(2),
            'Total Amount': row.totalAmount.toFixed(2),
        }));
         if(billWiseReportTotals) {
          csvData.push({
            'Date': 'GRAND TOTAL',
            'Bill No.': `${billWiseReportTotals.totalBills} Bills`,
            'Customer': '',
            'Card Payment': billWiseReportTotals.cardPayment.toFixed(2),
            'Cash Payment': billWiseReportTotals.cashPayment.toFixed(2),
            'Total Amount': billWiseReportTotals.totalAmount.toFixed(2),
          });
        }
        downloadCSV(arrayToCSV(csvData), `bill_wise_report_${dateSuffix}.csv`);
    } else if (reportView === 'dayWise') {
        if (dayWiseSummaryData.length === 0) { alert("No data to download."); return; }
        const csvData = dayWiseSummaryData.map(row => {
            const common = { 'Bills': row.count, 'Total Sales': row.total.toFixed(2) };
            if (summaryGrouping === 'day') {
                return { 'Date': row.startDate.toLocaleDateString(), ...common };
            }
            return { 'Start Date': row.startDate.toLocaleDateString(), 'End Date': row.endDate.toLocaleDateString(), ...common };
        });
        downloadCSV(arrayToCSV(csvData), `day_wise_summary_${dateSuffix}.csv`);
    } else if (reportView === 'customerCredits') {
        if (customerCreditsReportData.length === 0) { alert("No data to download."); return; }
        const csvData = customerCreditsReportData.map(row => ({
            'Customer Name': row.customerName,
            'Mobile Number': row.mobileNumber,
            'Last Transaction Bill No.': String(row.lastTransactionBillNo),
            'Available Credit': row.credit.toFixed(2),
        }));
         const totalCredit = customerCreditsReportData.reduce((sum: number, row: { credit: number; }): number => sum + row.credit, 0);
         csvData.push({
            'Customer Name': 'TOTAL CREDIT',
            'Mobile Number': '',
            'Last Transaction Bill No.': '',
            'Available Credit': totalCredit.toFixed(2),
         });
        downloadCSV(arrayToCSV(csvData), `customer_credits_report_${getTodayDateString()}.csv`);
    } else if (reportView === 'closingStock') {
        if (closingStockReportData.length === 0) { alert("No data to download."); return; }
        const csvData = closingStockReportData.map(row => ({
            'Last Purchase Date': row.purchaseDate,
            'Supplier': row.supplier,
            'Item Name': row.itemName,
            'Item Code': row.itemCode,
            'Size': row.size,
            'Quantity': String(row.quantity),
            'Last Known MRP': String(row.mrp),
            'Total Value (Cost)': row.totalValue.toFixed(2),
        }));
        csvData.push({
            'Last Purchase Date': 'GRAND TOTAL', 'Supplier': '', 'Item Name': '', 'Item Code': '', 'Size': '',
            'Quantity': String(closingStockTotals.totalQuantity),
            'Last Known MRP': '',
            'Total Value (Cost)': closingStockTotals.totalValue.toFixed(2),
        });
        downloadCSV(arrayToCSV(csvData), `closing_stock_report_${getTodayDateString()}.csv`);
    }
  };

  const Tab: React.FC<{ view: typeof reportView, label: string }> = ({ view, label }) => (
    <button
        onClick={() => setReportView(view)}
        className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${reportView === view ? 'bg-royal-600 text-white shadow' : 'text-gray-600 dark:text-gray-300 hover:bg-cream-50 dark:hover:bg-gray-700'}`}
    >
        {label}
    </button>
  );

  const GroupingButton: React.FC<{ group: typeof summaryGrouping, label: string }> = ({ group, label }) => (
      <button 
        onClick={() => setSummaryGrouping(group)}
        className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors duration-200 ${summaryGrouping === group ? 'bg-royal-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
      >
        {label}
      </button>
  );


  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">Reports & Analysis</h2>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-3 py-2 bg-cream-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-royal-500"/>
              </div>
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-3 py-2 bg-cream-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-royal-500"/>
              </div>
            </div>
            <div className="flex items-center gap-2">
                <input type="file" id="import-backup" accept=".json" className="hidden" onChange={handleFileUpload} />
                <button onClick={handleDownloadBackup} className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors p-2 rounded-md hover:bg-cream-50 dark:hover:bg-gray-700">
                    <DownloadIcon /> Export Backup
                </button>
                 <label htmlFor="import-backup" className="cursor-pointer flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors p-2 rounded-md hover:bg-cream-50 dark:hover:bg-gray-700">
                    <UploadIcon /> Import Backup
                </label>
            </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
              <Tab view="itemWise" label="Item-wise Report" />
              <Tab view="billWise" label="Bill-wise Report" />
              <Tab view="dayWise" label="Day-wise Summary" />
              <Tab view="customerCredits" label="Customer Credits" />
              <Tab view="closingStock" label="Closing Stock" />
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 pl-10 pr-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-royal-500 transition"
            />
          </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
         <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Report Data</h3>
             <div className="flex items-center gap-2">
                {reportView === 'itemWise' && (
                    <button onClick={handleAnalyze} disabled={isAnalyzing || itemWiseReportData.length < 5} className="flex items-center gap-2 text-sm font-semibold text-royal-600 dark:text-royal-400 hover:text-royal-800 dark:hover:text-royal-300 transition-colors p-2 rounded-md hover:bg-royal-50 dark:hover:bg-royal-900/20 disabled:opacity-50 disabled:cursor-not-allowed">
                       <SparklesIcon /> {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
                    </button>
                )}
                 <button onClick={handleDownloadCSV} className="flex items-center gap-2 text-sm font-semibold text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-colors p-2 rounded-md hover:bg-green-50 dark:hover:bg-green-900/20">
                    <DownloadIcon /> Export CSV
                </button>
             </div>
        </div>
        
        {analysisError && <div className="p-4 m-4 bg-red-50 text-red-700 rounded-md">{analysisError}</div>}
        {analysis && <div className="p-4 m-4 prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: analysis }} />}

        {reportView === 'dayWise' && (
            <div className="p-4 flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Group by:</span>
                <GroupingButton group="day" label="Day" />
                <GroupingButton group="week" label="Week" />
                <GroupingButton group="month" label="Month" />
            </div>
        )}
        
        <div className="overflow-x-auto">
          {reportView === 'itemWise' && (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                <thead className="bg-cream-50 dark:bg-gray-700">
                    <tr>
                        {['Date', 'Bill No.', 'Customer', 'Item Details', 'Qty', 'MRP', 'Disc %', 'Net Value', 'Pre-GST', 'CGST', 'SGST', ''].map(h => 
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{h}</th>
                        )}
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {itemWiseReportData.map((row, index) => (
                        <tr key={`${row.billRef.id}-${index}`} className="hover:bg-cream-50 dark:hover:bg-gray-700/50 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap"><Highlight text={row.date} highlight={searchQuery}/></td>
                            <td className="px-4 py-3 whitespace-nowrap"><Highlight text={row.billNo} highlight={searchQuery}/></td>
                            <td className="px-4 py-3"><Highlight text={row.customer} highlight={searchQuery}/></td>
                            <td className="px-4 py-3"><Highlight text={row.itemDetails} highlight={searchQuery}/></td>
                            <td className="px-4 py-3 whitespace-nowrap"><Highlight text={row.qty} highlight={searchQuery}/></td>
                            <td className="px-4 py-3 whitespace-nowrap"><Highlight text={row.mrp.toFixed(2)} highlight={searchQuery}/></td>
                            <td className="px-4 py-3 whitespace-nowrap"><Highlight text={row.discPerc.toFixed(2)} highlight={searchQuery}/></td>
                            <td className="px-4 py-3 whitespace-nowrap font-semibold text-gray-800 dark:text-gray-200"><Highlight text={row.netValue.toFixed(2)} highlight={searchQuery}/></td>
                            <td className="px-4 py-3 whitespace-nowrap"><Highlight text={row.preGst.toFixed(2)} highlight={searchQuery}/></td>
                            <td className="px-4 py-3 whitespace-nowrap"><Highlight text={row.cgstAmount.toFixed(2)} highlight={searchQuery}/></td>
                            <td className="px-4 py-3 whitespace-nowrap"><Highlight text={row.sgstAmount.toFixed(2)} highlight={searchQuery}/></td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                                <button onClick={() => onEditBill(row.billRef.id)} className="p-2 text-gray-500 hover:text-royal-600 dark:hover:text-royal-400 rounded-full"><PencilIcon /></button>
                                <button onClick={() => onDeleteBill(row.billRef.id)} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-full"><TrashIcon /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
                {itemWiseReportTotals && (
                    <tfoot className="bg-cream-50 dark:bg-gray-700 font-bold">
                        <tr>
                            <td className="px-4 py-3 text-sm" colSpan={4}>Grand Total</td>
                            <td className="px-4 py-3 text-left text-sm">{itemWiseReportTotals.qty}</td>
                            <td className="px-4 py-3 text-left text-sm">{itemWiseReportTotals.mrp.toFixed(2)}</td>
                            <td className="px-4 py-3"></td>
                            <td className="px-4 py-3 text-left text-sm">{itemWiseReportTotals.netValue.toFixed(2)}</td>
                            <td className="px-4 py-3 text-left text-sm">{itemWiseReportTotals.preGst.toFixed(2)}</td>
                            <td className="px-4 py-3 text-left text-sm">{itemWiseReportTotals.cgstAmount.toFixed(2)}</td>
                            <td className="px-4 py-3 text-left text-sm">{itemWiseReportTotals.sgstAmount.toFixed(2)}</td>
                             <td className="px-4 py-3"></td>
                        </tr>
                    </tfoot>
                )}
            </table>
          )}

          {reportView === 'billWise' && (
             <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                <thead className="bg-cream-50 dark:bg-gray-700">
                    <tr>
                         {['Date', 'Bill No.', 'Customer', 'Card Payment', 'Cash Payment', 'Total Amount', ''].map(h => 
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{h}</th>
                        )}
                    </tr>
                </thead>
                 <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {billWiseReportData.map(row => (
                        <tr key={row.billRef.id} className="hover:bg-cream-50 dark:hover:bg-gray-700/50 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap"><Highlight text={row.date} highlight={searchQuery}/></td>
                            <td className="px-4 py-3 whitespace-nowrap"><Highlight text={row.billNo} highlight={searchQuery}/></td>
                            <td className="px-4 py-3"><Highlight text={row.customer} highlight={searchQuery}/></td>
                            <td className="px-4 py-3 whitespace-nowrap"><Highlight text={row.cardPayment.toFixed(2)} highlight={searchQuery}/></td>
                            <td className="px-4 py-3 whitespace-nowrap"><Highlight text={row.cashPayment.toFixed(2)} highlight={searchQuery}/></td>
                            <td className="px-4 py-3 whitespace-nowrap font-semibold text-gray-800 dark:text-gray-200"><Highlight text={row.totalAmount.toFixed(2)} highlight={searchQuery}/></td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                                <button onClick={() => onEditBill(row.billRef.id)} className="p-2 text-gray-500 hover:text-royal-600 dark:hover:text-royal-400 rounded-full"><PencilIcon /></button>
                                <button onClick={() => onDeleteBill(row.billRef.id)} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-full"><TrashIcon /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
                {billWiseReportTotals && (
                     <tfoot className="bg-cream-50 dark:bg-gray-700 font-bold">
                        <tr>
                            <td className="px-4 py-3 text-sm" colSpan={3}>Grand Total ({billWiseReportTotals.totalBills} Bills)</td>
                            <td className="px-4 py-3 text-left text-sm">{billWiseReportTotals.cardPayment.toFixed(2)}</td>
                            <td className="px-4 py-3 text-left text-sm">{billWiseReportTotals.cashPayment.toFixed(2)}</td>
                            <td className="px-4 py-3 text-left text-sm">{billWiseReportTotals.totalAmount.toFixed(2)}</td>
                            <td className="px-4 py-3"></td>
                        </tr>
                    </tfoot>
                )}
             </table>
          )}
          
           {reportView === 'dayWise' && (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                    <thead className="bg-cream-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{summaryGrouping === 'day' ? 'Date' : 'Period'}</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">No. of Bills</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Sales</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {dayWiseSummaryData.map(row => (
                            <tr key={row.startDate.toISOString()} className="hover:bg-cream-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-800 dark:text-gray-200">
                                    {summaryGrouping === 'day' ? row.startDate.toLocaleDateString() : `${row.startDate.toLocaleDateString()} - ${row.endDate.toLocaleDateString()}`}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">{row.count}</td>
                                <td className="px-4 py-3 whitespace-nowrap font-semibold text-gray-800 dark:text-gray-200">₹{row.total.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {reportView === 'customerCredits' && (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                    <thead className="bg-cream-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Customer Name</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Mobile Number</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Last Transaction Bill No.</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Available Credit</th>
                        </tr>
                    </thead>
                     <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {customerCreditsReportData.map(row => (
                            <tr key={row.mobileNumber} className="hover:bg-cream-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap"><Highlight text={row.customerName} highlight={searchQuery}/></td>
                                <td className="px-4 py-3 whitespace-nowrap"><Highlight text={row.mobileNumber} highlight={searchQuery}/></td>
                                <td className="px-4 py-3 whitespace-nowrap"><Highlight text={row.lastTransactionBillNo} highlight={searchQuery}/></td>
                                <td className="px-4 py-3 whitespace-nowrap font-semibold text-gray-800 dark:text-gray-200"><Highlight text={`₹${row.credit.toFixed(2)}`} highlight={searchQuery}/></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

             {reportView === 'closingStock' && (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                    <thead className="bg-cream-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Last Purchase</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Supplier</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Item Name / Code / Size</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Qty in Stock</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Last Known MRP</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Value (at cost)</th>
                        </tr>
                    </thead>
                     <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {closingStockReportData.map((row, i) => (
                             <tr key={`${row.itemCode}-${row.size}-${i}`} className="hover:bg-cream-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap"><Highlight text={row.purchaseDate} highlight={searchQuery}/></td>
                                <td className="px-4 py-3 whitespace-nowrap"><Highlight text={row.supplier} highlight={searchQuery}/></td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="font-semibold"><Highlight text={row.itemName} highlight={searchQuery}/></div>
                                    <div className="text-gray-500 dark:text-gray-400"><Highlight text={row.itemCode} highlight={searchQuery}/> / <Highlight text={row.size} highlight={searchQuery}/></div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap font-bold text-lg"><Highlight text={row.quantity} highlight={searchQuery}/></td>
                                <td className="px-4 py-3 whitespace-nowrap"><Highlight text={row.mrp === 'N/A' ? 'N/A' : `₹${row.mrp}`} highlight={searchQuery}/></td>
                                <td className="px-4 py-3 whitespace-nowrap font-semibold text-gray-800 dark:text-gray-200"><Highlight text={`₹${row.totalValue.toFixed(2)}`} highlight={searchQuery}/></td>
                            </tr>
                        ))}
                    </tbody>
                     <tfoot className="bg-cream-50 dark:bg-gray-700 font-bold">
                        <tr>
                            <td className="px-4 py-3 text-sm" colSpan={3}>Grand Total</td>
                            <td className="px-4 py-3 text-left text-sm">{closingStockTotals.totalQuantity} pcs</td>
                            <td className="px-4 py-3"></td>
                            <td className="px-4 py-3 text-left text-sm">₹{closingStockTotals.totalValue.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
             )}

          {(itemWiseReportData.length === 0 && reportView === 'itemWise' || billWiseReportData.length === 0 && reportView === 'billWise') && (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                <p>No data available for the selected date range.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};