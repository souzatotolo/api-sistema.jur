const jwt = require('jsonwebtoken');
const User = require('../Models/User');

// O SEGREDO DO JWT - DEVE SER O MESMO EM authController.js!
// Em um ambiente de produção real, use process.env.JWT_SECRET aqui.
const JWT_SECRET = '222';

const protect = async (req, res, next) => {
  let token;

  // 1. Verifica se o token está no cabeçalho (Bearer Token)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Formato: "Bearer TOKEN" -> extrai apenas o TOKEN
      token = req.headers.authorization.split(' ')[1];

      // 2. Verifica e decodifica o token
      const decoded = jwt.verify(token, JWT_SECRET);

      // 3. Anexa o usuário à requisição (excluindo a senha)
      // Isso permite que você acesse req.user._id em suas rotas
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res
          .status(401)
          .json({ message: 'Não autorizado, usuário não encontrado.' });
      }

      next(); // Continua para a próxima função da rota
    } catch (error) {
      console.error(error);
      // Erros comuns: token expirado, inválido
      return res
        .status(401)
        .json({ message: 'Não autorizado, token falhou ou é inválido.' });
    }
  }

  // Se o token não foi encontrado
  if (!token) {
    res.status(401).json({ message: 'Não autorizado, token não encontrado.' });
  }
};

module.exports = protect;
