import express from "express"
import { queryImporter, registerImporter, addViolation } from "./importer.js"

const app = express()
const port = process.env.PORT || 8000

app.use(express.json())

app.get("/health", (req, res) => {
  res.json({ status: "ok" })
})

app.get("/importer/:gstin", async (req, res) => {
  try {
    const profile = await queryImporter(req.params.gstin)
    res.json(profile)
  } catch (err) {
    res.status(404).json({ error: err.message })
  }
})

app.post("/importer", async (req, res) => {
  try {
    const profile = await registerImporter(req.body)
    res.status(201).json(profile)
  } catch (err) {
    res.status(409).json({ error: err.message })
  }
})

app.post("/importer/:gstin/violation", async (req, res) => {
  try {
    await addViolation(req.params.gstin, req.body)
    res.json({ status: "ok" })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.listen(port, () => {})