import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Send,
  Mic,
  MicOff,
  MoreVertical,
  ShieldCheck,
  HeartCrack,
  Flag,
  Check,
  CheckCheck,
  Play,
  Pause,
  X,
  Crown,
  Lock,
} from 'lucide-react';
import { ConversationMatch, UserSession, ChatMessage } from '../types';

interface ChatWindowProps {
  activeMatch: ConversationMatch;
  userSession: UserSession;
  chatInput: string;
  setChatInput: (v: string) => void;
  isPeerTyping: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onSendMessage: (e: React.FormEvent) => void;
  onExit: () => void;
  onReport: (reason: string) => void;
  playingVoiceMessages: Record<string, boolean>;
  voicePlaybackProgress: Record<string, number>;
  onPlayVoice: (id: string, text: string, isUser: boolean, duration: number) => void;
  isRecordingVoice: boolean;
  voiceRecordSeconds: number;
  onStartRecordVoice: () => void;
  onSendVoice: () => void;
  onCancelVoice: () => void;
  freeTrialSeconds: number;
  isPremium: boolean;
  onUpgradePremium: () => void;
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDateLabel(ts: string) {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function groupByDate(messages: ChatMessage[]) {
  const groups: { label: string; messages: ChatMessage[] }[] = [];
  let currentLabel = '';
  for (const msg of messages) {
    const label = formatDateLabel(msg.timestamp);
    if (label !== currentLabel) {
      currentLabel = label;
      groups.push({ label, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  }
  return groups;
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      {[0, 150, 300].map((delay) => (
        <motion.span
          key={delay}
          className="w-2 h-2 rounded-full bg-neutral-400"
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.75, repeat: Infinity, delay: delay / 1000, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

const WAVE_HEIGHTS = [4, 8, 12, 7, 14, 10, 6, 14, 9, 13, 5, 11, 8, 14, 6, 10, 4, 12, 7, 10];

function VoiceBubble({
  msg,
  isUser,
  isPlaying,
  progress,
  onPlay,
  peer,
  showAvatar,
}: {
  msg: ChatMessage;
  isUser: boolean;
  isPlaying: boolean;
  progress: number;
  onPlay: () => void;
  peer: { avatar: string; nickname: string };
  showAvatar: boolean;
}) {
  const dur = msg.voiceDuration || 1;
  const mm = Math.floor(dur / 60);
  const ss = (dur % 60).toString().padStart(2, '0');

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18 }}
      className={`flex mb-1 ${isUser ? 'justify-end' : 'justify-start'} items-end gap-2`}
    >
      {!isUser && (
        <img
          referrerPolicy="no-referrer"
          src={peer.avatar}
          className={`w-8 h-8 rounded-full object-cover shrink-0 border border-neutral-700 ${showAvatar ? 'opacity-100' : 'opacity-0'}`}
          alt="peer"
        />
      )}

      <div className="flex flex-col" style={{ maxWidth: 'min(72%, 280px)' }}>
        {!isUser && showAvatar && (
          <span className="text-[11px] font-bold text-orange-400 ml-1 mb-1">{peer.nickname}</span>
        )}

        <div
          className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl shadow-md ${
            isUser
              ? 'bg-[#128C7E] rounded-tr-sm'
              : 'bg-[#1f1f1f] border border-neutral-800 rounded-tl-sm'
          }`}
          style={{ minWidth: 200 }}
        >
          <button
            type="button"
            onClick={onPlay}
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            {isPlaying
              ? <Pause size={16} className="text-white" />
              : <Play size={16} className="text-white ml-0.5" />}
          </button>

          <div className="flex-1 flex flex-col gap-1.5">
            <div className="flex items-end gap-[2px] h-7">
              {WAVE_HEIGHTS.map((h, i) => {
                const pct = (i / WAVE_HEIGHTS.length) * 100;
                const filled = progress >= pct;
                return (
                  <motion.div
                    key={i}
                    className="rounded-full flex-1"
                    style={{ backgroundColor: filled ? '#34d399' : 'rgba(255,255,255,0.25)' }}
                    animate={isPlaying ? { height: [`${h * 1.8}px`, `${h * 2.6}px`, `${h * 1.8}px`] } : { height: `${h * 1.8}px` }}
                    transition={isPlaying ? { duration: 0.5, repeat: Infinity, delay: i * 0.04, ease: 'easeInOut' } : { duration: 0.2 }}
                  />
                );
              })}
            </div>
          </div>

          <span className="text-[11px] font-mono text-white/70 shrink-0">{mm}:{ss}</span>
        </div>

        <div className={`flex items-center gap-1 mt-0.5 ${isUser ? 'justify-end' : 'justify-start'} px-1`}>
          <span className="text-[10px] text-neutral-500">{formatTime(msg.timestamp)}</span>
          {isUser && (msg.isRead
            ? <CheckCheck size={12} className="text-[#34B7F1]" />
            : <Check size={12} className="text-neutral-500" />
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function ChatWindow({
  activeMatch,
  userSession,
  chatInput,
  setChatInput,
  isPeerTyping,
  messagesEndRef,
  onSendMessage,
  onExit,
  onReport,
  playingVoiceMessages,
  voicePlaybackProgress,
  onPlayVoice,
  isRecordingVoice,
  voiceRecordSeconds,
  onStartRecordVoice,
  onSendVoice,
  onCancelVoice,
  freeTrialSeconds,
  isPremium,
  onUpgradePremium,
}: ChatWindowProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showReportMenu, setShowReportMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const peer = activeMatch.peer;
  const isMuted = userSession.offenseStatus === 'muted' || userSession.offenseStatus === 'banned';
  const dateGroups = groupByDate(activeMatch.messages);
  const trialMins = Math.floor(freeTrialSeconds / 60);
  const trialSecs = freeTrialSeconds % 60;
  const isCrossGender = peer.gender !== userSession.gender;
  const isFemale = userSession.gender === 'female';
  const isTrialExpired = !isPremium && isCrossGender && !isFemale && freeTrialSeconds === 0;

  useEffect(() => {
    if (!isRecordingVoice) inputRef.current?.focus();
  }, [activeMatch.peer.uid, isRecordingVoice]);

  // Scroll to bottom whenever messages change or typing indicator appears
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    // Use requestAnimationFrame so the DOM has rendered the new message first
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [activeMatch.messages, isPeerTyping]);

  const recMM = Math.floor(voiceRecordSeconds / 60);
  const recSS = (voiceRecordSeconds % 60).toString().padStart(2, '0');

  return (
    <motion.div
      key="chat_window"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex flex-col bg-[#0b0907]"
      style={{
        backgroundImage:
          'radial-gradient(ellipse at 15% 50%, rgba(234,88,12,0.05) 0%, transparent 55%), radial-gradient(ellipse at 85% 15%, rgba(244,63,94,0.04) 0%, transparent 55%)',
      }}
    >
      {/* ── HEADER ── */}
      <div
        className="flex items-center gap-2.5 px-3 bg-[#111009]/95 border-b border-neutral-800/50 backdrop-blur-xl shadow-md shrink-0"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 10px)', paddingBottom: 10 }}
      >
        <button
          type="button"
          onClick={onExit}
          className="flex items-center justify-center w-10 h-10 rounded-full text-neutral-300 hover:text-white hover:bg-neutral-800/60 transition-colors shrink-0"
        >
          <ArrowLeft size={22} />
        </button>

        <div className="relative shrink-0">
          <img
            referrerPolicy="no-referrer"
            src={peer.avatar}
            alt={peer.nickname}
            className="w-10 h-10 rounded-full object-cover border border-neutral-700 bg-neutral-900"
          />
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#111009]" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-white truncate leading-snug">{peer.nickname}</p>
          <AnimatePresence mode="wait">
            {isPeerTyping ? (
              <motion.p key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[12px] text-emerald-400 font-medium">
                typing...
              </motion.p>
            ) : (
              <motion.p key="loc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[12px] text-neutral-400 truncate">
                🇮🇳 {peer.city || 'India'} · online
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {!isPremium && (
          <button
            type="button"
            onClick={onUpgradePremium}
            className="text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-amber-600/15 border border-amber-500/30 text-amber-300 hover:bg-amber-600/25 transition-colors shrink-0"
          >
            ⏱ {trialMins}:{trialSecs.toString().padStart(2, '0')}
          </button>
        )}

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => { setShowMenu(v => !v); setShowReportMenu(false); }}
            className="flex items-center justify-center w-10 h-10 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800/60 transition-colors"
          >
            <MoreVertical size={20} />
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -6 }}
                className="absolute right-0 top-12 w-48 bg-[#1a1a1a] border border-neutral-700 rounded-2xl shadow-2xl z-50 overflow-hidden text-sm"
              >
                <button
                  type="button"
                  onClick={() => { setShowMenu(false); setShowReportMenu(true); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-neutral-800 text-red-400 transition-colors"
                >
                  <Flag size={14} /> Report User
                </button>
                <button
                  type="button"
                  onClick={() => { setShowMenu(false); onExit(); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-neutral-800 text-neutral-300 transition-colors border-t border-neutral-800"
                >
                  <HeartCrack size={14} className="text-rose-400" /> Exit Chat
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Report sub-menu */}
      <AnimatePresence>
        {showReportMenu && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-20 right-3 z-50 w-56 bg-[#1a1a1a] border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden text-sm"
          >
            <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
              <span className="font-bold text-neutral-300 text-xs uppercase tracking-wider flex items-center gap-1.5"><ShieldCheck size={12} /> Report Reason</span>
              <button type="button" onClick={() => setShowReportMenu(false)} className="text-neutral-500 hover:text-white"><X size={14} /></button>
            </div>
            {['Harassment', 'Abuse/Threats', 'Sexual content', 'Fake profile', 'Spam', 'PII Sharing'].map(r => (
              <button
                key={r}
                type="button"
                onClick={() => { onReport(r); setShowReportMenu(false); }}
                className="w-full text-left px-4 py-3 hover:bg-neutral-800 text-neutral-300 border-t border-neutral-800/50 first:border-0 transition-colors"
              >
                {r}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MESSAGES ── */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        onClick={() => { setShowMenu(false); setShowReportMenu(false); }}
      >
        {/* Inner column — min-h-full + justify-end anchors messages to the bottom */}
        <div className="flex flex-col min-h-full justify-end px-3 py-3">

        {dateGroups.map((group, gi) => (
          <div key={`${group.label}_${gi}`}>
            <div className="flex justify-center my-3">
              <span className="text-[11px] font-semibold text-neutral-400 bg-neutral-900/80 border border-neutral-800 px-3 py-1 rounded-full">
                {group.label}
              </span>
            </div>

            {group.messages.map((msg, idx) => {
              const isUser = msg.senderId === 'user';
              const isSystem = msg.senderId === 'system';
              const showAvatar =
                !isUser && !isSystem &&
                (idx === group.messages.length - 1 || group.messages[idx + 1]?.senderId !== msg.senderId);

              if (isSystem) {
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-center my-2"
                  >
                    <div className="bg-neutral-900/90 border border-neutral-800 text-neutral-400 text-[11px] px-4 py-2.5 rounded-2xl text-center leading-relaxed max-w-[85%]">
                      🛡️ {msg.content.replace(/^🛡️\s*/, '')}
                    </div>
                  </motion.div>
                );
              }

              if (msg.isVoice) {
                return (
                  <VoiceBubble
                    key={msg.id}
                    msg={msg}
                    isUser={isUser}
                    isPlaying={!!playingVoiceMessages[msg.id]}
                    progress={voicePlaybackProgress[msg.id] || 0}
                    onPlay={() => onPlayVoice(msg.id, msg.content, isUser, msg.voiceDuration || 1)}
                    peer={peer}
                    showAvatar={showAvatar}
                  />
                );
              }

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.16 }}
                  className={`flex mb-1 ${isUser ? 'justify-end' : 'justify-start'} items-end gap-2`}
                >
                  {!isUser && (
                    <img
                      referrerPolicy="no-referrer"
                      src={peer.avatar}
                      className={`w-8 h-8 rounded-full object-cover shrink-0 border border-neutral-700 ${showAvatar ? 'opacity-100' : 'opacity-0'}`}
                      alt="peer"
                    />
                  )}
                  <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`} style={{ maxWidth: 'min(75%, 320px)' }}>
                    {!isUser && showAvatar && (
                      <span className="text-[11px] font-bold text-orange-400 ml-2 mb-0.5">{peer.nickname}</span>
                    )}
                    <div
                      className={`px-4 py-2.5 shadow-sm ${
                        isUser
                          ? 'bg-[#128C7E] text-white rounded-2xl rounded-tr-sm'
                          : 'bg-[#1f1f1f] border border-neutral-800 text-white rounded-2xl rounded-tl-sm'
                      }`}
                    >
                      <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                      <div className={`flex items-center gap-1 mt-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-[10px] opacity-55">{formatTime(msg.timestamp)}</span>
                        {isUser && (msg.isRead
                          ? <CheckCheck size={12} className="text-[#34B7F1] opacity-90" />
                          : <Check size={12} className="text-neutral-500 opacity-80" />
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ))}

        <AnimatePresence>
          {isPeerTyping && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex items-end gap-2 mt-1"
            >
              <img
                referrerPolicy="no-referrer"
                src={peer.avatar}
                className="w-8 h-8 rounded-full object-cover shrink-0 border border-neutral-700"
                alt="peer"
              />
              <div className="bg-[#1f1f1f] border border-neutral-800 rounded-2xl rounded-tl-sm px-4 py-3">
                <TypingDots />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
        </div>{/* end inner column */}
      </div>

      {/* ── TRIAL EXPIRED PAYWALL ── */}
      <AnimatePresence>
        {isTrialExpired && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className="shrink-0 bg-[#0e0a06] border-t border-amber-500/20 px-4 pt-4 pb-5"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 20px)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Lock size={16} className="text-amber-400" />
              </div>
              <div>
                <p className="text-white font-black text-[13px]">Free trial ended</p>
                <p className="text-neutral-400 text-[11px]">Upgrade to keep chatting with {peer.nickname}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onUpgradePremium}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 rounded-2xl font-black text-black text-[13px] uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Crown size={15} />
              Get Suno Plus — ₹99/mo or ₹799/yr
            </button>
            <p className="text-center text-[9.5px] text-neutral-600 mt-2">
              UPI · PhonePe · GPay · Cards · Paytm
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── INPUT BAR ── */}
      {!isTrialExpired && (
      <div
        className="shrink-0 px-3 pt-2 bg-[#111009]/95 border-t border-neutral-800/50 backdrop-blur-xl"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 10px)' }}
      >
        <AnimatePresence mode="wait">
          {isRecordingVoice ? (
            <motion.div
              key="recording"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex items-center gap-3"
            >
              <button
                type="button"
                onClick={onCancelVoice}
                className="w-11 h-11 rounded-full flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors shrink-0"
              >
                <X size={20} />
              </button>

              <div className="flex-1 flex items-center gap-3 bg-neutral-900 border border-red-500/30 rounded-full px-4 h-11">
                <motion.span
                  className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <div className="flex items-end gap-[2px] flex-1 h-5">
                  {WAVE_HEIGHTS.slice(0, 14).map((h, i) => (
                    <motion.div
                      key={i}
                      className="flex-1 rounded-full bg-red-400"
                      animate={{ height: [`${h * 1.2}px`, `${h * 2.2}px`, `${h * 1.2}px`] }}
                      transition={{ duration: 0.4 + i * 0.03, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  ))}
                </div>
                <span className="text-[12px] font-mono text-red-400 font-bold shrink-0">
                  {recMM}:{recSS}
                </span>
              </div>

              <button
                type="button"
                onClick={onSendVoice}
                className="w-11 h-11 rounded-full flex items-center justify-center bg-[#128C7E] hover:bg-[#0f7a6e] text-white transition-colors shadow-lg shrink-0"
              >
                <Send size={20} />
              </button>
            </motion.div>
          ) : (
            <motion.form
              key="text-input"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              onSubmit={onSendMessage}
              className="flex items-end gap-2"
            >
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={isMuted}
                  placeholder={isMuted ? 'You are muted...' : `Message ${peer.nickname}...`}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-full px-4 text-[14px] text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-[#128C7E] focus:border-[#128C7E] transition-all disabled:opacity-50"
                  style={{ height: 44 }}
                />
              </div>

              <AnimatePresence mode="wait">
                {chatInput.trim() ? (
                  <motion.button
                    key="send"
                    type="submit"
                    disabled={isMuted}
                    className="w-11 h-11 rounded-full flex items-center justify-center bg-[#128C7E] hover:bg-[#0f7a6e] text-white transition-colors shadow-lg disabled:opacity-50 shrink-0"
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.7, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  >
                    <Send size={18} />
                  </motion.button>
                ) : (
                  <motion.button
                    key="mic"
                    type="button"
                    onClick={onStartRecordVoice}
                    disabled={isMuted}
                    className="w-11 h-11 rounded-full flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors shrink-0 disabled:opacity-50"
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.7, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  >
                    {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
      )}
    </motion.div>
  );
}
