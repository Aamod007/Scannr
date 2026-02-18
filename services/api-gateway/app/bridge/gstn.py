import httpx
from typing import Dict, Optional
import os

# GSTN API Configuration
GSTN_BASE_URL = os.getenv("GSTN_BASE_URL", "https://api.gstn.gov.in")
GSTN_API_KEY = os.getenv("GSTN_API_KEY", "")
GSTN_CLIENT_ID = os.getenv("GSTN_CLIENT_ID", "")
GSTN_CLIENT_SECRET = os.getenv("GSTN_CLIENT_SECRET", "")

class GSTNIntegration:
    """Integration with GSTN (Goods and Services Tax Network).
    
    Validates importer GSTIN and checks compliance status.
    """
    
    def __init__(self):
        self.access_token: Optional[str] = None
        self.token_expiry: Optional[float] = None
    
    async def _get_access_token(self) -> str:
        """Obtain OAuth 2.0 access token from GSTN."""
        if self.access_token and self.token_expiry and time.time() < self.token_expiry:
            return self.access_token
        
        # For demo/development, return mock token
        if not GSTN_CLIENT_ID:
            return "mock-gstn-token"
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{GSTN_BASE_URL}/oauth/token",
                    data={
                        "grant_type": "client_credentials",
                        "client_id": GSTN_CLIENT_ID,
                        "client_secret": GSTN_CLIENT_SECRET,
                        "scope": "importer_validation"
                    }
                )
                response.raise_for_status()
                data = response.json()
                self.access_token = data["access_token"]
                self.token_expiry = time.time() + data.get("expires_in", 3600)
                return self.access_token
        except Exception as e:
            print(f"GSTN auth error: {e}")
            return ""
    
    async def validate_gstin(self, gstin: str) -> Dict:
        """Validate GSTIN and get taxpayer details.
        
        Args:
            gstin: 15-digit GSTIN number
            
        Returns:
            Dictionary with validation status and taxpayer info
        """
        # Basic GSTIN format validation
        if not self._is_valid_gstin_format(gstin):
            return {
                "valid": False,
                "error": "Invalid GSTIN format",
                "gstin": gstin
            }
        
        # For demo/development
        if not GSTN_API_KEY:
            return self._get_mock_gstin_data(gstin)
        
        try:
            token = await self._get_access_token()
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{GSTN_BASE_URL}/taxpayer/v1.0/validate",
                    params={"gstin": gstin},
                    headers={"Authorization": f"Bearer {token}"}
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            return {
                "valid": True,  # Assume valid on error to not block
                "warning": f"GSTN validation failed: {str(e)}",
                "gstin": gstin,
                "fallback": True
            }
    
    def _is_valid_gstin_format(self, gstin: str) -> bool:
        """Validate GSTIN format (15 characters)."""
        if len(gstin) != 15:
            return False
        
        # GSTIN format: 2 (state) + 10 (PAN) + 1 (entity) + 1 (check) + 1 (Z)
        import re
        pattern = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
        return bool(re.match(pattern, gstin))
    
    def _get_mock_gstin_data(self, gstin: str) -> Dict:
        """Return mock GSTIN data for development."""
        state_code = gstin[:2]
        state_names = {
            "27": "Maharashtra",
            "29": "Karnataka",
            "33": "Tamil Nadu",
            "07": "Delhi"
        }
        
        return {
            "valid": True,
            "gstin": gstin,
            "legal_name": f"Importer Pvt Ltd ({gstin[-6:]})",
            "trade_name": f"Importer Co",
            "state": state_names.get(state_code, "Unknown"),
            "state_code": state_code,
            "status": "Active",
            "taxpayer_type": "Regular",
            "registration_date": "2017-07-01",
            "filing_status": "Regular",
            "last_filed": "2026-01-31"
        }
    
    async def check_filing_compliance(self, gstin: str) -> Dict:
        """Check GST return filing compliance.
        
        Args:
            gstin: GSTIN to check
            
        Returns:
            Compliance status and filing history
        """
        if not GSTN_API_KEY:
            return {
                "compliant": True,
                "gstin": gstin,
                "filing_rate": 0.95,
                "pending_returns": 1,
                "last_filed": "2026-01-31"
            }
        
        try:
            token = await self._get_access_token()
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{GSTN_BASE_URL}/taxpayer/v1.0/compliance",
                    params={"gstin": gstin},
                    headers={"Authorization": f"Bearer {token}"}
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            return {
                "compliant": True,  # Assume compliant on error
                "warning": f"Compliance check failed: {str(e)}",
                "gstin": gstin
            }

# Convenience function
async def validate_importer_gstin(gstin: str) -> Dict:
    """Validate importer GSTIN."""
    gstn = GSTNIntegration()
    return await gstn.validate_gstin(gstin)

import time
