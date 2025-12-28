import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Radio, RefreshCw, Trash2, Zap, Lock, Unlock, LogOut, Share2, Link as LinkIcon } from 'lucide-react';
import { Player, PlayerStatus, GameStats } from './types';
import { StatsBoard } from './components/StatsBoard';
import { PlayerCard } from './components/PlayerCard';
import { LoginModal } from './components/LoginModal';
import { ShareModal } from './components/ShareModal';
import { generateBattleReport } from './services/geminiService';

const App: React.FC = () => {
  // Load initial state: Check URL first, then LocalStorage
  const [players, setPlayers] = useState<Player[]>(() => {
    // 1. Try to load from URL (Shared Snapshot)
    const searchParams = new URLSearchParams(window.location.search);
    const sharedData = searchParams.get('data');
    
    if (sharedData) {
      try {
        // Decode: Base64 -> UTF8 -> JSON
        const json = decodeURIComponent(escape(atob(sharedData)));
        const parsedData = JSON.parse(json);
        // Optional: clean up URL so refreshing doesn't keep resetting if we implement local saves later
        // window.history.replaceState({}, document.title, window.location.pathname);
        return parsedData;
      } catch (e) {
        console.error("Failed to parse shared data:", e);
      }
    }

    // 2. Fallback to LocalStorage
    const saved = localStorage.getItem('br-players');
    return saved ? JSON.parse(saved) : [];
  });

  const [newName, setNewName] = useState('');
  const [aiReport, setAiReport] = useState<string>('系統待命中... 等待指令分析戰況。');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  
  // Auth states
  const [isAdmin, setIsAdmin] = useState(() => {
    return sessionStorage.getItem('z-zone-admin') === 'true';
  });
  const [showLogin, setShowLogin] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [isSharedView, setIsSharedView] = useState(false);

  useEffect(() => {
    // Determine if we are viewing a shared link
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('data')) {
      setIsSharedView(true);
      setAiReport("已載入戰術快照。數據為唯讀狀態。");
    }
  }, []);

  useEffect(() => {
    // Only save to local storage if we are NOT in shared view (to prevent overwriting admin's local data with a stale link)
    // Or save it to a different key if you want spectators to cache it.
    if (!isSharedView) {
      localStorage.setItem('br-players', JSON.stringify(players));
    }
  }, [players, isSharedView]);

  const stats: GameStats = useMemo(() => {
    return {
      total: players.length,
      survivors: players.filter(p => p.status === PlayerStatus.SURVIVOR).length,
      infected: players.filter(p => p.status === PlayerStatus.INFECTED).length,
      eliminated: players.filter(p => p.status === PlayerStatus.ELIMINATED).length,
    };
  }, [players]);

  const handleLogin = () => {
    setIsAdmin(true);
    sessionStorage.setItem('z-zone-admin', 'true');
    // If we were in shared view, clearing the URL might be good practice, but keeping it simple for now
  };

  const handleLogout = () => {
    setIsAdmin(false);
    sessionStorage.removeItem('z-zone-admin');
  };

  const toggleAdmin = () => {
    if (isAdmin) {
      if (window.confirm('確定要登出管理員模式嗎？\n將切換回僅供檢視的觀戰模式。')) {
        handleLogout();
      }
    } else {
      setShowLogin(true);
    }
  };

  const addPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newPlayer: Player = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      status: PlayerStatus.SURVIVOR,
      joinedAt: Date.now(),
      statusChangedAt: Date.now(),
    };

    setPlayers(prev => [...prev, newPlayer]);
    setNewName('');
  };

  const updateStatus = (id: string, status: PlayerStatus) => {
    setPlayers(prev => prev.map(p => 
      p.id === id ? { ...p, status, statusChangedAt: Date.now() } : p
    ));
  };

  const deletePlayer = (id: string) => {
    if (window.confirm('確定要移除此玩家資料嗎？')) {
      setPlayers(prev => prev.filter(p => p.id !== id));
    }
  };

  const resetGame = () => {
    if (window.confirm('確定要重置所有遊戲數據嗎？此動作無法復原。')) {
      setPlayers([]);
      setAiReport('系統重置完成。');
      // Clear URL params if resetting
      window.history.replaceState({}, document.title, window.location.pathname);
      setIsSharedView(false);
    }
  };

  const handleGenerateReport = async () => {
    if (players.length === 0) {
      setAiReport("無數據。請先加入玩家。");
      return;
    }
    setIsGeneratingReport(true);
    const report = await generateBattleReport(players);
    setAiReport(report);
    setIsGeneratingReport(false);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans pb-24 relative">
      <LoginModal 
        isOpen={showLogin} 
        onClose={() => setShowLogin(false)} 
        onLogin={handleLogin} 
      />
      
      <ShareModal 
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        players={players}
      />

      {/* Admin Toggle / Logout Button */}
      <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2">
        <button 
          onClick={toggleAdmin}
          className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all shadow-lg backdrop-blur-md ${
            isAdmin 
              ? 'bg-red-900/80 text-white border-red-500 hover:bg-red-800' 
              : 'bg-gray-900/80 text-gray-400 border-gray-700 hover:text-white hover:border-gray-500'
          }`}
          title={isAdmin ? "登出管理員模式" : "登入管理員模式"}
        >
          {isAdmin ? (
            <>
              <LogOut size={14} />
              <span className="font-mono text-xs font-bold tracking-wider">LOGOUT</span>
            </>
          ) : (
            <>
              <Lock size={14} />
              <span className="font-mono text-xs font-bold tracking-wider">LOGIN</span>
            </>
          )}
        </button>

        {isSharedView && !isAdmin && (
           <div className="px-3 py-1 bg-blue-900/30 border border-blue-500/30 rounded text-blue-300 text-[10px] font-mono backdrop-blur-md">
             <LinkIcon size={10} className="inline mr-1" />
             SHARED VIEW
           </div>
        )}
      </div>

      {/* Header */}
      <header className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-white uppercase tracking-tighter italic">
            Z-ZONE
          </h1>
          <p className="text-gray-500 font-mono text-sm tracking-widest mt-1">
            TACTICAL COMMAND SYSTEM v2.0 {isAdmin ? <span className="text-neon-green font-bold">[ADMIN ACCESS]</span> : <span className="text-gray-600">[SPECTATOR]</span>}
          </p>
        </div>
        
        {isAdmin && (
          <div className="flex flex-wrap justify-center gap-3 animate-in fade-in duration-500">
            <button 
              onClick={() => setShowShare(true)}
              className="flex items-center gap-2 px-4 py-2 bg-neon-green/10 hover:bg-neon-green/20 border border-neon-green/50 text-neon-green font-mono text-sm transition-all rounded"
            >
              <Share2 size={16} />
              戰況廣播
            </button>
            <button 
              onClick={handleGenerateReport}
              disabled={isGeneratingReport}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-900 to-blue-900 hover:from-indigo-800 hover:to-blue-800 border border-blue-500/30 rounded text-blue-100 font-mono text-sm transition-all shadow-[0_0_15px_rgba(30,58,138,0.5)]"
            >
              <Radio size={16} className={isGeneratingReport ? "animate-pulse" : ""} />
              {isGeneratingReport ? "通訊連線中..." : "AI 戰況廣播"}
            </button>
            <button 
              onClick={resetGame}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-red-900/40 border border-gray-700 hover:border-red-500/50 rounded text-gray-400 hover:text-red-200 font-mono text-sm transition-all"
            >
              <Trash2 size={16} />
              重置
            </button>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto">
        {/* AI Report Panel */}
        <div className="mb-8 bg-black/50 border-t border-b border-blue-500/20 p-4 relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50"></div>
          <h3 className="text-blue-400 text-xs font-mono mb-2 flex items-center gap-2">
            <Zap size={12} /> INCOMING TRANSMISSION
          </h3>
          <p className={`font-mono text-sm md:text-base leading-relaxed ${isGeneratingReport ? 'text-gray-500 animate-pulse' : 'text-gray-300'}`}>
            {aiReport}
          </p>
        </div>

        {/* Stats */}
        <StatsBoard stats={stats} />

        {/* Add Player Form - Only visible in Admin Mode */}
        {isAdmin && (
          <form onSubmit={addPlayer} className="mb-8 flex gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="relative flex-1">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="輸入玩家代號 / 姓名..."
                className="w-full bg-gray-900 border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green transition-all font-mono"
              />
            </div>
            <button 
              type="submit"
              className="bg-neon-green hover:bg-cyan-400 text-black font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-colors uppercase tracking-wider"
            >
              <Plus size={20} />
              <span className="hidden md:inline">加入</span>
            </button>
          </form>
        )}

        {/* Player Grid */}
        {players.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-gray-800 rounded-xl">
            <RefreshCw size={48} className="mx-auto text-gray-700 mb-4" />
            <p className="text-gray-500 font-mono">NO SIGNAL FOUND.</p>
            <p className="text-gray-600 text-sm mt-2">{isAdmin ? "等待玩家連線..." : "目前無戰術資料"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {players
              .sort((a, b) => {
                 if (a.status === b.status) return b.statusChangedAt - a.statusChangedAt;
                 if (a.status === PlayerStatus.SURVIVOR) return -1;
                 if (b.status === PlayerStatus.SURVIVOR) return 1;
                 return 0;
              })
              .map(player => (
                <PlayerCard 
                  key={player.id} 
                  player={player} 
                  onStatusChange={updateStatus}
                  onDelete={deletePlayer}
                  readOnly={!isAdmin}
                />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;