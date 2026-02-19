package importer

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type ImporterProfile struct {
	ImporterID       string      `json:"importer_id"`
	RegistrationDate string      `json:"registration_date"`
	AEOCertificates  []AEOCert   `json:"aeo_certificates"`
	ViolationHistory []Violation `json:"violation_history"`
	InspectionLogs   []Inspection `json:"inspection_logs"`
	TrustScore       float64     `json:"trust_score"`
	LastUpdated      string      `json:"last_updated"`
}

type AEOCert struct {
	CertificateID string `json:"certificate_id"`
	Tier          int    `json:"tier"`
	IssuedBy      string `json:"issued_by"`
	IssuedAt      string `json:"issued_at"`
	ExpiresAt     string `json:"expires_at"`
}

type Violation struct {
	ViolationID string `json:"violation_id"`
	Description string `json:"description"`
	Severity    int    `json:"severity"`
	RecordedAt  string `json:"recorded_at"`
}

type Inspection struct {
	InspectionID string `json:"inspection_id"`
	Outcome      string `json:"outcome"`
	InspectorID  string `json:"inspector_id"`
	InspectedAt  string `json:"inspected_at"`
}

type SmartContract struct {
	contractapi.Contract
}

func (s *SmartContract) RegisterImporter(ctx contractapi.TransactionContextInterface, importerID string, yearsActive int, aeoTier int, violations int, cleanInspections int) (*ImporterProfile, error) {
	exists, err := s.importerExists(ctx, importerID)
	if err != nil {
		return nil, fmt.Errorf("failed to check importer existence: %v", err)
	}
	if exists {
		return nil, fmt.Errorf("importer %s already exists", importerID)
	}
	now := time.Now().UTC().Format(time.RFC3339)
	trustScore := calculateTrustScore(yearsActive, aeoTier, violations, cleanInspections)
	profile := ImporterProfile{
		ImporterID:       importerID,
		RegistrationDate: now,
		AEOCertificates:  []AEOCert{},
		ViolationHistory: []Violation{},
		InspectionLogs:   []Inspection{},
		TrustScore:       trustScore,
		LastUpdated:      now,
	}
	profileBytes, err := json.Marshal(profile)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal profile: %v", err)
	}
	if err := ctx.GetStub().PutState(importerID, profileBytes); err != nil {
		return nil, fmt.Errorf("failed to write state: %v", err)
	}
	return &profile, nil
}

func (s *SmartContract) GetImporter(ctx contractapi.TransactionContextInterface, importerID string) (*ImporterProfile, error) {
	profileBytes, err := ctx.GetStub().GetState(importerID)
	if err != nil {
		return nil, fmt.Errorf("failed to read state: %v", err)
	}
	if profileBytes == nil {
		return nil, fmt.Errorf("importer %s not found", importerID)
	}
	var profile ImporterProfile
	if err := json.Unmarshal(profileBytes, &profile); err != nil {
		return nil, fmt.Errorf("failed to unmarshal profile: %v", err)
	}
	return &profile, nil
}

func (s *SmartContract) AddViolation(ctx contractapi.TransactionContextInterface, importerID string, violationID string, description string, severity int) error {
	profile, err := s.GetImporter(ctx, importerID)
	if err != nil {
		return err
	}
	now := time.Now().UTC().Format(time.RFC3339)
	violation := Violation{
		ViolationID: violationID,
		Description: description,
		Severity:    severity,
		RecordedAt:  now,
	}
	profile.ViolationHistory = append(profile.ViolationHistory, violation)
	profile.LastUpdated = now
	profileBytes, err := json.Marshal(profile)
	if err != nil {
		return fmt.Errorf("failed to marshal profile: %v", err)
	}
	if err := ctx.GetStub().PutState(importerID, profileBytes); err != nil {
		return fmt.Errorf("failed to write state: %v", err)
	}
	return nil
}

func (s *SmartContract) LogInspection(ctx contractapi.TransactionContextInterface, importerID string, inspectionID string, outcome string, inspectorID string) error {
	profile, err := s.GetImporter(ctx, importerID)
	if err != nil {
		return err
	}
	now := time.Now().UTC().Format(time.RFC3339)
	inspection := Inspection{
		InspectionID: inspectionID,
		Outcome:      outcome,
		InspectorID:  inspectorID,
		InspectedAt:  now,
	}
	profile.InspectionLogs = append(profile.InspectionLogs, inspection)
	profile.LastUpdated = now
	profileBytes, err := json.Marshal(profile)
	if err != nil {
		return fmt.Errorf("failed to marshal profile: %v", err)
	}
	if err := ctx.GetStub().PutState(importerID, profileBytes); err != nil {
		return fmt.Errorf("failed to write state: %v", err)
	}
	return nil
}

func (s *SmartContract) CalculateTrustScore(ctx contractapi.TransactionContextInterface, importerID string) (float64, error) {
	profile, err := s.GetImporter(ctx, importerID)
	if err != nil {
		return 0, err
	}
	return profile.TrustScore, nil
}

func (s *SmartContract) AddAEOCertificate(ctx contractapi.TransactionContextInterface, importerID string, certificateID string, tier int, issuedBy string, expiresAt string) error {
	profile, err := s.GetImporter(ctx, importerID)
	if err != nil {
		return err
	}
	now := time.Now().UTC().Format(time.RFC3339)
	cert := AEOCert{
		CertificateID: certificateID,
		Tier:          tier,
		IssuedBy:      issuedBy,
		IssuedAt:      now,
		ExpiresAt:     expiresAt,
	}
	profile.AEOCertificates = append(profile.AEOCertificates, cert)
	profile.LastUpdated = now
	profileBytes, err := json.Marshal(profile)
	if err != nil {
		return fmt.Errorf("failed to marshal profile: %v", err)
	}
	if err := ctx.GetStub().PutState(importerID, profileBytes); err != nil {
		return fmt.Errorf("failed to write state: %v", err)
	}
	return nil
}

// UpdateImporter updates mutable fields only. RegistrationDate is immutable
// and ViolationHistory is append-only — these rules are enforced here.
func (s *SmartContract) UpdateImporter(ctx contractapi.TransactionContextInterface, importerID string, newRegistrationDate string, newViolationHistoryJSON string) error {
	profile, err := s.GetImporter(ctx, importerID)
	if err != nil {
		return err
	}

	// ANTI-FRAUD RULE 1: RegistrationDate is immutable — reject any change
	if newRegistrationDate != "" && newRegistrationDate != profile.RegistrationDate {
		return fmt.Errorf("ANTI-FRAUD: RegistrationDate is immutable and cannot be modified (current: %s, attempted: %s)", profile.RegistrationDate, newRegistrationDate)
	}

	// ANTI-FRAUD RULE 2: ViolationHistory is append-only — no deletions
	if newViolationHistoryJSON != "" {
		var newViolations []Violation
		if err := json.Unmarshal([]byte(newViolationHistoryJSON), &newViolations); err != nil {
			return fmt.Errorf("failed to parse violation history: %v", err)
		}
		// Reject if new list is shorter (deletions attempted)
		if len(newViolations) < len(profile.ViolationHistory) {
			return fmt.Errorf("ANTI-FRAUD: ViolationHistory is append-only — cannot delete violations (current: %d, attempted: %d)", len(profile.ViolationHistory), len(newViolations))
		}
		// Reject if any existing violation was modified
		for i, existing := range profile.ViolationHistory {
			if i < len(newViolations) {
				if newViolations[i].ViolationID != existing.ViolationID {
					return fmt.Errorf("ANTI-FRAUD: ViolationHistory is append-only — cannot modify existing violation at index %d", i)
				}
			}
		}
		profile.ViolationHistory = newViolations
	}

	profile.LastUpdated = time.Now().UTC().Format(time.RFC3339)
	profileBytes, err := json.Marshal(profile)
	if err != nil {
		return fmt.Errorf("failed to marshal profile: %v", err)
	}
	return ctx.GetStub().PutState(importerID, profileBytes)
}

// DeleteViolation explicitly rejects deletion of violation history records.
func (s *SmartContract) DeleteViolation(ctx contractapi.TransactionContextInterface, importerID string, violationID string) error {
	return fmt.Errorf("ANTI-FRAUD: Deletion of ViolationHistory records is prohibited — violation %s cannot be removed from importer %s", violationID, importerID)
}

func (s *SmartContract) importerExists(ctx contractapi.TransactionContextInterface, importerID string) (bool, error) {
	profileBytes, err := ctx.GetStub().GetState(importerID)
	if err != nil {
		return false, fmt.Errorf("failed to read state: %v", err)
	}
	return profileBytes != nil, nil
}

func calculateTrustScore(yearsActive int, aeoTier int, violations int, cleanInspections int) float64 {
	score := float64(yearsActive*10) + float64(aeoTier*20) - float64(violations*15) + float64(cleanInspections)*0.5
	if score < 0 {
		score = 0
	}
	if score > 100 {
		score = 100
	}
	return score
}