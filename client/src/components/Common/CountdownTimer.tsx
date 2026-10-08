import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';

interface CountdownTimerProps {
  expiresAt: number; // timestamp in ms
  onExpire?: () => void;
  className?: string;
  showIcon?: boolean;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  expiresAt,
  onExpire,
  className = '',
  showIcon = true,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
    return diff;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setSecondsLeft(diff);

      if (diff <= 0) {
        clearInterval(interval);
        if (onExpire) {
          onExpire();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const hrs = Math.floor(secondsLeft / 3600);
  const mins = Math.floor((secondsLeft % 3600) / 60);
  const secs = secondsLeft % 60;
  const formattedTime = hrs > 0
    ? `${hrs}h ${mins.toString().padStart(2, '0')}m`
    : `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  const isUrgent = secondsLeft <= 30 && secondsLeft > 0;
  const isExpired = secondsLeft <= 0;

  return (
    <div
      className={`inline-flex items-center gap-1.5 font-mono text-xs font-bold px-2.5 py-1 rounded-full transition-all ${
        isExpired
          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
          : isUrgent
          ? 'bg-[#6366F1]/25 text-[#6366F1] border border-[#6366F1]/50 shadow-[0_0_8px_rgba(99,102,241,0.3)] animate-pulse'
          : 'bg-[#6366F1]/15 text-[#6366F1] border border-[#6366F1]/30'
      } ${className}`}
    >
      {showIcon && (
        isExpired ? (
          <AlertCircle className="w-3.5 h-3.5" />
        ) : (
          <Clock className={`w-3.5 h-3.5 ${isUrgent ? 'animate-spin' : ''}`} />
        )
      )}
      <span>{isExpired ? 'Expired' : formattedTime}</span>
    </div>
  );
};
