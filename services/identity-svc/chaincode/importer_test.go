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