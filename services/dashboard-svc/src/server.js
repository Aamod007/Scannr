import express from "express"
import path from "path"
import { fileURLToPath } from "url"

const app = express()
const port = process.env.PORT || 8000
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const publicDir = path.join(__dirname, "../public")

app.use(express.static(publicDir))

app.get("/health", (req, res) => {
  res.json({ status: "ok" })
})

app.get("*", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"))
})

app.listen(port, () => {})
