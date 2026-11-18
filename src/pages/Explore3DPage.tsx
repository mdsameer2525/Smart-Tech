import {
  Atom,
  Box,
  CheckCircle2,
  Cpu,
  Globe,
  HeartPulse,
  Network,
  Search,
  Sparkles,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ThreeViewport } from '../explore/ThreeViewport';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import {
  fetchGamificationProfile,
  recordExploreCompletion,
  type ExploreSceneId,
  type GamificationProfile,
} from '../services/gamificationClient';

const LAB_MODULES: Array<{
  id: ExploreSceneId;
  title: string;
  category: string;
  minPartsRequired: number;
  xpReward: number;
  summary: string;
}> = [
  {
    id: 'solar_system',
    title: 'Solar System Observatory',
    category: 'Astronomy',
    minPartsRequired: 4,
    xpReward: 75,
    summary:
      'Orbit the Sun and 8 textured planets, adjust orbital speeds, zoom in on Saturn’s ice rings, and inspect planetary astrophysics.',
  },
  {
    id: 'human_anatomy',
    title: 'Human Anatomy Systems',
    category: 'Biology',
    minPartsRequired: 4,
    xpReward: 75,
    summary:
      'Isolate Skeletal, Cardiovascular, Nervous, Respiratory, and Digestive systems inside a 3D anatomical rig with beating heart and lung mechanics.',
  },
  {
    id: 'computer_network',
    title: 'Computer Network Topology',
    category: 'Networking',
    minPartsRequired: 4,
    xpReward: 75,
    summary:
      'Trace live packet routing across Client Workstations, Switches, Firewalls, Routers, Web Servers, and isolated Database tiers.',
  },
  {
    id: 'chemistry_lab',
    title: '3D Molecular Chemistry Lab',
    category: 'Chemistry',
    minPartsRequired: 3,
    xpReward: 75,
    summary:
      'Rotate CPK-colored covalent bonds for Water (H₂O), Carbon Dioxide (CO₂), Methane (CH₄), Ammonia (NH₃), and Ethanol.',
  },
  {
    id: 'computer_architecture',
    title: 'CPU & Computer Architecture',
    category: 'Computer Systems',
    minPartsRequired: 4,
    xpReward: 75,
    summary:
      'Step through Fetch, Decode, Execute, Memory, and Writeback stages across the Control Unit, ALU, Registers, Cache, and RAM buses.',
  },
];

function renderLabIcon(id: ExploreSceneId) {
  const cls = 'w-5 h-5';
  switch (id) {
    case 'solar_system':
      return <Globe className={cls} />;
    case 'human_anatomy':
      return <HeartPulse className={cls} />;
    case 'computer_network':
      return <Network className={cls} />;
    case 'chemistry_lab':
      return <Atom className={cls} />;
    case 'computer_architecture':
      return <Cpu className={cls} />;
  }
}

export function Explore3DPage() {
  const { user } = useAuth();

  useDocumentMeta({
    title: '3D Explore Laboratory — Smart-Tech',
    description:
      'Interactive 3D STEM visualization laboratory covering Solar System, Human Anatomy, Computer Networks, Molecular Chemistry, and Computer Architecture.',
    canonicalPath: '/explore',
  });

  const [activeSceneId, setActiveSceneId] = useState<ExploreSceneId>('solar_system');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [guestInspected, setGuestInspected] = useState<Record<string, string[]>>({});
  const [bannerMessage, setBannerMessage] = useState('');

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    void fetchGamificationProfile()
      .then((res) => setProfile(res.profile))
      .catch(() => {});
  }, [user]);

  const activeLab = useMemo(
    () => LAB_MODULES.find((m) => m.id === activeSceneId) || LAB_MODULES[0],
    [activeSceneId]
  );

  const categories = useMemo(
    () => Array.from(new Set(LAB_MODULES.map((m) => m.category))),
    []
  );

  const filteredLabs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return LAB_MODULES.filter((m) => {
      const catOk = selectedCategory === 'ALL' || m.category === selectedCategory;
      const queryOk =
        !q ||
        m.title.toLowerCase().includes(q) ||
        m.summary.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q);
      return catOk && queryOk;
    });
  }, [searchQuery, selectedCategory]);

  const handlePartsInspected = useCallback(
    (sceneId: ExploreSceneId, partIds: string[]) => {
      setGuestInspected((prev) => ({ ...prev, [sceneId]: partIds }));
      if (!user) return;
      void recordExploreCompletion(sceneId, partIds)
        .then((res) => {
          setProfile(res.profile);
          if (res.progress.xpEarned > 0) {
            setBannerMessage(
              `Lab Mastered! Earned +${res.progress.xpEarned} XP${
                res.progress.newBadges.length > 0
                  ? ` and unlocked badge: ${res.progress.newBadges.join(', ')}`
                  : ''
              }.`
            );
          }
        })
        .catch(() => {});
    },
    [user]
  );

  const activeInspectedParts = useMemo(() => {
    const serverParts =
      profile?.exploreProgress.find((e) => e.sceneId === activeLab.id)?.inspectedParts || [];
    const localParts = guestInspected[activeLab.id] || [];
    return Array.from(new Set([...serverParts, ...localParts]));
  }, [activeLab.id, profile, guestInspected]);

  const completedLabsCount = useMemo(() => {
    if (!profile) return 0;
    return profile.exploreProgress.filter((e) => e.completed).length;
  }, [profile]);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-700">
            <Box className="w-4 h-4" />
            <span>Interactive WebGL Laboratory</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            3D Explore Visualization Lab
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl">
            Rotate, zoom, and click individual 3D structures across astronomy, biology, networking, molecular chemistry, and CPU architecture.
          </p>
        </div>

        {user ? (
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-200">
              <p className="text-xs font-semibold text-indigo-700">Labs Mastered</p>
              <p className="font-display text-xl font-bold font-mono text-slate-900">
                {completedLabsCount} / {LAB_MODULES.length}
              </p>
            </div>
            <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <p className="text-xs font-semibold text-emerald-800">Explorer XP</p>
              <p className="font-display text-xl font-bold font-mono text-slate-900">
                {profile?.xp ?? 0} XP
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-4 max-w-md">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-900">Guest Explorer Mode</p>
              <p className="text-xs text-slate-600">
                Sign in to earn +75 XP per mastered 3D visualization lab.
              </p>
            </div>
            <Link
              to="/auth"
              className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg whitespace-nowrap"
            >
              Sign In
            </Link>
          </div>
        )}
      </section>

      {bannerMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm font-semibold text-emerald-900 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-700" />
            {bannerMessage}
          </span>
          <button
            type="button"
            onClick={() => setBannerMessage('')}
            className="text-xs text-emerald-800 hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search & Filter + 5 Lab Switcher Cards */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                selectedCategory === 'ALL'
                  ? 'bg-indigo-700 text-white border-indigo-700'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              All 5 3D Labs
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-indigo-700 text-white border-indigo-700'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 3D visualizations..."
              aria-label="Search 3D visualizations"
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:border-indigo-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {filteredLabs.map((lab) => {
            const isActive = activeSceneId === lab.id;
            const isCompleted = profile?.exploreProgress.find((e) => e.sceneId === lab.id)?.completed;
            return (
              <button
                key={lab.id}
                type="button"
                onClick={() => {
                  setBannerMessage('');
                  setActiveSceneId(lab.id);
                }}
                className={`text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  isActive
                    ? 'bg-indigo-700 border-indigo-700 text-white shadow-xs'
                    : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`p-2 rounded-lg ${
                      isActive ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700'
                    }`}
                  >
                    {renderLabIcon(lab.id)}
                  </span>
                  {isCompleted && (
                    <CheckCircle2
                      className={`w-4 h-4 ${isActive ? 'text-emerald-200' : 'text-emerald-600'}`}
                    />
                  )}
                </div>
                <div>
                  <p
                    className={`text-[11px] font-semibold uppercase tracking-wide ${
                      isActive ? 'text-indigo-100' : 'text-indigo-700'
                    }`}
                  >
                    {lab.category}
                  </p>
                  <p className="font-display text-sm font-bold leading-snug mt-0.5">{lab.title}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Active Lazy-Loaded 3D Viewport */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900">{activeLab.title}</h2>
            <p className="text-sm text-slate-600">{activeLab.summary}</p>
          </div>
          <span className="text-xs font-mono font-semibold px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
            +{activeLab.xpReward} XP upon inspecting {activeLab.minPartsRequired} parts
          </span>
        </div>

        <ThreeViewport
          sceneId={activeLab.id}
          title={activeLab.title}
          minPartsRequired={activeLab.minPartsRequired}
          initialInspectedParts={activeInspectedParts}
          onPartsInspected={handlePartsInspected}
        />
      </section>
    </main>
  );
}
