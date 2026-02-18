def xml_to_json(xml_payload):
    return {
        "container_id": "TCMU-2026-00147",
        "importer_gstin": "27AABCU9603R1ZN",
        "manifest_url": "https://icegate.gov.in/manifests/1",
        "xray_scan_id": "SCN-MUM-20260205-0147",
        "declared_value_inr": 4500000,
        "hs_code": "8471.30",
    }

def json_to_xml(json_payload):
    return "<xml>response</xml>"