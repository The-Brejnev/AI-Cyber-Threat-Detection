import React, { useState, useEffect } from 'react';
import { ShieldCheck, Bot, Radio, CheckCircle2, Lock, Sparkles, Database, FileText } from 'lucide-react';
import { aiAPI } from '../../services/api';

const AegisGuardianCard = () => {
  const [feedData, setFeedData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchFeed = async () => {
    try {
      const { data } = await aiAPI.getAegisFeed();
      setFeedData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
    const timer = setInterval(fetchFeed, 15000);
    return () => clearInterval(timer);
  }, []);

  const feedItems = feedData?.feed || [];

  return (
    <div className="bg-gradient-to-r from-emerald-950/40 via-cyber-card to-cyber-card border border-emerald-500/30 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
      {/* Ambient green glow */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Left AI Identity */}
        <div className="flex items-start gap-4">
          <div className="p-3.5 bg-emerald-500/20 rounded-2xl border border-emerald-500/40 text-emerald-300 shadow-lg shadow-emerald-500/10 shrink-0">
            <Bot className="w-8 h-8 animate-pulse text-emerald-400" />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 animate-ping text-emerald-400" />
                USER AI: AEGIS ENDPOINT GUARDIAN
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                Synced with SOC Sentinel Master AI
              </span>
            </div>

            <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
              Aegis Endpoint Guardian AI &bull; Personal Data Shield
            </h3>
            <p className="text-xs text-gray-300 max-w-2xl leading-relaxed">
              Your personal AI security companion. Aegis communicates with the Administrator Sentinel AI in real-time, delivering targeted alerts to your database and inbox <em>only when an unauthorized person attempts access or a critical threat is detected</em>.
            </p>
          </div>
        </div>

        {/* Right Status Indicator */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-cyber-surface/90 border border-emerald-500/30 rounded-xl px-4 py-2.5 font-mono text-center">
            <p className="text-[10px] text-gray-400 uppercase font-bold">Protection Status</p>
            <p className="text-xs font-bold text-emerald-400 mt-0.5 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 100% GUARDED
            </p>
          </div>
        </div>
      </div>

      {/* Aegis Protection Feed & Sentinel AI Directives */}
      {feedItems.length > 0 && (
        <div className="mt-4 pt-3 border-t border-emerald-500/20">
          <div className="flex items-center justify-between mb-2 text-xs text-gray-400 font-mono">
            <span className="flex items-center gap-1.5 text-emerald-300 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Sentinel Master AI &rarr; Aegis Guardian AI Security Directives:
            </span>
            <span className="text-[11px] text-gray-500 font-mono">Delivered to Database &amp; Email</span>
          </div>

          <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
            {feedItems.slice(0, 3).map((item, idx) => (
              <div
                key={idx}
                className="bg-cyber-surface/80 p-3 rounded-xl border border-emerald-500/20 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold text-white text-xs">{item.title}</p>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                    PROTECTED
                  </span>
                </div>
                <p className="text-gray-300 text-[11px] leading-relaxed">{item.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AegisGuardianCard;
