USE bancodigital;

-- Senha padrão para todos os usuários: senha123 (exceto Alice que é 'admin')
INSERT INTO users (name, email, password, role, account_number, balance, bio) VALUES
('Alice Admin', 'alice@bancodigital.com', 'admasdasdin', 'admin', '1-001', 25000.00, 'Administradora do sistema bancário. Apaixonada por tecnologia e segurança financeira.'),
('Bruno Silva', 'bruno@bancodigital.com', 'senhaasdasda123', 'user', '1-002', 12500.50, 'Desenvolvedor de software e entusiasta de criptomoedas. Sempre em busca de novos desafios!'),
('Carla Santos', 'carla@bancodigital.com', 'senhaad123', 'user', '1-003', 8750.75, 'Empreendedora digital. Amo viajar e conhecer novas culturas.'),
('Diego Souza', 'diego@bancodigital.com', 'senhaasdas123', 'user', '1-004', 15200.00, 'Investidor e analista financeiro. Compartilhando conhecimento sobre mercado.'),
('Elena Costa', 'elena@bancodigital.com', 'senha12asdasd3', 'user', '1-005', 5600.25, 'Designer UX/UI. Criando experiências incríveis para usuários.');


INSERT INTO comments (user_id, author_id, body) VALUES
(4, 2, 'Muito bom!'),
(5, 3, 'Excelente trabalho!'),
(2, 1, 'Parabéns pelo seu perfil!'),
(3, 4, 'Adorei suas publicações!');


INSERT INTO posts (author_id, content) VALUES
(1, 'Bem-vindos ao novo sistema bancário! 🏦'),
(2, 'Acabei de fazer uma transferência pelo app. Muito rápido!'),
(3, 'Alguém sabe como funciona o programa de pontos?'),
(4, 'Adorando a nova interface do banco! 💰'),
(5, 'Dica: sempre confira seus extratos regularmente!'),
(1, 'Lembrete: Mantenha suas senhas seguras e não compartilhe com ninguém.'),
(2, 'Investir é pensar no futuro. Que tal começar hoje?'),
(3, 'Recebi um cashback incrível hoje! 🎉');