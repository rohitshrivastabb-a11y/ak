
export enum Brand {
  Squirehood = 'SQUIREHOOD',
  MishraCollection = 'Mishra Collection'
}

export type TransactionType = 'Sale' | 'Exchange' | 'Return';

export interface Item {
  id: string;
  code: string;
  name: string;
  size: string;
  mrp: number;
  quantity: number;
  discountPercentage: number;
  netValue: number;
}

export interface PurchasedItem {
  id: string;
  name: string;
  code: string;
  size: string;
  quantity: number;
  value: number; // Cost value
}

export interface Bill {
  id:string;
  customerName: string;
  mobileNumber: string;
  items: Item[];
  date: number; // timestamp
  showroomBrand: Brand;
  paymentMethod: 'Cash' | 'Card';
  address: string;
  gstNumber?: string;
  transactionType: TransactionType;
  originalBillId?: string;
  creditApplied: number;
  creditGenerated: number;
  customInvoiceNumber?: string;
}

export interface Purchase {
    id: string;
    date: number; // timestamp
    supplier?: string;
    items: PurchasedItem[];
}

export type CustomerCredits = Record<string, number>;

export interface User {
  id: string;
  name: string;
  email: string;
  profilePicture: string;
}

export interface Product {
  id: string;
  name: string;
  code: string;
  size: string;
  mrp: number;
}
