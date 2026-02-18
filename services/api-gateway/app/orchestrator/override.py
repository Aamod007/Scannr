import uuid
from datetime import datetime, timezone

from app.db.connection import get_db_pool


async def officer_override(payload: dict):
    """Process officer override and update database."""
    clearance_id = payload.get("clearance_id")
    officer_id = payload.get("officer_id")
    override_to = payload.get("override_to")
    reason = payload.get("reason")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # Check if clearance exists
        row = await conn.fetchrow(
            "SELECT id, lane FROM clearance_decisions WHERE id = $1",
            clearance_id
        )
        
        if row is None:
            return {"error": "Clearance not found"}
        
        original_lane = row["lane"]
        
        # Update clearance_decisions
        await conn.execute(
            """
            UPDATE clearance_decisions 
            SET lane = $1, officer_override = $2, override_reason = $3
            WHERE id = $4
            """,
            override_to,
            True,
            reason,
            clearance_id
        )
        
        # Insert into officer_overrides table
        override_id = f"OV-{uuid.uuid4().hex[:8]}"
        await conn.execute(
            """
            INSERT INTO officer_overrides (clearance_id, officer_id, original_lane, override_lane, reason)
            VALUES ($1, $2, $3, $4, $5)
            """,
            clearance_id,
            officer_id,
            original_lane,
            override_to,
            reason
        )
        
        # Add to ML training queue for feedback loop
        await conn.execute(
            """
            INSERT INTO ml_training_queue (clearance_id, label_correct, officer_label)
            VALUES ($1, $2, $3)
            """,
            clearance_id,
            False,  # AI was incorrect since officer overrode
            override_to
        )

    return {"status": "ok", "override_id": override_id}
