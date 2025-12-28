import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Share2, Radio, Globe, AlertTriangle, RotateCcw } from 'lucide-react';
import { Player } from '../types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, players }) => {
  const [copied, setCopied] = useState(false);
  // Allow user to override the base URL (in case they are on localhost but want to share a prod link)
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      // 1. Try to get the saved public URL from local storage
      const savedUrl = localStorage.getItem('z-zone-public-url');
      
      if (savedUrl) {
        setBaseUrl(savedUrl);
      } else {
        // 2. Default to current location
        setBaseUrl(window.location.origin + window.location.pathname);
      }
    }
  }, [isOpen]);

  // Save the URL whenever user types, so they don't have to re-enter it next time
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setBaseUrl(val);
    localStorage.setItem('z-zone-public-url', val);
  };

  const handleResetUrl = () => {
    const current = window.location.origin + window.location.pathname;
    setBaseUrl(current);
    localStorage.removeItem('z-zone-public-url');
  };

  if (!isOpen) return null;

  // Generate the shareable URL using the custom Base URL
  const generateUrl = () => {
    try {
      const json = JSON.stringify(players);
      // UTF-8 safe base64 encoding
      const base64 = btoa(unescape(encodeURIComponent(json)));
      
      // Construct URL carefully
      const cleanBase = baseUrl.trim().replace(/\/$/, ''); // remove trailing slash
      return `${cleanBase}?data=${base64}`;
    } catch (e) {
      return baseUrl;
    }
  };

  const shareUrl = generateUrl();
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(shareUrl)}&bgcolor=141414&color=00f0ff`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-panel-bg border border-neon-green/50 shadow-[0_0_50px_rgba(0,240,255,0.2)] rounded-lg overflow-hidden relative animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gray-900/80 p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2 text-neon-green">
            <Radio className="animate-pulse" size={18} />
            <span className="font-mono text-sm tracking-widest uppercase font-bold">Tactical Uplink</span>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 flex flex-col items-center overflow-y-auto">
          
          <div className="bg-white p-2 rounded-lg mb-6 shadow-[0_0_20px_rgba(0,240,255,0.3)] flex-shrink-0">
            <img 
              src={qrCodeUrl} 
              alt="Game State QR Code" 
              className="w-48 h-48 md:w-56 md:h-56 object-contain"
            />
          </div>

          {/* Base URL Editor */}
          <div className="w-full mb-4">
            <div className="flex justify-between items-end mb-1">
              <label className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
                <Globe size={10} /> PUBLIC URL (公開網址)
              </label>
              <button 
                onClick={handleResetUrl}
                className="text-[10px] text-gray-600 hover:text-neon-green flex items-center gap-1 transition-colors"
                title="重置為當前網址"
              >
                <RotateCcw size={10} /> RESET
              </button>
            </div>
            
            <input 
              type="text" 
              value={baseUrl}
              onChange={handleUrlChange}
              className="w-full bg-gray-900 border border-gray-700 text-neon-green text-xs font-mono p-2 rounded outline-none focus:border-neon-green transition-colors placeholder-gray-700"
              placeholder="例如: https://my-game.vercel.app"
            />
            <p className="text-[10px] text-gray-500 mt-1 leading-tight">
              * 請輸入您發布後的公開網址。系統會自動記憶，方便您在電腦端操作並產生給手機端的 QR Code。
            </p>
          </div>

          {/* Full Link Copy */}
          <div className="w-full relative">
            <div className="flex items-center gap-2 w-full">
              <input 
                type="text" 
                readOnly 
                value={shareUrl} 
                className="w-full bg-black border border-gray-700 text-gray-500 text-xs font-mono p-3 rounded outline-none"
              />
              <button
                onClick={handleCopy}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white p-3 rounded transition-colors"
                title="Copy Link"
              >
                {copied ? <Check size={16} className="text-neon-green" /> : <Copy size={16} />}
              </button>
            </div>
            {copied && (
              <span className="absolute -top-6 right-0 text-neon-green text-xs font-mono animate-in fade-in slide-in-from-bottom-2">
                COPIED
              </span>
            )}
          </div>
        </div>

        <div className="bg-gray-900/50 p-3 border-t border-gray-800 text-center flex-shrink-0">
          <p className="text-[10px] text-gray-500 font-mono">
            NO SERVER REQUIRED • DATA ENCODED IN URL
          </p>
        </div>
      </div>
    </div>
  );
};