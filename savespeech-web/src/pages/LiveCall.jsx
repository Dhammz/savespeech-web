import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRealtimeCall } from "../hooks/useRealtimeCall";
import Button from "../components/ui/Button";
import Footer from "../components/Footer";

export default function LiveCall() {
  const {
    isCalling,
    status,
    error,
    fullTranscript,
    interimTranscript,
    riskScore,
    riskLevel,
    label,
    scamCategory,
    indicators,
    explanation,
    overrideApplied,
    startCall,
    stopCall,
    resetAnalysis,
  } = useRealtimeCall();

  const [callDuration, setCallDuration] = useState(0);

  // Timer panggilan
  useEffect(() => {
    let interval = null;
    if (isCalling) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [isCalling]);

  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const getRiskColor = (lvl) => {
    switch (lvl) {
      case "Critical":
        return "text-red-400 border-red-500/50 bg-red-500/10";
      case "High":
        return "text-orange-400 border-orange-500/50 bg-orange-500/10";
      case "Medium":
        return "text-yellow-400 border-yellow-500/50 bg-yellow-500/10";
      default:
        return "text-emerald-400 border-emerald-500/50 bg-emerald-500/10";
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col bg-[#05060f] text-slate-100 bg-security-grid">
      <main className="relative z-10 flex-grow px-4 py-8 sm:py-12">
        <div className="max-w-5xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-violet-500/15 text-violet-300 border border-violet-400/30">
              <i className="ri-broadcast-line animate-pulse text-violet-400" />
              <span>Simulasi Deteksi Panggilan Telepon Realtime</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
              Live Phone Call Guard
            </h1>
            <p className="text-sm text-slate-400 max-w-xl mx-auto">
              Sistem akan memantau percakapan telepon secara langsung lewat mikrofon, melakukan transkripsi kalimat demi kalimat, dan memberi peringatan instan jika terindikasi penipuan perbankan.
            </p>
          </div>

          {/* Status Alert Banner Jika Terindikasi Bahaya */}
          <AnimatePresence>
            {isCalling && (riskLevel === "High" || riskLevel === "Critical") && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-4 rounded-2xl bg-red-600/20 border-2 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.35)] flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-red-500/30 flex items-center justify-center shrink-0">
                  <i className="ri-alarm-warning-fill text-2xl text-red-400 animate-bounce" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-red-200">
                    PERINGATAN RISIKO TINGGI: Indikasi Penipuan Terdeteksi!
                  </h3>
                  <p className="text-xs text-red-300/90 mt-0.5">
                    Jangan pernah menyebutkan kode OTP, password, atau PIN perbankan kepada penelepon. Segera tutup telepon!
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Phone Call Card Simulator */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Kolom Kiri: Visual Panggilan */}
            <div className="md:col-span-1 glass-surface rounded-3xl p-6 border border-white/10 flex flex-col items-center justify-between text-center relative overflow-hidden">
              <div className="space-y-4 w-full">
                <div className="relative mx-auto w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-500/20 to-violet-600/30 border border-white/10 flex items-center justify-center shadow-inner">
                  {isCalling && (
                    <div className="absolute inset-0 rounded-full border-2 border-cyan-400/50 animate-ping" />
                  )}
                  <i className={`text-4xl ${isCalling ? "ri-phone-fill text-cyan-400" : "ri-phone-line text-slate-400"}`} />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-white">Simulasi Penelepon</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {isCalling ? "Panggilan Sedang Berlangsung..." : "Panggilan Belum Dimulai"}
                  </p>
                </div>

                {/* Timer */}
                <div className="inline-block px-3 py-1 rounded-lg bg-black/40 border border-white/5 font-mono text-sm font-semibold text-slate-300">
                  {formatTimer(callDuration)}
                </div>
              </div>

              {/* Tombol Kontrol Panggilan */}
              <div className="w-full pt-6 space-y-3">
                {!isCalling ? (
                  <Button
                    fullWidth
                    onClick={startCall}
                    className="bg-emerald-500 hover:bg-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                  >
                    <i className="ri-phone-line text-lg" />
                    <span>Mulai Panggilan</span>
                  </Button>
                ) : (
                  <Button
                    fullWidth
                    variant="danger"
                    onClick={stopCall}
                    className="shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                  >
                    <i className="ri-phone-off-line text-lg" />
                    <span>Akhiri Panggilan</span>
                  </Button>
                )}

                {fullTranscript && !isCalling && (
                  <button
                    type="button"
                    onClick={resetAnalysis}
                    className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Bersihkan Layar
                  </button>
                )}
              </div>

              {error && (
                <p className="text-xs text-red-400 mt-3">{error}</p>
              )}
            </div>

            {/* Kolom Kanan: Transkrip Live & Skor Risiko */}
            <div className="md:col-span-2 space-y-6">
              
              {/* Meteran Risiko Realtime */}
              <div className="glass-surface rounded-3xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                    <i className="ri-dashboard-3-line text-cyan-400" />
                    Tingkat Risiko Penipuan Saat Ini
                  </h3>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getRiskColor(riskLevel)}`}>
                    Level: {riskLevel.toUpperCase()} ({riskScore}%)
                  </div>
                </div>

                {/* Progress Bar Risiko */}
                <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden border border-white/10 p-0.5">
                  <motion.div
                    className={`h-full rounded-full transition-all duration-500 ${
                      riskLevel === "Critical"
                        ? "bg-red-500"
                        : riskLevel === "High"
                        ? "bg-orange-500"
                        : riskLevel === "Medium"
                        ? "bg-yellow-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(5, riskScore))}%` }}
                  />
                </div>

                {explanation && (
                  <p className="text-xs text-slate-300 mt-4 leading-relaxed bg-white/[0.03] p-3 rounded-xl border border-white/5">
                    <strong>Catatan AI:</strong> {explanation}
                  </p>
                )}
              </div>

              {/* Transkrip Mengalir (Live Streaming Transcript) */}
              <div className="glass-surface rounded-3xl p-6 border border-white/10 flex flex-col h-80">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-sm font-bold text-slate-300 flex items-center gap-2">
                    <i className="ri-chat-voice-line text-violet-400" />
                    Transkrip Suara Panggilan (Live)
                  </span>
                  {isCalling && (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      Mendengarkan...
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto mt-4 space-y-3 pr-2 text-sm">
                  {fullTranscript || interimTranscript ? (
                    <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/5 text-slate-200 leading-relaxed font-sans">
                      {fullTranscript}
                      {interimTranscript && (
                        <span className="text-cyan-400 font-medium animate-pulse"> {interimTranscript}</span>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
                      <i className="ri-mic-line text-3xl mb-2 opacity-40" />
                      <p className="text-xs">
                        {isCalling
                          ? "Katakan sesuatu ke mikrofon Anda untuk memulai deteksi..."
                          : "Klik 'Mulai Panggilan' untuk memulai sesi pemantauan langsung."}
                      </p>
                    </div>
                  )}
                </div>

                {/* Indikator Terdeteksi */}
                {indicators.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-white/10">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                      Indikator Penipuan Ditemukan:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {indicators.map((ind, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30"
                        >
                          <i className="ri-error-warning-line text-red-400" />
                          {ind.label || ind.code}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
