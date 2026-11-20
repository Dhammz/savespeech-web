"""Routes package"""
from app.api.routes import health, auth, analyze, jobs, results, history, realtime

__all__ = ["health", "auth", "analyze", "jobs", "results", "history", "realtime"]
