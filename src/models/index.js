import { Sequelize } from 'sequelize';
import UserModel from './User.js';
import CommentModel from './Comment.js';

export function initModels(sequelize) {
  const User = UserModel(sequelize);
  const Comment = CommentModel(sequelize);

  // Definir associações
  
  User.hasMany(Comment, { foreignKey: 'student_id', as: 'comments' });
  Comment.belongsTo(User, { foreignKey: 'student_id', as: 'user' });

  // author_id agora aponta para users
  User.hasMany(Comment, { foreignKey: 'author_id', as: 'authoredComments' });
  Comment.belongsTo(User, { foreignKey: 'author_id', as: 'author' });

  return {
    User,
    Comment
  };
}
