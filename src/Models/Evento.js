const mongoose = require('mongoose');

const EventoSchema = new mongoose.Schema({
  titulo: {
    type: String,
    required: [true, 'Título do evento é obrigatório'],
  },
  descricao: {
    type: String,
  },
  tipo: {
    type: String,
    enum: ['Audiência', 'Reunião', 'Prazo', 'Outro'],
    default: 'Outro',
  },
  dataInicio: {
    type: Date,
    required: [true, 'Data de início é obrigatória'],
  },
  dataFim: {
    type: Date,
  },
  processoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Processo',
  },
  local: {
    type: String,
  },
  notas: {
    type: String,
  },
  concluido: {
    type: Boolean,
    default: false,
  },
  criadoEm: {
    type: Date,
    default: Date.now,
  },
  atualizadoEm: {
    type: Date,
    default: Date.now,
  },
});

// Atualizar atualizadoEm antes de salvar
EventoSchema.pre('save', function (next) {
  this.atualizadoEm = Date.now();
  next();
});

module.exports = mongoose.model('Evento', EventoSchema);
