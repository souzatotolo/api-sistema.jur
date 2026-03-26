const mongoose = require('mongoose');

const PublicacaoSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  conteudo: { type: String, default: '' },
  dataPublicacao: { type: Date, default: Date.now },
  tribunal: { type: String, default: '' },
  processoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Processo', default: null },
  numeroProcesso: { type: String, default: '' },
  tipo: {
    type: String,
    enum: ['Intimação', 'Despacho', 'Sentença', 'Acórdão', 'Edital', 'Outro'],
    default: 'Outro',
  },
  lida: { type: Boolean, default: false },
  criadoEm: { type: Date, default: Date.now },
});

PublicacaoSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

PublicacaoSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Publicacao', PublicacaoSchema);
