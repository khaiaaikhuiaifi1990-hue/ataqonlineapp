export interface Product {
  id: string;
  name: string;
  category: string;
  mCode: string;
  costPrice: number;
  price: number;
  about: string;
  sizes: string;
  imgs: string[];
  expiry: number;
  durationText: string;
  status: 'active' | 'hidden';
  createdAt?: any;
  updatedAt?: any;
}

export interface StoreConfig {
  passwordAccess: string;
  profitMargin: number; // raw value e.g., 50 means 50%
}

export interface Agent {
  id: string;
  name: string;
  phone: string;
  mCode: string;
  status: 'active' | 'suspended';
  createdAt?: any;
}

export interface Category {
  value: string;
  icon: string;
}


