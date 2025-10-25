import { Sequelize } from 'sequelize';
import UserModel from './User.js';
import CommentModel from './Comment.js';
import PostModel from './Post.js';
import TransactionModel from './Transaction.js';

export function initModels(sequelize) {
  const User = UserModel(sequelize);
  const Comment = CommentModel(sequelize);
  const Post = PostModel(sequelize);
  const Transaction = TransactionModel(sequelize);

  // Definir associações
  
  User.hasMany(Comment, { foreignKey: 'user_id', as: 'comments' });
  Comment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  // author_id agora aponta para users
  User.hasMany(Comment, { foreignKey: 'author_id', as: 'authoredComments' });
  Comment.belongsTo(User, { foreignKey: 'author_id', as: 'author' });

  // Posts
  User.hasMany(Post, { foreignKey: 'author_id', as: 'posts' });
  Post.belongsTo(User, { foreignKey: 'author_id', as: 'author' });

  // Transactions
  User.hasMany(Transaction, { foreignKey: 'from_user_id', as: 'sentTransactions' });
  User.hasMany(Transaction, { foreignKey: 'to_user_id', as: 'receivedTransactions' });
  Transaction.belongsTo(User, { foreignKey: 'from_user_id', as: 'sender' });
  Transaction.belongsTo(User, { foreignKey: 'to_user_id', as: 'receiver' });

  return {
    User,
    Comment,
    Post,
    Transaction
  };
}
