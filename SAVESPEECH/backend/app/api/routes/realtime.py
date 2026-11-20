import asyncio
import io
import json
import logging
import uuid
import wave
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import SessionLocal
from app.db.models import User
from app.services.classifier import classifier_service
from app.services.indicators import detect_indicators
from app.services.risk_engine import compute_risk
from app.services.masking import mask_indicators

logger = logging.getLogger("savespeech.realtime")

router = APIRouter(tags=["Realtime"])


def get_user_from_token(token: Optional[str]) -> Optional[User]:
    """Helper untuk memverifikasi token JWT dari parameter WebSocket."""
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        user_id_str = payload.get("sub")
        if not user_id_str:
            return None
        db: Session = SessionLocal()
        try:
            user = db.query(User).filter(User.id == uuid.UUID(user_id_str)).first()
            return user
        finally:
            db.close()
    except Exception as e:
        logger.warning(f"Gagal verifikasi token WebSocket: {e}")
        return None


@router.websocket("/ws/live-call")
async def websocket_live_call(
    websocket: WebSocket,
    token: Optional[str] = Query(None)
):
    """
    WebSocket endpoint untuk analisis panggilan telepon interaktif ultra cepat.
    Mendukung transmisi teks transkrip kata-demi-kata (ultra-low latency < 50ms)
    serta analisis risiko instan (ML + Rule Engine).
    """
    await websocket.accept()

    user = get_user_from_token(token)
    user_name = user.nama if user else "Pengguna Live"
    logger.info(f"Koneksi WebSocket realtime (Ultra Fast) dibuka oleh: {user_name}")

    await websocket.send_json({
        "type": "SESSION_STARTED",
        "message": f"Sesi analisis panggilan ultra cepat aktif untuk {user_name}",
    })

    accumulated_transcript = []

    try:
        while True:
            data_text = await websocket.receive_text()
            if not data_text:
                continue

            try:
                payload = json.loads(data_text)
                action = payload.get("action")

                if action == "ANALYZE_TEXT":
                    new_text = (payload.get("text") or "").strip()
                    if new_text:
                        accumulated_transcript.append(new_text)
                        full_text = " ".join(accumulated_transcript)

                        # Evaluasi segmen untuk rule-based indicators pada SELURUH percakapan
                        simulated_segments = [{
                            "start": 0.0,
                            "end": 0.0,
                            "text": full_text,
                            "flagged": False
                        }]

                        # Deteksi indikator & ML Classifier
                        detected_indicators = detect_indicators(simulated_segments)
                        clf_result = classifier_service.predict(full_text)
                        risk_result = compute_risk(
                            p_scam=clf_result["pScam"],
                            indicators=detected_indicators,
                            base_label=clf_result["label"],
                        )

                        masked_indicators = mask_indicators(detected_indicators)

                        # Kirim hasil evaluasi instan (latensi < 50ms)
                        await websocket.send_json({
                            "type": "ANALYSIS_UPDATE",
                            "newText": new_text,
                            "fullTranscript": full_text,
                            "riskScore": risk_result["riskScore"],
                            "riskLevel": risk_result["riskLevel"],
                            "label": risk_result["label"],
                            "scamCategory": clf_result.get("scamCategory"),
                            "indicators": masked_indicators,
                            "explanation": risk_result["explanation"],
                            "overrideApplied": risk_result.get("overrideApplied", False),
                        })

                elif action == "RESET":
                    accumulated_transcript.clear()
                    await websocket.send_json({"type": "RESET_ACK", "message": "Riwayat dibersihkan"})

                elif action == "FINISH":
                    break

            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        logger.info(f"Koneksi WebSocket diputus oleh klien ({user_name}).")
    except Exception as e:
        logger.exception(f"Exception pada WebSocket realtime: {e}")
    finally:
        accumulated_transcript.clear()
