// dashboard.js
document.addEventListener('DOMContentLoaded', () => {
    // Redireciona se não estiver logado
    if (!isLoggedIn()) {
        window.location.href = '/login.html';
        return;
    }
    
    const user = getCurrentUser();
    
    if (user) {
        document.getElementById('userName').textContent = user.name;
        
        // Link para o próprio perfil na navbar
        const myProfileNavLink = document.getElementById('myProfileNavLink');
        if (myProfileNavLink) {
            myProfileNavLink.href = `/user.html?id=${user.id}`;
        }
        
        // Link para o próprio perfil no card
        const myProfileLink = document.getElementById('myProfileLink');
        if (myProfileLink) {
            myProfileLink.href = `/user.html?id=${user.id}`;
        }
        
        // Mostra links de admin
        if (user.role === 'admin') {
            const adminUsersCard = document.getElementById('adminUsersCard');
            if (adminUsersCard) {
                adminUsersCard.style.display = 'block';
            }
            const usersNavLink = document.getElementById('usersNavLink');
            if (usersNavLink) {
                usersNavLink.style.display = 'inline';
            }
        }
        
        // Carrega dados bancários do dashboard
        loadDashboardData();
    }
});

async function loadDashboardData() {
    try {
        const response = await fetch('/api/users/me/dashboard', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Erro ao carregar dados do dashboard');
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
            const data = result.data;
            
            // Atualiza informações do usuário
            const accountNumberEl = document.getElementById('accountNumber');
            if (accountNumberEl) {
                accountNumberEl.textContent = data.user.account_number || 'N/A';
            }
            
            // Atualiza saldo
            const balanceEl = document.getElementById('balanceAmount');
            if (balanceEl) {
                balanceEl.textContent = `R$ ${formatMoney(data.user.balance)}`;
            }
            
            // Atualiza gastos mensais
            const spendingEl = document.getElementById('monthlySpending');
            if (spendingEl) {
                spendingEl.textContent = `R$ ${formatMoney(data.monthlySpending.total)}`;
            }
            
            // Atualiza meta de economia
            const savingsGoalEl = document.getElementById('savingsGoal');
            if (savingsGoalEl) {
                savingsGoalEl.textContent = `${data.savingsGoal.percentage.toFixed(1)}%`;
            }
            
            // Renderiza transações
            renderTransactions(data.recentTransactions);
            
            // Renderiza categorias
            renderCategories(data.monthlySpending.categories);
            
            // Carrega transferências reais
            loadRealTransactions();
        }
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        showError('Erro ao carregar dados do dashboard');
    }
}

async function loadRealTransactions() {
    try {
        const response = await fetch('/api/users/me/transactions', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            console.error('Erro ao carregar transferências');
            return;
        }
        
        const result = await response.json();
        
        if (result.success && result.transactions && result.transactions.length > 0) {
            // Adiciona as transferências reais ao início da lista
            const listEl = document.getElementById('transactionsList');
            if (!listEl) return;
            
            const transfersHtml = result.transactions.map(t => {
                const amount = parseFloat(t.amount).toFixed(2);
                const date = new Date(t.created_at).toLocaleString('pt-BR');
                const type = t.type === 'sent' ? 'debit' : 'credit';
                const sign = t.type === 'sent' ? '' : '+';
                
                let description = '';
                if (t.type === 'sent') {
                    description = `Transferência para ${t.to_name}`;
                } else {
                    description = `Transferência de ${t.from_name}`;
                }
                
                return `
                    <div class="transaction-item ${type}">
                        <div class="transaction-info">
                            <strong>${description}</strong>
                            <span class="transaction-date">${date}</span>
                        </div>
                        <div class="transaction-amount ${type}">
                            ${sign}${t.type === 'sent' ? '-' : ''}R$ ${amount.replace('.', ',')}
                        </div>
                    </div>
                `;
            }).join('');
            
            // Prepend transferências reais antes das transações fictícias
            listEl.innerHTML = transfersHtml + listEl.innerHTML;
        }
    } catch (error) {
        console.error('Erro ao carregar transferências:', error);
    }
}

function renderTransactions(transactions) {
    const listEl = document.getElementById('transactionsList');
    if (!listEl) return;
    
    if (!transactions || transactions.length === 0) {
        listEl.innerHTML = '<p class="no-data">Nenhuma transação encontrada</p>';
        return;
    }
    
    const html = transactions.map(t => {
        const type = t.type === 'credit' ? 'credit' : 'debit';
        const sign = t.type === 'credit' ? '+' : '';
        const date = new Date(t.date).toLocaleDateString('pt-BR');
        
        return `
            <div class="transaction-item ${type}">
                <div class="transaction-info">
                    <strong>${t.description}</strong>
                    <span class="transaction-date">${date}</span>
                </div>
                <div class="transaction-amount ${type}">
                    ${sign}R$ ${formatMoney(Math.abs(t.amount))}
                </div>
            </div>
        `;
    }).join('');
    
    listEl.innerHTML = html;
}

function renderCategories(categories) {
    const listEl = document.getElementById('categoriesList');
    if (!listEl) return;
    
    if (!categories || categories.length === 0) {
        listEl.innerHTML = '<p class="no-data">Nenhuma categoria encontrada</p>';
        return;
    }
    
    const html = categories.map(c => {
        return `
            <div class="category-item">
                <div class="category-info">
                    <strong>${c.name}</strong>
                    <span class="category-percentage">${c.percentage}%</span>
                </div>
                <div class="category-bar">
                    <div class="category-bar-fill" style="width: ${c.percentage}%"></div>
                </div>
                <div class="category-amount">R$ ${formatMoney(c.amount)}</div>
            </div>
        `;
    }).join('');
    
    listEl.innerHTML = html;
}

function formatMoney(value) {
    return parseFloat(value).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function showError(message) {
    alert(message);
}
