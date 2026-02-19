"""OFAC / UN / INTERPOL sanctions screening.

Checks entity names and country codes against known sanctions lists.
In production, these lists are refreshed daily via tariff-sync-svc.
For development, a curated seed list is embedded.
"""

import os
import csv
import logging
from typing import Set, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# ------------------------------------------------------------------
# Seed sanctions data (production: loaded from data/sanctions/*.csv)
# ------------------------------------------------------------------

OFAC_SDN_NAMES: Set[str] = {
    "DAWOOD IBRAHIM",
    "OSAMA BIN LADEN",
    "HAFEZ SAEED",
    "MASOOD AZHAR",
    "AL-QAEDA",
    "ISIS",
    "LASHKAR-E-TAIBA",
    "HEZBOLLAH",
    "TALIBAN",
    "BOKO HARAM",
}

UN_SANCTIONED_ENTITIES: Set[str] = {
    "DAWOOD IBRAHIM",
    "AL-QAEDA",
    "ISIS",
    "TALIBAN",
    "BOKO HARAM",
    "NORTH KOREA",
    "IRAN",
    "SYRIA",
    "SOMALIA",
    "YEMEN",
    "LIBYA",
    "SOUTH SUDAN",
    "CENTRAL AFRICAN REPUBLIC",
    "DEMOCRATIC REPUBLIC OF THE CONGO",
    "MALI",
}

INTERPOL_WATCHLIST: Set[str] = {
    "DAWOOD IBRAHIM",
    "MASOOD AZHAR",
    "HAFEZ SAEED",
}

_ofac_loaded = False
_un_loaded = False


def _try_load_ofac_csv() -> None:
    """Attempt to load OFAC SDN list from data/sanctions/ofac_sdn.csv."""
    global _ofac_loaded
    if _ofac_loaded:
        return
    path = os.getenv("OFAC_CSV", "data/sanctions/ofac_sdn.csv")
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8", errors="replace") as f:
                reader = csv.reader(f)
                for row in reader:
                    if len(row) >= 2:
                        OFAC_SDN_NAMES.add(row[1].upper().strip())
            logger.info(f"Loaded {len(OFAC_SDN_NAMES)} OFAC SDN entries")
        except Exception as e:
            logger.warning(f"Failed to load OFAC CSV: {e}")
    _ofac_loaded = True


def _try_load_un_csv() -> None:
    """Attempt to load UN sanctions from data/sanctions/un_sanctions.csv."""
    global _un_loaded
    if _un_loaded:
        return
    path = os.getenv("UN_SANCTIONS_CSV", "data/sanctions/un_sanctions.csv")
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8", errors="replace") as f:
                reader = csv.reader(f)
                for row in reader:
                    if len(row) >= 2:
                        UN_SANCTIONED_ENTITIES.add(row[1].upper().strip())
            logger.info(f"Loaded {len(UN_SANCTIONED_ENTITIES)} UN sanctions entries")
        except Exception as e:
            logger.warning(f"Failed to load UN sanctions CSV: {e}")
    _un_loaded = True


def check_ofac_match(entity_name: str) -> bool:
    """Check if entity name appears on the OFAC SDN list.

    Args:
        entity_name: Name of person, company, or organisation.

    Returns:
        True if a match is found.
    """
    _try_load_ofac_csv()
    if not entity_name:
        return False
    normalised = entity_name.upper().strip()
    # Exact match or substring containment
    for sdn in OFAC_SDN_NAMES:
        if sdn in normalised or normalised in sdn:
            logger.warning(f"OFAC match: {entity_name} ↔ {sdn}")
            return True
    return False


def check_un_sanctions(entity_or_country: str) -> bool:
    """Check if entity or country is on the UN Security Council sanctions list.

    Args:
        entity_or_country: Entity name or ISO country name / code.

    Returns:
        True if a match is found.
    """
    _try_load_un_csv()
    if not entity_or_country:
        return False
    normalised = entity_or_country.upper().strip()
    for entry in UN_SANCTIONED_ENTITIES:
        if entry in normalised or normalised in entry:
            logger.warning(f"UN sanctions match: {entity_or_country} ↔ {entry}")
            return True
    return False


def check_interpol_alert(entity_name: str) -> bool:
    """Check if entity is on the INTERPOL Red/Orange notice list.

    Args:
        entity_name: Person or organisation name.

    Returns:
        True if a match is found.
    """
    if not entity_name:
        return False
    normalised = entity_name.upper().strip()
    for entry in INTERPOL_WATCHLIST:
        if entry in normalised or normalised in entry:
            logger.warning(f"INTERPOL match: {entity_name} ↔ {entry}")
            return True
    return False
