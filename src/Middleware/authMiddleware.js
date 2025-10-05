// kanban-api/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

// Deve ser O MESMO segredo usado no authController.js
const JWT_SECRET = '222';

exports.protect = (req, res, next) => {
  let token;

  // 1. Obter o token do cabeçalho de Autorização (formato: Bearer <token>)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res
      .status(401)
      .json({ message: 'Acesso negado. Token não fornecido.' });
  }

  try {
    // 2. Verificar e decodificar o token
    const decoded = jwt.verify(token, JWT_SECRET);

    // 3. Anexar o usuário à requisição (opcional)
    req.user = decoded;

    next();
  } catch (error) {
    // Token inválido ou expirado
    return res.status(401).json({ message: 'Token inválido ou expirado.' });
  }
};
