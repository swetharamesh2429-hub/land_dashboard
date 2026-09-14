import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { loadingTracker } from '../../utils/loadingTracker';

/**
 * TopProgressBar — Thin (2.5px) blue horizontal loading progress bar
 * fixed at the very top of the viewport (z-index: 9999).
 * Reactively triggers on route changes and in-flight API requests.
 */
export const TopProgressBar = () => {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);
  const completeTimerRef = useRef(null);

  const startProgress = () => {
    if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    setVisible(true);
    setProgress(20);

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev < 60) return prev + 15;
        if (prev < 85) return prev + 6;
        if (prev < 92) return prev + 2;
        return prev;
      });
    }, 120);
  };

  const finishProgress = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    setProgress(100);
    completeTimerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        setProgress(0);
      }, 200);
    }, 220);
  };

  // Route change progress trigger
  useEffect(() => {
    startProgress();
    const timeout = setTimeout(() => {
      finishProgress();
    }, 180);

    return () => {
      clearTimeout(timeout);
      if (timerRef.current) clearInterval(timerRef.current);
      if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    };
  }, [location.pathname, location.search]);

  // API In-flight request subscription
  useEffect(() => {
    const unsubscribe = loadingTracker.subscribe((isLoading) => {
      if (isLoading) {
        startProgress();
      } else {
        finishProgress();
      }
    });

    return () => unsubscribe();
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 h-[2.5px] pointer-events-none z-[99999] overflow-hidden"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 250ms ease-out',
      }}
      aria-hidden="true"
    >
      <div
        className="h-full bg-gradient-to-r from-sky-500 via-[#0284c7] to-sky-400 shadow-[0_0_8px_rgba(2,132,199,0.8)]"
        style={{
          width: `${progress}%`,
          transition: progress === 100 ? 'width 150ms ease-out' : 'width 250ms ease-out',
        }}
      />
    </div>
  );
};
