// kanban-api/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'O nome de usuário é obrigatório.'],
    unique: true, // Garante que cada usuário seja único
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'A senha é obrigatória.'],
    minlength: 6,
  },
  // Você pode adicionar outros campos, como 'isAdmin' ou 'nomeCompleto'
});

// MIDDLEWARE: Criptografar a senha antes de salvar
userSchema.pre('save', async function (next) {
  // Apenas roda se o campo de senha foi modificado (ou é novo)
  if (!this.isModified('password')) {
    return next();
  }

  // Gera o salt e faz o hash
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Método para comparar a senha fornecida com o hash no banco
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
