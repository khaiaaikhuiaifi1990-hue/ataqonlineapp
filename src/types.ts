export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  originalPrice: number;
  discountPrice?: number;
  costPrice?: number; // For merchant cost/profit calculation
  quantity: number;
  image: string; // Compressed optimized primary image
  thumbnail?: string; // Tiny blurred placeholder for 0ms load
  additionalImages?: string[]; // Up to 3 additional images (Color 2, Color 3, Color 4/Details)
  mCode?: string; // Merchant / Delegate code (e.g. "1", "M-101")
  sizes?: string; // Available sizes & dimensions
  colors?: string; // Available colors
  merchantId?: string;
  merchantName: string;
  merchantPhone: string;
  merchantLocation?: string;
  isOffer: boolean;
  isFeatured?: boolean; // Highlighted / pinned offer
  offerEndsAt?: string; // ISO date string
  expiryDate?: string; // Secondary expiry date field
  offerDurationDays?: number; // Configured duration in days
  offerDurationText?: string; // Textual duration
  rating?: number;
  reviewsCount?: number;
  viewsCount?: number;
  createdAt: number;
  status: 'active' | 'out_of_stock' | 'expired' | 'hidden' | 'deleted';
}

export type StoreCategory = 
  | 'الكل'
  | 'عروض حصرية'
  | 'إلكترونيات وجوالات'
  | 'عطور وتجميل'
  | 'أزياء وملابس'
  | 'سوبرماركت ومواد غذائية'
  | 'مطاعم وكافيهات'
  | 'أجهزة منزلية'
  | 'سيارات ومعدات'
  | 'عقارات وخدمات'
  | 'أخرى';

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Review {
  id: string;
  productId: string;
  authorName: string;
  authorPhone?: string;
  rating: number;
  comment: string;
  createdAt: number;
}

export interface Merchant {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  mCode?: string; // Delegate Identifier Code e.g. M-101
  pin: string; // Encrypted/hashed or secure 4-6 digit PIN
  location: string;
  category: string;
  isVerified: boolean;
  joinedAt: number;
  avatar?: string;
  status: 'active' | 'suspended';
}

export interface PlatformSettings {
  platformName: string;
  supportPhone: string;
  supportPhoneNumbers: string[]; // Round-robin support numbers list
  profitMarginPercent: number; // Store profit margin 0% - 150%
  merchantAccessCode: string; // Access code for certified delegates/merchants
  ownerPin: string; // Master PIN for owner
  categories: string[]; // Dynamic store categories
  autoCleanupExpired: boolean; // Continuous auto cleanup toggle
  bannerTitle: string;
  bannerSubtitle: string;
  showAnnouncement: boolean;
  announcementText: string;
  currency: string;
}

export interface MerchantStats {
  totalProducts: number;
  activeOffers: number;
  totalViews: number;
  estimatedProfit: number;
  outOfStockCount: number;
}

export type ActiveView = 
  | 'store' 
  | 'product_details'
  | 'cart'
  | 'admin_portal'
  | 'merchant_login' 
  | 'merchant_dashboard' 
  | 'owner_login' 
  | 'owner_dashboard';
