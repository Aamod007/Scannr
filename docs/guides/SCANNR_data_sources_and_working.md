# SCANNR — Data Sources, Downloads & How It All Works

---

## Part 1 — All Data Used in SCANNR

### 1.1 Data Categories Overview

| Category | Used By | Volume | Update Frequency |
|---|---|---|---|
| X-ray scan images | Vision AI (YOLOv8) | ~50K images (training) | Per container scan |
| Importer credentials | Blockchain (Fabric) | All registered importers | On registration / change |
| Historical clearance records | Risk Scoring (XGBoost) | 3–5 years of port data | Every clearance |
| HS tariff codes & weights | Risk Scoring + Tariff Sync | ~5,000 HS codes | Budget day → 24hr sync |
| Country risk index | Risk Scoring features | 195 countries | Monthly |
| Sanctions lists | Risk Scoring features | ~10,000 entities | Daily |
| Cargo manifest data | All pillars | Per container | Per container arrival |
| Officer override logs | ML retraining | Grows over time | Per override |
| Port congestion & vessel data | Analytics only | Per port | Real-time |

---

## Part 2 — Data Sources with Download Links

---

### 2.1 X-ray Scan Datasets (Vision AI Training)

#### GDXray — Primary Training Dataset
- **What it is:** 19,407 X-ray images across 5 categories (Baggages, Castings, Nature, Settings, Welds). The Baggages subset is the most relevant — contains airport/customs bag scans with hidden objects.
- **Size:** ~2.1 GB
- **Download:** https://domingomery.ing.puc.cl/material/gdxray/
- **Direct ZIP:** https://domingomery.ing.puc.cl/material/gdxray/GDXray.zip
- **Paper:** https://link.springer.com/article/10.1007/s10921-015-0315-7
- **License:** Free for research

#### SIXray — Large Scale X-ray Dataset
- **What it is:** 1,059,231 X-ray images of baggage with 6 contraband categories (gun, knife, wrench, pliers, scissors, hammer). Closest to real customs scan volume.
- **Size:** ~21 GB
- **Download:** https://github.com/MeioJane/SIXray
- **Direct (Google Drive):** https://drive.google.com/drive/folders/1QrHrEVxhfDTKI2O0-cCy2Jqso64UGhkA
- **License:** Research use only

#### CLCXray — Clutter & Conceal X-ray Dataset
- **What it is:** 9,565 X-ray images specifically focused on cluttered bags where contraband is concealed — mirrors real smuggling scenarios better than GDXray.
- **Size:** ~3.8 GB
- **Download:** https://github.com/GreysonPhoenix/CLCXray
- **License:** Research use

#### OPIXray — Occluded Prohibited Items
- **What it is:** 8,885 X-ray images with 5 prohibited item categories, annotated with occlusion levels — important for training the model on partially hidden items.
- **Size:** ~1.2 GB
- **Download:** https://github.com/OPIXray-author/OPIXray
- **License:** Research use

#### COMPASS-XP — Dual-Energy X-ray
- **What it is:** Multi-energy X-ray dataset with material classification (organic, metal, mixed). Useful for density anomaly detection.
- **Download:** https://www.kaggle.com/datasets/humansintheloop/compass-xp
- **License:** CC BY 4.0

**How to download all X-ray datasets in bulk:**
```bash
# Install gdown for Google Drive downloads
pip install gdown

# GDXray
wget https://domingomery.ing.puc.cl/material/gdxray/GDXray.zip
unzip GDXray.zip -d data/xray/gdxray/

# SIXray (via gdown)
gdown --folder https://drive.google.com/drive/folders/1QrHrEVxhfDTKI2O0-cCy2Jqso64UGhkA -O data/xray/sixray/

# CLCXray
git clone https://github.com/GreysonPhoenix/CLCXray data/xray/clcxray/

# OPIXray
git clone https://github.com/OPIXray-author/OPIXray data/xray/opixray/
```

---

### 2.2 Threat & Contraband Reference Data

#### COCO Dataset (YOLOv8 Pretraining Base)
- **What it is:** 330K images, 80 object classes. Used as the base pretrained weights for YOLOv8 before fine-tuning on customs X-rays.
- **Size:** 25 GB (train2017 + val2017 + annotations)
- **Download:** https://cocodataset.org/#download
- **Direct links:**
  - Train images: http://images.cocodataset.org/zips/train2017.zip
  - Val images: http://images.cocodataset.org/zips/val2017.zip
  - Annotations: http://images.cocodataset.org/annotations/annotations_trainval2017.zip
- **License:** CC BY 4.0

#### Ultralytics YOLOv8 Pretrained Weights
- **What it is:** Pre-trained model weights (trained on COCO). Download and fine-tune — don't train from scratch.
- **Download (auto via pip):**
```bash
pip install ultralytics
# weights download automatically on first use:
from ultralytics import YOLO
model = YOLO('yolov8l.pt')  # downloads yolov8l.pt ~87MB
```
- **Manual download:** https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8l.pt

---

### 2.3 HS Tariff Code Data

#### WCO HS Nomenclature 2022
- **What it is:** World Customs Organization Harmonised System — the official 5,000+ product classification codes used globally.
- **Download (CSV, structured):** https://www.wcoomd.org/en/topics/nomenclature/instrument-and-tools/hs-nomenclature-2022-edition.aspx
- **India-specific (CBIC):** https://www.cbic.gov.in/resources//htdocs-cbec/customs/cs-act/formatted-htmls/cst1.htm
- **Machine-readable CSV (UN Comtrade):** https://unstats.un.org/unsd/tradekb/Knowledgebase/50039/HS-2022-complete-list-in-Excel-and-CSV-format
- **Direct CSV:** https://comtradeapi.un.org/files/v1/app/reference/Tariff.csv.gz

#### India Budget 2026-27 Customs Duty Schedule
- **Source:** CBIC official site — updated on Budget day
- **URL:** https://www.cbic.gov.in/resources//htdocs-cbec/customs/cst-act2012-250412.pdf
- **API (post-budget):** https://api.cbic.gov.in/tariff/v1/ *(contact CBIC for API key)*

```bash
# Download HS code CSV
wget "https://comtradeapi.un.org/files/v1/app/reference/Tariff.csv.gz" -O data/tariff/hs_codes.csv.gz
gunzip data/tariff/hs_codes.csv.gz
```

---

### 2.4 Country Risk Index Data

#### FATF High-Risk Jurisdictions List
- **What it is:** Financial Action Task Force "grey list" and "black list" — countries with strategic AML/CFT deficiencies. Direct input to origin country risk feature.
- **Download:** https://www.fatf-gafi.org/en/topics/high-risk-and-other-monitored-jurisdictions.html
- **Machine-readable JSON:** https://www.fatf-gafi.org/content/dam/fatf-gafi/high-risk-jurisdictions/FATF-high-risk-jurisdictions.json *(check for latest)*

#### World Bank Ease of Doing Business / Trade Logistics Index
- **What it is:** Country-level trade performance scores — proxy for customs reliability of origin country.
- **Download:** https://lpi.worldbank.org/international/global
- **Direct CSV:** https://datacatalogfiles.worldbank.org/ddh-published/0038010/DR0049812/LPI_Data.csv

#### UN Comtrade Country Codes + Risk Mapping
- **Download:** https://comtradeapi.un.org/files/v1/app/reference/partnerAreas.csv

#### Basel AML Index (Money Laundering Risk by Country)
- **What it is:** Annual ranking of 152 countries by money-laundering risk — directly relevant to high-value cargo origin risk.
- **Download:** https://index.baselgovernance.org/api/datasets/latest/download/csv
- **Main page:** https://index.baselgovernance.org/

```bash
# Bulk download country risk data
wget "https://lpi.worldbank.org/sites/default/files/International_LPI_from_2007_to_2023.xlsx" -O data/risk/world_bank_lpi.xlsx
wget "https://index.baselgovernance.org/api/datasets/latest/download/csv" -O data/risk/basel_aml_index.csv
wget "https://comtradeapi.un.org/files/v1/app/reference/partnerAreas.csv" -O data/risk/country_codes.csv
```

---

### 2.5 Sanctions & Watchlist Data

#### OFAC Specially Designated Nationals (SDN) List
- **What it is:** US Treasury Office of Foreign Assets Control — the global gold standard sanctions list. ~15,000 entities.
- **Format:** XML, CSV, JSON available
- **Download page:** https://ofac.treasury.gov/sanctions-list-search
- **Direct XML:** https://www.treasury.gov/ofac/downloads/sdn.xml
- **Direct CSV:** https://www.treasury.gov/ofac/downloads/sdn.csv
- **Auto-updated daily**

#### UN Security Council Consolidated Sanctions List
- **What it is:** UN official sanctions covering terrorism, WMD proliferation, country-specific sanctions.
- **Download:** https://scsanctions.un.org/resources/xml/en/consolidated.xml
- **CSV version:** https://scsanctions.un.org/resources/csv/en/consolidated.csv

#### EU Consolidated Sanctions List
- **Download:** https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content?token=dG9rZW4tMjAxNw

#### INTERPOL Notices (Public Data)
- **What it is:** Red/Orange notices for wanted persons and dangerous goods. API available.
- **API:** https://ws-public.interpol.int/notices/v1/red *(public REST API, no key needed)*

```bash
# Download sanctions lists
wget "https://www.treasury.gov/ofac/downloads/sdn.csv" -O data/sanctions/ofac_sdn.csv
wget "https://scsanctions.un.org/resources/csv/en/consolidated.csv" -O data/sanctions/un_sanctions.csv

# Auto-refresh script (run daily via cron)
# Add to crontab: 0 2 * * * /scripts/refresh_sanctions.sh
```

---

### 2.6 Historical Trade & Customs Data

#### UN Comtrade Database (Trade Flows)
- **What it is:** Import/export statistics for 200+ countries by HS code. Useful for detecting declared value anomalies (is ₹12 lakh for "electronics from Dubai" realistic?).
- **API (free tier):** https://comtradeapi.un.org/
- **Bulk download:** https://comtradeapi.un.org/bulk/v1/file/C/A/HS?subscription-key=YOUR_KEY
- **Registration:** https://comtradeapi.un.org/ *(free account for 500 API calls/day)*

#### India DGFT Trade Statistics
- **What it is:** India's Directorate General of Foreign Trade — commodity-level import/export data.
- **Download:** https://www.dgft.gov.in/CP/?opt=EOEC
- **Monthly data:** https://commerce.gov.in/trade-statistics/

#### World Integrated Trade Solution (WITS) — World Bank
- **What it is:** Comprehensive trade data by country + HS code, useful for price benchmarking.
- **Download:** https://wits.worldbank.org/WITS/WITS/Restricted/Login.aspx *(free account)*
- **Bulk CSV:** https://wits.worldbank.org/data/public/CEPII-BACI-HS12-V202401b.zip

---

### 2.7 AEO & Trusted Trader Reference Data

#### WCO AEO Compendium
- **What it is:** Global list of countries with AEO/trusted trader programmes and mutual recognition agreements.
- **Download:** https://www.wcoomd.org/-/media/wco/public/global/pdf/topics/facilitation/instruments-and-tools/tools/safe-package/aeo-compendium.pdf

#### India AEO Programme Guidelines (CBIC)
- **What it is:** Official criteria for AEO Tier 1/2/3 certification in India — used to validate blockchain credential fields.
- **Download:** https://www.cbic.gov.in/resources//htdocs-cbec/customs/aeo/aeo-guidelines-april2016.pdf

---

### 2.8 Geopolitical & Conflict Data

#### ACLED — Armed Conflict Location & Event Data
- **What it is:** Real-time data on political violence and conflict by country/region. Used for origin route risk adjustment.
- **Download:** https://acleddata.com/data-export-tool/ *(free account required)*
- **API:** https://api.acleddata.com/acled/read?key=YOUR_KEY&email=YOUR_EMAIL

#### UN OCHA Conflict Zones
- **Download:** https://data.humdata.org/

---

### 2.9 Port & Vessel Data

#### MarineTraffic AIS Data (Vessel Tracking)
- **What it is:** Real-time vessel positions, port calls, route history. Used for carrier risk scoring.
- **API:** https://www.marinetraffic.com/en/ais-api-services *(paid, ~$50/month basic)*
- **Free alternative (OpenAIS):** https://www.vessel-tracking.net/

#### Indian Port Community System (PCS1x)
- **What it is:** India's national port system — official source of vessel arrival/manifest data.
- **API access:** Contact Indian Ports Association at https://www.ipa.nic.in/

---

### Bulk Download Script (All Free Sources)

```bash
#!/bin/bash
# scannr_data_download.sh
# Run once to pull all free datasets

mkdir -p data/{xray,tariff,risk,sanctions,trade}

echo "=== Downloading X-ray datasets ==="
wget -q "https://domingomery.ing.puc.cl/material/gdxray/GDXray.zip" \
     -O data/xray/gdxray.zip && unzip -q data/xray/gdxray.zip -d data/xray/

echo "=== Downloading HS tariff codes ==="
wget -q "https://comtradeapi.un.org/files/v1/app/reference/Tariff.csv.gz" \
     -O data/tariff/hs_codes.csv.gz && gunzip data/tariff/hs_codes.csv.gz

echo "=== Downloading country risk data ==="
wget -q "https://index.baselgovernance.org/api/datasets/latest/download/csv" \
     -O data/risk/basel_aml.csv
wget -q "https://comtradeapi.un.org/files/v1/app/reference/partnerAreas.csv" \
     -O data/risk/countries.csv

echo "=== Downloading sanctions lists ==="
wget -q "https://www.treasury.gov/ofac/downloads/sdn.csv" \
     -O data/sanctions/ofac_sdn.csv
wget -q "https://scsanctions.un.org/resources/csv/en/consolidated.csv" \
     -O data/sanctions/un_sanctions.csv

echo "=== Done. Check data/ folder ==="
du -sh data/
```

---

## Part 3 — How It All Works (End-to-End)

---

### Step 0 — One-Time Setup (Before First Container)

```
CBIC admin registers all known importers on Hyperledger Fabric
      │
      ├─ For each importer:
      │    RegistrationDate = today (immutable)
      │    AEO cert = uploaded + multi-signed by CBIC + port authority
      │    ViolationHistory = [] (empty, append-only)
      │    TrustScore = calculated by chaincode
      │
YOLOv8 trained on GDXray + SIXray datasets
      │
      ├─ 100 epochs on NVIDIA A100
      ├─ Grad-CAM integrated
      └─ Model saved to MLflow registry as v1.0

XGBoost trained on:
      ├─ Synthetic data (if no real history) or
      └─ Last 3-5 years ICEGATE clearance records

Sanctions lists loaded into PostgreSQL (OFAC + UN)
Country risk scores loaded (Basel AML + World Bank LPI)
HS tariff weights loaded from CBIC API (post-Budget)

All 7 services start via docker-compose / Kubernetes
RabbitMQ queues created: vision.results, risk.requests
```

---

### Step 1 — Container Arrives at Port

```
🚢 CONTAINER: TCMU-2026-00147
   Importer: TechCorp India Pvt. Ltd.
   Declared: "Laptop components from Taiwan"
   Value: ₹45 lakh   HS Code: 8471.30
```

The port's Terminal Operating System (TOS) sends a webhook to SCANNR's API gateway the moment the vessel manifest is confirmed:

```
POST /api/v1/clearance/initiate
{
  "container_id": "TCMU-2026-00147",
  "importer_gstin": "27AABCU9603R1ZN",
  "manifest_url": "https://icegate.gov.in/manifests/...",
  "xray_scan_id": null,       ← not scanned yet
  "declared_value_inr": 4500000,
  "hs_code": "8471.30"
}
```

SCANNR creates a `clearance_decision` row in PostgreSQL with `status = PENDING` and kicks off the pipeline.

---

### Step 2 — Blockchain Identity Check (10 seconds)

The `identity-svc` receives the GSTIN and queries the Hyperledger Fabric network:

```
Query: GetImporter("27AABCU9603R1ZN")

Fabric network responds from CouchDB world state:
{
  "ImporterID": "27AABCU9603R1ZN",
  "RegistrationDate": "2019-01-14T08:22:11Z",
  "AEOCertificates": [{ "tier": 1, "issued": "2021-03", "multiSig": true }],
  "ViolationHistory": [],
  "InspectionLogs": [47 entries, all CLEARED],
  "TrustScore": 88.0
}
```

**What the blockchain guarantees:**
- `RegistrationDate` cannot be faked — it was written in 2019 and the chain proves it
- `ViolationHistory` being empty is cryptographically verified — no one deleted records
- `TrustScore` was computed on-chain, not by any external system

**Redis cache check happens first** — if this GSTIN was queried in the last 6 hours, the cached result is returned in <200ms, skipping the Fabric query entirely.

Result emitted to RabbitMQ → picked up by orchestrator.

**Trust Score for TechCorp:**
```
TrustScore = (7 years × 10) + (AEO Tier 1 × 20) - (0 violations × 15) + (47 clean × 0.5)
           = 70 + 20 - 0 + 23.5
           = 93.5 → clamped → 88.0 (with recency weight)
```

---

### Step 3 — Physical X-ray Scan (30 seconds)

The container moves through a drive-through X-ray scanner at the port gate. The scanner hardware (e.g., Smiths Detection, Nuctech) generates a DICOM image file and POSTs it to `vision-svc`:

```
POST /scan
{
  "scan_id": "SCN-MUM-20260205-0147",
  "container_id": "TCMU-2026-00147",
  "dicom_url": "s3://scannr-scans/raw/SCN-MUM-20260205-0147.dcm"
}
```

---

### Step 4 — Vision AI Analysis (5 seconds)

Inside `vision-svc`:

```
1. Fetch DICOM from S3
2. OpenCV pipeline:
   - Convert DICOM → 16-bit PNG
   - CLAHE contrast enhancement (highlights density variations)
   - Resize to 640×640
   - Normalise pixel values to [0,1]

3. YOLOv8-Large inference:
   - Run forward pass on GPU
   - Output: bounding boxes + class labels + confidence scores
   
   Result for TechCorp container:
   [
     { class: "density_anomaly", confidence: 0.42, bbox: [x,y,w,h] }
   ]
   ← confidence 42% is BELOW 75% threshold → not flagged

4. Grad-CAM heatmap generated:
   - Identifies which pixels activated the anomaly detection
   - Saved as PNG to S3: s3://scannr-heatmaps/SCN-MUM-20260205-0147.png
   
5. Nearest historical case lookup:
   - PostgreSQL query: SELECT * FROM clearance_decisions 
     WHERE vision_class = 'density_anomaly' 
     ORDER BY vision_confidence DESC LIMIT 3
   - Returns: [Case #MUM-2025-1134 — found packaging material, CLEARED]

6. Emit to RabbitMQ 'vision.results':
   {
     "scan_id": "SCN-MUM-20260205-0147",
     "anomaly_detected": false,
     "confidence": 0.42,
     "threshold_met": false,
     "heatmap_url": "s3://...",
     "similar_case": "#MUM-2025-1134"
   }
```

---

### Step 5 — Risk Score Calculation (2 seconds)

`risk-svc` consumes the RabbitMQ message, assembles all 25+ features, and scores:

```python
features = {
  # From Blockchain (weight: 40%)
  "trust_score": 88.0,
  "years_active": 7,
  "violation_count": 0,
  "aeo_tier": 1,
  "recent_clean_inspections": 10,   # last 10 all cleared

  # From Vision AI (weight: 30%)
  "anomaly_detected": 0,            # False = 0
  "vision_confidence": 0.42,
  "anomaly_class_encoded": 3,       # density_anomaly
  "detection_count": 0,

  # From Cargo / Manifest (weight: 15%)
  "hs_code_risk": 0.2,              # 8471.30 = laptop parts = low risk
  "declared_value_inr": 4500000,
  "value_vs_benchmark": 0.95,       # declared value close to Comtrade avg
  "weight_kg": 2400,
  "category_encoded": 2,            # electronics

  # From Route (weight: 10%)
  "origin_risk_index": 0.38,        # Taiwan = moderate (US tensions)
  "transshipment_count": 0,         # direct shipment
  "carrier_risk_score": 0.15,       # known carrier, clean history
  "port_of_entry_risk": 0.25,       # Mumbai JNPT = standard

  # From External Intel (weight: 5%)
  "ofac_match": 0,                  # no sanctions match
  "un_sanctions_match": 0,
  "conflict_zone_flag": 0,
  "seasonal_smuggling_index": 0.2,  # Feb = low season
}

xgboost_model.predict(features) → risk_score = 18
```

**Decision:** Risk score 18 < threshold 20 → 🟢 **GREEN LANE**

---

### Step 6 — Decision Written & Container Released

```
PostgreSQL clearance_decisions:
{
  "container_id": "TCMU-2026-00147",
  "importer_gstin": "27AABCU9603R1ZN",
  "risk_score": 18,
  "lane": "GREEN",
  "vision_anomaly": false,
  "vision_confidence": 0.42,
  "blockchain_trust": 88.0,
  "heatmap_s3_url": "s3://scannr-heatmaps/...",
  "officer_override": false,
  "audit_hash": "sha256:a3f9b2c1..."   ← SHA-256 of full payload
}
```

Blockchain updated: `InspectionLogs` for TechCorp gets a new entry — `CLEARED, score 18, GREEN`.

ICEGATE notified via API → manifest marked as cleared → container released to importer.

**Total time: 2 minutes 18 seconds.**

---

### What Happens With a HIGH-RISK Container

```
Container: QILL-2026-0893
Importer: QuickImports LLC (registered 2 months ago)
Cargo: "Electronics" from Dubai
Value: ₹12 lakh

Blockchain result:
  TrustScore: 22  (only 2 months active, no AEO)

Vision AI result:
  anomaly_detected: TRUE
  class: density_anomaly
  confidence: 0.91  ← above 75% threshold → FLAGGED
  Heatmap: large red zone in corner of container

Risk features assembled:
  trust_score: 22     ← very low
  anomaly_detected: 1 ← flagged
  vision_confidence: 0.91
  origin_risk: 0.72   ← Dubai = moderate-high (transshipment hub)
  value_vs_benchmark: 0.41 ← declared value 59% below Comtrade avg
  importer_age_months: 2   ← brand new

XGBoost output: risk_score = 78

Decision: 🔴 RED LANE → Physical inspection mandatory

Officer sees in dashboard:
  - Risk score: 78/100
  - Vision heatmap showing density anomaly in top-left corner
  - Similar to Case #CH-2024-4471 (gold bars in electronics, 2024)
  - Trust score 22 (new importer, no credentials)

Officer physically inspects → finds 15kg gold bars
Officer clicks "Confirm Seizure" in dashboard

System updates:
  - clearance_decisions: lane=RED, officer_override=false
  - Blockchain: ViolationHistory += { date: today, type: SEIZURE }
  - TrustScore for QuickImports → recalculated → drops to 7/100
  - ml_training_queue: case added as TRUE_POSITIVE for model validation
```

---

### The Self-Healing Loop

```
Week 1: Model deployed. Accuracy on real data: 89%
            │
            ├─ Officers flag 12 cases as "AI was wrong"
            │    (9 false positives, 3 false negatives)
            │
Week 2: 50 flagged samples accumulated in ml_training_queue
            │
            ├─ 02:00 IST: retrain_scheduler.py triggers
            ├─ New model v1.1 trained with flagged cases added
            ├─ MLflow logs v1.1 with metrics
            ├─ v1.1 deployed to 10% of /score traffic
            │
48 hours later:
            ├─ ab_test.py compares:
            │    v1.0 accuracy on holdout: 89.0%
            │    v1.1 accuracy on holdout: 90.3%
            │
            └─ v1.1 auto-promoted to 100% traffic
               v1.0 archived in MLflow (never deleted)

Week 3: Smugglers start using lead-lined packaging (blocks X-rays)
            │
            ├─ monitor.py detects: 18% spike in "void" detections
            ├─ Adversarial alert triggered
            ├─ Emergency retrain within 48 hours
            │    New class: "lead_shielded_void"
            └─ Patch deployed. Smuggling tactic neutralised.
```

---

### The Tariff Sync Loop

```
Budget Day: March 1, 2026
Finance Minister announces: lithium batteries (HS 8507) tariff raised 15%

02:00 IST: tariff_sync_svc polls CBIC API
            │
            ├─ Detects change: HS 8507 new_duty_rate = prev + 15%
            ├─ Updates tariff_risk_weights table:
            │    hs_code: '8507'
            │    risk_weight: 1.0 → 1.15  (higher tariff = higher evasion incentive)
            │
            ├─ Sends reload signal to risk-svc via RabbitMQ
            │
risk-svc receives signal:
            ├─ Reloads tariff_risk_weights from PostgreSQL
            ├─ XGBoost feature for HS 8507 containers now weighted +15%
            └─ No model retraining needed — it's a feature weight change only

Total time from Budget announcement → live in scoring: < 24 hours
```

---

### How the Three Pillars Talk to Each Other

```
                    ┌─────────────────────────┐
                    │    RabbitMQ / API calls  │
                    └─────────────────────────┘
                              │
            ┌─────────────────┼──────────────────┐
            │                 │                  │
     ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
     │ identity-svc │   │  vision-svc  │   │  risk-svc   │
     │ Hyperledger  │   │  YOLOv8     │   │  XGBoost    │
     │ Fabric       │   │  Grad-CAM   │   │  25 features│
     └──────┬───────┘   └──────┬──────┘   └──────┬──────┘
            │                  │                  │
            └────────────────┬─┘                  │
                             │    ┌───────────────┘
                             ▼    ▼
                    ┌────────────────────┐
                    │   Orchestrator     │
                    │  (api-gateway)     │
                    │                   │
                    │  Combines:        │
                    │  • Trust = 88     │
                    │  • Anomaly = NO   │
                    │  • Score = 18     │
                    │                   │
                    │  → GREEN LANE ✅  │
                    └────────┬──────────┘
                             │
               ┌─────────────┼──────────────┐
               ▼             ▼              ▼
        PostgreSQL       Blockchain      ICEGATE
        (audit log)    (update log)   (release signal)
```

---

### Data Flow Summary Table

| Data | Source | Flows Into | How Often |
|---|---|---|---|
| X-ray DICOM image | Port scanner hardware | `vision-svc` | Per container |
| Cargo manifest | ICEGATE / vessel TOS | Orchestrator | Per container |
| Importer profile | Hyperledger Fabric | `risk-svc` features | Per container (cached) |
| Trust score | Chaincode (on-chain compute) | `risk-svc` features | Per blockchain query |
| HS code tariff weight | CBIC API → PostgreSQL | `risk-svc` features | Daily sync |
| OFAC/UN sanctions | Treasury / UN → PostgreSQL | `risk-svc` features | Daily refresh |
| Country risk score | Basel AML + World Bank → PostgreSQL | `risk-svc` features | Monthly |
| Grad-CAM heatmap | `vision-svc` generates | S3 storage → dashboard | Per scan |
| Officer override | Dashboard UI → API | `ml_training_queue` | Per override |
| Retrain samples | `ml_training_queue` | MLflow + new model | Nightly if ≥50 |
| Model metrics | MLflow | `ml-monitor-svc` | Continuous |
| Tariff change diff | CBIC API | `tariff_risk_weights` table | Every 6hrs poll |

---

*Everything here is buildable with open-source tools and free data. The only paid external dependency is MarineTraffic AIS (optional, for carrier risk). Everything else runs on your own infrastructure.*
