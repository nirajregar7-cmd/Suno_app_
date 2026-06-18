import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert, Users, MessageSquare, BarChart2, FileText,
  Ban, AlertTriangle, CheckCircle, Trash2, RefreshCw,
  TrendingUp, Shield, Star, Crown, Eye, UserCheck,
  AlertOctagon, Clock, ChevronDown, ChevronUp, Search,
  Activity, Zap, Lock, Award
} from 'lucide-react';

interface AdminStats {
  users: number;
  avgTrustScore: string;
  posts: number;
  totalReports: number;
  pendingReports: number;
  totalChats: number;
  bannedUsers: number;
  premiumUsers: number;
}

interface AdminUser {
  uid: string;
  nickname: string;
  avatar: string;
  gender: string;
  city: string;
  trustScore: number;
  offenseStatus: string;
  offenseCount: number;
  phoneNumber: string;
  isAdmin: boolean;
  voiceVerified: boolean;
  isPremium: boolean;
  language: string;
  ageRange: string;
}

interface AdminPost {
  id: string;
  roomId: string;
  authorNickname: string;
  content: string;
  timestamp: string;
  authorTrustScore: number;
  replyCount: number;
}

interface AdminReport {
  id: string;
  reportedUserNickname: string;
  reportedUserId: string;
  reporterNickname: string;
  reason: string;
  evidence: string[];
  timestamp: string;
  status: string;
}

type Tab = 'overview' | 'users' | 'reports' | 'posts';

const STATUS_COLORS: Record<string, string> = {
  clear: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  warned: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  muted: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  suspended: 'text-red-400 bg-red-500/10 border-red-500/20',
  banned: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
};

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-2">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
      <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">{label}</p>
      <p className="text-2xl font-black text-white font-mono">{value}</p>
      {sub && <p className="text-[10px] text-neutral-500">{sub}</p>}
    </div>
  );
}

export default function AdminPanel() {
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [statsRes, usersRes, postsRes, reportsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/users'),
        fetch('/api/admin/posts'),
        fetch('/api/db-reports'),
      ]);
      const [statsData, usersData, postsData, reportsData] = await Promise.all([
        statsRes.json(), usersRes.json(), postsRes.json(), reportsRes.json()
      ]);
      if (statsData && !statsData.error) setStats(statsData);
      if (usersData?.users) setUsers(usersData.users);
      if (postsData?.posts) setPosts(postsData.posts);
      if (reportsData?.reports) setReports(reportsData.reports);
    } catch (err) {
      console.error('Admin fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 8000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const updateUser = async (uid: string, payload: object) => {
    setActionLoading(uid);
    try {
      await fetch(`/api/admin/users/${uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      await fetchAll();
    } finally {
      setActionLoading(null);
    }
  };

  const deleteUser = async (uid: string, nickname: string) => {
    if (!confirm(`Delete user "${nickname}"? This cannot be undone.`)) return;
    setActionLoading(uid);
    try {
      await fetch(`/api/admin/users/${uid}`, { method: 'DELETE' });
      setUsers(prev => prev.filter(u => u.uid !== uid));
    } finally {
      setActionLoading(null);
    }
  };

  const deletePost = async (id: string) => {
    if (!confirm('Delete this post?')) return;
    setActionLoading(id);
    try {
      await fetch(`/api/admin/posts/${id}`, { method: 'DELETE' });
      setPosts(prev => prev.filter(p => p.id !== id));
    } finally {
      setActionLoading(null);
    }
  };

  const resolveReport = async (id: string, status: string, reportedUserId: string, action: string) => {
    setActionLoading(id);
    try {
      await fetch(`/api/admin/reports/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (action === 'warn') await fetch(`/api/admin/users/${reportedUserId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ offenseStatus: 'warned', trustScore: 80 }) });
      if (action === 'mute') await fetch(`/api/admin/users/${reportedUserId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ offenseStatus: 'muted', trustScore: 60 }) });
      if (action === 'ban') await fetch(`/api/admin/users/${reportedUserId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ offenseStatus: 'banned', trustScore: 0 }) });

      await fetchAll();
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(u =>
    !searchQ || u.nickname.toLowerCase().includes(searchQ.toLowerCase()) ||
    (u.phoneNumber || '').includes(searchQ) || u.city?.toLowerCase().includes(searchQ.toLowerCase())
  );

  const pendingReports = reports.filter(r => r.status === 'Pending');

  const TABS: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <BarChart2 size={13} /> },
    { id: 'users', label: 'Users', icon: <Users size={13} />, badge: users.length },
    { id: 'reports', label: 'Reports', icon: <ShieldAlert size={13} />, badge: pendingReports.length || undefined },
    { id: 'posts', label: 'Posts', icon: <MessageSquare size={13} />, badge: posts.length },
  ];

  return (
    <div className="bg-[#0a0707] min-h-screen text-[#ece8e5]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0a0707]/95 backdrop-blur border-b border-neutral-900 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-600/20 border border-rose-500/20 flex items-center justify-center">
              <ShieldAlert size={14} className="text-rose-400" />
            </div>
            <div>
              <h1 className="text-xs font-black text-white uppercase tracking-widest">Suno Admin</h1>
              <p className="text-[9px] text-neutral-500">Moderation Console</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pendingReports.length > 0 && (
              <span className="px-2 py-0.5 bg-rose-600 rounded-full text-[9px] font-black text-white animate-pulse">
                {pendingReports.length} PENDING
              </span>
            )}
            <button
              onClick={fetchAll}
              className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors"
            >
              <RefreshCw size={12} />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mt-3">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all relative ${
                tab === t.id
                  ? 'bg-rose-600 text-white'
                  : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900'
              }`}
            >
              {t.icon} {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-black ${tab === t.id ? 'bg-white/20 text-white' : 'bg-rose-600 text-white'}`}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-neutral-600 text-sm">
            <RefreshCw size={16} className="animate-spin mr-2" /> Loading live data…
          </div>
        ) : (
          <>
            {/* ── OVERVIEW ── */}
            {tab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard icon={<Users size={16} />} label="Total Users" value={stats?.users ?? 0} sub={`${stats?.bannedUsers ?? 0} banned`} color="bg-blue-500/10 text-blue-400" />
                  <StatCard icon={<MessageSquare size={16} />} label="Total Chats" value={stats?.totalChats ?? 0} sub="messages sent" color="bg-emerald-500/10 text-emerald-400" />
                  <StatCard icon={<ShieldAlert size={16} />} label="Pending Reports" value={stats?.pendingReports ?? 0} sub={`${stats?.totalReports ?? 0} total`} color="bg-rose-500/10 text-rose-400" />
                  <StatCard icon={<Crown size={16} />} label="Premium Users" value={stats?.premiumUsers ?? 0} sub="paid subscribers" color="bg-amber-500/10 text-amber-400" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard icon={<FileText size={16} />} label="Community Posts" value={stats?.posts ?? 0} sub="across all rooms" color="bg-purple-500/10 text-purple-400" />
                  <StatCard icon={<Star size={16} />} label="Avg Trust Score" value={stats?.avgTrustScore ?? '—'} sub="platform average" color="bg-teal-500/10 text-teal-400" />
                  <StatCard icon={<Ban size={16} />} label="Banned Accounts" value={stats?.bannedUsers ?? 0} sub="removed from platform" color="bg-red-500/10 text-red-400" />
                  <StatCard icon={<Activity size={16} />} label="Active Reports" value={stats?.pendingReports ?? 0} sub="awaiting action" color="bg-orange-500/10 text-orange-400" />
                </div>

                {/* Quick status summary */}
                <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4">
                  <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Zap size={11} className="text-amber-400" /> Platform Health
                  </h3>
                  <div className="space-y-2">
                    {[
                      { label: 'Safe Users', value: users.filter(u => u.offenseStatus === 'clear').length, total: users.length, color: 'bg-emerald-500' },
                      { label: 'Warned Users', value: users.filter(u => u.offenseStatus === 'warned').length, total: users.length, color: 'bg-amber-500' },
                      { label: 'Muted / Suspended', value: users.filter(u => ['muted','suspended'].includes(u.offenseStatus)).length, total: users.length, color: 'bg-orange-500' },
                      { label: 'Banned', value: users.filter(u => u.offenseStatus === 'banned').length, total: users.length, color: 'bg-rose-500' },
                    ].map(row => (
                      <div key={row.label} className="flex items-center gap-3">
                        <p className="text-[10px] text-neutral-400 w-36">{row.label}</p>
                        <div className="flex-1 h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                          <div className={`h-full ${row.color} rounded-full transition-all`} style={{ width: row.total ? `${(row.value / row.total) * 100}%` : '0%' }} />
                        </div>
                        <p className="text-[10px] font-mono text-white w-6 text-right">{row.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent pending reports preview */}
                {pendingReports.length > 0 && (
                  <div className="bg-rose-950/20 border border-rose-500/20 rounded-2xl p-4">
                    <h3 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <AlertOctagon size={11} /> {pendingReports.length} Report{pendingReports.length > 1 ? 's' : ''} Awaiting Action
                    </h3>
                    <div className="space-y-2">
                      {pendingReports.slice(0, 3).map(r => (
                        <div key={r.id} className="flex items-center justify-between text-xs bg-neutral-950/50 p-2.5 rounded-lg">
                          <span className="text-rose-300 font-bold">{r.reportedUserNickname}</span>
                          <span className="text-neutral-500">→</span>
                          <span className="text-amber-400 text-[10px] font-bold uppercase">{r.reason}</span>
                          <button onClick={() => setTab('reports')} className="text-[9px] text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-lg hover:bg-rose-500/10">
                            Review
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── USERS ── */}
            {tab === 'users' && (
              <div className="space-y-3">
                <div className="flex gap-2 items-center">
                  <div className="flex-1 relative">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                      value={searchQ}
                      onChange={e => setSearchQ(e.target.value)}
                      placeholder="Search by name, phone, city…"
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                  <span className="text-[10px] text-neutral-500 whitespace-nowrap">{filteredUsers.length} users</span>
                </div>

                {filteredUsers.length === 0 ? (
                  <div className="text-center py-12 text-neutral-600 text-sm">
                    <UserCheck size={32} className="mx-auto mb-2 text-neutral-800" />
                    No users yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredUsers.map(u => (
                      <div key={u.uid} className="bg-neutral-950 border border-neutral-800 rounded-2xl p-3">
                        <div className="flex items-start gap-3">
                          <img src={u.avatar} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-neutral-800" onError={e => { (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(u.nickname) + '&background=1a1a1a&color=888'; }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-black text-white">{u.nickname}</span>
                              {u.isAdmin && <span className="text-[8px] bg-rose-600/20 border border-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded font-bold">ADMIN</span>}
                              {u.voiceVerified && <span className="text-[8px] bg-blue-600/20 border border-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-bold">VERIFIED</span>}
                              {u.isPremium && <span className="text-[8px] bg-amber-600/20 border border-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">PREMIUM</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[9px] text-neutral-500">{u.gender} · {u.ageRange} · {u.city || 'India'}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold capitalize ${STATUS_COLORS[u.offenseStatus] || 'text-neutral-400'}`}>
                                {u.offenseStatus}
                              </span>
                              <span className="text-[9px] text-neutral-600 font-mono">Trust: {u.trustScore}</span>
                            </div>
                            {u.phoneNumber && (
                              <p className="text-[9px] text-neutral-600 font-mono mt-0.5">{u.phoneNumber}</p>
                            )}
                          </div>
                        </div>

                        {/* Action row */}
                        <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-neutral-900">
                          {u.offenseStatus !== 'warned' && u.offenseStatus !== 'banned' && (
                            <button
                              onClick={() => updateUser(u.uid, { offenseStatus: 'warned', trustScore: Math.max(0, u.trustScore - 15) })}
                              disabled={actionLoading === u.uid}
                              className="flex items-center gap-1 px-2.5 py-1 bg-neutral-900 hover:bg-amber-500/10 border border-neutral-800 hover:border-amber-500/20 text-amber-400 text-[9px] font-bold rounded-lg transition-all disabled:opacity-50"
                            >
                              <AlertTriangle size={9} /> Warn
                            </button>
                          )}
                          {u.offenseStatus !== 'muted' && u.offenseStatus !== 'banned' && (
                            <button
                              onClick={() => updateUser(u.uid, { offenseStatus: 'muted', trustScore: Math.max(0, u.trustScore - 25) })}
                              disabled={actionLoading === u.uid}
                              className="flex items-center gap-1 px-2.5 py-1 bg-neutral-900 hover:bg-orange-500/10 border border-neutral-800 hover:border-orange-500/20 text-orange-400 text-[9px] font-bold rounded-lg transition-all disabled:opacity-50"
                            >
                              <Lock size={9} /> Mute
                            </button>
                          )}
                          {u.offenseStatus !== 'banned' && (
                            <button
                              onClick={() => updateUser(u.uid, { offenseStatus: 'banned', trustScore: 0 })}
                              disabled={actionLoading === u.uid}
                              className="flex items-center gap-1 px-2.5 py-1 bg-neutral-900 hover:bg-rose-500/10 border border-neutral-800 hover:border-rose-500/20 text-rose-400 text-[9px] font-bold rounded-lg transition-all disabled:opacity-50"
                            >
                              <Ban size={9} /> Ban
                            </button>
                          )}
                          {u.offenseStatus !== 'clear' && (
                            <button
                              onClick={() => updateUser(u.uid, { offenseStatus: 'clear', trustScore: 85, offenseCount: 0 })}
                              disabled={actionLoading === u.uid}
                              className="flex items-center gap-1 px-2.5 py-1 bg-neutral-900 hover:bg-emerald-500/10 border border-neutral-800 hover:border-emerald-500/20 text-emerald-400 text-[9px] font-bold rounded-lg transition-all disabled:opacity-50"
                            >
                              <CheckCircle size={9} /> Clear
                            </button>
                          )}
                          {!u.isAdmin && (
                            <button
                              onClick={() => updateUser(u.uid, { isAdmin: true })}
                              disabled={actionLoading === u.uid}
                              className="flex items-center gap-1 px-2.5 py-1 bg-neutral-900 hover:bg-purple-500/10 border border-neutral-800 hover:border-purple-500/20 text-purple-400 text-[9px] font-bold rounded-lg transition-all disabled:opacity-50"
                            >
                              <Award size={9} /> Make Admin
                            </button>
                          )}
                          <button
                            onClick={() => deleteUser(u.uid, u.nickname)}
                            disabled={actionLoading === u.uid}
                            className="flex items-center gap-1 px-2.5 py-1 bg-neutral-900 hover:bg-red-500/10 border border-neutral-800 hover:border-red-500/20 text-red-500 text-[9px] font-bold rounded-lg transition-all disabled:opacity-50 ml-auto"
                          >
                            <Trash2 size={9} /> Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── REPORTS ── */}
            {tab === 'reports' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-neutral-500">{pendingReports.length} pending · {reports.length} total</p>
                </div>

                {reports.length === 0 ? (
                  <div className="text-center py-12">
                    <Shield size={32} className="mx-auto mb-2 text-emerald-800" />
                    <p className="text-sm text-emerald-400 font-bold">All clear! No reports.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {reports.map(r => (
                      <div key={r.id} className={`border rounded-2xl overflow-hidden transition-all ${r.status === 'Pending' ? 'bg-rose-950/10 border-rose-500/20' : 'bg-neutral-950 border-neutral-800'}`}>
                        <div
                          className="p-3 flex items-center gap-3 cursor-pointer"
                          onClick={() => setExpandedReport(expandedReport === r.id ? null : r.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black text-rose-300">{r.reportedUserNickname}</span>
                              <span className="text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase">{r.reason}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${r.status === 'Pending' ? 'text-rose-400 bg-rose-500/10' : 'text-emerald-400 bg-emerald-500/10'}`}>
                                {r.status}
                              </span>
                            </div>
                            <p className="text-[9px] text-neutral-500 mt-0.5">
                              By {r.reporterNickname} · {new Date(r.timestamp).toLocaleDateString('en-IN')}
                            </p>
                          </div>
                          {expandedReport === r.id ? <ChevronUp size={12} className="text-neutral-500 flex-shrink-0" /> : <ChevronDown size={12} className="text-neutral-500 flex-shrink-0" />}
                        </div>

                        {expandedReport === r.id && (
                          <div className="px-3 pb-3 space-y-3 border-t border-neutral-900/50">
                            {r.evidence.length > 0 && (
                              <div>
                                <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5 mt-3">Chat Evidence</p>
                                <div className="bg-neutral-950 border border-neutral-900 rounded-xl p-2.5 space-y-1 font-mono max-h-28 overflow-y-auto">
                                  {r.evidence.map((line, i) => (
                                    <p key={i} className="text-[10px] text-neutral-300 border-b border-neutral-900/50 pb-1 last:border-0">{line}</p>
                                  ))}
                                </div>
                              </div>
                            )}

                            {r.status === 'Pending' && (
                              <div className="flex flex-wrap gap-1.5">
                                <button onClick={() => resolveReport(r.id, 'Dismissed', r.reportedUserId, 'none')} disabled={actionLoading === r.id} className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 text-[9px] font-bold rounded-lg transition-all disabled:opacity-50">Dismiss</button>
                                <button onClick={() => resolveReport(r.id, 'Reviewed_Warning', r.reportedUserId, 'warn')} disabled={actionLoading === r.id} className="flex items-center gap-1 px-2.5 py-1 bg-neutral-900 hover:bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-bold rounded-lg transition-all disabled:opacity-50"><AlertTriangle size={9} /> Warn User</button>
                                <button onClick={() => resolveReport(r.id, 'Reviewed_Mute', r.reportedUserId, 'mute')} disabled={actionLoading === r.id} className="flex items-center gap-1 px-2.5 py-1 bg-neutral-900 hover:bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[9px] font-bold rounded-lg transition-all disabled:opacity-50"><Clock size={9} /> Mute 24h</button>
                                <button onClick={() => resolveReport(r.id, 'Reviewed_Banned', r.reportedUserId, 'ban')} disabled={actionLoading === r.id} className="flex items-center gap-1 px-2.5 py-1 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/20 text-rose-400 text-[9px] font-bold rounded-lg transition-all disabled:opacity-50"><Ban size={9} /> Ban User</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── POSTS ── */}
            {tab === 'posts' && (
              <div className="space-y-3">
                <p className="text-[10px] text-neutral-500">{posts.length} community posts</p>

                {posts.length === 0 ? (
                  <div className="text-center py-12 text-neutral-600 text-sm">
                    <MessageSquare size={32} className="mx-auto mb-2 text-neutral-800" />
                    No posts yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {posts.map(p => (
                      <div key={p.id} className="bg-neutral-950 border border-neutral-800 rounded-2xl p-3">
                        <div className="flex items-start gap-2.5">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-[10px] font-black text-white">{p.authorNickname}</span>
                              <span className="text-[9px] text-neutral-600 bg-neutral-900 px-1.5 py-0.5 rounded font-mono">{p.roomId.replace('room_', '')}</span>
                              <span className="text-[9px] text-neutral-600">Trust: {p.authorTrustScore}</span>
                              <span className="text-[9px] text-neutral-600">{p.replyCount} replies</span>
                            </div>
                            <p className="text-xs text-neutral-300 leading-relaxed line-clamp-3">{p.content}</p>
                            <p className="text-[9px] text-neutral-600 mt-1">{new Date(p.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                          <button
                            onClick={() => deletePost(p.id)}
                            disabled={actionLoading === p.id}
                            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-red-500/10 border border-neutral-800 hover:border-red-500/20 text-neutral-600 hover:text-red-400 transition-all flex-shrink-0 disabled:opacity-50"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
