package importer

import (
	"testing"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

func TestRegisterImporter(t *testing.T) {
	contract := new(SmartContract)
	ctx := &mockTransactionContext{}
	stub := &mockStub{}
	ctx.stub = stub

	profile, err := contract.RegisterImporter(ctx, "27AABCU9603R1ZN", 7, 1, 0, 20)
	if err != nil {
		t.Fatalf("RegisterImporter failed: %v", err)
	}
	if profile.ImporterID != "27AABCU9603R1ZN" {
		t.Errorf("expected importer_id 27AABCU9603R1ZN, got %s", profile.ImporterID)
	}
	if profile.TrustScore != 90.0 {
		t.Errorf("expected trust_score 90.0, got %f", profile.TrustScore)
	}
}

func TestGetImporter(t *testing.T) {
	contract := new(SmartContract)
	ctx := &mockTransactionContext{}
	stub := &mockStub{}
	stub.state["27AABCU9603R1ZN"] = []byte(`{"importer_id":"27AABCU9603R1ZN","registration_date":"2026-01-01T00:00:00Z","trust_score":90.0}`)
	ctx.stub = stub

	profile, err := contract.GetImporter(ctx, "27AABCU9603R1ZN")
	if err != nil {
		t.Fatalf("GetImporter failed: %v", err)
	}
	if profile.ImporterID != "27AABCU9603R1ZN" {
		t.Errorf("expected importer_id 27AABCU9603R1ZN, got %s", profile.ImporterID)
	}
}

func TestAddViolation(t *testing.T) {
	contract := new(SmartContract)
	ctx := &mockTransactionContext{}
	stub := &mockStub{}
	stub.state["27AABCU9603R1ZN"] = []byte(`{"importer_id":"27AABCU9603R1ZN","registration_date":"2026-01-01T00:00:00Z","violation_history":[],"trust_score":90.0}`)
	ctx.stub = stub

	err := contract.AddViolation(ctx, "27AABCU9603R1ZN", "V001", "Undeclared goods", 3)
	if err != nil {
		t.Fatalf("AddViolation failed: %v", err)
	}
	if len(stub.state["27AABCU9603R1ZN"]) == 0 {
		t.Error("expected state to be updated")
	}
}

func TestCalculateTrustScore(t *testing.T) {
	score := calculateTrustScore(7, 1, 0, 20)
	if score != 90.0 {
		t.Errorf("expected trust_score 90.0, got %f", score)
	}
}

// ──────────────────────────────────────────────────────────────────────
// ADVERSARIAL TESTS — Anti-Fraud Rule Enforcement
// PRD §5.2.3: RegistrationDate immutable, ViolationHistory append-only
// ──────────────────────────────────────────────────────────────────────

func TestAdversarial_BackdateRegistrationDate(t *testing.T) {
	// ANTI-FRAUD: Attempt to backdate RegistrationDate should be rejected.
	contract := new(SmartContract)
	ctx := &mockTransactionContext{}
	stub := &mockStub{}
	ctx.stub = stub

	// Register importer (sets RegistrationDate automatically)
	profile, err := contract.RegisterImporter(ctx, "27AABCU9603R1ZN", 7, 1, 0, 20)
	if err != nil {
		t.Fatalf("RegisterImporter failed: %v", err)
	}
	originalDate := profile.RegistrationDate

	// Now attempt to backdate the RegistrationDate via UpdateImporter
	err = contract.UpdateImporter(ctx, "27AABCU9603R1ZN", "2020-01-01T00:00:00Z", "")
	if err == nil {
		t.Fatal("ADVERSARIAL FAILURE: UpdateImporter should have rejected RegistrationDate modification but did not")
	}
	if err.Error() == "" {
		t.Fatal("ADVERSARIAL FAILURE: Expected anti-fraud error message")
	}

	// Verify RegistrationDate was NOT changed
	retrieved, err := contract.GetImporter(ctx, "27AABCU9603R1ZN")
	if err != nil {
		t.Fatalf("GetImporter failed: %v", err)
	}
	if retrieved.RegistrationDate != originalDate {
		t.Fatalf("ADVERSARIAL FAILURE: RegistrationDate was modified from %s to %s", originalDate, retrieved.RegistrationDate)
	}
}

func TestAdversarial_ForwardDateRegistrationDate(t *testing.T) {
	// ANTI-FRAUD: Attempt to forward-date RegistrationDate should also be rejected.
	contract := new(SmartContract)
	ctx := &mockTransactionContext{}
	stub := &mockStub{}
	ctx.stub = stub

	_, err := contract.RegisterImporter(ctx, "29ZZZZZ9999Z1Z0", 3, 0, 2, 5)
	if err != nil {
		t.Fatalf("RegisterImporter failed: %v", err)
	}

	err = contract.UpdateImporter(ctx, "29ZZZZZ9999Z1Z0", "2030-12-31T23:59:59Z", "")
	if err == nil {
		t.Fatal("ADVERSARIAL FAILURE: UpdateImporter should have rejected RegistrationDate forward-dating")
	}
}

func TestAdversarial_DeleteViolationHistory(t *testing.T) {
	// ANTI-FRAUD: Attempt to delete violations from ViolationHistory should be rejected.
	contract := new(SmartContract)
	ctx := &mockTransactionContext{}
	stub := &mockStub{}
	ctx.stub = stub

	// Register and add 2 violations
	_, err := contract.RegisterImporter(ctx, "33AAAAA0000A1Z1", 5, 1, 0, 10)
	if err != nil {
		t.Fatalf("RegisterImporter failed: %v", err)
	}

	err = contract.AddViolation(ctx, "33AAAAA0000A1Z1", "V001", "Undeclared electronics", 3)
	if err != nil {
		t.Fatalf("AddViolation 1 failed: %v", err)
	}
	err = contract.AddViolation(ctx, "33AAAAA0000A1Z1", "V002", "Counterfeit documents", 5)
	if err != nil {
		t.Fatalf("AddViolation 2 failed: %v", err)
	}

	// Verify 2 violations exist
	profile, _ := contract.GetImporter(ctx, "33AAAAA0000A1Z1")
	if len(profile.ViolationHistory) != 2 {
		t.Fatalf("Expected 2 violations, got %d", len(profile.ViolationHistory))
	}

	// Attempt to replace ViolationHistory with only 1 violation (deleting V002)
	shortenedJSON := `[{"violation_id":"V001","description":"Undeclared electronics","severity":3,"recorded_at":"2026-01-01T00:00:00Z"}]`
	err = contract.UpdateImporter(ctx, "33AAAAA0000A1Z1", "", shortenedJSON)
	if err == nil {
		t.Fatal("ADVERSARIAL FAILURE: UpdateImporter should have rejected ViolationHistory deletion")
	}

	// Verify violations were NOT deleted
	profile, _ = contract.GetImporter(ctx, "33AAAAA0000A1Z1")
	if len(profile.ViolationHistory) != 2 {
		t.Fatalf("ADVERSARIAL FAILURE: ViolationHistory was reduced from 2 to %d", len(profile.ViolationHistory))
	}
}

func TestAdversarial_EmptyViolationHistory(t *testing.T) {
	// ANTI-FRAUD: Attempt to clear all violations should be rejected.
	contract := new(SmartContract)
	ctx := &mockTransactionContext{}
	stub := &mockStub{}
	ctx.stub = stub

	_, _ = contract.RegisterImporter(ctx, "07BBBBB1111B1Z2", 2, 0, 0, 3)
	_ = contract.AddViolation(ctx, "07BBBBB1111B1Z2", "V010", "Smuggling attempt", 5)

	// Attempt to set ViolationHistory to empty array
	err := contract.UpdateImporter(ctx, "07BBBBB1111B1Z2", "", "[]")
	if err == nil {
		t.Fatal("ADVERSARIAL FAILURE: UpdateImporter should have rejected clearing ViolationHistory")
	}
}

func TestAdversarial_DeleteViolationDirect(t *testing.T) {
	// ANTI-FRAUD: The DeleteViolation function should always reject.
	contract := new(SmartContract)
	ctx := &mockTransactionContext{}
	stub := &mockStub{}
	ctx.stub = stub

	err := contract.DeleteViolation(ctx, "27AABCU9603R1ZN", "V001")
	if err == nil {
		t.Fatal("ADVERSARIAL FAILURE: DeleteViolation should always be rejected")
	}
}

func TestAdversarial_ModifyExistingViolation(t *testing.T) {
	// ANTI-FRAUD: Attempt to modify an existing violation record should be rejected.
	contract := new(SmartContract)
	ctx := &mockTransactionContext{}
	stub := &mockStub{}
	ctx.stub = stub

	_, _ = contract.RegisterImporter(ctx, "33CCCCC2222C1Z3", 4, 1, 0, 8)
	_ = contract.AddViolation(ctx, "33CCCCC2222C1Z3", "V020", "Original violation", 3)

	// Attempt to modify the existing violation by changing ViolationID
	modifiedJSON := `[{"violation_id":"V999","description":"Tampered record","severity":1,"recorded_at":"2026-01-01T00:00:00Z"}]`
	err := contract.UpdateImporter(ctx, "33CCCCC2222C1Z3", "", modifiedJSON)
	if err == nil {
		t.Fatal("ADVERSARIAL FAILURE: UpdateImporter should have rejected modification of existing violation")
	}
}

func TestAdversarial_SameRegistrationDateAccepted(t *testing.T) {
	// Passing the same RegistrationDate should be accepted (no actual change).
	contract := new(SmartContract)
	ctx := &mockTransactionContext{}
	stub := &mockStub{}
	ctx.stub = stub

	profile, _ := contract.RegisterImporter(ctx, "07DDDDD3333D1Z4", 1, 0, 0, 0)

	// Passing the exact same date should NOT error
	err := contract.UpdateImporter(ctx, "07DDDDD3333D1Z4", profile.RegistrationDate, "")
	if err != nil {
		t.Fatalf("UpdateImporter should accept same RegistrationDate, got error: %v", err)
	}
}

func TestAdversarial_AppendViolationAccepted(t *testing.T) {
	// Appending new violations (while keeping existing ones) should be accepted.
	contract := new(SmartContract)
	ctx := &mockTransactionContext{}
	stub := &mockStub{}
	ctx.stub = stub

	_, _ = contract.RegisterImporter(ctx, "29EEEEE4444E1Z5", 3, 1, 0, 5)
	_ = contract.AddViolation(ctx, "29EEEEE4444E1Z5", "V030", "Minor infraction", 1)

	// Append a new violation via UpdateImporter (keeping V030 intact)
	appendedJSON := `[{"violation_id":"V030","description":"Minor infraction","severity":1,"recorded_at":"2026-01-01T00:00:00Z"},{"violation_id":"V031","description":"New violation","severity":2,"recorded_at":"2026-02-01T00:00:00Z"}]`
	err := contract.UpdateImporter(ctx, "29EEEEE4444E1Z5", "", appendedJSON)
	if err != nil {
		t.Fatalf("UpdateImporter should accept appending new violations, got error: %v", err)
	}

	profile, _ := contract.GetImporter(ctx, "29EEEEE4444E1Z5")
	if len(profile.ViolationHistory) != 2 {
		t.Fatalf("Expected 2 violations after append, got %d", len(profile.ViolationHistory))
	}
}

type mockTransactionContext struct {
	contractapi.TransactionContextInterface
	stub *mockStub
}

func (m *mockTransactionContext) GetStub() contractapi.ChaincodeStubInterface {
	return m.stub
}

type mockStub struct {
	state map[string][]byte
}

func (s *mockStub) GetState(key string) ([]byte, error) {
	if s.state == nil {
		s.state = make(map[string][]byte)
	}
	return s.state[key], nil
}

func (s *mockStub) PutState(key string, value []byte) error {
	if s.state == nil {
		s.state = make(map[string][]byte)
	}
	s.state[key] = value
	return nil
}