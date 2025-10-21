// kanban-api/Processo.js
const mongoose = require('mongoose');

// Define a estrutura de um item do histórico
const historicoSchema = new mongoose.Schema(
  {
    data: { type: Date, default: Date.now },
    descricao: { type: String, required: true },
  },
  { _id: false }
); // Não gera _id para subdocumentos simples

// Define a estrutura principal do Processo
const processoSchema = new mongoose.Schema({
  nomeCliente: { type: String, required: true },
  contato: String,
  indicacao: String,
  primeiroContato: Date,
  parceria: String,
  porcentagem: String,
  valorCausa: { type: Number, default: 0 },
  fase: { type: String, required: true }, // ESSENCIAL para o Kanban
  numProcesso: String,
  vara: String,
  tipo: String, // Tipo: Cível, Trabalhista, etc.
  prazo: Date,
  audiencia: Date,
  ultimoContato: Date,
  statusPrioridade: String, // Fazer com prioridade, Aguardando (Cliente), etc.
  proximoPasso: String,
  observacao: String,

  // O array de histórico armazena todas as atualizações
  historico: [historicoSchema],
});

// A chave 'virtual' _id deve ser mapeada para a key 'id' do DND
processoSchema.virtual('id').get(function () {
  return this._id.toHexString();
});
processoSchema.set('toJSON', {
  virtuals: true,
  // Transforma o _id do Mongo no id esperado pelo Frontend DND
  transform: (doc, ret) => {
    ret._id = ret.id; // Mantém a compatibilidade do _id para a DB, mas o frontend pode usar ._id
    delete ret.id;
    delete ret.__v;
  },
});

module.exports = mongoose.model('Processo', processoSchema);
