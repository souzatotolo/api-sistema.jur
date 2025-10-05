const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true, // Garante que o username seja único
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  // Opcional: Adicionar um campo para rastrear a data de criação
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Middleware Mongoose: Criptografa a senha antes de salvar
UserSchema.pre('save', async function (next) {
  // Apenas faz o hash se o campo 'password' foi modificado (ou é novo)
  if (!this.isModified('password')) {
    return next();
  }

  // Gera o salt e faz o hash
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Método do Schema: Compara a senha fornecida com a senha em hash do banco de dados
UserSchema.methods.matchPassword = async function (enteredPassword) {
  // Retorna true se as senhas corresponderem
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
