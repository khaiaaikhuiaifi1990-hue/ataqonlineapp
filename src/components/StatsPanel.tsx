import React, { useMemo, useState, useEffect } from 'react';
import { 
  Package, 
  Sparkles, 
  TrendingUp, 
  AlertTriangle,
  Users
} from 'lucide-react';
import { Product } from '../types';
import { getAppUsersMetrics, subscribeToAppUsersMetrics, AppUsersMetrics } from '../utils/userTrackingService';

interface StatsPanelProps {
  products: Product[];
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ products }) => {
  const [usersMetrics, setUsersMetrics] = useState<AppUsersMetrics>(() => getAppUsersMetrics());

  // Real-time listener for app user registrations and visits
  useEffect(() => {
    const unsubscribe = subscribeToAppUsersMetrics((updated) => {
      setUsersMetrics(updated);
    });
    return () => unsubscribe();
  }, []);

  const stats = useMemo(() => {
    let totalItems = products.length;
    let activeOffers = 0;
    let totalEstimatedProfit = 0;
    let outOfStock = 0;
    let totalViews = 0;

    products.forEach((p) => {
      if (p.isOffer) activeOffers++;
      if (p.quantity <= 0) outOfStock++;
      totalViews += p.viewsCount || 0;

      const salePrice = p.discountPrice || p.originalPrice;
      const cost = p.costPrice || 0;
      if (cost > 0 && salePrice > cost) {
        totalEstimatedProfit += (salePrice - cost) * (p.quantity || 1);
      }
    });

    return {
      totalItems,
      activeOffers,
      totalEstimatedProfit,
      outOfStock,
      totalViews
    };
  }, [products]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
      {/* 1. Total Registered App Users (👥 إجمالي مستخدمي التطبيق) */}
      <div className="col-span-2 sm:col-span-1 bg-white p-4 rounded-2xl border border-purple-200/80 shadow-xs flex items-center gap-3 relative overflow-hidden group">
        <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
          <Users className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-slate-500 font-bold flex items-center gap-1.5">
            <span>إجمالي مستخدمي التطبيق 👥</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" title="محدث تلقائياً" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-700 leading-tight">
            {usersMetrics.totalUsers.toLocaleString('ar-YE')}
          </div>
          <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
            {usersMetrics.activeToday} نشط اليوم • {usersMetrics.mobilePercent}% عبر الجوال
          </div>
        </div>
      </div>

      {/* 2. Total Products */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <Package className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xs text-slate-500 font-medium">إجمالي المنتجات</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">{stats.totalItems}</div>
        </div>
      </div>

      {/* 3. Active Offers */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
          <Sparkles className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xs text-slate-500 font-medium">العروض النشطة</div>
          <div className="text-xl sm:text-2xl font-black text-amber-600">{stats.activeOffers}</div>
        </div>
      </div>

      {/* 4. Estimated Profit Potential */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <TrendingUp className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xs text-slate-500 font-medium">الأرباح التقديرية</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600">
            {stats.totalEstimatedProfit.toLocaleString('ar-YE')} <span className="text-xs">ريال</span>
          </div>
        </div>
      </div>

      {/* 5. Out of stock or low stock */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xs text-slate-500 font-medium">منتجات نفدت كميتها</div>
          <div className="text-xl sm:text-2xl font-black text-rose-600">{stats.outOfStock}</div>
        </div>
      </div>
    </div>
  );
};

