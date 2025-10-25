// Verifica autenticação
const uid = getCookie('uid');
if (!uid) {
  window.location.href = '/login.html';
}

// Função para obter cookie
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

// Configura link do perfil na navbar
const myProfileNavLink = document.getElementById('myProfileNavLink');
if (myProfileNavLink) {
  myProfileNavLink.href = `/user.html?id=${uid}`;
}

// Verifica se é admin e mostra o link de usuários
fetch('/api/users/me/dashboard')
  .then(res => res.json())
  .then(data => {
    if (data.success && data.data.user) {
      // Se tiver role de admin no cookie ou na resposta, mostra o link
      const userRole = getCookie('role');
      if (userRole === 'admin') {
        const usersNavLink = document.getElementById('usersNavLink');
        if (usersNavLink) {
          usersNavLink.style.display = 'inline';
        }
      }
    }
  })
  .catch(err => console.error('Erro ao verificar admin:', err));

// Logout
document.getElementById('logoutLink').addEventListener('click', (e) => {
  e.preventDefault();
  document.cookie = 'uid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  window.location.href = '/login.html';
});

// Carrega saldo atual
async function loadBalance() {
  try {
    const response = await fetch('/api/users/me/dashboard');
    const data = await response.json();
    
    if (data.success && data.data.user) {
      const balance = parseFloat(data.data.user.balance).toFixed(2);
      document.getElementById('currentBalance').textContent = `R$ ${balance}`;
    }
  } catch (error) {
    console.error('Erro ao carregar saldo:', error);
  }
}

// Função para realizar transferência
async function makeTransfer(toAccount, amount) {
  const response = await fetch('/api/users/transfer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      to_account_number: toAccount,
      amount: amount
    })
  });
  
  return await response.json();
}

// Handler do formulário
document.getElementById('transferForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const toAccount = document.getElementById('toAccount').value;
  const amount = document.getElementById('amount').value;
  const messageDiv = document.getElementById('message');
  
  messageDiv.textContent = 'Processando transferência...';
  messageDiv.className = 'message info';
  
  try {
    const data = await makeTransfer(toAccount, amount);
    
    if (data.success) {
      messageDiv.textContent = `Transferência realizada com sucesso! Novo saldo: R$ ${parseFloat(data.transaction.new_balance).toFixed(2)}`;
      messageDiv.className = 'message success';
      
      // Limpa o formulário
      document.getElementById('transferForm').reset();
      
      // Atualiza saldo
      await loadBalance();
    } else {
      messageDiv.textContent = `Erro: ${data.error}`;
      messageDiv.className = 'message error';
    }
  } catch (error) {
    messageDiv.textContent = `Erro na transferência: ${error.message}`;
    messageDiv.className = 'message error';
  }
});

// Carrega dados iniciais
loadBalance();
