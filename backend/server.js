const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Criar diretório de uploads se não existir
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configuração do Multer para upload de PDFs
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Apenas arquivos PDF são permitidos!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // Limite de 10MB
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads')); // Servir arquivos estáticos

// ⚠️ IMPORTANTE: SUBSTITUA PELO SEU IP PÚBLICO DA AWS
const MONGO_URL = process.env.MONGO_URL || 'mongodb://devops_user:SuaSenhaForte123@3.22.171.5:27017/devops?authSource=admin';

// Conexão com MongoDB (sem as opções deprecated)
mongoose.connect(MONGO_URL)
.then(() => console.log('✅ MongoDB conectado com sucesso!'))
.catch(err => console.error('❌ Erro ao conectar MongoDB:', err));

// Schema e Model para Livro
const LivroSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  autor: { type: String, required: true },
  descricao: String,
  pdfFilename: String,
  pdfPath: String,
  criado: { type: Date, default: Date.now }
});

const Livro = mongoose.model('Livro', LivroSchema);

// Rotas

// GET - Listar todos os livros
app.get('/api/livros', async (req, res) => {
  try {
    const livros = await Livro.find().sort({ criado: -1 });
    res.json(livros);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Buscar um livro por ID
app.get('/api/livros/:id', async (req, res) => {
  try {
    const livro = await Livro.findById(req.params.id);
    if (!livro) {
      return res.status(404).json({ error: 'Livro não encontrado' });
    }
    res.json(livro);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Visualizar PDF
app.get('/api/livros/:id/pdf', async (req, res) => {
  try {
    const livro = await Livro.findById(req.params.id);
    if (!livro || !livro.pdfPath) {
      return res.status(404).json({ error: 'PDF não encontrado' });
    }

    const pdfPath = path.join(__dirname, livro.pdfPath);
    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ error: 'Arquivo PDF não encontrado no servidor' });
    }

    res.sendFile(pdfPath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST - Criar novo livro com PDF
app.post('/api/livros', upload.single('pdf'), async (req, res) => {
  try {
    const novoLivro = new Livro({
      titulo: req.body.titulo,
      autor: req.body.autor,
      descricao: req.body.descricao,
      pdfFilename: req.file ? req.file.filename : null,
      pdfPath: req.file ? `uploads/${req.file.filename}` : null
    });
    await novoLivro.save();
    res.status(201).json(novoLivro);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT - Atualizar livro
app.put('/api/livros/:id', upload.single('pdf'), async (req, res) => {
  try {
    const livroAntigo = await Livro.findById(req.params.id);
    if (!livroAntigo) {
      return res.status(404).json({ error: 'Livro não encontrado' });
    }

    const dadosAtualizados = {
      titulo: req.body.titulo,
      autor: req.body.autor,
      descricao: req.body.descricao
    };

    // Se um novo PDF foi enviado, atualizar
    if (req.file) {
      // Remover PDF antigo se existir
      if (livroAntigo.pdfPath) {
        const oldPdfPath = path.join(__dirname, livroAntigo.pdfPath);
        if (fs.existsSync(oldPdfPath)) {
          fs.unlinkSync(oldPdfPath);
        }
      }
      dadosAtualizados.pdfFilename = req.file.filename;
      dadosAtualizados.pdfPath = `uploads/${req.file.filename}`;
    }

    const livroAtualizado = await Livro.findByIdAndUpdate(
      req.params.id,
      dadosAtualizados,
      { new: true, runValidators: true }
    );

    res.json(livroAtualizado);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE - Remover livro
app.delete('/api/livros/:id', async (req, res) => {
  try {
    const livroRemovido = await Livro.findByIdAndDelete(req.params.id);
    if (!livroRemovido) {
      return res.status(404).json({ error: 'Livro não encontrado' });
    }

    // Remover PDF do sistema de arquivos
    if (livroRemovido.pdfPath) {
      const pdfPath = path.join(__dirname, livroRemovido.pdfPath);
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
    }

    res.json({ message: 'Livro removido com sucesso', livro: livroRemovido });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: 'API Biblioteca Digital funcionando!',
    endpoints: {
      'GET /api/livros': 'Listar todos os livros',
      'GET /api/livros/:id': 'Buscar livro por ID',
      'GET /api/livros/:id/pdf': 'Visualizar PDF do livro',
      'POST /api/livros': 'Criar novo livro (com upload de PDF)',
      'PUT /api/livros/:id': 'Atualizar livro',
      'DELETE /api/livros/:id': 'Remover livro'
    }
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});