const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;
const uiPath = path.resolve(__dirname, '..', '..', 'code.html');

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.get('*', (req, res) => {
    res.sendFile(uiPath);
});

app.listen(PORT, () => {
    console.log(`SCANNR Dashboard running on http://localhost:${PORT}`);
});
