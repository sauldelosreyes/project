// Cargar las variables de entorno desde el archivo .env
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express()

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

// Definir la clave secreta desde las variables de entorno
const JWT_SECRET = process.env.JWT_SECRET;

// Configurar multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// Middleware para manejar el cuerpo de las solicitudes


app.use(cors({
  origin: "*",
  credentials: true,
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

const db = new sqlite3.Database('projects.db');

// Crear tabla de proyectos si no existe
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    enlace TEXT,
    imagen TEXT
  )`);
});

// Endpoint para obtener proyectos (sin autenticación)
app.get('/projects', (req, res) => {
  console.log('Recibiendo solicitud GET para /projects');
  const sql = 'SELECT * FROM projects';
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error al obtener proyectos:', err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log('Proyectos obtenidos:', rows);
    res.json(rows);
  });
});

// Endpoint para autenticar usuarios
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  console.log('Intentando iniciar sesión con usuario:', username);

  if (username === 'admin' && password === 'supercontraseñamagica123') {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
    console.log('Inicio de sesión exitoso para usuario:', username);
    return res.json({ token });
  }

  console.log('Credenciales incorrectas para usuario:', username);
  return res.status(401).json({ error: 'Credenciales incorrectas' });
});

// Middleware de autenticación para JWT
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) {
    console.log('Token no proporcionado');
    return res.status(403).json({ error: 'Se requiere token de autenticación' });
  }

  jwt.verify(token.split(' ')[1], JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log('Token no válido:', err.message);
      return res.status(401).json({ error: 'Token no válido' });
    }
    req.userId = decoded.username; // Guarda el nombre de usuario en la solicitud
    console.log('Token verificado, usuario:', req.userId);
    next();
  });
};

// Endpoint para añadir un proyecto (requerido autenticación)
app.post('/projects', verifyToken, upload.single('imagen'), (req, res) => {
  const { nombre, descripcion, enlace } = req.body;
  const imagen = req.file ? `/uploads/${req.file.filename}` : null;

  console.log('Añadiendo proyecto:', { nombre, descripcion, enlace, imagen });

  const sql = 'INSERT INTO projects (nombre, descripcion, enlace, imagen) VALUES (?, ?, ?, ?)';
  db.run(sql, [nombre, descripcion, enlace, imagen], function (err) {
    if (err) {
      console.error('Error al añadir proyecto:', err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log('Proyecto añadido con ID:', this.lastID);
    res.status(201).json({ id: this.lastID, nombre, descripcion, enlace, imagen });
  });
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});

// Endpoint para actualizar un proyecto (requiere autenticación)
app.put('/projects/:id', verifyToken, upload.single('imagen'), (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, enlace } = req.body;
  const imagen = req.file ? `/uploads/${req.file.filename}` : null;

  console.log('Actualizando proyecto ID:', id, { nombre, descripcion, enlace, imagen });

  const sql = `UPDATE projects SET nombre = ?, descripcion = ?, enlace = ?, imagen = ? WHERE id = ?`;
  db.run(sql, [nombre, descripcion, enlace, imagen, id], function (err) {
    if (err) {
      console.error('Error al actualizar proyecto:', err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log('Proyecto actualizado ID:', id);
    res.json({ id, nombre, descripcion, enlace, imagen }); // Devolvemos el proyecto actualizado
  });
});

// Endpoint para eliminar un proyecto (requiere autenticación)
app.delete('/projects/:id', verifyToken, (req, res) => {
  const { id } = req.params;

  console.log('Eliminando proyecto ID:', id);

  const sql = 'DELETE FROM projects WHERE id = ?';
  db.run(sql, id, function (err) {
    if (err) {
      console.error('Error al eliminar proyecto:', err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log('Proyecto eliminado ID:', id);
    res.status(204).send(); // Respuesta sin contenido
  });
});
