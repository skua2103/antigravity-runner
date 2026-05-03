"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export default function CyberRunner() {
  const canvasRef = useRef(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  
  const scoreRef = useRef(0);
  const stateRef = useRef({
    player: { x: 50, y: 300, width: 30, height: 30, vy: 0, jumpCount: 0, animationOffset: 0 },
    obstacles: [],
    speedMultiplier: 1,
    frameCount: 0,
    lastObstacleTime: 0
  });

  const gravity = 0.6;
  const jumpPower = -11;
  const groundY = 350;

  const resetGame = useCallback(() => {
    stateRef.current = {
      player: { x: 50, y: groundY - 30, width: 30, height: 30, vy: 0, jumpCount: 0, animationOffset: 0 },
      obstacles: [],
      speedMultiplier: 1,
      frameCount: 0,
      lastObstacleTime: 0
    };
    scoreRef.current = 0;
    setScore(0);
    setIsGameOver(false);
  }, []);

  const jump = useCallback(() => {
    if (isGameOver) return;
    const player = stateRef.current.player;
    if (player.jumpCount < 2) {
      player.vy = jumpPower;
      player.jumpCount++;
    }
  }, [isGameOver]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [jump]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationId;

    const gameLoop = (timestamp) => {
      if (isGameOver) return;
      
      const state = stateRef.current;
      state.frameCount++;
      scoreRef.current = Math.floor(state.frameCount / 60);
      
      if (state.frameCount % 10 === 0) {
         setScore(scoreRef.current);
      }

      state.speedMultiplier = 1 + (state.frameCount / 3600);

      state.player.vy += gravity;
      state.player.y += state.player.vy;
      
      if (state.player.y + state.player.height >= groundY) {
        state.player.y = groundY - state.player.height;
        state.player.vy = 0;
        state.player.jumpCount = 0;
      }

      if (state.player.y + state.player.height === groundY) {
        state.player.animationOffset = Math.sin(state.frameCount * 0.4) * 3;
      } else {
        state.player.animationOffset = 0;
      }

      const spawnRate = Math.max(40, 100 - state.speedMultiplier * 15);
      if (state.frameCount - state.lastObstacleTime > spawnRate) {
        if (Math.random() < 0.03 * state.speedMultiplier) {
          const isFlying = Math.random() < 0.3;
          const width = 20 + Math.random() * 20;
          const height = 20 + Math.random() * 40;
          const y = isFlying ? groundY - 50 - Math.random() * 70 : groundY - height;
          
          state.obstacles.push({
            x: canvas.width,
            y: y,
            width: width,
            height: height,
            speed: (6 + Math.random() * 3) * state.speedMultiplier
          });
          state.lastObstacleTime = state.frameCount;
        }
      }

      for (let i = state.obstacles.length - 1; i >= 0; i--) {
        let obs = state.obstacles[i];
        obs.x -= obs.speed;
        
        if (obs.x + obs.width < 0) {
          state.obstacles.splice(i, 1);
          continue;
        }

        const p = state.player;
        const hitX = p.x + 4;
        const hitY = p.y + p.animationOffset + 4;
        const hitW = p.width - 8;
        const hitH = p.height - 8;
        
        if (
          hitX < obs.x + obs.width &&
          hitX + hitW > obs.x &&
          hitY < obs.y + obs.height &&
          hitY + hitH > obs.y
        ) {
          setIsGameOver(true);
          setScore(scoreRef.current);
        }
      }

      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = "rgba(6, 182, 212, 0.1)";
      ctx.lineWidth = 1;
      const offset = (state.frameCount * 3 * state.speedMultiplier) % 40;
      for (let x = -offset; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      ctx.shadowBlur = 15;
      ctx.shadowColor = "#e879f9";
      ctx.strokeStyle = "#e879f9";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(canvas.width, groundY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.shadowBlur = 15;
      ctx.shadowColor = "#06b6d4";
      ctx.fillStyle = "#22d3ee";
      ctx.fillRect(state.player.x, state.player.y + state.player.animationOffset, state.player.width, state.player.height);
      ctx.shadowBlur = 0;

      ctx.shadowBlur = 15;
      ctx.shadowColor = "#f43f5e";
      ctx.fillStyle = "#fb7185";
      for (let obs of state.obstacles) {
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      }
      ctx.shadowBlur = 0;

      if (!isGameOver) {
        animationId = requestAnimationFrame(gameLoop);
      }
    };

    resetGame();
    animationId = requestAnimationFrame(gameLoop);

    return () => cancelAnimationFrame(animationId);
  }, [isGameOver, resetGame]);

  return (
    <div 
      className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-4 font-mono select-none" 
      onClick={jump}
    >
      <div className="max-w-4xl w-full">
        <h1 
          className="text-4xl md:text-5xl font-black text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-purple-500 tracking-wider"
          style={{ filter: "drop-shadow(0 0 15px rgba(6,182,212,0.5))" }}
        >
          NEON RUNNER
        </h1>
        
        <div className="flex justify-between items-end mb-3 px-2">
          <p 
            className="text-2xl font-bold text-cyan-400"
            style={{ filter: "drop-shadow(0 0 8px rgba(6,182,212,0.8))" }}
          >
            TIME: {score} s
          </p>
          <p className="text-sm text-slate-400 hidden md:block">
            <span className="text-cyan-400">SPACE</span> or <span className="text-cyan-400">CLICK</span> to double jump
          </p>
        </div>

        <div className="relative w-full aspect-[2/1] max-w-[800px] mx-auto group">
          <canvas 
            ref={canvasRef} 
            width={800} 
            height={400} 
            className="w-full h-full block bg-slate-900 border border-cyan-500/30 rounded-lg transition-shadow duration-500"
            style={{ boxShadow: "0 0 30px rgba(6,182,212,0.15)" }}
          />

          {isGameOver && (
            <div 
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg border border-fuchsia-500/50 z-10 animate-in fade-in duration-300"
              style={{ boxShadow: "inset 0 0 50px rgba(244,63,94,0.3)" }}
            >
              <h2 
                className="text-5xl md:text-6xl font-black text-rose-500 mb-2 animate-pulse tracking-widest"
                style={{ filter: "drop-shadow(0 0 20px rgba(244,63,94,0.8))" }}
              >
                SYSTEM FAILURE
              </h2>
              <p className="text-xl md:text-2xl text-slate-300 mb-8">
                SURVIVAL TIME: <span className="text-cyan-400 font-bold text-3xl mx-2">{score}</span> s
              </p>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  resetGame();
                }}
                className="px-10 py-4 bg-slate-900 border-2 border-cyan-400 text-cyan-400 font-bold text-xl md:text-2xl rounded-lg hover:bg-cyan-400 hover:text-slate-900 transition-all duration-300 scale-100 hover:scale-105 active:scale-95"
                style={{ boxShadow: "0 0 15px rgba(6,182,212,0.5)" }}
              >
                REBOOT SYSTEM
              </button>
            </div>
          )}
        </div>
        
        <p className="text-center text-sm font-bold text-slate-400 mt-6 md:hidden animate-pulse">
          TAP SCREEN TO JUMP
        </p>
      </div>
    </div>
  );
}
