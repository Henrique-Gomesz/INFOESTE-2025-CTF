import { Router } from 'express';
import { requireAdmin, requireUserSelfOrAdmin, requireAuth } from '../utils/auth.js';
import { Op } from 'sequelize';

const router = Router();

// Aplica autenticação obrigatória para todas as rotas de usuários
router.use(requireAuth);

// Lista usuários com pesquisa refletida (XSS refletido)
router.get('/', async (req, res) => {
  const { User } = req.app.locals.models;
  const q = req.query.q || '';
  try {
    let users;
    if (q) {
      users = await User.findAll({
        where: {
          name: {
            [Op.like]: `%${q}%`
          }
        },
        attributes: ['id', 'name', 'email'],
        raw: true
      });
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
      attributes: ['id', 'name', 'email'],
      raw: true
    });
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'Usuário não encontrado ou consulta inválida' 
      });
    }
    
    // Formata o usuário
    const formattedUser = {
      id: user.id,
      name: user.name,
      email: user.email
    };
    
    // Comentários com XSS armazenado
    let comments = [];
    try {
      const commentRows = await Comment.findAll({
        where: { student_id: id },
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
  const { Comment } = req.app.locals.models;
  const id = req.params.id;
  const uid = req.cookies.uid || 1; // Fallback para não quebrar
  const { body } = req.body;
  try {
    const comment = await Comment.create({
      student_id: id,
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
        student_id: comment.student_id
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
    await Comment.destroy({ where: { student_id: id } });
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

// Excluir comentário: permitido para admin, dono do perfil (student_id) ou autor do comentário
router.delete('/:id/comments/:commentId', async (req, res) => {
  const { Comment } = req.app.locals.models;
  const userId = String(req.params.id);
  const commentId = req.params.commentId;
  const isAdmin = !!(req.user && req.user.role === 'admin');
  const uid = (req.user && req.user.id) || req.cookies.uid || null;
  try {
    const comment = await Comment.findOne({
      where: { id: commentId },
      attributes: ['id', 'student_id', 'author_id'],
      raw: true
    });
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comentário não encontrado'
      });
    }
    
    const isProfileOwner = uid && String(uid) === String(comment.student_id);
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

export default router;
