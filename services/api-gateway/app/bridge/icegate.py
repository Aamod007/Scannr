import xml.etree.ElementTree as ET
import json
from typing import Dict, Optional
import httpx
from datetime import datetime
import os

# ICEGATE API Configuration
ICEGATE_BASE_URL = os.getenv("ICEGATE_BASE_URL", "https://www.icegate.gov.in/iceDataProvider")
ICEGATE_CERT_PATH = os.getenv("ICEGATE_CERT_PATH", "/app/certs/icegate.pem")
ICEGATE_KEY_PATH = os.getenv("ICEGATE_KEY_PATH", "/app/certs/icegate.key")

class ICEGATEBridge:
    """Bridge for ICEGATE (Indian Customs EDI Gateway) integration.
    
    Handles XML-SOAP communication with ICEGATE and converts to/from JSON.
    """
    
    def __init__(self):
        self.client_cert = (ICEGATE_CERT_PATH, ICEGATE_KEY_PATH) if os.path.exists(ICEGATE_CERT_PATH) else None
        
    def xml_to_dict(self, xml_string: str) -> Dict:
        """Convert ICEGATE XML response to Python dictionary."""
        try:
            root = ET.fromstring(xml_string)
            return self._xml_to_dict_recursive(root)
        except ET.ParseError as e:
            return {"error": f"Invalid XML: {str(e)}"}
    
    def _xml_to_dict_recursive(self, element: ET.Element):
        """Recursively convert XML element to dictionary."""
        result = {}
        
        # Add attributes
        if element.attrib:
            result.update(element.attrib)
        
        # Process children
        children = list(element)
        if children:
            for child in children:
                child_data = self._xml_to_dict_recursive(child)
                if child.tag in result:
                    if not isinstance(result[child.tag], list):
                        result[child.tag] = [result[child.tag]]
                    result[child.tag].append(child_data)
                else:
                    result[child.tag] = child_data
        else:
            # Leaf node with text
            text = element.text.strip() if element.text else ""
            if text:
                result = text
        
        return result
    
    def dict_to_xml(self, data: Dict, root_name: str = "request") -> str:
        """Convert Python dictionary to ICEGATE XML request."""
        root = ET.Element(root_name)
        self._dict_to_xml_recursive(root, data)
        return ET.tostring(root, encoding='unicode')
    
    def _dict_to_xml_recursive(self, parent: ET.Element, data):
        """Recursively convert dictionary to XML elements."""
        if isinstance(data, dict):
            for key, value in data.items():
                if isinstance(value, (dict, list)):
                    child = ET.SubElement(parent, key)
                    self._dict_to_xml_recursive(child, value)
                else:
                    child = ET.SubElement(parent, key)
                    child.text = str(value)
        elif isinstance(data, list):
            for item in data:
                self._dict_to_xml_recursive(parent, item)
    
    async def fetch_manifest(self, bill_no: str, year: str) -> Dict:
        """Fetch shipping bill/manifest from ICEGATE.
        
        Args:
            bill_no: Shipping bill number
            year: Financial year (e.g., "2026")
            
        Returns:
            Dictionary with manifest details
        """
        # For development/demo, return mock data
        # In production, make actual SOAP call to ICEGATE
        if not self.client_cert:
            return self._get_mock_manifest(bill_no)
        
        # Production ICEGATE SOAP call
        soap_request = f"""<?xml version="1.0" encoding="UTF-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
            <soap:Body>
                <getShippingBillDetails>
                    <billNumber>{bill_no}</billNumber>
                    <year>{year}</year>
                </getShippingBillDetails>
            </soap:Body>
        </soap:Envelope>"""
        
        try:
            async with httpx.AsyncClient(cert=self.client_cert, timeout=30.0) as client:
                response = await client.post(
                    f"{ICEGATE_BASE_URL}/dataProvider",
                    content=soap_request,
                    headers={"Content-Type": "text/xml; charset=utf-8"}
                )
                response.raise_for_status()
                return self.xml_to_dict(response.text)
        except Exception as e:
            return {"error": str(e), "fallback": self._get_mock_manifest(bill_no)}
    
    def _get_mock_manifest(self, bill_no: str) -> Dict:
        """Return mock manifest data for development."""
        return {
            "container_id": "TCMU-2026-00147",
            "importer_gstin": "27AABCU9603R1ZN",
            "manifest_url": f"https://icegate.gov.in/manifests/{bill_no}",
            "xray_scan_id": f"SCN-MUM-20260218-{bill_no[-4:]}",
            "declared_value_inr": 4500000,
            "hs_code": "8471.30",
            "weight": 12500,
            "volume": 33.2,
            "category": "electronics",
            "origin_country": "CN",
            "transshipment_count": 0,
            "carrier_name": "Maersk Line"
        }
    
    async def submit_clearance_result(self, clearance_id: str, lane: str, decision_time: float) -> Dict:
        """Submit clearance result back to ICEGATE.
        
        Args:
            clearance_id: SCANNR clearance ID
            lane: GREEN/YELLOW/RED
            decision_time: Time taken for decision in seconds
            
        Returns:
            Submission status
        """
        data = {
            "clearanceId": clearance_id,
            "lane": lane,
            "decisionTime": decision_time,
            "timestamp": datetime.utcnow().isoformat(),
            "system": "SCANNR"
        }
        
        if not self.client_cert:
            return {"status": "success", "message": "Mock submission", "data": data}
        
        xml_payload = self.dict_to_xml(data, "clearanceResult")
        
        try:
            async with httpx.AsyncClient(cert=self.client_cert, timeout=30.0) as client:
                response = await client.post(
                    f"{ICEGATE_BASE_URL}/submitClearance",
                    content=xml_payload,
                    headers={"Content-Type": "text/xml; charset=utf-8"}
                )
                response.raise_for_status()
                return self.xml_to_dict(response.text)
        except Exception as e:
            return {"error": str(e)}


# XML-JSON Converter Functions
def xml_to_json(xml_string: str) -> str:
    """Convert XML string to JSON string."""
    bridge = ICEGATEBridge()
    result = bridge.xml_to_dict(xml_string)
    return json.dumps(result, indent=2)

def json_to_xml(json_string: str, root_name: str = "request") -> str:
    """Convert JSON string to XML string."""
    data = json.loads(json_string)
    bridge = ICEGATEBridge()
    return bridge.dict_to_xml(data, root_name)
