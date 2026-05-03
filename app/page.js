"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export default function CyberRunner() {
  const canvasRef = useRef(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  
  // 状態をReactの再レンダリングなしに管理するためのref
  const scoreRef = useRef(0);
  const stateRef = useRef({
    player: { x: 50, y: 300, width: 30, height: 30, vy: 0, jumpCount: 0, animationOffset: 0 },
    obstacles: [],
    speedMultiplier: 1,
    frameCount: 0,
    lastObstacleTime: 0
  });

  // 物理演算の設定
  const gravity = 0.6;
  const jumpPower = -11;
  const groundY = 350;

  // ゲームのリセット処理
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

  // ジャンプ処理（2段ジャンプ対応）
  const jump = useCallback(() => {
    if (isGameOver) return;
    const player = stateRef.current.player;
    if (player.jumpCount < 2) {
      player.vy = jumpPower;
      player.jumpCount++;
    }
  }, [isGameOver]);

  // スペースキーでのジャンプ
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

  // メインゲームループ
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationId;

    const gameLoop = (timestamp) => {
      if (isGameOver) return;
      
      const state = stateRef.current;
      state.frameCount++;
      
      // スコアの更新 (約60フレームで1秒)
      scoreRef.current = Math.floor(state.frameCount / 60);
      
      // パフォーマンスのため、スコアのReact state更新は頻度を下げる
      if (state.frameCount % 10 === 0) {
         setScore(scoreRef.current);
      }

      // 時間経過でゲームスピードを少しずつ速くする
      state.speedMultiplier = 1 + (state.frameCount / 3600); // 1分で速度が約2倍になる

      // === プレイヤーの更新 ===
      state.player.vy += gravity;
      state.player.y += state.player.vy;
      
      // 地面との当たり判定
      if (state.player.y + state.player.height >= groundY) {
        state.player.y = groundY - state.player.height;
        state.player.vy = 0;
        state.player.jumpCount = 0; // 着地したらジャンプ回数リセット
      }

      // 走るアニメーション (地面にいる時だけ上下に少し揺らす)
      if (state.player.y + state.player.height === groundY) {
        state.player.animationOffset = Math.sin(state.frameCount * 0.4) * 3;
      } else {
        state.player.animationOffset = 0;
      }

      // === 障害物の生成 ===
      // 速度が上がるにつれて生成間隔も短くする
      const spawnRate = Math.max(40, 100 - state.speedMultiplier * 15);
      if (state.frameCount - state.lastObstacleTime > spawnRate) {
        // ランダムな確率で生成
        if (Math.random() < 0.03 * state.speedMultiplier) {
          const isFlying = Math.random() < 0.3; // 30%の確率で空中障害物
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

      // === 障害物の更新と当たり判定 ===
      for (let i = state.obstacles.length - 1; i >= 0; i--) {
        let obs = state.obstacles[i];
        obs.x -= obs.speed;
        
        // 画面外に出た障害物を削除
        if (obs.x + obs.width < 0) {
          state.obstacles.splice(i, 1);
          continue;
        }

        // 当たり判定 (プレイヤーの当たり判定を少し小さくして遊びを持たせる)
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
          setScore(scoreRef.current); // 最終スコアを確定
        }
      }

      // === 描画 (Canvas API) ===
      
      // 背景をクリア (ダーク基調)
      ctx.fillStyle = "#0f172a"; // slate-900
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // サイバーパンク風のグリッド線背景
      ctx.strokeStyle = "rgba(6, 182, 212, 0.1)"; // シアンの薄い線
      ctx.lineWidth = 1;
      const offset = (state.frameCount * 3 * state.speedMultiplier) % 40;
      for (let x = -offset; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // 地面の描画 (ネオンピンクのライン)
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#e879f9"; // fuchsia-400
      ctx.strokeStyle = "#e879f9";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(canvas.width, groundY);
      ctx.stroke();
      ctx.shadowBlur = 0; // シャドウリセット

      // プレイヤーの描画 (ネオンシアンの四角形)
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#06b6d4"; // cyan-500
      ctx.fillStyle = "#22d3ee"; // cyan-400
      ctx.fillRect(state.player.x, state.player.y + state.player.animationOffset, state.player.width, state.player.height);
      ctx.shadowBlur = 0;

      // 障害物の描画 (ネオンレッド/ピンクの四角形)
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#f43f5e"; // rose-500
      ctx.fillStyle = "#fb7185"; // rose-400
      for (let obs of state.obstacles) {
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      }
      ctx.shadowBlur = 0;

      // 次のフレームを要求
      if (!isGameOver) {
        animationId = requestAnimationFrame(gameLoop);
      }
    };

    // ゲーム開始
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
        {/* ヘッダータイトル */}
        <h1 className="text-4xl md:text-5xl font-black text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-purple-500 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)] tracking-wider">
          NEON RUNNER
        </h1>
        
        {/* スコアと操作説明 */}
        <div className="flex justify-between items-end mb-3 px-2">
          <p className="text-2xl font-bold text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">
            TIME: {score} s
          </p>
          <p className="text-sm text-slate-400 hidden md:block">
            <span className="text-cyan-400">SPACE</span> or <span className="text-cyan-400">CLICK</span> to double jump
          </p>
        </div>

        {/* ゲーム画面コンテナ */}
        <div className="relative w-full aspect-[2/1] max-w-[800px] mx-auto group">
          {/* Canvas本体 (内部解像度は固定で、CSSでレスポンシブに) */}
          <canvas 
            ref={canvasRef} 
            width={800} 
            height={400} 
            className="w-full h-full block bg-slate-900 border border-cyan-500/30 rounded-lg shadow-[0_0_30px_rgba(6,182,212,0.15)] group-hover:shadow-[0_0_40px_rgba(6,182,212,0.3)] transition-shadow duration-500"
          />

          {/* ゲームオーバー時のオーバーレイ */}
          {isGameOver && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg border border-fuchsia-500/50 shadow-[inset_0_0_50px_rgba(244,63,94,0.3)] z-10 animate-in fade-in duration-300">
              <h2 className="text-5xl md:text-6xl font-black text-rose-500 mb-2 drop-shadow-[0_0_20px_rgba(244,63,94,0.8)] animate-pulse tracking-widest">
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
                className="px-10 py-4 bg-slate-900 border-2 border-cyan-400 text-cyan-400 font-bold text-xl md:text-2xl rounded-lg hover:bg-cyan-400 hover:text-slate-900 transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.5)] hover:shadow-[0_0_30px_rgba(6,182,212,0.9)] scale-100 hover:scale-105 active:scale-95"
              >
                REBOOT SYSTEM
              </button>
            </div>
          )}
        </div>
        
        {/* モバイル向け操作説明 */}
        <p className="text-center text-sm font-bold text-slate-400 mt-6 md:hidden animate-pulse">
          TAP SCREEN TO JUMP
        </p>
      </div>
    </div>
  );
}
