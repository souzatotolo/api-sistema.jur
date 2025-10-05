const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Recomendado: Use a biblioteca dotenv para carregar variáveis de ambiente de um arquivo .env localmente
require('dotenv').config();
const Processo = require('./src/Models/Processo'); // Importa o modelo

const app = express();
const PORT = 3001;

// ----------------------------------------------------
// MUDANÇA PRINCIPAL: Usar Variável de Ambiente
// O código buscará a URL de conexão da variável MONGO_URI_ATLAS
// Se ela não existir (o que acontece se você não configurou), ele usa a URL local como fallback.
const MONGO_URI = process.env.MONGO_URI_ATLAS;
// ----------------------------------------------------

// --- Middleware ---
app.use(
  cors({
    origin: 'https://sistema-jur-5hdg.vercel.app/', // Permite apenas seu frontend Next.js
  })
);
app.use(express.json()); // Permite que o Express leia corpos de requisição JSON

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
//              ENDPOINTS
// ===================================

/**
 * 1. GET: Retorna todos os processos agrupados por fase
 * Substitui a função loadProcessos do frontend
 */
app.get('/api/processos', async (req, res) => {
  try {
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
 * Substitui a função handleSaveNew do frontend
 */
app.post('/api/processos', async (req, res) => {
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
 * Substitui a função handleSaveEdit e parte do onDragEnd
 */
app.put('/api/processos/:id', async (req, res) => {
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
 * Substitui a função handleAddUpdate
 */
app.post('/api/processos/:id/historico', async (req, res) => {
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

app.delete('/api/processos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deletedProcesso = await Processo.findByIdAndDelete(id);

    if (!deletedProcesso) {
      return res
        .status(404)
        .json({ message: 'Processo não encontrado para exclusão' });
    }

    // Retorna uma resposta de sucesso (Status 200 OK ou 204 No Content)
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
  console.log(`Servidor da API rodando em http://localhost:${PORT}`);
});
