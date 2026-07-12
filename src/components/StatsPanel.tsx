import { ShoppingBag, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

interface StatsPanelProps {
  total: number;
  active: number;
  expired: number;
}

export default function StatsPanel({ total, active, expired }: StatsPanelProps) {
  const stats = [
    {
      id: 'stat-total',
      label: 'إجمالي العروض المرفوعة',
      value: total,
      icon: ShoppingBag,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50/75 border border-indigo-100/30',
    },
    {
      id: 'stat-active',
      label: 'العروض النشطة الحالية',
      value: active,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50/75 border border-emerald-100/30',
    },
    {
      id: 'stat-expired',
      label: 'العروض منتهية الصلاحية',
      value: expired,
      icon: AlertTriangle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50/75 border border-amber-100/30',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4" dir="rtl">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className={`flex items-center gap-4 p-5 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow ${stat.bgColor}`}
          >
            <div className={`p-3 rounded-xl bg-white shadow-sm ${stat.color}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <span className={`text-2xl font-bold font-mono ${stat.color}`}>
                {stat.value}
              </span>
              <p className="text-gray-500 text-xs font-semibold mt-0.5">
                {stat.label}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
