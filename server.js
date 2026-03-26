const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// --- NOVAS IMPORTAÇÕES PARA AUTENTICAÇÃO ---
const authController = require('./src/Controllers/authController'); // Importa o controlador de autenticação
const protect = require('./src/Middleware/authMiddleware'); // Importa o middleware de proteção
const Processo = require('./src/Models/Processo');
const Evento = require('./src/Models/Evento'); // Importa modelo de Evento
const eventoController = require('./src/Controllers/eventoController'); // Importa controller de Evento
const Publicacao = require('./src/Models/Publicacao');
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
  }),
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
  console.log('PUT /api/processos/:id', id, req.body);
  try {
    const updatedProcesso = await Processo.findByIdAndUpdate(
      id,
      req.body,
      { new: true }, // new: retorna o documento atualizado
    );
    if (!updatedProcesso) {
      return res.status(404).json({ message: 'Processo não encontrado' });
    }
    console.log('Updated processo:', updatedProcesso.pagamento);
    res.json(updatedProcesso.toJSON());
  } catch (err) {
    console.error('Error updating processo:', err);
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
      { new: true },
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

// ===================================
//     ENDPOINTS DE EVENTO (PROTEGIDOS)
// ===================================

/**
 * GET: Retorna todos os eventos
 */
app.get('/api/eventos', protect, eventoController.getAllEventos);

/**
 * GET: Retorna evento por ID
 */
app.get('/api/eventos/:id', protect, eventoController.getEventoById);

/**
 * GET: Retorna eventos de um processo específico
 */
app.get(
  '/api/processos/:processoId/eventos',
  protect,
  eventoController.getEventosByProcesso,
);

/**
 * GET: Retorna eventos em um período (query: dataInicio, dataFim)
 */
app.get('/api/eventos/periodo', protect, eventoController.getEventosPorPeriodo);

/**
 * POST: Cria novo evento
 */
app.post('/api/eventos', protect, eventoController.createEvento);

/**
 * PUT: Atualiza evento
 */
app.put('/api/eventos/:id', protect, eventoController.updateEvento);

/**
 * DELETE: Deleta evento
 */
app.delete('/api/eventos/:id', protect, eventoController.deleteEvento);

// ===================================
//     ENDPOINT DATAJUD (PROXY CNJ)
// ===================================

/**
 * GET /api/datajud/:numProcesso
 * Consulta o andamento processual no DataJud (CNJ)
 * O número do processo deve estar no formato CNJ: NNNNNNN-DD.AAAA.J.TT.OOOO
 */
app.get('/api/datajud/:numProcesso', protect, async (req, res) => {
  const { numProcesso } = req.params;

  // Detecta o índice do tribunal a partir do número CNJ
  const getTribunalIndex = (num) => {
    const clean = num.replace(/[^0-9]/g, '');
    if (clean.length !== 20) return null;
    const J = clean[13];
    const TT = clean.substring(14, 16);
    const tjMap = {
      '01': 'tjac', '02': 'tjal', '03': 'tjap', '04': 'tjam',
      '05': 'tjba', '06': 'tjce', '07': 'tjdft', '08': 'tjes',
      '09': 'tjgo', '10': 'tjma', '11': 'tjmt', '12': 'tjms',
      '13': 'tjmg', '14': 'tjpa', '15': 'tjpb', '16': 'tjpr',
      '17': 'tjpe', '18': 'tjpi', '19': 'tjrj', '20': 'tjrn',
      '21': 'tjrs', '22': 'tjro', '23': 'tjrr', '24': 'tjsc',
      '25': 'tjse', '26': 'tjsp', '27': 'tjto',
    };
    if (J === '1') return 'stf';
    if (J === '2') return 'cnj';
    if (J === '3') return 'stj';
    if (J === '4') return 'tst';
    if (J === '5') return 'mpt';
    if (J === '6') return `trf${parseInt(TT)}`;
    if (J === '7') return `trt${parseInt(TT)}`;
    if (J === '8') return tjMap[TT] || null;
    return null;
  };

  const tribunal = getTribunalIndex(numProcesso);
  if (!tribunal) {
    return res.status(400).json({ message: 'Número de processo inválido ou tribunal não identificado. Use o formato CNJ: NNNNNNN-DD.AAAA.J.TT.OOOO' });
  }

  const apiKey = process.env.DATAJUD_API_KEY || 'cDZHYzlZa0JadVREZDJCendN';
  const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${tribunal}/_search`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `APIKey ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: { match: { numeroProcesso: numProcesso } },
        sort: [{ 'dataAjuizamento': { order: 'desc' } }],
        size: 1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ message: 'Erro ao consultar DataJud', detalhe: errText });
    }

    const data = await response.json();
    const hits = data?.hits?.hits || [];

    if (hits.length === 0) {
      return res.status(404).json({ message: 'Processo não encontrado no DataJud para o tribunal detectado.', tribunal });
    }

    const processo = hits[0]._source;
    return res.json({
      tribunal,
      numeroProcesso: processo.numeroProcesso,
      classe: processo.classe?.nome || '',
      assuntos: (processo.assuntos || []).map((a) => a.nome),
      dataAjuizamento: processo.dataAjuizamento,
      orgaoJulgador: processo.orgaoJulgador?.nome || '',
      movimentos: (processo.movimentos || [])
        .sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora))
        .slice(0, 20)
        .map((m) => ({
          data: m.dataHora,
          descricao: m.nome || m.complementosTabelados?.map((c) => c.descricao).join(', ') || '',
        })),
    });
  } catch (err) {
    console.error('Erro ao consultar DataJud:', err);
    res.status(500).json({ message: 'Erro interno ao consultar DataJud', error: err.message });
  }
});

// ===================================
//     ENDPOINTS DE PUBLICAÇÕES (PROTEGIDOS)
// ===================================

app.get('/api/publicacoes', protect, async (req, res) => {
  try {
    const publicacoes = await Publicacao.find({}).sort({ dataPublicacao: -1 });
    res.json(publicacoes);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar publicações' });
  }
});

app.post('/api/publicacoes', protect, async (req, res) => {
  try {
    const nova = new Publicacao(req.body);
    await nova.save();
    res.status(201).json(nova.toJSON());
  } catch (err) {
    res.status(400).json({ message: 'Erro ao criar publicação', error: err.message });
  }
});

app.put('/api/publicacoes/:id', protect, async (req, res) => {
  try {
    const updated = await Publicacao.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Publicação não encontrada' });
    res.json(updated.toJSON());
  } catch (err) {
    res.status(400).json({ message: 'Erro ao atualizar publicação', error: err.message });
  }
});

app.delete('/api/publicacoes/:id', protect, async (req, res) => {
  try {
    const deleted = await Publicacao.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Publicação não encontrada' });
    res.json({ message: 'Publicação excluída', id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao excluir publicação' });
  }
});

// --- Início do Servidor ---
app.listen(PORT, () => {
  console.log(`Servidor da API rodando...`);
});
