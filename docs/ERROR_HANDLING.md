# Sistema de Tratamento de Erros

## Middleware Global de Erros

O sistema agora possui um middleware global que captura todos os erros não tratados nas rotas e fornece uma resposta adequada.

### Funcionalidades

1. **Captura de erros assíncronos**: Todos os erros em funções async são automaticamente capturados
2. **Tratamento de 404**: Rotas não encontradas retornam erro 404 apropriado
3. **Respostas JSON ou HTML**: Detecta automaticamente o tipo de resposta esperada
4. **Logs detalhados**: Todos os erros são logados no console com stack trace
5. **Shutdown gracioso**: Fecha conexões do banco de dados antes de encerrar

### Como Usar o asyncHandler

Para rotas assíncronas, envolva sua função com `asyncHandler`:

```javascript
import { asyncHandler, createError } from '../utils/asyncHandler.js';

// Sem asyncHandler (precisa de try-catch manual)
router.get('/exemplo', async (req, res) => {
  try {
    const data = await fetchData();
    res.json(data);
  } catch (error) {
    next(error); // Precisa passar manualmente
  }
});

// Com asyncHandler (erros são capturados automaticamente)
router.get('/exemplo', asyncHandler(async (req, res) => {
  const data = await fetchData();
  res.json(data);
}));
```

### Como Criar Erros Customizados

Use a classe `AppError` ou os helpers do `createError`:

```javascript
import { asyncHandler, createError, AppError } from '../utils/asyncHandler.js';

router.get('/user/:id', asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  
  if (!user) {
    throw createError.notFound('Usuário não encontrado');
  }
  
  res.json(user);
}));

// Ou use AppError diretamente
router.post('/admin', asyncHandler(async (req, res) => {
  if (!req.user.isAdmin) {
    throw new AppError('Acesso negado', 403);
  }
  
  // código admin
}));
```

### Tipos de Erros Disponíveis

- `createError.notFound(message)` - 404
- `createError.badRequest(message)` - 400
- `createError.unauthorized(message)` - 401
- `createError.forbidden(message)` - 403
- `createError.conflict(message)` - 409
- `createError.internal(message)` - 500

### Tratamento de Erros Não Capturados

O sistema também trata:
- `uncaughtException` - Exceções não capturadas
- `unhandledRejection` - Promises rejeitadas não tratadas
- `SIGTERM` / `SIGINT` - Shutdown gracioso (fecha conexões do DB)

### Logs

Todos os erros são logados no console com:
- Mensagem de erro
- Stack trace completo
- Contexto da requisição (se disponível)

### Ambiente de Produção

Em produção (quando `NODE_ENV=production`):
- Detalhes do stack trace não são expostos ao cliente
- Mensagens de erro são genéricas
- Logs completos continuam no servidor
