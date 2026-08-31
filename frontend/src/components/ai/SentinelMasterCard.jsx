import React, { useState, useEffect } from 'react';
import { Bot, Radio, Zap, ShieldCheck, ArrowRight, ShieldAlert, Cpu, Lock } from 'lucide-react';
import { aiAPI } from '../../services/api';

const SentinelMasterCard = () => {
  const [aiData, setAiData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const { data } = await aiAPI.getStatus();
      setAiData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const timer = setInterval(fetchStatus, 15000);
    return () => clearInterval(timer);
  }, []);

  const master = aiData?.sentinel_master_ai;
  const stats = aiData?.inter_ai_stats;
  const recentRelays = aiData?.recent_relays || [];

  return (
    <div className="bg-gradient-to-r from-purple-950/40 via-cyber-card to-cyber-card border border-purple-500/30 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Left AI Identity */}
        <div className="flex items-start gap-4">
          <div className="p-3.5 bg-purple-500/20 rounded-2xl border border-purple-500/40 text-purple-300 shadow-lg shadow-purple-500/10 shrink-0">
            <Bot className="w-8 h-8 animate-pulse text-purple-400" />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 animate-ping text-purple-400" />
                ADMIN AI: SOC SENTINEL MASTER
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                {master?.version || 'v3.2-NeuralSOC'}
              </span>
            </div>

            <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
              SOC Sentinel Master AI &bull; Inter-AI Orchestrator
            </h3>
            <p className="text-xs text-gray-300 max-w-2xl leading-relaxed">
              Monitors system-wide telemetry and automatically alerts <strong className="text-emerald-400">Aegis User AI</strong>, dispatches to the user's database, and sends email <em>ONLY when Unauthorized Access or HIGH/CRITICAL threats</em> are detected.
            </p>
          </div>
        </div>

        {/* Right Inter-AI Metrics */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="bg-cyber-surface/90 border border-cyber-border rounded-xl px-3.5 py-2.5 font-mono text-center min-w-28">
            <p className="text-[10px] text-gray-400 uppercase font-bold">Inter-AI Signals</p>
            <p className="text-base font-bold text-purple-400 mt-0.5">{stats?.critical_escalations_relayed ?? 0} Relayed</p>
          </div>

          <div className="bg-cyber-surface/90 border border-cyber-border rounded-xl px-3.5 py-2.5 font-mono text-center min-w-32">
            <p className="text-[10px] text-gray-400 uppercase font-bold">User Noise Filtered</p>
            <p className="text-base font-bold text-green-400 mt-0.5">{stats?.noise_reduction_rate || '94.2%'}</p>
          </div>
        </div>
      </div>

      {/* Recent Inter-AI Real-time Dispatch Ticker */}
      {recentRelays.length > 0 && (
        <div className="mt-4 pt-3 border-t border-purple-500/20">
          <div className="flex items-center justify-between mb-2 text-xs text-gray-400 font-mono">
            <span className="flex items-center gap-1.5 text-purple-300 font-semibold">
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              Live Sentinel AI &rarr; Aegis User AI Signal Feed:
            </span>
            <span className="text-[11px] text-gray-500">Autonomous Email &amp; DB Dispatches</span>
          </div>

          <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
            {recentRelays.slice(0, 3).map((r, i) => (
              <div
                key={i}
                className="bg-cyber-surface/80 p-2 rounded-lg border border-purple-500/20 text-xs flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold font-mono bg-red-500/20 text-red-300 border border-red-500/30">
                    {r.severity}
                  </span>
                  <span className="text-white font-medium truncate">{r.threat_type}</span>
                  <span className="text-gray-400 text-[11px] font-mono">&rarr; Alerted: <strong className="text-cyan-400">{r.target_user}</strong></span>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono shrink-0 font-bold">
                  ✓ DELIVERED TO USER DB &amp; EMAIL
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SentinelMasterCard;
