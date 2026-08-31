import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Search, Ban, Shield, Plus, RefreshCw, AlertOctagon } from 'lucide-react';
import { blockedIPsAPI } from '../services/api';
import toast from 'react-hot-toast';

import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import StatCard from '../components/ui/StatCard';
import Pagination from '../components/ui/Pagination';

const BlockedIPs = () => {
  const [ips, setIps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBlock, setNewBlock] = useState({ ip_address: '', reason: '', threat_type: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchIPs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await blockedIPsAPI.getBlockedIPs({ page, page_size: 20, search });
      const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
      setIps(items);
      setTotal(data?.total ?? items.length);
    } catch (e) {
      console.error('Fetch blocked IPs error:', e);
      toast.error('Failed to fetch blocked IPs');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchIPs();
  }, [fetchIPs]);

  const handleBlockIP = async (e) => {
    e.preventDefault();
    if (!newBlock.ip_address.trim()) {
      return toast.error('Please enter an IP address');
    }
    if (!newBlock.reason.trim()) {
      return toast.error('Please enter a reason for blocking');
    }

    setSubmitting(true);
    try {
      await blockedIPsAPI.blockIP(newBlock);
      toast.success(`IP ${newBlock.ip_address} blocked successfully`);
      setIsModalOpen(false);
      setNewBlock({ ip_address: '', reason: '', threat_type: '' });
      fetchIPs();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to block IP');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnblock = async (id, ip) => {
    try {
      await blockedIPsAPI.unblockIP(id);
      toast.success(`IP ${ip || ''} unblocked`);
      fetchIPs();
    } catch (e) {
      toast.error('Failed to unblock IP');
    }
  };

  const activeCount = ips.filter(ip => ip.is_active).length;

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Ban className="w-6 h-6 text-red-500" />
            Firewall & Blocked IP Management
          </h1>
          <p className="text-gray-400 text-sm mt-1">Manage active network blocks and firewall access control rules</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchIPs}
            className="flex items-center gap-2 px-3 py-2 bg-cyber-card hover:bg-cyber-surface border border-cyber-border rounded-lg text-sm text-gray-300 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-red-500/20"
          >
            <Plus className="w-4 h-4" /> Block New IP
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Block Rules" value={total} icon={Ban} color="red" />
        <StatCard title="Active Enforcements" value={activeCount} icon={AlertOctagon} color="orange" />
        <StatCard title="Firewall Shield Status" value="Active" icon={Shield} color="green" />
      </div>

      <div className="bg-cyber-card border border-cyber-border rounded-xl p-5">
        <div className="mb-6 relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search IP address or reason..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-cyber-surface border border-cyber-border rounded-lg text-white text-sm focus:outline-none focus:border-cyber-blue"
          />
        </div>

        <DataTable 
          isLoading={loading}
          data={ips}
          columns={[
            { 
              header: 'IP Address', 
              cell: (r) => <span className="font-mono text-red-400 font-medium">{r.ip_address}</span> 
            },
            { 
              header: 'Reason', 
              accessorKey: 'reason',
              cell: (r) => <span className="text-gray-300 text-xs">{r.reason}</span>
            },
            { 
              header: 'Threat Category', 
              cell: (r) => <span className="text-xs font-mono bg-cyber-surface px-2 py-0.5 rounded border border-cyber-border text-gray-300">{r.threat_type || 'MANUAL_BLOCK'}</span>
            },
            { 
              header: 'Blocked Date', 
              cell: (r) => {
                const dateVal = r.blocked_at || r.created_at;
                return <span className="text-xs text-gray-400 font-mono">{dateVal ? format(new Date(dateVal), 'MMM dd, yyyy HH:mm') : '--'}</span>;
              }
            },
            { 
              header: 'Enforcement', 
              cell: (r) => (
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${r.is_active ? 'border-red-500/50 text-red-400 bg-red-500/10' : 'border-gray-500/50 text-gray-400 bg-gray-500/10'}`}>
                  {r.is_active ? 'BLOCKED' : 'UNBLOCKED'}
                </span>
              )
            },
            { 
              header: 'Action', 
              cell: (r) => (
                r.is_active ? (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleUnblock(r.id, r.ip_address); }}
                    className="text-xs text-cyber-blue hover:text-white px-2.5 py-1 rounded bg-blue-500/10 border border-cyber-blue/30 hover:bg-blue-600 transition-colors font-medium"
                  >
                    Unblock
                  </button>
                ) : (
                  <span className="text-xs text-gray-600">Inactive</span>
                )
              )
            }
          ]}
        />
        
        {!loading && total > 20 && (
          <div className="mt-4">
            <Pagination currentPage={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} />
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Block Malicious IP Address">
        <form onSubmit={handleBlockIP} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Target IP Address *</label>
            <input 
              type="text" 
              required 
              placeholder="e.g. 45.33.32.156"
              value={newBlock.ip_address} 
              onChange={e => setNewBlock({...newBlock, ip_address: e.target.value})} 
              className="w-full bg-cyber-surface border border-cyber-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500 font-mono" 
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Block Reason *</label>
            <input 
              type="text" 
              required
              placeholder="e.g. Repeated brute force attempts detected by AI"
              value={newBlock.reason} 
              onChange={e => setNewBlock({...newBlock, reason: e.target.value})} 
              className="w-full bg-cyber-surface border border-cyber-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500" 
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Threat Type (Optional)</label>
            <input 
              type="text" 
              placeholder="e.g. BRUTE_FORCE, DDOS, PORT_SCAN"
              value={newBlock.threat_type} 
              onChange={e => setNewBlock({...newBlock, threat_type: e.target.value})} 
              className="w-full bg-cyber-surface border border-cyber-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500 font-mono" 
            />
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-cyber-border">
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)} 
              className="px-4 py-2 bg-cyber-surface text-gray-300 text-sm rounded-lg hover:bg-cyber-border transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={submitting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting ? 'Enforcing...' : 'Enforce Block'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BlockedIPs;
