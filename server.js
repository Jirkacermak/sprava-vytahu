const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();
const PORT = 3000;
const FILE = path.join(__dirname, 'public', 'vytahy.json');


app.use(express.json());
app.use(express.static('public'));

// 🧑 Přihlašovací údaje
const validUser = {
  username: 'admin',
  password: 'tajneheslo',
  token: 'dummy-token-123'
};

// ✅ Přihlášení
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Chybí uživatelské jméno nebo heslo' });
  }
  if (username === validUser.username && password === validUser.password) {
    return res.json({ token: validUser.token });
  } else {
    return res.status(401).json({ error: 'Neplatné přihlašovací údaje' });
  }
});

// 🛡️ Middleware pro ověření tokenu
function authMiddleware(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: 'Chybí token' });
  if (token === validUser.token) next();
  else res.status(403).json({ error: 'Neplatný token' });
}

// 🔐 GET výtahy
app.get('/api/vytahy', authMiddleware, async (req, res) => {
  try {
    const data = await fs.readFile(FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    console.error(err);
    res.status(500).send('Chyba čtení souboru');
  }
});

// 🔐 POST nový výtah
app.post('/api/vytahy', authMiddleware, async (req, res) => {
  try {
    const novy = req.body;
    const data = await fs.readFile(FILE, 'utf8');
    const vytahy = JSON.parse(data);
    const noveID = vytahy.length ? Math.max(...vytahy.map(v => v.id)) + 1 : 1;
    const novyVytah = { ...novy, id: noveID };
    vytahy.push(novyVytah);
    await fs.writeFile(FILE, JSON.stringify(vytahy, null, 2));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send('Chyba při přidávání výtahu');
  }
});

// 🔐 PUT aktualizace výtahu
app.put('/api/vytahy/:id', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Neplatné ID');

    const data = await fs.readFile(FILE, 'utf8');
    const vytahy = JSON.parse(data);
    const index = vytahy.findIndex(v => v.id === id);
    if (index === -1) return res.status(404).send('Výtah nenalezen');

    const { revize, zkouska, inspekce } = req.body;
    const isValidDate = d => d === '' || !d || !isNaN(Date.parse(d));
    if (![revize, zkouska, inspekce].every(isValidDate)) {
      return res.status(400).send('Neplatný formát data');
    }

    vytahy[index] = {
      ...vytahy[index],
      revize: revize ?? vytahy[index].revize,
      zkouska: zkouska ?? vytahy[index].zkouska,
      inspekce: inspekce ?? vytahy[index].inspekce
    };

    await fs.writeFile(FILE, JSON.stringify(vytahy, null, 2));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send('Chyba zápisu do souboru');
  }
});

// 🔐 DELETE výtah
app.delete('/api/vytahy/:id', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Neplatné ID');

    const data = await fs.readFile(FILE, 'utf8');
    let vytahy = JSON.parse(data);
    const index = vytahy.findIndex(v => v.id === id);
    if (index === -1) return res.status(404).send('Výtah nenalezen');

    vytahy.splice(index, 1);
    await fs.writeFile(FILE, JSON.stringify(vytahy, null, 2));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send('Chyba při mazání výtahu');
  }
});

// 📄 Root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server běží na http://localhost:${PORT}`);
});
