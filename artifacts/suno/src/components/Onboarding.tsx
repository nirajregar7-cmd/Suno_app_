import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserSession, GenderType } from '../types';
import {
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Check,
  AlertCircle,
  Camera,
  Upload,
  MapPin,
  Globe,
  Calendar,
  Heart,
  Users,
  Zap,
  Star,
  Lock,
} from 'lucide-react';

interface OnboardingProps {
  onComplete: (userSession: UserSession) => void;
  realRegisteredUsers: UserSession[];
}

const ADMIN_PHONE_NUMBERS = ['9000000005'];

const MALE_PRESETS = [
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
];

const FEMALE_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80',
];

export function getSeededPhotosForPeer(uid: string, gender: string, avatar: string): string[] {
  const pool = gender === 'female' ? FEMALE_PRESETS : MALE_PRESETS;
  const filtered = pool.filter(p => p !== avatar);
  return [avatar, ...filtered.slice(0, 3)];
}

const NICK_ADJ = ['Desi', 'Sweet', 'Royal', 'Cool', 'Quiet', 'Kind', 'Wise', 'Bold', 'Zen', 'Happy', 'Gentle', 'Proud'];
const NICK_NOUN = ['Hero', 'Soul', 'Friend', 'Rider', 'Star', 'Thinker', 'Wave', 'Guide', 'Heart', 'Spirit', 'Spark', 'Gem'];

const INTERESTS = [
  { label: 'Mental Peace 🧘', value: 'Mental Peace' },
  { label: 'Relationships 💕', value: 'Relationships' },
  { label: 'Career Advice 💼', value: 'Career Advice' },
  { label: 'College Life 🎓', value: 'College Life' },
  { label: 'Bollywood 🎬', value: 'Bollywood' },
  { label: 'Fitness & Yoga 🏋️', value: 'Fitness & Yoga' },
  { label: 'Startups & Tech 🚀', value: 'Startups & Tech' },
];

const INDIAN_CITIES = [
  'Mumbai, Maharashtra', 'Delhi NCR', 'Bengaluru, Karnataka', 'Pune, Maharashtra',
  'Kolkata, West Bengal', 'Chennai, Tamil Nadu', 'Hyderabad, Telangana',
  'Jaipur, Rajasthan', 'Lucknow, Uttar Pradesh', 'Ahmedabad, Gujarat',
  'Patna, Bihar', 'Indore, Madhya Pradesh', 'Other City in India',
];

const LANGUAGES = [
  { value: 'Hindi', label: 'Hindi (हिन्दी)' },
  { value: 'English', label: 'English' },
  { value: 'Marathi', label: 'Marathi (मराठी)' },
  { value: 'Punjabi', label: 'Punjabi (ਪੰਜਾਬੀ)' },
  { value: 'Tamil', label: 'Tamil (தமிழ்)' },
  { value: 'Telugu', label: 'Telugu (తెలుగు)' },
  { value: 'Bengali', label: 'Bengali (বাংলা)' },
  { value: 'Gujarati', label: 'Gujarati (ગુજરાતી)' },
];

// Step indicator
function StepDot({ active, done }: { active: boolean; done: boolean }) {
  return (
    <div className={`w-2 h-2 rounded-full transition-all duration-300 ${done ? 'bg-orange-500' : active ? 'bg-white' : 'bg-neutral-700'}`} />
  );
}

export default function Onboarding({ onComplete, realRegisteredUsers = [] }: OnboardingProps) {
  const [tab, setTab] = useState<'signup' | 'login'>('signup');
  const [step, setStep] = useState(1); // 1=identity, 2=profile, 3=preferences

  // Shared
  const [mobileNumber, setMobileNumber] = useState('');
  const [errorText, setErrorText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1 – Identity
  const [gender, setGender] = useState<GenderType>('male');
  const [nickname, setNickname] = useState('');
  const [birthYear, setBirthYear] = useState<number>(2000);

  // Step 2 – Profile
  const [selectedAvatar, setSelectedAvatar] = useState(MALE_PRESETS[0]);
  const [photoOption, setPhotoOption] = useState<'preset' | 'upload'>('preset');
  const [uploadError, setUploadError] = useState('');
  const [bioInput, setBioInput] = useState('');

  // Step 3 – Preferences
  const [selectedCity, setSelectedCity] = useState(INDIAN_CITIES[0]);
  const [language, setLanguage] = useState('Hindi');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['Mental Peace', 'Relationships']);
  const [ruleConfirmed, setRuleConfirmed] = useState(false);

  const generateNick = () => {
    const adj = NICK_ADJ[Math.floor(Math.random() * NICK_ADJ.length)];
    const noun = NICK_NOUN[Math.floor(Math.random() * NICK_NOUN.length)];
    const num = Math.floor(100 + Math.random() * 900);
    setNickname(`${adj}${noun}_${num}`);
  };

  useEffect(() => {
    generateNick();
    setSelectedAvatar(gender === 'female' ? FEMALE_PRESETS[0] : MALE_PRESETS[0]);
  }, [gender]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setUploadError('Max 2 MB'); return; }
    setUploadError('');
    const reader = new FileReader();
    reader.onloadend = () => setSelectedAvatar(reader.result as string);
    reader.readAsDataURL(file);
  };

  const toggleInterest = (val: string) => {
    setSelectedInterests(prev =>
      prev.includes(val) ? prev.filter(i => i !== val) : [...prev, val]
    );
  };

  // LOGIN flow
  const handleLogin = async () => {
    setErrorText('');
    if (!mobileNumber || mobileNumber.length < 10) {
      setErrorText('Enter a valid 10-digit mobile number.');
      return;
    }
    setIsSubmitting(true);
    try {
      // First check in-memory cache
      const digits = mobileNumber.replace(/\D/g, '');
      let found = realRegisteredUsers.find(u => {
        const uDigits = (u.phoneNumber || '').replace(/\D/g, '');
        return uDigits === digits || uDigits.endsWith(digits);
      });

      // If not found locally, do a fresh fetch from the DB
      if (!found) {
        const res = await fetch('/api/db-users');
        const data = await res.json();
        if (data && data.users) {
          found = (data.users as UserSession[]).find(u => {
            const uDigits = (u.phoneNumber || '').replace(/\D/g, '');
            return uDigits === digits || uDigits.endsWith(digits);
          });
        }
      }

      const isAdminNumber = ADMIN_PHONE_NUMBERS.includes(digits);

      if (found) {
        onComplete(isAdminNumber ? { ...found, isAdmin: true } : found);
      } else if (isAdminNumber) {
        onComplete({
          uid: `usr_${digits}`,
          nickname: 'Admin',
          gender: 'male',
          avatar: `https://ui-avatars.com/api/?name=Admin&background=9f1239&color=fff&size=150`,
          ageRange: '18-25',
          city: 'India',
          country: 'India',
          language: 'Hindi',
          interests: [],
          trustScore: 100,
          offenseStatus: 'clear',
          offenseCount: 0,
          isAdmin: true,
          voiceVerified: true,
          isPremium: true,
          phoneNumber: `+91 ${digits}`,
          safetySettings: { hideGender: false, verifiedUsersOnly: false, ageRangeFilter: 'all' },
          joinedAt: new Date().toISOString(),
        } as any);
      } else {
        setErrorText(`No account found for +91 ${mobileNumber}. Please create a profile first.`);
        setIsSubmitting(false);
      }
    } catch (err) {
      setErrorText('Network error. Please try again.');
      setIsSubmitting(false);
    }
  };

  // STEP validations
  const validateStep1 = () => {
    if (!nickname.trim()) { setErrorText('Please enter a nickname.'); return false; }
    if (!mobileNumber || mobileNumber.length < 10) { setErrorText('Enter a valid 10-digit mobile number.'); return false; }
    const duplicate = realRegisteredUsers.find(u => u.phoneNumber === `+91 ${mobileNumber}`);
    if (duplicate) { setErrorText('This number is already registered. Use the Login tab.'); return false; }
    const age = new Date().getFullYear() - birthYear;
    if (age < 18) { setErrorText(`You must be 18+. Your age: ${age}.`); return false; }
    setErrorText('');
    return true;
  };

  const validateStep2 = () => { setErrorText(''); return true; };

  const validateStep3 = () => {
    if (!ruleConfirmed) { setErrorText('Please confirm the safety rules.'); return false; }
    setErrorText('');
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep(s => s + 1);
  };

  const handleSubmit = () => {
    if (!validateStep3()) return;
    setIsSubmitting(true);
    const age = new Date().getFullYear() - birthYear;
    setTimeout(() => {
      onComplete({
        uid: `usr_india_${Date.now()}`,
        nickname: nickname.trim(),
        avatar: selectedAvatar,
        uploadedPhotos: getSeededPhotosForPeer(`usr_${Date.now()}`, gender, selectedAvatar),
        city: selectedCity,
        ageRange: age <= 24 ? '18-24' : age <= 34 ? '25-34' : age <= 44 ? '35-44' : '45+',
        gender,
        country: 'India',
        language,
        interests: selectedInterests,
        bio: bioInput.trim() || `Connecting from ${selectedCity}. Open to respectful conversations!`,
        trustScore: 100,
        offenseCount: 0,
        offenseStatus: 'clear',
        phoneNumber: `+91 ${mobileNumber}`,
        voiceVerified: false,
        safetySettings: {
          hideGender: false,
          anonymousMode: false,
          limitIncomingChats: false,
          verifiedUsersOnly: true,
        },
        paymentDetails: {
          freeTrialMinutesLeft: 10,
          isPremiumSignedUp: false,
          hasAutoPayEnabled: false,
        },
      });
      setIsSubmitting(false);
    }, 800);
  };

  const presets = gender === 'female' ? FEMALE_PRESETS : MALE_PRESETS;

  return (
    <div className="min-h-screen bg-[#070505] flex items-center justify-center p-4 py-10 relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-120px] left-[-120px] w-[500px] h-[500px] bg-orange-600/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-80px] right-[-80px] w-[400px] h-[400px] bg-emerald-600/8 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-rose-900/5 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Hero header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 shadow-2xl shadow-orange-500/20 mb-4">
            <ShieldCheck className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white">
            Suno India <span className="text-2xl">🇮🇳</span>
          </h1>
          <p className="text-neutral-400 text-xs mt-1.5 font-medium tracking-wide">
            Safe · Anonymous · Peer Support · Made for India
          </p>
          {/* Trust badges */}
          <div className="flex items-center justify-center gap-3 mt-3">
            {[
              { icon: <Lock size={10} />, label: 'E2E Encrypted' },
              { icon: <ShieldCheck size={10} />, label: 'AI Moderated' },
              { icon: <Users size={10} />, label: '18+ Only' },
            ].map(b => (
              <span key={b.label} className="flex items-center gap-1 text-[9px] font-bold text-neutral-400 bg-neutral-900 border border-neutral-800 px-2 py-1 rounded-full">
                <span className="text-orange-400">{b.icon}</span> {b.label}
              </span>
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#110c0b]/95 border border-neutral-800/70 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl">
          {/* Tab switcher */}
          <div className="flex p-1.5 bg-neutral-950 border-b border-neutral-800/50 gap-1">
            {(['signup', 'login'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setErrorText(''); setStep(1); }}
                className={`flex-1 py-2.5 text-[11px] font-black uppercase tracking-wider rounded-2xl transition-all cursor-pointer ${
                  tab === t
                    ? 'bg-gradient-to-r from-orange-600 to-rose-600 text-white shadow-lg'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                {t === 'signup' ? '📝 Create Profile' : '🔑 Login'}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Error banner */}
            <AnimatePresence mode="wait">
              {errorText && (
                <motion.div
                  key="err"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mb-4 p-3 bg-red-950/40 border border-red-500/30 rounded-xl flex items-start gap-2 text-xs text-red-300"
                >
                  <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-400" />
                  <span>{errorText}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── LOGIN ── */}
            {tab === 'login' ? (
              <div className="space-y-5">
                <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 space-y-1">
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="text-orange-400">🔑</span> Welcome back
                  </p>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Enter your registered mobile number to instantly access your profile.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-300">Mobile Number (+91)</label>
                  <div className="flex gap-2">
                    <span className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 flex items-center text-xs text-neutral-400 font-mono font-bold">
                      🇮🇳 +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={mobileNumber}
                      onChange={e => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                      className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm font-mono text-white focus:ring-1 focus:ring-orange-500 focus:outline-none"
                      placeholder="9876543210"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={isSubmitting}
                  className="w-full py-3 bg-gradient-to-r from-orange-600 to-rose-600 hover:opacity-90 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-orange-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <><ArrowRight size={14} /> Enter Suno</>
                  )}
                </button>
              </div>
            ) : (
              /* ── SIGNUP ── */
              <div>
                {/* Step dots */}
                <div className="flex items-center justify-center gap-2 mb-5">
                  {[1, 2, 3].map(s => (
                    <StepDot key={s} active={step === s} done={step > s} />
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {/* ── STEP 1: Identity ── */}
                  {step === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-5"
                    >
                      <div className="text-center mb-2">
                        <p className="text-sm font-black text-white">Who are you? 👤</p>
                        <p className="text-[11px] text-neutral-500 mt-0.5">Set up your anonymous identity</p>
                      </div>

                      {/* Gender */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">I am a</label>
                        <div className="grid grid-cols-2 gap-3">
                          {([
                            { val: 'male', emoji: '👦', label: 'Boy (Male)', color: 'blue' },
                            { val: 'female', emoji: '👧', label: 'Girl (Female)', color: 'rose' },
                          ] as const).map(g => (
                            <button
                              key={g.val}
                              type="button"
                              onClick={() => setGender(g.val)}
                              className={`py-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                                gender === g.val
                                  ? g.val === 'male'
                                    ? 'bg-blue-600/10 border-blue-500 shadow-lg shadow-blue-500/10'
                                    : 'bg-rose-600/10 border-rose-500 shadow-lg shadow-rose-500/10'
                                  : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
                              }`}
                            >
                              <span className="text-3xl">{g.emoji}</span>
                              <span className={`text-xs font-black ${gender === g.val ? (g.val === 'male' ? 'text-blue-400' : 'text-rose-400') : 'text-neutral-400'}`}>
                                {g.label}
                              </span>
                              {gender === g.val && (
                                <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-0.5">
                                  <Check size={9} /> Selected
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Nickname */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-neutral-300">Your Anonymous Handle</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            maxLength={20}
                            value={nickname}
                            onChange={e => setNickname(e.target.value)}
                            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm font-bold text-white focus:ring-1 focus:ring-orange-500 focus:outline-none"
                            placeholder="e.g. DesiSoul_429"
                          />
                          <button
                            type="button"
                            onClick={generateNick}
                            className="px-3 bg-orange-600/10 hover:bg-orange-600/20 border border-orange-500/30 rounded-xl text-orange-400 transition-colors cursor-pointer"
                            title="Generate random nickname"
                          >
                            <Sparkles size={14} />
                          </button>
                        </div>
                        <p className="text-[10px] text-neutral-500">100% anonymous — no real name needed</p>
                      </div>

                      {/* Mobile */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-neutral-300">Mobile Number (for login)</label>
                        <div className="flex gap-2">
                          <span className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 flex items-center text-xs text-neutral-400 font-mono font-bold">
                            🇮🇳 +91
                          </span>
                          <input
                            type="tel"
                            maxLength={10}
                            value={mobileNumber}
                            onChange={e => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm font-mono text-white focus:ring-1 focus:ring-orange-500 focus:outline-none"
                            placeholder="9876543210"
                          />
                        </div>
                        <p className="text-[10px] text-neutral-500 flex items-center gap-1">
                          <Lock size={9} /> Used only to log back in — never shared
                        </p>
                      </div>

                      {/* Birth year */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                          <Calendar size={12} className="text-orange-400" /> Year of Birth (must be 18+)
                        </label>
                        <input
                          type="number"
                          min={1960}
                          max={new Date().getFullYear() - 18}
                          value={birthYear}
                          onChange={e => setBirthYear(Number(e.target.value))}
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm font-mono text-white focus:ring-1 focus:ring-orange-500 focus:outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleNext}
                        className="w-full py-3 bg-gradient-to-r from-orange-600 to-rose-600 hover:opacity-90 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        Continue <ArrowRight size={14} />
                      </button>
                    </motion.div>
                  )}

                  {/* ── STEP 2: Profile Photo & Bio ── */}
                  {step === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-5"
                    >
                      <div className="text-center mb-2">
                        <p className="text-sm font-black text-white">Your Profile 📸</p>
                        <p className="text-[11px] text-neutral-500 mt-0.5">Pick a photo and write a short intro</p>
                      </div>

                      {/* Avatar preview + tabs */}
                      <div className="flex flex-col items-center gap-4">
                        <div className={`w-24 h-24 rounded-3xl overflow-hidden border-2 shadow-xl ${gender === 'female' ? 'border-rose-500 shadow-rose-500/20' : 'border-blue-500 shadow-blue-500/20'}`}>
                          <img src={selectedAvatar} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="Avatar" />
                        </div>

                        {/* Option tabs */}
                        <div className="flex bg-neutral-950 border border-neutral-800 p-1 rounded-xl gap-1 w-full">
                          {(['preset', 'upload'] as const).map(opt => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setPhotoOption(opt)}
                              className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${photoOption === opt ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                            >
                              {opt === 'preset' ? '🏙️ Presets' : '📤 Upload'}
                            </button>
                          ))}
                        </div>

                        {photoOption === 'preset' && (
                          <div className="flex gap-2 flex-wrap justify-center">
                            {presets.map((src, i) => (
                              <button
                                key={src}
                                type="button"
                                onClick={() => setSelectedAvatar(src)}
                                className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${selectedAvatar === src ? (gender === 'female' ? 'border-rose-500 scale-105' : 'border-blue-500 scale-105') : 'border-transparent hover:scale-105'}`}
                              >
                                <img referrerPolicy="no-referrer" src={src} className="w-full h-full object-cover" alt={`Preset ${i + 1}`} />
                              </button>
                            ))}
                          </div>
                        )}

                        {photoOption === 'upload' && (
                          <label className="w-full border border-dashed border-neutral-700 hover:border-orange-500/50 bg-neutral-900/50 rounded-2xl p-5 flex flex-col items-center gap-2 cursor-pointer transition-colors">
                            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                            <Upload size={20} className="text-orange-400" />
                            <span className="text-xs font-bold text-neutral-300">Click to upload photo</span>
                            <span className="text-[10px] text-neutral-500">JPG / PNG / WEBP · Max 2 MB</span>
                            {uploadError && <p className="text-[10px] text-rose-400 font-semibold">{uploadError}</p>}
                          </label>
                        )}
                      </div>

                      {/* Bio */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-neutral-300">Short Bio (optional)</label>
                        <textarea
                          maxLength={120}
                          rows={3}
                          value={bioInput}
                          onChange={e => setBioInput(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white focus:ring-1 focus:ring-orange-500 focus:outline-none resize-none"
                          placeholder="e.g. College student from Delhi. Love discussing career goals and mental health..."
                        />
                        <p className="text-[10px] text-neutral-600 text-right">{bioInput.length}/120</p>
                      </div>

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="px-4 py-3 bg-neutral-900 border border-neutral-800 text-neutral-300 font-bold text-xs rounded-2xl hover:bg-neutral-800 transition-all cursor-pointer"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={handleNext}
                          className="flex-1 py-3 bg-gradient-to-r from-orange-600 to-rose-600 hover:opacity-90 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          Continue <ArrowRight size={14} />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* ── STEP 3: Preferences & Submit ── */}
                  {step === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-5"
                    >
                      <div className="text-center mb-2">
                        <p className="text-sm font-black text-white">Your Preferences 🌏</p>
                        <p className="text-[11px] text-neutral-500 mt-0.5">Customize your Suno experience</p>
                      </div>

                      {/* City */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                          <MapPin size={12} className="text-orange-400" /> Your City / Region
                        </label>
                        <select
                          value={selectedCity}
                          onChange={e => setSelectedCity(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-neutral-200 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                        >
                          {INDIAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      {/* Language */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                          <Globe size={12} className="text-orange-400" /> Preferred Language
                        </label>
                        <select
                          value={language}
                          onChange={e => setLanguage(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-neutral-200 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                        >
                          {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                        </select>
                      </div>

                      {/* Interests */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                          <Heart size={12} className="text-rose-400" /> Topics You Care About
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {INTERESTS.map(i => (
                            <button
                              key={i.value}
                              type="button"
                              onClick={() => toggleInterest(i.value)}
                              className={`text-[11px] font-bold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                                selectedInterests.includes(i.value)
                                  ? 'bg-orange-600/20 border-orange-500/50 text-orange-300'
                                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                              }`}
                            >
                              {i.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Safety rules */}
                      <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 space-y-3">
                        <p className="text-xs font-black text-white flex items-center gap-1.5">
                          <ShieldCheck size={13} className="text-emerald-400" /> Suno Safety Pledge
                        </p>
                        <ul className="space-y-1.5 text-[11px] text-neutral-400">
                          {[
                            '🚫 No sharing of personal contact info (phone, WhatsApp, Instagram)',
                            '🤝 Treat every person with respect — zero harassment',
                            '🔒 All conversations are AI-moderated for safety',
                            '⚠️ Violations result in immediate account suspension',
                          ].map(rule => (
                            <li key={rule} className="flex items-start gap-1.5">{rule}</li>
                          ))}
                        </ul>
                        <label className="flex items-center gap-2.5 mt-2 cursor-pointer">
                          <div
                            onClick={() => setRuleConfirmed(r => !r)}
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${ruleConfirmed ? 'bg-emerald-600 border-emerald-600' : 'border-neutral-700'}`}
                          >
                            {ruleConfirmed && <Check size={12} className="text-white" strokeWidth={3} />}
                          </div>
                          <span className="text-[11px] font-bold text-neutral-300">I agree to the Safety Rules</span>
                        </label>
                      </div>

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          className="px-4 py-3 bg-neutral-900 border border-neutral-800 text-neutral-300 font-bold text-xs rounded-2xl hover:bg-neutral-800 transition-all cursor-pointer"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={handleSubmit}
                          disabled={isSubmitting}
                          className="flex-1 py-3 bg-gradient-to-r from-orange-600 to-rose-600 hover:opacity-90 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                        >
                          {isSubmitting ? (
                            <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          ) : (
                            <><Star size={13} /> Join Suno India</>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-4 text-center">
            <p className="text-[9px] text-neutral-600 font-mono">
              © {new Date().getFullYear()} Suno Safe Spaces · India · All conversations encrypted
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
