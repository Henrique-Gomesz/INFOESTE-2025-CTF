import { Sequelize } from 'sequelize';
import { initModels } from '../models/index.js';

export async function createSequelize() {
  const sequelize = new Sequelize(
    process.env.DB_NAME || 'bancodigital',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || '127.0.0.1',
      port: +(process.env.DB_PORT || 3306),
      dialect: 'mysql',
      logging: false, // Desabilita logs SQL, habilite para debug
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    }
  );

  try {
    await sequelize.authenticate();
    console.log('✅ Conexão com o banco de dados estabelecida com sucesso.');
    
    // Inicializa os modelos
    const models = initModels(sequelize);
    
    // Adiciona os modelos ao objeto sequelize para fácil acesso
    sequelize.models = models;
    
    return sequelize;
  } catch (err) {
    console.error('❌ Erro conectando ao MySQL:', err.message);
    throw err;
  }
}
