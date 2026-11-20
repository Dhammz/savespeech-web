import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "../context/useAuth";

/**
 * Hook untuk mengelola panggilan telepon langsung (Realtime Call).
 * Menggunakan Web Speech API (SpeechRecognition) bawaan browser untuk transkripsi
 * ultra-cepat (zero-latency / realtime kata-per-kata), dan WebSocket backend untuk
 * analisis ML & Rule-Based Scam Detection instan.
 */
export function useRealtimeCall() {
  const { token } = useAuth();
  const [isCalling, setIsCalling] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | connecting | active | finished | error
  const [error, setError] = useState(null);

  // Realtime Analysis State
  const [fullTranscript, setFullTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [riskScore, setRiskScore] = useState(0);
  const [riskLevel, setRiskLevel] = useState("Low");
  const [label, setLabel] = useState("NORMAL");
  const [scamCategory, setScamCategory] = useState(null);
  const [indicators, setIndicators] = useState([]);
  const [explanation, setExplanation] = useState("");
  const [overrideApplied, setOverrideApplied] = useState(false);

  const wsRef = useRef(null);
  const recognitionRef = useRef(null);
  const accumulatedRef = useRef("");

  // Bersihkan koneksi dan stop speech recognition
  const stopCall = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    if (wsRef.current) {
      try {
        wsRef.current.send(JSON.stringify({ action: "FINISH" }));
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }

    setIsCalling(false);
    setStatus("finished");
    setInterimTranscript("");
  }, []);

  const sendTranscriptForAnalysis = useCallback((newText) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (!newText.trim()) return;

    // Kirim pesan transkrip langsung ke backend untuk evaluasi AI instan
    wsRef.current.send(
      JSON.stringify({
        action: "ANALYZE_TEXT",
        text: newText,
      })
    );
  }, []);

  const startCall = useCallback(async () => {
    try {
      setError(null);
      setStatus("connecting");
      setFullTranscript("");
      setInterimTranscript("");
      accumulatedRef.current = "";
      setRiskScore(0);
      setRiskLevel("Low");
      setLabel("NORMAL");
      setIndicators([]);
      setExplanation("");
      setOverrideApplied(false);

      // 1. Cek dukungan Web Speech Recognition di browser
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        throw new Error(
          "Browser Anda tidak mendukung Web Speech Recognition. Disarankan menggunakan Google Chrome atau Microsoft Edge untuk latensi ultra cepat."
        );
      }

      // 2. Buka koneksi WebSocket ke Backend FastAPI
      const wsUrlBase = (import.meta.env.VITE_API_URL || "http://localhost:8000/api")
        .replace(/^http/, "ws")
        .replace(/\/api\/?$/, "");
      const fullWsUrl = `${wsUrlBase}/api/ws/live-call${token ? `?token=${encodeURIComponent(token)}` : ""}`;

      const ws = new WebSocket(fullWsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("active");
        setIsCalling(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "ANALYSIS_UPDATE") {
            setRiskScore(data.riskScore ?? 0);
            setRiskLevel(data.riskLevel || "Low");
            setLabel(data.label || "NORMAL");
            setScamCategory(data.scamCategory || null);
            setIndicators(data.indicators || []);
            setExplanation(data.explanation || "");
            setOverrideApplied(Boolean(data.overrideApplied));
          }
        } catch (e) {
          console.error("Gagal parse payload WebSocket:", e);
        }
      };

      ws.onerror = () => {
        setError("Gagal terhubung ke server WebSocket panggilan.");
        setStatus("error");
        stopCall();
      };

      ws.onclose = () => {
        setIsCalling(false);
      };

      // 3. Konfigurasi Speech Recognition Native
      const recognition = new SpeechRecognition();
      recognition.lang = "id-ID";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognitionRef.current = recognition;

      recognition.onresult = (event) => {
        let interim = "";
        let finalChunk = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptPart = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalChunk += transcriptPart + " ";
          } else {
            interim += transcriptPart;
          }
        }

        setInterimTranscript(interim);

        if (finalChunk.trim()) {
          const cleanFinal = finalChunk.trim();
          accumulatedRef.current = (accumulatedRef.current + " " + cleanFinal).trim();
          setFullTranscript(accumulatedRef.current);
          
          // Kirim ke backend detik itu juga untuk evaluasi risiko
          sendTranscriptForAnalysis(cleanFinal);
        }
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition warning:", event.error);
        if (event.error === "not-allowed") {
          setError("Izin akses mikrofon ditolak oleh browser.");
          stopCall();
        }
      };

      recognition.onend = () => {
        // Otomatis restart recognition jika panggilan masih aktif
        if (recognitionRef.current && isCalling) {
          try {
            recognitionRef.current.start();
          } catch {}
        }
      };

      // Mulai mendengarkan suara
      recognition.start();
    } catch (err) {
      console.error("Gagal memulai panggilan langsung:", err);
      setError(err.message || "Gagal membuka panggilan langsung.");
      setStatus("error");
      stopCall();
    }
  }, [isCalling, sendTranscriptForAnalysis, stopCall, token]);

  const resetAnalysis = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: "RESET" }));
    }
    accumulatedRef.current = "";
    setFullTranscript("");
    setInterimTranscript("");
    setRiskScore(0);
    setRiskLevel("Low");
    setLabel("NORMAL");
    setIndicators([]);
    setExplanation("");
    setOverrideApplied(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCall();
    };
  }, [stopCall]);

  return {
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
  };
}
