import { registerImporter, queryImporter, addViolation, resetStore } from "../src/importer.js"

beforeEach(() => {
  resetStore()
})

describe("importer", () => {
  test("registerImporter creates profile", async () => {
    const profile = await registerImporter({
      importer_id: "27AABCU9603R1ZN",
      years_active: 7,
      aeo_tier: 1,
      violations: 0,
      clean_inspections: 20,
    })
    expect(profile.importer_id).toBe("27AABCU9603R1ZN")
    expect(Math.round(profile.trust_score)).toBe(100)
  })

  test("registerImporter throws if exists", async () => {
    await registerImporter({ importer_id: "27AABCU9603R1ZN" })
    await expect(registerImporter({ importer_id: "27AABCU9603R1ZN" })).rejects.toThrow(
      "Importer already exists"
    )
  })

  test("queryImporter returns profile", async () => {
    await registerImporter({ importer_id: "27AABCU9603R1ZN" })
    const profile = await queryImporter("27AABCU9603R1ZN")
    expect(profile.importer_id).toBe("27AABCU9603R1ZN")
  })

  test("addViolation appends to history", async () => {
    await registerImporter({ importer_id: "27AABCU9603R1ZN" })
    await addViolation("27AABCU9603R1ZN", {
      violation_id: "V001",
      description: "Undeclared goods",
      severity: 3,
    })
    const profile = await queryImporter("27AABCU9603R1ZN")
    expect(profile.violation_history.length).toBe(1)
  })
})
