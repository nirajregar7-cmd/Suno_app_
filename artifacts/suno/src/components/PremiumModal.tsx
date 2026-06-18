import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, Heart, Zap, Shield, Check, Crown } from 'lucide-react';

interface PremiumModalProps {
  userSession: {
    uid: string;
    nickname: string;
    phoneNumber?: string;
    isPremium?: boolean;
    premiumPlan?: string;
    premiumExpiresAt?: string;
  };
  onClose: () => void;
  onSuccess: (plan: string) => void;
}

declare global {
  interface Window {
    Cashfree?: any;
  }
}

const PLANS = [
  {
    id: 'monthly',
    label: '1 Month',
    price: '₹99',
    perMonth: '₹99/mo',
    savings: null,
    badge: null,
  },
  {
    id: 'yearly',
    label: '1 Year',
    price: '₹799',
    perMonth: '₹66/mo',
    savings: 'Save ₹389',
    badge: 'BEST VALUE',
  },
];

const FEATURES = [
  { icon: Heart, text: 'See who liked you — instantly', premium: true },
  { icon: Zap, text: 'Unlimited daily matches', premium: true },
  { icon: Crown, text: 'Gold Premium badge on profile', premium: true },
  { icon: Shield, text: 'Priority in discovery feed', premium: true },
  { icon: Star, text: 'Voice verified trust boost', premium: true },
];

export default function PremiumModal({ userSession, onClose, onSuccess }: PremiumModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isAlreadyPremium = userSession.isPremium &&
    userSession.premiumExpiresAt &&
    new Date(userSession.premiumExpiresAt) > new Date();

  const loadCashfreeSDK = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (window.Cashfree) {
        resolve(window.Cashfree);
        return;
      }
      const s = document.createElement('script');
      s.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      s.onload = () => resolve(window.Cashfree);
      s.onerror = () => reject(new Error('Failed to load Cashfree SDK'));
      document.head.appendChild(s);
    });
  };

  const handleUpgrade = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/cashfree/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: userSession.uid,
          plan: selectedPlan,
          phoneNumber: userSession.phoneNumber,
          nickname: userSession.nickname,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create order');

      const Cashfree = await loadCashfreeSDK();
      const cf = await Cashfree({ mode: data.env === 'production' ? 'production' : 'sandbox' });

      cf.checkout({
        paymentSessionId: data.paymentSessionId,
        redirectTarget: '_self',
      });
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 80, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="w-full max-w-sm bg-[#0e0a06] border border-amber-500/20 rounded-3xl overflow-hidden shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative bg-gradient-to-br from-amber-600/20 via-orange-600/10 to-transparent px-5 pt-6 pb-4 text-center">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 text-neutral-500 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Crown size={22} className="text-amber-400" />
              <span className="text-amber-400 font-black text-lg tracking-wide uppercase">Suno Plus</span>
            </div>
            {isAlreadyPremium ? (
              <div className="space-y-1">
                <p className="text-white font-bold text-sm">You're already Premium! ⭐</p>
                <p className="text-neutral-400 text-[11px]">
                  Active until {new Date(userSession.premiumExpiresAt!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            ) : (
              <p className="text-neutral-300 text-[12px]">Unlock the full Suno experience</p>
            )}
          </div>

          {!isAlreadyPremium && (
            <>
              {/* Features */}
              <div className="px-5 py-3 space-y-2">
                {FEATURES.map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                      <Icon size={12} className="text-amber-400" />
                    </div>
                    <span className="text-[12px] text-neutral-200">{text}</span>
                    <Check size={11} className="text-green-400 ml-auto shrink-0" />
                  </div>
                ))}
              </div>

              {/* Plan selector */}
              <div className="px-5 pb-3 grid grid-cols-2 gap-2">
                {PLANS.map(plan => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id as 'monthly' | 'yearly')}
                    className={`relative p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      selectedPlan === plan.id
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700'
                    }`}
                  >
                    {plan.badge && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap">
                        {plan.badge}
                      </span>
                    )}
                    <div className="text-white font-black text-base">{plan.price}</div>
                    <div className="text-neutral-400 text-[10px]">{plan.label}</div>
                    <div className="text-neutral-500 text-[9px]">{plan.perMonth}</div>
                    {plan.savings && (
                      <div className="text-green-400 text-[9px] font-bold mt-0.5">{plan.savings}</div>
                    )}
                  </button>
                ))}
              </div>

              {/* Error */}
              {error && (
                <div className="mx-5 mb-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <p className="text-red-400 text-[11px]">{error}</p>
                </div>
              )}

              {/* CTA */}
              <div className="px-5 pb-5">
                <button
                  onClick={handleUpgrade}
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-60 rounded-2xl font-black text-black text-[13px] uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  {loading ? '⏳ Opening Payment...' : `✨ Get Suno Plus — ${PLANS.find(p => p.id === selectedPlan)?.price}`}
                </button>
                <p className="text-center text-[9.5px] text-neutral-600 mt-2">
                  Secure payment via Cashfree · UPI · Cards · Net Banking · Wallets
                </p>
              </div>
            </>
          )}

          {isAlreadyPremium && (
            <div className="px-5 pb-6">
              <button
                onClick={onClose}
                className="w-full py-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl font-bold text-sm cursor-pointer hover:bg-amber-500/15 transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
