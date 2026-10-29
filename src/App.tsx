import React, { useState, useEffect } from 'react';
import { GamepadController } from './components/GamepadController';
import { TVReceiver } from './components/TVReceiver';

export default function App() {
  const [mode, setMode] = useState<'phone' | 'tv'>('phone');
  const [roomCode, setRoomCode] = useState<string>('');

  useEffect(() => {
    // Check URL parameters for ?room=XXXX or ?mode=tv
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    const modeParam = params.get('mode');

    if (roomParam) {
      setRoomCode(roomParam.toUpperCase());
      setMode('phone');
      return;
    }

    if (modeParam === 'tv') {
      setMode('tv');
      return;
    }

    // Auto-detect based on screen width & touch capability
    const isMobileTouch =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.innerWidth < 768;

    if (isMobileTouch) {
      setMode('phone');
    } else {
      // Large display / TV browser
      setMode('tv');
    }

    // Check saved room code
    const savedRoom = localStorage.getItem('xstreampad_room');
    if (savedRoom) {
      setRoomCode(savedRoom);
    }
  }, []);

  const handleSetRoom = (code: string) => {
    setRoomCode(code);
    localStorage.setItem('xstreampad_room', code);
  };

  return (
    <main className="w-full h-full min-h-screen bg-black overflow-hidden select-none touch-none">
      {mode === 'phone' ? (
        <GamepadController
          roomCode={roomCode}
          onSwitchToTV={() => setMode('tv')}
        />
      ) : (
        <TVReceiver
          roomCode={roomCode}
          onSwitchToPhone={() => setMode('phone')}
        />
      )}
    </main>
  );
}
