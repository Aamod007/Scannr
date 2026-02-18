def preprocess_scan(scan_id: str, dicom_url: str):
    return {
        "scan_id": scan_id,
        "dicom_url": dicom_url,
        "width": 640,
        "height": 640,
        "pipeline": ["resize_640", "clahe", "dicom_to_png"],
    }
