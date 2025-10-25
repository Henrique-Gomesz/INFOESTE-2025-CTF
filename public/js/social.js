// social.js
document.addEventListener('DOMContentLoaded', () => {
    // Redireciona se não estiver logado
    if (!isLoggedIn()) {
        window.location.href = '/login.html';
        return;
    }
    
    const currentUser = getCurrentUser();
    
    // Configura link "Meu Perfil" na navbar
    if (currentUser) {
        const myProfileNavLink = document.getElementById('myProfileNavLink');
        if (myProfileNavLink) {
            myProfileNavLink.href = `/user.html?id=${currentUser.id}`;
        }
    }
    
    // Mostra link de usuários se for admin
    if (currentUser && currentUser.role === 'admin') {
        const usersNavLink = document.getElementById('usersNavLink');
        if (usersNavLink) {
            usersNavLink.style.display = 'inline';
        }
    }
    
    // Carrega posts
    loadPosts();
    
    // Event listener para criar post
    const createPostBtn = document.getElementById('createPostBtn');
    if (createPostBtn) {
        createPostBtn.addEventListener('click', createPost);
    }
    
    // Event listener para textarea (Enter com Ctrl para publicar)
    const postContent = document.getElementById('postContent');
    if (postContent) {
        postContent.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                createPost();
            }
        });
    }
});

async function loadPosts() {
    const container = document.getElementById('postsContainer');
    
    try {
        const response = await fetch('/api/posts', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Erro ao carregar posts');
        }
        
        const result = await response.json();
        
        if (result.success && result.posts) {
            renderPosts(result.posts);
        } else {
            container.innerHTML = '<div class="no-posts">Nenhuma publicação encontrada</div>';
        }
    } catch (error) {
        console.error('Erro ao carregar posts:', error);
        container.innerHTML = '<div class="error-message">Erro ao carregar publicações. Tente novamente.</div>';
    }
}

function renderPosts(posts) {
    const container = document.getElementById('postsContainer');
    const currentUser = getCurrentUser();
    
    if (!posts || posts.length === 0) {
        container.innerHTML = '<div class="no-posts">Nenhuma publicação encontrada. Seja o primeiro a postar!</div>';
        return;
    }
    
    const html = posts.map(post => {
        const date = new Date(post.created_at).toLocaleString('pt-BR');
        const canDelete = currentUser && (currentUser.id == post.author_id || currentUser.role === 'admin');
        
        return `
            <div class="post-item" data-post-id="${post.id}">
                <div class="post-header">
                    <a href="/user.html?id=${post.author_id}" class="post-author">
                        ${escapeHtml(post.author_name)}
                    </a>
                    <span class="post-date">${date}</span>
                </div>
                <div class="post-content">${post.content}</div>
                ${canDelete ? `
                <div class="post-actions">
                    <button class="delete-post-btn" onclick="deletePost(${post.id})">
                        🗑️ Excluir
                    </button>
                </div>
                ` : ''}
            </div>
        `;
    }).join('');
    
    container.innerHTML = `<div class="posts-list">${html}</div>`;
}

async function createPost() {
    const contentEl = document.getElementById('postContent');
    const content = contentEl.value.trim();
    
    if (!content) {
        showMessage('Por favor, escreva algo antes de publicar', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ content })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Publicação criada com sucesso!', 'success');
            contentEl.value = '';
            loadPosts(); // Recarrega a lista de posts
        } else {
            showMessage(result.error || 'Erro ao criar publicação', 'error');
        }
    } catch (error) {
        console.error('Erro ao criar post:', error);
        showMessage('Erro ao criar publicação. Tente novamente.', 'error');
    }
}

async function deletePost(postId) {
    if (!confirm('Tem certeza que deseja excluir esta publicação?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/posts/${postId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Publicação excluída com sucesso!', 'success');
            loadPosts(); // Recarrega a lista de posts
        } else {
            showMessage(result.error || 'Erro ao excluir publicação', 'error');
        }
    } catch (error) {
        console.error('Erro ao excluir post:', error);
        showMessage('Erro ao excluir publicação. Tente novamente.', 'error');
    }
}

function showMessage(message, type = 'info') {
    const container = document.getElementById('messageContainer');
    const className = type === 'error' ? 'error-message' : 'success-message';
    
    container.innerHTML = `<div class="${className}">${escapeHtml(message)}</div>`;
    
    // Remove a mensagem após 5 segundos
    setTimeout(() => {
        container.innerHTML = '';
    }, 5000);
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}
