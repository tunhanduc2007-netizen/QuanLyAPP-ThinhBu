import React from 'react';

export default function LoadingScreen({ message = 'Đang khởi động FinTrack Pro...' }) {
  return (
    <div className="fintrack-loading-container" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100%',
      background: 'var(--bg-app, #0F172A)',
      color: 'var(--text-main, #FFFFFF)',
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      overflow: 'hidden',
      userSelect: 'none'
    }}>
      <style>{`
        /* 3D Scene & Perspective */
        .fintrack-3d-scene {
          perspective: 1200px;
          perspective-origin: 50% 50%;
          width: 240px;
          height: 240px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        /* Floating Container */
        .fintrack-float-wrapper {
          position: relative;
          width: 120px;
          height: 120px;
          transform-style: preserve-3d;
          animation: fintrackFloat 3.2s ease-in-out infinite;
        }

        /* Continuous 3D Spinning Coin */
        .fintrack-coin-3d {
          width: 100%;
          height: 100%;
          position: absolute;
          transform-style: preserve-3d;
          animation: fintrackSpin3D 4.5s linear infinite;
        }

        @keyframes fintrackSpin3D {
          0% {
            transform: rotateY(0deg) rotateX(16deg) rotateZ(3deg);
          }
          50% {
            transform: rotateY(180deg) rotateX(-16deg) rotateZ(-3deg);
          }
          100% {
            transform: rotateY(360deg) rotateX(16deg) rotateZ(3deg);
          }
        }

        @keyframes fintrackFloat {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-14px);
          }
        }

        /* 3D Coin Faces & Thickness Slices */
        .coin-slice {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          transform-style: preserve-3d;
          backface-visibility: visible;
        }

        /* Front Face (Emerald / Golden Sheen) */
        .coin-front {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 30%, #34D399 0%, #10B981 40%, #059669 80%, #047857 100%);
          border: 3px solid rgba(255, 255, 255, 0.7);
          box-shadow: 
            inset 0 0 14px rgba(251, 191, 36, 0.4),
            0 0 30px rgba(16, 185, 129, 0.55),
            0 8px 24px rgba(0, 0, 0, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          transform: translateZ(9px);
          backface-visibility: hidden;
          overflow: hidden;
        }

        /* Specular Glare / Glass Sweep across Front Face */
        .coin-front::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0) 45%, rgba(255,255,255,0.2) 100%);
          pointer-events: none;
        }

        /* Back Face (Deep Cyan / Blue SSOT Shield) */
        .coin-back {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 30%, #38BDF8 0%, #0284C7 45%, #0369A1 80%, #075985 100%);
          border: 3px solid rgba(255, 255, 255, 0.7);
          box-shadow: 
            inset 0 0 14px rgba(56, 189, 248, 0.4),
            0 0 30px rgba(2, 132, 199, 0.55),
            0 8px 24px rgba(0, 0, 0, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotateY(180deg) translateZ(9px);
          backface-visibility: hidden;
          overflow: hidden;
        }

        .coin-back::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0) 45%, rgba(255,255,255,0.2) 100%);
          pointer-events: none;
        }

        /* 3D Edge Rim Slices for Realistic Thickness */
        .coin-edge-1 { transform: translateZ(7px); background: #047857; border: 1px solid rgba(52, 211, 153, 0.5); }
        .coin-edge-2 { transform: translateZ(5px); background: #059669; border: 1px solid rgba(52, 211, 153, 0.4); }
        .coin-edge-3 { transform: translateZ(3px); background: #047857; border: 1px solid rgba(52, 211, 153, 0.3); }
        .coin-edge-4 { transform: translateZ(1px); background: #065F46; border: 1px solid rgba(52, 211, 153, 0.3); }
        .coin-edge-5 { transform: translateZ(-1px); background: #047857; border: 1px solid rgba(56, 189, 248, 0.3); }
        .coin-edge-6 { transform: translateZ(-3px); background: #0369A1; border: 1px solid rgba(56, 189, 248, 0.3); }
        .coin-edge-7 { transform: translateZ(-5px); background: #0284C7; border: 1px solid rgba(56, 189, 248, 0.4); }
        .coin-edge-8 { transform: translateZ(-7px); background: #0369A1; border: 1px solid rgba(56, 189, 248, 0.5); }

        /* Gyroscopic Orbital Rings */
        .orbit-ring-1 {
          position: absolute;
          width: 156px;
          height: 156px;
          border-radius: 50%;
          border: 2px dashed rgba(16, 185, 129, 0.55);
          box-shadow: 0 0 16px rgba(16, 185, 129, 0.25);
          transform-style: preserve-3d;
          animation: orbitSpin1 6s linear infinite;
          pointer-events: none;
        }

        .orbit-ring-2 {
          position: absolute;
          width: 172px;
          height: 172px;
          border-radius: 50%;
          border: 1.5px solid rgba(56, 189, 248, 0.4);
          box-shadow: 0 0 20px rgba(56, 189, 248, 0.2);
          transform-style: preserve-3d;
          animation: orbitSpin2 7.5s linear infinite reverse;
          pointer-events: none;
        }

        /* Orbital satellite light dots */
        .orbit-dot-1 {
          position: absolute;
          top: -4px;
          left: 50%;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #34D399;
          box-shadow: 0 0 12px #34D399, 0 0 20px #10B981;
          transform: translateX(-50%);
        }

        .orbit-dot-2 {
          position: absolute;
          bottom: -4px;
          left: 50%;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #38BDF8;
          box-shadow: 0 0 12px #38BDF8, 0 0 20px #0284C7;
          transform: translateX(-50%);
        }

        @keyframes orbitSpin1 {
          0% {
            transform: rotateX(70deg) rotateY(15deg) rotateZ(0deg);
          }
          100% {
            transform: rotateX(70deg) rotateY(15deg) rotateZ(360deg);
          }
        }

        @keyframes orbitSpin2 {
          0% {
            transform: rotateY(70deg) rotateX(-15deg) rotateZ(0deg);
          }
          100% {
            transform: rotateY(70deg) rotateX(-15deg) rotateZ(360deg);
          }
        }

        /* Breathing Ground Shadow */
        .fintrack-ground-shadow {
          position: absolute;
          bottom: 12px;
          width: 110px;
          height: 22px;
          border-radius: 50%;
          background: radial-gradient(ellipse at center, rgba(16, 185, 129, 0.45) 0%, rgba(16, 185, 129, 0.15) 45%, transparent 75%);
          animation: shadowBreathe 3.2s ease-in-out infinite;
          filter: blur(4px);
        }

        @keyframes shadowBreathe {
          0%, 100% {
            transform: scale(1);
            opacity: 0.8;
          }
          50% {
            transform: scale(0.75);
            opacity: 0.35;
          }
        }

        /* Pulsing Animated Dots */
        .loading-dot-pulse {
          display: inline-block;
          animation: dotPulse 1.4s infinite;
        }
        .loading-dot-pulse:nth-child(2) { animation-delay: 0.2s; }
        .loading-dot-pulse:nth-child(3) { animation-delay: 0.4s; }

        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.2; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-3px); }
        }

        /* Glowing Progress Track */
        .progress-bar-track {
          width: 220px;
          height: 5px;
          background: rgba(148, 163, 184, 0.18);
          border-radius: 9999px;
          overflow: hidden;
          position: relative;
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.2);
        }

        .progress-bar-fill {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 55%;
          border-radius: 9999px;
          background: linear-gradient(90deg, transparent 0%, #10B981 50%, #38BDF8 100%);
          box-shadow: 0 0 12px rgba(16, 185, 129, 0.8);
          animation: progressSlide 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        @keyframes progressSlide {
          0% {
            left: -55%;
          }
          100% {
            left: 100%;
          }
        }

        /* Gradient shimmer text */
        .brand-title-shimmer {
          background: linear-gradient(135deg, #10B981 0%, #38BDF8 50%, #34D399 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: brandShimmer 3s ease-in-out infinite alternate;
        }

        @keyframes brandShimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
      `}</style>

      {/* Atmospheric Background Glow */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 480,
        height: 480,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, rgba(2, 132, 199, 0.05) 45%, transparent 70%)',
        pointerEvents: 'none',
        filter: 'blur(30px)'
      }} />

      {/* 3D SCENE CONTAINER */}
      <div className="fintrack-3d-scene">
        {/* Dual Gyroscopic Orbital Rings */}
        <div className="orbit-ring-1">
          <div className="orbit-dot-1" />
        </div>
        <div className="orbit-ring-2">
          <div className="orbit-dot-2" />
        </div>

        {/* Floating Coin Container */}
        <div className="fintrack-float-wrapper">
          <div className="fintrack-coin-3d">
            {/* 3D Coin Edge Slices (Creating True 3D Metallic Thickness) */}
            <div className="coin-slice coin-edge-8" />
            <div className="coin-slice coin-edge-7" />
            <div className="coin-slice coin-edge-6" />
            <div className="coin-slice coin-edge-5" />
            <div className="coin-slice coin-edge-4" />
            <div className="coin-slice coin-edge-3" />
            <div className="coin-slice coin-edge-2" />
            <div className="coin-slice coin-edge-1" />

            {/* FRONT FACE: Stylized FinTech Monogram */}
            <div className="coin-front">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.35))' }}>
                <defs>
                  <linearGradient id="frontEmblemGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="50%" stopColor="#ECFDF5" />
                    <stop offset="100%" stopColor="#A7F3D0" />
                  </linearGradient>
                </defs>
                {/* 3D F & Financial Growth Chart Monogram */}
                <path
                  d="M13 11C13 9.89543 13.8954 9 15 9H33C34.1046 9 35 9.89543 35 11V15C35 16.1046 34.1046 17 33 17H21V21H30C31.1046 21 32 21.8954 32 23V27C32 28.1046 31.1046 29 30 29H21V37C21 38.1046 20.1046 39 19 39H15C13.8954 39 13 38.1046 13 37V11Z"
                  fill="url(#frontEmblemGrad)"
                />
                <circle cx="34" cy="35" r="3.5" fill="#FBBF24" filter="drop-shadow(0 0 4px #FBBF24)" />
              </svg>
            </div>

            {/* BACK FACE: SSOT Security Shield */}
            <div className="coin-back">
              <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.35))' }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
          </div>
        </div>

        {/* Breathing 3D Ground Shadow */}
        <div className="fintrack-ground-shadow" />
      </div>

      {/* BRAND & STATUS TEXT */}
      <div style={{ textAlign: 'center', marginTop: 18, zIndex: 2 }}>
        <h1 className="brand-title-shimmer" style={{
          fontSize: 26,
          fontWeight: 900,
          margin: '0 0 6px 0',
          letterSpacing: '-0.5px'
        }}>
          FinTrack Pro
        </h1>

        {/* SSOT Tagline Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 12px',
          borderRadius: 9999,
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--primary-green, #10B981)',
          marginBottom: 16
        }}>
          <span>🛡️ SỔ CÁI KÉP SSOT</span>
          <span style={{ opacity: 0.5 }}>•</span>
          <span>AI ASSISTANT</span>
        </div>

        {/* Dynamic Status Text */}
        <div style={{
          fontSize: 13.5,
          fontWeight: 700,
          color: 'var(--text-muted, #94A3B8)',
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2
        }}>
          <span>{message.replace(/\.\.\.$/, '')}</span>
          <span className="loading-dot-pulse">.</span>
          <span className="loading-dot-pulse">.</span>
          <span className="loading-dot-pulse">.</span>
        </div>

        {/* Glowing Progress Track */}
        <div className="progress-bar-track" style={{ margin: '0 auto' }}>
          <div className="progress-bar-fill" />
        </div>

        {/* Security Reassurance Subtitle */}
        <p style={{
          fontSize: 11,
          color: 'var(--text-sub, #64748B)',
          margin: '16px 0 0 0',
          letterSpacing: 0.2
        }}>
          🔒 Chuẩn đối soát toàn vẹn • Sẵn sàng trong giây lát
        </p>
      </div>
    </div>
  );
}
