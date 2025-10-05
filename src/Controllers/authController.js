const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../Models/User'); // Importa o modelo User

// O SEGREDO DO JWT - Mantenha este valor seguro e o mesmo no middleware/protect.js!
const JWT_SECRET = '222';

// --- FUNÇÃO 1: LOGIN ---
exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    // 1. Encontrar usuário no banco
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    // 2. Comparar senha usando o método do Schema (implementado no User.js)
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    // 3. Gerar e enviar JWT
    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token, username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// --- FUNÇÃO 2: CADASTRO DE USUÁRIO (NOVA) ---
// Rota aberta APENAS para criar os 2 usuários iniciais ("martancouto", "richardtotolo").
exports.register = async (req, res) => {
  const { username, password } = req.body;

  // Lógica de limitação para dois usuários iniciais
  if (
    !['martancouto', 'richardtotolo'].includes(username) ||
    (await User.countDocuments()) >= 2
  ) {
    return res.status(403).json({
      message:
        'O cadastro está limitado a dois usuários. Use a rota de login ou alteração de senha.',
    });
  }

  try {
    // 1. Criar novo usuário (o Mongoose fará o hash automático no User.js!)
    const user = await User.create({ username, password });

    // 2. Gerar e enviar token (faz login automático após o cadastro)
    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(201).json({
      token,
      username: user.username,
      message: 'Usuário cadastrado com sucesso!',
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Usuário já existe.' });
    }
    console.error(err);
    res.status(500).json({ message: 'Erro ao cadastrar usuário.' });
  }
};

// --- FUNÇÃO 3: ALTERAR SENHA (PROTEGIDA) ---
// Esta rota é chamada APENAS se o middleware 'protect' permitir.
exports.changePassword = async (req, res) => {
  // O middleware `protect` anexa o objeto `user` (decodificado do JWT) à requisição
  const userId = req.user.id;
  const { oldPassword, newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res
      .status(400)
      .json({ message: 'A nova senha deve ter pelo menos 6 caracteres.' });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      // Isso é um fallback, pois o middleware protect já garante que o usuário existe
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    // 1. Verificar se a senha antiga está correta
    if (!(await user.matchPassword(oldPassword))) {
      return res.status(401).json({ message: 'Senha antiga incorreta.' });
    }

    // 2. Atualizar a senha (o middleware 'pre save' do Mongoose fará o hash automaticamente)
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Senha alterada com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao alterar a senha.' });
  }
};
