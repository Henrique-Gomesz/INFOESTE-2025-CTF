import { Router } from 'express';
import { requireAdmin, requireUserSelfOrAdmin, requireAuth } from '../utils/auth.js';
import { Op } from 'sequelize';

const router = Router();

// Aplica autenticação obrigatória para todas as rotas de usuários
router.use(requireAuth);

// Dashboard bancário - dados do usuário logado
router.get('/me/dashboard', async (req, res) => {
  const { User } = req.app.locals.models;
  const uid = req.cookies.uid || req.user?.id;
  
  if (!uid) {
    return res.status(401).json({ 
      success: false,
      error: 'Usuário não autenticado' 
    });
  }
  
  try {
    const user = await User.findOne({
      where: { id: uid },
      attributes: ['id', 'name', 'email', 'account_number', 'balance'],
      raw: true
    });
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'Usuário não encontrado' 
      });
    }
    
    // Dados fictícios para o dashboard
    const dashboardData = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        account_number: user.account_number,
        balance: parseFloat(user.balance)
      },
      recentTransactions: [],
      monthlySpending: {
        total: 2450.30,
        categories: [
          { name: 'Alimentação', amount: 850.00, percentage: 35 },
          { name: 'Transporte', amount: 450.00, percentage: 18 },
          { name: 'Contas', amount: 650.30, percentage: 27 },
          { name: 'Lazer', amount: 500.00, percentage: 20 }
        ]
      },
      savingsGoal: {
        target: 10000.00,
        current: parseFloat(user.balance) * 0.3,
        percentage: (parseFloat(user.balance) * 0.3 / 10000.00) * 100
      }
    };
    
    res.json({ 
      success: true,
      data: dashboardData
    });
  } catch (e) {
    console.log(`❌ Erro: ${e.message}`);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao buscar dados do dashboard: ' + e.message 
    });
  }
});

// Lista usuários com pesquisa refletida (XSS refletido + SQL INJECTION) - Apenas Admin
router.get('/', requireAdmin, async (req, res) => {
  const { User } = req.app.locals.models;
  const { sequelize } = req.app.locals;
  const q = req.query.q || '';
  
  try {
    let users;
    if (q) {
      // VULNERABILIDADE: SQL INJECTION
      // Query SQL raw com concatenação direta do parâmetro de busca
      // Permite: UNION-based SQLi, extrair dados sensíveis, bypass de autenticação
      // Exploit examples:
      // - ?q=' UNION SELECT id, name, password FROM users --
      // - ?q=' UNION SELECT 1, account_number, balance FROM users --
      // - ?q=' UNION SELECT NULL, email, password FROM users WHERE role='admin' --
      const query = `SELECT id, name, email FROM users WHERE name LIKE '%${q}%'`;
      
      console.log(`🔓 SQL Query vulnerável: ${query}`);
      
      const [results] = await sequelize.query(query);
      users = results;
    } else {
      users = await User.findAll({
        attributes: ['id', 'name', 'email'],
        raw: true
      });
    }
    res.json({ 
      success: true,
      users
    });
  } catch (e) {
    console.log(`❌ Erro: ${e.message}`);
    res.status(500).json({ 
      success: false,
      error: 'Erro na consulta: ' + e.message,
      users: []
    });
  }
});

// IDOR: qualquer usuário pode acessar qualquer perfil por ID
router.get('/:id', async (req, res) => {
  const { User, Comment } = req.app.locals.models;
  const id = req.params.id;
  try {
    const user = await User.findOne({
      where: { id },
      attributes: ['id', 'name', 'bio', 'account_number'],
      raw: true
    });
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'Usuário não encontrado ou consulta inválida' 
      });
    }
    
    // Formata o usuário - NOME, BIO E NÚMERO DA CONTA
    const formattedUser = {
      id: user.id,
      name: user.name,
      bio: user.bio || 'Este usuário ainda não adicionou uma biografia.',
      account_number: user.account_number || 'N/A'
    };
    
    // Comentários com XSS armazenado
    let comments = [];
    try {
      const commentRows = await Comment.findAll({
        where: { user_id: id },
        attributes: ['id', 'body', 'author_id'],
        include: [{
          model: User,
          as: 'author',
          attributes: ['name'],
          required: false
        }],
        order: [['created_at', 'DESC']],
        raw: true,
        nest: true
      });
      
      comments = commentRows.map(c => ({
        id: c.id,
        body: c.body,
        author_id: c.author_id,
        author: c.author?.name || 'Anônimo'
      }));
    } catch (commentErr) {
      console.log(`❌ Erro nos comentários: ${commentErr.message}`);
    }
    
    res.json({ 
      success: true,
      user: formattedUser, 
      comments 
    });
  } catch (e) {
    console.log(`❌ Erro: ${e.message}`);
    res.status(500).json({ 
      success: false,
      error: 'Erro na consulta: ' + e.message 
    });
  }
});

// XSS armazenado: inserir comentário sem sanitização
router.post('/:id/comments', async (req, res) => {
  const { Comment, User } = req.app.locals.models;
  const id = req.params.id;
  const uid = req.cookies.uid || req.user?.id;
  const { body } = req.body;
  
  // Valida se o usuário está autenticado
  if (!uid) {
    return res.status(401).json({
      success: false,
      error: 'Usuário não autenticado'
    });
  }
  
  try {
    // Verifica se o autor existe
    const author = await User.findOne({ where: { id: uid } });
    if (!author) {
      return res.status(404).json({
        success: false,
        error: 'Usuário autor não encontrado'
      });
    }
    
    // Verifica se o usuário alvo existe
    const targetUser = await User.findOne({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'Usuário destino não encontrado'
      });
    }
    
    const comment = await Comment.create({
      user_id: id,
      author_id: uid,
      body
    });
    res.status(201).json({
      success: true,
      message: 'Comentário adicionado com sucesso',
      comment: {
        id: comment.id,
        body: comment.body,
        author_id: comment.author_id,
        user_id: comment.user_id
      }
    });
  } catch (e) {
    console.log(`❌ Erro: ${e.message}`);
    res.status(500).json({
      success: false,
      error: e.message
    });
  }
});

// Mass Assignment: atualiza qualquer campo do usuário a partir do corpo
router.put('/:id', requireUserSelfOrAdmin, async (req, res) => {
  const { User } = req.app.locals.models;
  const id = req.params.id;
  const payload = req.body; // Inseguro: sem whitelist, pode alterar campos sensíveis
  
  try {
    // Remove campos vazios
    const updateData = {};
    Object.keys(payload).forEach(key => {
      if (payload[key]) {
        updateData[key] = payload[key];
      }
    });
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Nenhum campo para atualizar'
      });
    }
    
    await User.update(updateData, {
      where: { id }
    });
    
    res.json({
      success: true,
      message: 'Perfil atualizado com sucesso'
    });
  } catch (e) {
    console.log(`❌ Erro: ${e.message}`);
    res.status(500).json({
      success: false,
      error: e.message
    });
  }
});

// Admin: excluir usuário (inseguro: sem transação)
router.delete('/:id', requireAdmin, async (req, res) => {
  const { Comment, User } = req.app.locals.models;
  const id = req.params.id;
  try {
    await Comment.destroy({ where: { user_id: id } });
    await User.destroy({ where: { id } });
    res.json({
      success: true,
      message: 'Usuário excluído com sucesso'
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      error: e.message
    });
  }
});

// Excluir comentário: permitido para admin, dono do perfil (user_id) ou autor do comentário
router.delete('/:id/comments/:commentId', async (req, res) => {
  const { Comment } = req.app.locals.models;
  const userId = String(req.params.id);
  const commentId = req.params.commentId;
  const isAdmin = !!(req.user && req.user.role === 'admin');
  const uid = (req.user && req.user.id) || req.cookies.uid || null;
  try {
    const comment = await Comment.findOne({
      where: { id: commentId },
      attributes: ['id', 'user_id', 'author_id'],
      raw: true
    });
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comentário não encontrado'
      });
    }
    
    const isProfileOwner = uid && String(uid) === String(comment.user_id);
    const isAuthor = uid && String(uid) === String(comment.author_id);
    
    if (!(isAdmin || isProfileOwner || isAuthor)) {
      return res.status(403).json({
        success: false,
        error: 'Você não pode excluir este comentário.'
      });
    }
    
    await Comment.destroy({ where: { id: commentId } });
    res.json({
      success: true,
      message: 'Comentário excluído com sucesso'
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      error: e.message
    });
  }
});

// ============================================
// ROTA ADMIN: ADICIONAR SALDO
// ============================================
// Admin pode adicionar saldo a qualquer conta passando apenas o ID
router.post('/admin/add-balance', requireAdmin, async (req, res) => {
  const { User } = req.app.locals.models;
  const { userId, amount } = req.body;
  
  if (!userId || !amount) {
    return res.status(400).json({
      success: false,
      error: 'userId e amount são obrigatórios'
    });
  }
  
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'amount deve ser um número positivo'
    });
  }
  
  try {
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado'
      });
    }
    
    const oldBalance = parseFloat(user.balance);
    const newBalance = oldBalance + parseFloat(amount);
    
    await user.update({ balance: newBalance });
    
    res.json({
      success: true,
      message: 'Saldo adicionado com sucesso',
      data: {
        userId: user.id,
        userName: user.name,
        oldBalance: oldBalance.toFixed(2),
        addedAmount: parseFloat(amount).toFixed(2),
        newBalance: newBalance.toFixed(2)
      }
    });
  } catch (e) {
    console.log(`❌ Erro ao adicionar saldo: ${e.message}`);
    res.status(500).json({
      success: false,
      error: e.message
    });
  }
});

// ============================================
// VULNERABILIDADE: RACE CONDITION
// ============================================
// Transferência entre contas - VULNERÁVEL a race condition
// Não usa transação atômica nem locks, permitindo múltiplas transferências simultâneas
router.post('/transfer', async (req, res) => {
  const { User, Transaction } = req.app.locals.models;
  const uid = req.cookies.uid || req.user?.id;
  const { to_account_number, amount } = req.body;
  
  if (!uid) {
    return res.status(401).json({ 
      success: false,
      error: 'Usuário não autenticado' 
    });
  }

  try {
    const transferAmount = parseFloat(amount);
    
    // Validações básicas
    if (!to_account_number || !transferAmount) {
      return res.status(400).json({
        success: false,
        error: 'Conta destino e valor são obrigatórios'
      });
    }

    if (transferAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valor deve ser maior que zero'
      });
    }

    // VULNERABILIDADE: Busca o saldo atual SEM LOCK
    const fromUser = await User.findOne({
      where: { id: uid },
      attributes: ['id', 'name', 'account_number', 'balance'],
      raw: true
    });

    if (!fromUser) {
      return res.status(404).json({
        success: false,
        error: 'Usuário remetente não encontrado'
      });
    }

    // Busca o destinatário
    const toUser = await User.findOne({
      where: { account_number: to_account_number },
      attributes: ['id', 'name', 'account_number', 'balance'],
      raw: true
    });

    if (!toUser) {
      return res.status(404).json({
        success: false,
        error: 'Conta destino não encontrada'
      });
    }

    if (fromUser.id === toUser.id) {
      return res.status(400).json({
        success: false,
        error: 'Não é possível transferir para a mesma conta'
      });
    }

    // VULNERABILIDADE: Verifica saldo mas NÃO TRAVA o registro
    const currentBalance = parseFloat(fromUser.balance);
    if (currentBalance < transferAmount) {
      return res.status(400).json({
        success: false,
        error: 'Saldo insuficiente'
      });
    }

    // VULNERABILIDADE: Delay proposital para aumentar a janela de race condition
    // Simula processamento/validação
    await new Promise(resolve => setTimeout(resolve, 100));

    // VULNERABILIDADE: Atualiza saldos SEM TRANSAÇÃO ATÔMICA
    // Se múltiplas requisições chegarem ao mesmo tempo, todas vão ler o mesmo saldo
    // e todas vão conseguir fazer a transferência
    
    // Deduz do remetente
    const newFromBalance = currentBalance - transferAmount;
    await User.update(
      { balance: newFromBalance },
      { where: { id: fromUser.id } }
    );

    // Adiciona ao destinatário
    const currentToBalance = parseFloat(toUser.balance);
    const newToBalance = currentToBalance + transferAmount;
    await User.update(
      { balance: newToBalance },
      { where: { id: toUser.id } }
    );

    // Registra a transação
    const transaction = await Transaction.create({
      from_user_id: fromUser.id,
      to_user_id: toUser.id,
      amount: transferAmount,
      status: 'completed'
    });

    res.json({
      success: true,
      message: 'Transferência realizada com sucesso',
      transaction: {
        id: transaction.id,
        to_name: toUser.name,
        to_account: toUser.account_number,
        amount: transferAmount,
        new_balance: newFromBalance
      }
    });

  } catch (e) {
    console.log(`❌ Erro na transferência: ${e.message}`);
    res.status(500).json({
      success: false,
      error: 'Erro ao processar transferência: ' + e.message
    });
  }
});

// Buscar histórico de transações do usuário
router.get('/me/transactions', async (req, res) => {
  const { User, Transaction } = req.app.locals.models;
  const uid = req.cookies.uid || req.user?.id;
  
  if (!uid) {
    return res.status(401).json({ 
      success: false,
      error: 'Usuário não autenticado' 
    });
  }

  try {
    // Busca transações enviadas
    const sentTransactions = await Transaction.findAll({
      where: { from_user_id: uid },
      include: [{
        model: User,
        as: 'receiver',
        attributes: ['name', 'account_number']
      }],
      order: [['created_at', 'DESC']],
      limit: 50
    });

    // Busca transações recebidas
    const receivedTransactions = await Transaction.findAll({
      where: { to_user_id: uid },
      include: [{
        model: User,
        as: 'sender',
        attributes: ['name', 'account_number']
      }],
      order: [['created_at', 'DESC']],
      limit: 50
    });

    // Formata as transações
    const sent = sentTransactions.map(t => ({
      id: t.id,
      type: 'sent',
      amount: parseFloat(t.amount),
      to_name: t.receiver?.name,
      to_account: t.receiver?.account_number,
      status: t.status,
      created_at: t.created_at
    }));

    const received = receivedTransactions.map(t => ({
      id: t.id,
      type: 'received',
      amount: parseFloat(t.amount),
      from_name: t.sender?.name,
      from_account: t.sender?.account_number,
      status: t.status,
      created_at: t.created_at
    }));

    // Combina e ordena por data
    const allTransactions = [...sent, ...received].sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );

    res.json({
      success: true,
      transactions: allTransactions
    });

  } catch (e) {
    console.log(`❌ Erro ao buscar transações: ${e.message}`);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar histórico de transações: ' + e.message
    });
  }
});

export default router;
