import { Router } from 'express';
import { requireAuth } from '../utils/auth.js';

const router = Router();

// Aplica autenticação obrigatória para todas as rotas de posts
router.use(requireAuth);

// Lista todos os posts (feed social)
router.get('/', async (req, res) => {
  const { Post, User } = req.app.locals.models;
  try {
    const posts = await Post.findAll({
      attributes: ['id', 'author_id', 'content', 'created_at'],
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'name', 'email'],
        required: true
      }],
      order: [['created_at', 'DESC']],
      raw: true,
      nest: true
    });
    
    const formattedPosts = posts.map(p => ({
      id: p.id,
      author_id: p.author_id,
      author_name: p.author.name,
      content: p.content,
      created_at: p.created_at,
      email: p.author.email
    }));
    
    res.json({ 
      success: true,
      posts: formattedPosts
    });
  } catch (e) {
    console.log(`❌ Erro: ${e.message}`);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao buscar posts: ' + e.message,
      posts: []
    });
  }
});

// Cria um novo post (XSS armazenado)
router.post('/', async (req, res) => {
  const { Post } = req.app.locals.models;
  const uid = req.cookies.uid || req.user?.id;
  const { content } = req.body;
  
  if (!uid) {
    return res.status(401).json({
      success: false,
      error: 'Usuário não autenticado'
    });
  }
  
  if (!content || !content.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Conteúdo do post não pode estar vazio'
    });
  }
  
  try {
    const post = await Post.create({
      author_id: uid,
      content: content
    });
    
    res.status(201).json({
      success: true,
      message: 'Post criado com sucesso',
      post: {
        id: post.id,
        author_id: post.author_id,
        content: post.content,
        created_at: post.created_at
      }
    });
  } catch (e) {
    console.log(`❌ Erro: ${e.message}`);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar post: ' + e.message
    });
  }
});

// Deleta um post (apenas o autor ou admin)
router.delete('/:id', async (req, res) => {
  const { Post } = req.app.locals.models;
  const postId = req.params.id;
  const uid = req.cookies.uid || req.user?.id;
  const isAdmin = !!(req.user && req.user.role === 'admin');
  
  if (!uid) {
    return res.status(401).json({
      success: false,
      error: 'Usuário não autenticado'
    });
  }
  
  try {
    const post = await Post.findOne({
      where: { id: postId },
      attributes: ['id', 'author_id'],
      raw: true
    });
    
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post não encontrado'
      });
    }
    
    const isAuthor = String(uid) === String(post.author_id);
    
    if (!(isAdmin || isAuthor)) {
      return res.status(403).json({
        success: false,
        error: 'Você não tem permissão para excluir este post'
      });
    }
    
    await Post.destroy({ where: { id: postId } });
    
    res.json({
      success: true,
      message: 'Post excluído com sucesso'
    });
  } catch (e) {
    console.log(`❌ Erro: ${e.message}`);
    res.status(500).json({
      success: false,
      error: 'Erro ao excluir post: ' + e.message
    });
  }
});

export default router;
