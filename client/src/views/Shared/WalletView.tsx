import React, { useState, useEffect } from 'react';
import {
  Wallet as WalletIcon,
  TrendingUp,
  Percent,
  AlertOctagon,
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { User, WalletSummary } from '../../types';
import { api } from '../../services/api';

interface WalletViewProps {
  user: User;
}

export const WalletView: React.FC<WalletViewProps> = ({ user }) => {
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulatingFine, setIsSimulatingFine] = useState(false);

  const fetchWallet = async () => {
    try {
      const res = await api.getWallet(user.id);
      setWallet(res);
    } catch (err) {
      console.error('Wallet fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, [user.id]);

  const handleSimulateFine = async () => {
    if (isSimulatingFine) return;
    setIsSimulatingFine(true);
    try {
      await api.mockFine(user.id);
      await fetchWallet();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulatingFine(false);
    }
  };

  if (isLoading || !wallet) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-zinc-400 text-xs">
        Loading campus wallet...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 bg-[#0F1117] text-white overflow-y-auto font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-1.5">
            <WalletIcon className="w-5 h-5 text-[#6366F1]" />
            <span>Campus Wallet</span>
          </h2>
          <p className="text-[11px] text-[#94A3B8]">Direct peer payout & platform fee ledger</p>
        </div>

        {/* Mock Fine Demo Trigger */}
        <button
          onClick={handleSimulateFine}
          disabled={isSimulatingFine}
          className="text-[10px] font-semibold bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
          title="Demonstrate 30% no-show penalty in pitch"
        >
          <Sparkles className="w-3 h-3 text-rose-400" />
          <span>Demo 30% Fine</span>
        </button>
      </div>

      {/* Main Balance Card */}
      <div className="bg-[#161822] border border-[#222634] rounded-2xl p-5 mb-4 shadow-md">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] block mb-1">
          Available Balance
        </span>
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-3xl font-black font-mono text-white tracking-tight">
            ₹{wallet.balance.toFixed(2)}
          </span>
          <span className="text-xs text-[#6366F1] font-semibold bg-[#6366F1]/10 px-2 py-0.5 rounded-full border border-[#6366F1]/30 font-mono">
            Active
          </span>
        </div>

        {/* 3 Metric Pills */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#222634]">
          <div className="bg-[#0F1117] p-2.5 rounded-xl border border-[#222634]">
            <span className="text-[10px] text-[#94A3B8] block flex items-center gap-1 font-medium">
              <TrendingUp className="w-3 h-3 text-[#6366F1]" /> Earnings
            </span>
            <span className="text-xs font-bold font-mono text-white">
              ₹{wallet.total_earnings.toFixed(2)}
            </span>
          </div>

          <div className="bg-[#0F1117] p-2.5 rounded-xl border border-[#222634]">
            <span className="text-[10px] text-[#94A3B8] block flex items-center gap-1 font-medium">
              <Percent className="w-3 h-3 text-[#94A3B8]" /> 1% Fees
            </span>
            <span className="text-xs font-bold font-mono text-zinc-300">
              ₹{wallet.total_fees.toFixed(2)}
            </span>
          </div>

          <div className="bg-[#0F1117] p-2.5 rounded-xl border border-[#222634]">
            <span className="text-[10px] text-[#94A3B8] block flex items-center gap-1 font-medium">
              <AlertOctagon className="w-3 h-3 text-rose-400" /> Fines
            </span>
            <span className="text-xs font-bold font-mono text-rose-400">
              ₹{wallet.total_fines.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Platform Fee Policy Info */}
      <div className="bg-[#161822] border border-[#222634] rounded-xl p-3 mb-4 flex items-center gap-3 shadow-sm">
        <div className="w-9 h-9 rounded-lg bg-[#0F1117] text-[#6366F1] flex items-center justify-center shrink-0 border border-[#222634]">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="text-xs">
          <p className="font-semibold text-white">1% Student Platform Fee</p>
          <p className="text-[11px] text-[#94A3B8]">
            Maintains student safety verification & high-speed campus routing servers.
          </p>
        </div>
      </div>

      {/* Transaction History */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
            Recent Transactions
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">
            {wallet.transactions.length} total
          </span>
        </div>

        {wallet.transactions.length === 0 ? (
          <div className="p-6 text-center text-zinc-400 text-xs border border-dashed border-[#222634] rounded-xl bg-[#161822]">
            No transactions yet. Complete a ride to view earnings!
          </div>
        ) : (
          <div className="space-y-2">
            {wallet.transactions.map((tx) => {
              const isEarning = tx.type === 'earning';
              const isFee = tx.type === 'platform_fee';

              return (
                <div
                  key={tx.id}
                  className="bg-[#161822] border border-[#222634] rounded-xl p-3 flex items-center justify-between shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isEarning
                          ? 'bg-[#6366F1]/15 text-[#6366F1] border border-[#6366F1]/40'
                          : isFee
                          ? 'bg-zinc-800 text-zinc-300 border border-[#222634]'
                          : 'bg-rose-950/50 text-rose-400 border border-rose-800'
                      }`}
                    >
                      {isEarning ? (
                        <ArrowDownRight className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white truncate max-w-[200px]">
                        {tx.description}
                      </p>
                      <p className="text-[10px] text-zinc-400">
                        {new Date(tx.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {' • '}
                        {isEarning ? 'Ride Payout' : isFee ? '1% Service Fee' : '30% No-Show Fine'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-xs font-bold font-mono ${
                        isEarning
                          ? 'text-[#6366F1]'
                          : isFee
                          ? 'text-zinc-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {tx.amount > 0 ? `+₹${tx.amount.toFixed(2)}` : `-₹${Math.abs(tx.amount).toFixed(2)}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletView;
