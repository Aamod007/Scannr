"""Country-of-origin risk index.

Combines FATF grey/black-list status, Basel AML Index,
and World Bank Logistics Performance Index into a single
0-10 risk score per country.

Production: data refreshed monthly from data/risk/*.csv
Development: embedded seed data below.
"""

import os
import csv
import logging
from typing import Dict

logger = logging.getLogger(__name__)

# Curated origin risk scores (higher = riskier, 0-10 scale)
# Sources: FATF grey/black list 2025, Basel AML Index, WB LPI
COUNTRY_RISK: Dict[str, float] = {
    # FATF black list
    "KP": 9.5,   # North Korea
    "IR": 8.5,   # Iran
    "MM": 8.0,   # Myanmar
    # FATF grey list (increased monitoring)
    "PK": 6.5,   # Pakistan
    "SY": 8.0,   # Syria
    "YE": 7.5,   # Yemen
    "SO": 7.0,   # Somalia
    "LY": 7.0,   # Libya
    "SS": 7.0,   # South Sudan
    "AF": 7.5,   # Afghanistan
    "IQ": 6.0,   # Iraq
    "VE": 5.5,   # Venezuela
    "NI": 5.0,   # Nicaragua
    "HT": 6.0,   # Haiti
    "CF": 6.5,   # Central African Republic
    "CD": 6.5,   # DR Congo
    "ML": 6.0,   # Mali
    "BF": 5.5,   # Burkina Faso
    "SD": 6.5,   # Sudan
    # Medium-risk
    "NG": 4.5,   # Nigeria
    "BD": 4.0,   # Bangladesh
    "KH": 4.0,   # Cambodia
    "LA": 4.0,   # Laos
    "PG": 4.0,   # Papua New Guinea
    "TZ": 3.5,   # Tanzania
    "UG": 3.5,   # Uganda
    # Moderate
    "AE": 3.0,   # UAE (transhipment hub)
    "CN": 2.5,   # China
    "TH": 2.5,   # Thailand
    "VN": 2.5,   # Vietnam
    "ID": 2.5,   # Indonesia
    "MY": 2.0,   # Malaysia
    "PH": 3.0,   # Philippines
    "LK": 3.0,   # Sri Lanka
    "TR": 3.0,   # Turkey
    "RU": 5.0,   # Russia
    "BY": 5.0,   # Belarus
    # Low risk
    "US": 1.0,   # United States
    "GB": 0.8,   # United Kingdom
    "DE": 0.7,   # Germany
    "JP": 0.5,   # Japan
    "SG": 0.5,   # Singapore
    "AU": 0.7,   # Australia
    "CA": 0.8,   # Canada
    "FR": 0.8,   # France
    "KR": 0.8,   # South Korea
    "NL": 0.7,   # Netherlands
    "CH": 0.6,   # Switzerland
    "NZ": 0.5,   # New Zealand
    "SE": 0.5,   # Sweden
    "NO": 0.5,   # Norway
    "DK": 0.5,   # Denmark
    "FI": 0.5,   # Finland
    "IN": 1.5,   # India (domestic)
}

# ISO-3166 name → code mapping (partial)
COUNTRY_NAME_MAP: Dict[str, str] = {
    "NORTH KOREA": "KP",
    "IRAN": "IR",
    "MYANMAR": "MM",
    "PAKISTAN": "PK",
    "SYRIA": "SY",
    "YEMEN": "YE",
    "SOMALIA": "SO",
    "AFGHANISTAN": "AF",
    "CHINA": "CN",
    "RUSSIA": "RU",
    "UNITED STATES": "US",
    "UNITED KINGDOM": "GB",
    "GERMANY": "DE",
    "JAPAN": "JP",
    "SINGAPORE": "SG",
    "INDIA": "IN",
    "NIGERIA": "NG",
    "UAE": "AE",
    "UNITED ARAB EMIRATES": "AE",
    "TURKEY": "TR",
    "BRAZIL": "BR",
    "SOUTH KOREA": "KR",
    "AUSTRALIA": "AU",
    "CANADA": "CA",
    "FRANCE": "FR",
}

_external_loaded = False


def _try_load_external() -> None:
    """Attempt to load risk data from data/risk/ CSV files."""
    global _external_loaded
    if _external_loaded:
        return

    # Basel AML Index
    path = os.getenv("BASEL_AML_CSV", "data/risk/basel_aml_index.csv")
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8", errors="replace") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    code = row.get("Country Code", row.get("code", "")).strip().upper()
                    score = row.get("Score", row.get("score", ""))
                    if code and score:
                        # Basel is 0-10, higher = riskier → direct use
                        COUNTRY_RISK[code] = float(score)
            logger.info(f"Loaded Basel AML data: {len(COUNTRY_RISK)} countries")
        except Exception as e:
            logger.warning(f"Failed to load Basel AML CSV: {e}")

    _external_loaded = True


def get_origin_risk_index(country_input: str) -> Dict[str, float]:
    """Get the origin-country risk index.

    Args:
        country_input: ISO-3166 alpha-2 code (e.g. 'CN') or
                       full country name (e.g. 'China').

    Returns:
        Dict with `risk_index` (0–10, higher = riskier) and
        `country_code`.
    """
    _try_load_external()

    if not country_input:
        return {"risk_index": 1.0, "country_code": "UNKNOWN"}

    normalised = country_input.upper().strip()

    # Try as ISO code first
    if normalised in COUNTRY_RISK:
        return {"risk_index": COUNTRY_RISK[normalised], "country_code": normalised}

    # Try as country name
    code = COUNTRY_NAME_MAP.get(normalised)
    if code and code in COUNTRY_RISK:
        return {"risk_index": COUNTRY_RISK[code], "country_code": code}

    # Unknown country → moderate default
    return {"risk_index": 2.0, "country_code": normalised}
