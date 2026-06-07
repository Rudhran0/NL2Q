/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import Workspace from './components/Workspace';
import { BrandLogo, getLogoSvgString } from './components/BrandLogo';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [splash, setSplash] = useState(true);
  const [experience, setExperience] = useState<'landing' | 'workspace'>('landing');

  // Dynamic Page Tab updates & Direct launch detectors
  useEffect(() => {
    // 1. Set dynamic corporate favicon representation
    try {
      const svgString = getLogoSvgString();
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
      document.title = 'NL2Q – Natural Language to SQL Workbench';
    } catch (err) {
      console.warn('Tab decorator system inactive:', err);
    }

    // 2. Local standalone check / launch bypass
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const hasLaunchedBefore = localStorage.getItem('nl2q_workbench_direct_launch') === 'true';
    
    if (isStandalone || hasLaunchedBefore) {
      setExperience('workspace');
    }

    // 3. Keep splash active for cinematic load experience
    const timer = setTimeout(() => {
      setSplash(false);
    }, 1600);

    return () => clearTimeout(timer);
  }, []);

  const handleLaunchWorkbench = () => {
    localStorage.setItem('nl2q_workbench_direct_launch', 'true');
    setExperience('workspace');
  };

  const handleReturnToLanding = () => {
    localStorage.removeItem('nl2q_workbench_direct_launch');
    setExperience('landing');
  };

  return (
    <div className="w-full min-h-screen bg-[#02050f] text-slate-100 flex flex-col selection:bg-blue-600/30 selection:text-blue-200">
      <AnimatePresence mode="wait">
        {splash ? (
          <motion.div
            key="splash-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="fixed inset-0 bg-[#02050f] z-100 flex flex-col items-center justify-center overflow-hidden"
          >
            {/* Ambient background pulsing aura */}
            <div className="absolute w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[140px] pointer-events-none animate-pulse" />
            <div className="absolute w-[400px] h-[400px] bg-indigo-950/20 rounded-full blur-[120px] pointer-events-none" />

            <div className="flex flex-col items-center space-y-6 relative z-10">
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              >
                <BrandLogo className="w-24 h-24" glow={true} />
              </motion.div>

              <div className="text-center space-y-1">
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="font-display text-2xl md:text-3xl font-extrabold tracking-tight text-white"
                >
                  NL2Q
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="text-slate-400 text-xs tracking-wider uppercase font-mono"
                >
                  Secure Relational Compiler Portal
                </motion.p>
              </div>

              {/* Loader indicator bar */}
              <div className="w-40 h-0.5 bg-slate-900 rounded-full overflow-hidden relative">
                <motion.div
                  initial={{ left: '-100%' }}
                  animate={{ left: '100%' }}
                  transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                  className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full"
                />
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="app-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col"
          >
            {experience === 'landing' ? (
              <LandingPage onLaunch={handleLaunchWorkbench} />
            ) : (
              <Workspace onBackToLanding={handleReturnToLanding} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
