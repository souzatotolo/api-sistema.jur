const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// --- NOVAS IMPORTAÇÕES PARA AUTENTICAÇÃO ---
const authController = require('./src/Controllers/authController'); // Importa o controlador de autenticação
const protect = require('./src/Middleware/authMiddleware'); // Importa o middleware de proteção
const Processo = require('./src/Models/Processo');
// -------------------------------------------

const app = express();
const PORT = 3001;

// ----------------------------------------------------
// VARIÁVEIS DE AMBIENTE PARA PRODUÇÃO/DEV
// ----------------------------------------------------
// 1. URL de Conexão com o MongoDB Atlas (usando process.env ou fallback local)
// ATENÇÃO: Verifique se a sua variável de ambiente MONGO_URI_ATLAS está configurada
const MONGO_URI =
  process.env.MONGO_URI_ATLAS || 'mongodb://localhost:27017/kanban_db';

// 2. DOMÍNIO DO FRONTEND (DEFINIDO COMO '*' PARA DESABILITAR O CORS EM TESTES.)
const FRONTEND_URL = '*';
// ----------------------------------------------------

// --- Middleware ---
app.use(express.json()); // Permite que o Express leia corpos de requisição JSON

// --- CONFIGURAÇÃO DE CORS (ABERTA PARA TODOS) ---
app.use(
  cors({
    origin: FRONTEND_URL, // Aceita '*' ou a URL de produção
  })
);
// -----------------------------------------------------

// --- Conexão com o MongoDB ---
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('Conexão com MongoDB estabelecida com sucesso!'))
  .catch((err) => console.error('Erro ao conectar ao MongoDB:', err));

// Função auxiliar para agrupar processos (o formato que seu frontend espera)
const groupProcesses = (processos) => {
  return processos.reduce((acc, processo) => {
    const fase = processo.fase;
    if (!acc[fase]) {
      acc[fase] = [];
    }
    acc[fase].push(processo.toJSON()); // Converte para JSON para incluir o 'id' virtual
    return acc;
  }, {});
};

// ===================================
//          ROTAS DE AUTENTICAÇÃO
// ===================================

/**
 * Rota 1: Cadastro de usuário (Limitada a 2 usuários para inicialização)
 */
app.post('/api/auth/register', authController.register);

/**
 * Rota 2: Login e Geração de Token JWT
 */
app.post('/api/auth/login', authController.login);

/**
 * Rota 3: Alteração de Senha (PROTEGIDA)
 * Requer um token JWT válido no cabeçalho
 */
app.put('/api/auth/change-password', protect, authController.changePassword);

// ===================================
//     ENDPOINTS DE PROCESSO (PROTEGIDOS)
// ===================================

// Aplica o middleware 'protect' a todas as rotas de processo abaixo

/**
 * 1. GET: Retorna todos os processos agrupados por fase
 * AGORA PROTEGIDA: Requer token JWT
 */
app.get('/api/processos', protect, async (req, res) => {
  try {
    // req.user contém o usuário logado se o token for válido
    const processos = await Processo.find({}).sort({ nomeCliente: 1 });
    const grouped = groupProcesses(processos);
    res.json(grouped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao buscar processos' });
  }
});

/**
 * 2. POST: Cria um novo processo
 * AGORA PROTEGIDA: Requer token JWT
 */
app.post('/api/processos', protect, async (req, res) => {
  try {
    const novoProcesso = new Processo(req.body);
    // Garante que o histórico inicial seja salvo
    if (!novoProcesso.historico || novoProcesso.historico.length === 0) {
      novoProcesso.historico = [{ descricao: 'Processo criado no sistema.' }];
    }
    await novoProcesso.save();
    res.status(201).json(novoProcesso.toJSON());
  } catch (err) {
    console.error(err);
    res
      .status(400)
      .json({ message: 'Erro ao criar processo', error: err.message });
  }
});

/**
 * 3. PUT: Atualiza um processo existente (edição completa ou DND)
 * AGORA PROTEGIDA: Requer token JWT
 */
app.put('/api/processos/:id', protect, async (req, res) => {
  const { id } = req.params;
  try {
    const updatedProcesso = await Processo.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true } // new: retorna o documento atualizado
    );
    if (!updatedProcesso) {
      return res.status(404).json({ message: 'Processo não encontrado' });
    }
    res.json(updatedProcesso.toJSON());
  } catch (err) {
    console.error(err);
    res
      .status(400)
      .json({ message: 'Erro ao atualizar processo', error: err.message });
  }
});

/**
 * 4. POST: Adiciona uma atualização ao histórico
 * AGORA PROTEGIDA: Requer token JWT
 */
app.post('/api/processos/:id/historico', protect, async (req, res) => {
  const { id } = req.params;
  const { descricao } = req.body;
  const newUpdate = { descricao: descricao, data: new Date() };

  try {
    const updatedProcesso = await Processo.findByIdAndUpdate(
      id,
      {
        $push: { historico: { $each: [newUpdate], $position: 0 } }, // Adiciona no início do array
        observacao: descricao, // Atualiza a observação principal
      },
      { new: true }
    );

    if (!updatedProcesso) {
      return res.status(404).json({ message: 'Processo não encontrado' });
    }

    res.json(updatedProcesso.toJSON());
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao adicionar atualização' });
  }
});

/**
 * 5. DELETE: Exclui um processo
 * AGORA PROTEGIDA: Requer token JWT
 */
app.delete('/api/processos/:id', protect, async (req, res) => {
  const { id } = req.params;
  try {
    const deletedProcesso = await Processo.findByIdAndDelete(id);

    if (!deletedProcesso) {
      return res
        .status(404)
        .json({ message: 'Processo não encontrado para exclusão' });
    }

    res.status(200).json({ message: 'Processo excluído com sucesso', id: id });
  } catch (err) {
    console.error('Erro ao excluir processo:', err);
    res
      .status(500)
      .json({ message: 'Erro ao excluir processo', error: err.message });
  }
});

// --- Início do Servidor ---
app.listen(PORT, () => {
  console.log(`Servidor da API rodando...`);
});
