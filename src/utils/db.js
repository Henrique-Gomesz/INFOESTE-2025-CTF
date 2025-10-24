import mysql from 'mysql2/promise';

export async function createPool() {
  const config = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: +(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'unilab',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Inseguro: sem SSL, sem timeouts adequados
  };
  try {
    const pool = await mysql.createPool(config);
    return pool;
  } catch (err) {
    console.error('Erro conectando ao MySQL:', err.message);
    // Não interrompe o servidor: endpoints podem falhar depois
    return {
      query: async () => { throw err; }
    };
  }
}
