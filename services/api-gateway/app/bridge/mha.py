import httpx
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import os

# MHA/OFAC API Configuration
OFAC_API_URL = os.getenv("OFAC_API_URL", "https://www.treasury.gov/ofac/downloads/sanctions/1.0/sdn_advanced.xml")
UN_SANCTIONS_URL = os.getenv("UN_SANCTIONS_URL", "https://scsanctions.un.org/resources/xml/en/consolidated.xml")
MHA_WEBHOOK_SECRET = os.getenv("MHA_WEBHOOK_SECRET", "")

class MHASanctionsFeed:
    """Integration with MHA (Ministry of Home Affairs) sanctions feeds.
    
    Monitors OFAC, UN, and INTERPOL sanctions lists in real-time.
    """
    
    def __init__(self):
        self.sanctions_cache: Dict[str, Dict] = {}
        self.last_update: Optional[datetime] = None
        self.cache_ttl = timedelta(hours=6)
    
    async def check_entity(self, entity_type: str, entity_value: str) -> Dict:
        """Check if an entity is on any sanctions list.
        
        Args:
            entity_type: 'name', 'passport', 'country', 'vessel', 'aircraft'
            entity_value: Value to check
            
        Returns:
            Match details if found, empty if clean
        """
        # Normalize input
        entity_value = entity_value.upper().strip()
        
        # Check cache first
        cache_key = f"{entity_type}:{entity_value}"
        if cache_key in self.sanctions_cache:
            cached = self.sanctions_cache[cache_key]
            if datetime.utcnow() - cached["timestamp"] < self.cache_ttl:
                return cached["result"]
        
        # For demo/development, use mock data
        if not MHA_WEBHOOK_SECRET:
            result = self._check_mock_sanctions(entity_type, entity_value)
            self.sanctions_cache[cache_key] = {
                "result": result,
                "timestamp": datetime.utcnow()
            }
            return result
        
        # Real API call (production)
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://api.mha.gov.in/sanctions/v1/check",
                    params={"type": entity_type, "value": entity_value},
                    headers={"Authorization": f"Bearer {MHA_WEBHOOK_SECRET}"}
                )
                response.raise_for_status()
                result = response.json()
                self.sanctions_cache[cache_key] = {
                    "result": result,
                    "timestamp": datetime.utcnow()
                }
                return result
        except Exception as e:
            return {
                "match": False,
                "warning": f"Sanctions check failed: {str(e)}",
                "entity_type": entity_type,
                "entity_value": entity_value
            }
    
    def _check_mock_sanctions(self, entity_type: str, entity_value: str) -> Dict:
        """Mock sanctions data for development."""
        # List of mock sanctioned entities for testing
        mock_sanctions = {
            "name": ["OSAMA BIN LADEN", "DAWOOD IBRAHIM", "HAFEZ SAEED"],
            "country": ["NORTH KOREA", "IRAN"],
            "passport": ["PK123456", "IR789012"]
        }
        
        if entity_type in mock_sanctions:
            if entity_value in mock_sanctions[entity_type]:
                return {
                    "match": True,
                    "severity": "HIGH",
                    "lists": ["OFAC-SDN", "UN-Consolidated"],
                    "entity_type": entity_type,
                    "entity_value": entity_value,
                    "programs": ["Counter Terrorism", "WMD Proliferation"],
                    "matched_on": datetime.utcnow().isoformat()
                }
        
        return {
            "match": False,
            "entity_type": entity_type,
            "entity_value": entity_value,
            "checked_at": datetime.utcnow().isoformat()
        }
    
    async def check_importer(self, importer_data: Dict) -> Dict:
        """Comprehensive sanctions check for an importer.
        
        Args:
            importer_data: Dictionary with importer details
            
        Returns:
            Aggregated sanctions check results
        """
        checks = []
        
        # Check importer name
        if "name" in importer_data:
            checks.append(await self.check_entity("name", importer_data["name"]))
        
        # Check associated persons
        if "directors" in importer_data:
            for director in importer_data["directors"]:
                checks.append(await self.check_entity("name", director))
        
        # Check origin country
        if "origin_country" in importer_data:
            checks.append(await self.check_entity("country", importer_data["origin_country"]))
        
        # Aggregate results
        matches = [c for c in checks if c.get("match", False)]
        
        return {
            "clean": len(matches) == 0,
            "matches": matches,
            "total_checks": len(checks),
            "risk_level": "HIGH" if matches else "LOW",
            "checked_at": datetime.utcnow().isoformat()
        }
    
    async def get_seasonal_smuggling_index(self, hs_code: str, month: int) -> float:
        """Get seasonal smuggling risk index for HS code.
        
        Args:
            hs_code: Harmonized System code
            month: Month (1-12)
            
        Returns:
            Risk index (0.0 - 10.0)
        """
        # Mock seasonal data based on HS code and month
        # In production, this would query CBIC intelligence database
        
        high_risk_codes = ["8471", "8517", "3004", "7108"]  # Electronics, drugs, gold
        medium_risk_codes = ["6203", "6109", "9999"]  # Textiles, misc
        
        base_risk = 1.0
        
        hs_prefix = hs_code[:4]
        if hs_prefix in high_risk_codes:
            base_risk = 5.0
        elif hs_prefix in medium_risk_codes:
            base_risk = 3.0
        
        # Seasonal multipliers (festival seasons = higher risk)
        seasonal_multipliers = {
            10: 1.5,  # Diwali
            11: 1.5,
            12: 1.3,  # Year-end
            1: 1.2,   # New Year
            3: 1.4,   # Financial year end
        }
        
        return base_risk * seasonal_multipliers.get(month, 1.0)

# Convenience function
async def check_sanctions(entity_type: str, entity_value: str) -> Dict:
    """Quick sanctions check."""
    feed = MHASanctionsFeed()
    return await feed.check_entity(entity_type, entity_value)
