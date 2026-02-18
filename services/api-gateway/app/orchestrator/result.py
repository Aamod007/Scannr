from app.db.connection import get_db_pool


async def get_clearance(clearance_id: str):
    """Get clearance decision from PostgreSQL."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT 
                id, container_id, importer_gstin, risk_score, lane,
                vision_anomaly, vision_confidence, blockchain_trust,
                heatmap_s3_url, officer_override, override_reason,
                created_at, audit_hash
            FROM clearance_decisions 
            WHERE id = $1
            """,
            clearance_id,
        )

        if row is None:
            return None

        return {
            "clearance_id": str(row["id"]),
            "container_id": row["container_id"],
            "importer_gstin": row["importer_gstin"],
            "risk_score": float(row["risk_score"]),
            "lane": row["lane"],
            "vision_anomaly": row["vision_anomaly"],
            "vision_confidence": (
                float(row["vision_confidence"]) if row["vision_confidence"] else None
            ),
            "blockchain_trust": float(row["blockchain_trust"]) if row["blockchain_trust"] else None,
            "heatmap_s3_url": row["heatmap_s3_url"],
            "officer_override": row["officer_override"],
            "override_reason": row["override_reason"],
            "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            "audit_hash": row["audit_hash"],
            "status": "COMPLETED",
        }


async def store_clearance(clearance_id: str, decision: dict):
    """Update clearance decision in PostgreSQL."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            UPDATE clearance_decisions 
            SET lane = $1, officer_override = $2, override_reason = $3, audit_hash = $4
            WHERE id = $5
            """,
            decision.get("lane"),
            decision.get("officer_override", False),
            decision.get("override_reason"),
            decision.get("audit_hash"),
            clearance_id,
        )


async def clearance_result(clearance_id: str):
    """Get clearance result by ID."""
    decision = await get_clearance(clearance_id)
    if not decision:
        return {"error": "Clearance not found"}
    return decision
