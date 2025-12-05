const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// ⚠️ IMPORTANTE: SUBSTITUA PELO SEU IP PÚBLICO DA AWS
const MONGO_URL = process.env.MONGO_URL || 'mongodb://devops_user:SuaSenhaForte123@3.22.171.5:27017/devops?authSource=admin';

// Conexão com MongoDB (sem as opções deprecated)
mongoose.connect(MONGO_URL)
.then(() => console.log('✅ MongoDB conectado com sucesso!'))
.catch(err => console.error('❌ Erro ao conectar MongoDB:', err));

// Schema e Model
const DadoSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  descricao: String,
  criado: { type: Date, default: Date.now }
});

const Dado = mongoose.model('Dado', DadoSchema);

// Rotas

// GET - Listar todos os dados
app.get('/api/dados', async (req, res) => {
  try {
    const dados = await Dado.find().sort({ criado: -1 });
    res.json(dados);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Buscar um dado por ID
app.get('/api/dados/:id', async (req, res) => {
  try {
    const dado = await Dado.findById(req.params.id);
    if (!dado) {
      return res.status(404).json({ error: 'Dado não encontrado' });
    }
    res.json(dado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST - Criar novo dado
app.post('/api/dados', async (req, res) => {
  try {
    const novoDado = new Dado({
      nome: req.body.nome,
      descricao: req.body.descricao
    });
    await novoDado.save();
    res.status(201).json(novoDado);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT - Atualizar dado
app.put('/api/dados/:id', async (req, res) => {
  try {
    const dadoAtualizado = await Dado.findByIdAndUpdate(
      req.params.id,
      { nome: req.body.nome, descricao: req.body.descricao },
      { new: true, runValidators: true }
    );
    if (!dadoAtualizado) {
      return res.status(404).json({ error: 'Dado não encontrado' });
    }
    res.json(dadoAtualizado);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE - Remover dado
app.delete('/api/dados/:id', async (req, res) => {
  try {
    const dadoRemovido = await Dado.findByIdAndDelete(req.params.id);
    if (!dadoRemovido) {
      return res.status(404).json({ error: 'Dado não encontrado' });
    }
    res.json({ message: 'Dado removido com sucesso', dado: dadoRemovido });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({ 
    message: 'API DevOps funcionando!',
    endpoints: {
      'GET /api/dados': 'Listar todos os dados',
      'GET /api/dados/:id': 'Buscar dado por ID',
      'POST /api/dados': 'Criar novo dado',
      'PUT /api/dados/:id': 'Atualizar dado',
      'DELETE /api/dados/:id': 'Remover dado'
    }
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});