import { registerImporter, queryImporter, addViolation, resetStore } from "../src/importer.js"

beforeEach(() => {
  resetStore()
})

describe("importer", () => {
  test("registerImporter creates profile", () => {
    const profile = registerImporter({
      importer_id: "27AABCU9603R1ZN",
      years_active: 7,
      aeo_tier: 1,
      violations: 0,
      clean_inspections: 20,
    })
    expect(profile.importer_id).toBe("27AABCU9603R1ZN")
    expect(Math.round(profile.trust_score)).toBe(100)
  })

  test("registerImporter throws if exists", () => {
    registerImporter({ importer_id: "27AABCU9603R1ZN" })
    expect(() => registerImporter({ importer_id: "27AABCU9603R1ZN" })).toThrow("Importer already exists")
  })

  test("queryImporter returns profile", () => {
    registerImporter({ importer_id: "27AABCU9603R1ZN" })
    const profile = queryImporter("27AABCU9603R1ZN")
    expect(profile.importer_id).toBe("27AABCU9603R1ZN")
  })

  test("addViolation appends to history", () => {
    registerImporter({ importer_id: "27AABCU9603R1ZN" })
    addViolation("27AABCU9603R1ZN", { violation_id: "V001", description: "Undeclared goods", severity: 3 })
    const profile = queryImporter("27AABCU9603R1ZN")
    expect(profile.violation_history.length).toBe(1)
  })
})