require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    host:     process.env.DB_HOST || 'localhost',
    port:     parseInt(process.env.DB_PORT, 10) || 3306,
    dialect:  'mysql',
    timezone: '+05:30',
    define: {
      charset:   'utf8mb4',
      collate:   'utf8mb4_unicode_ci',
      underscored: true,
      timestamps:  true,
    },
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT, 10) || 3306,
    dialect:  'mysql',
    timezone: '+05:30',
    logging:  false,
    define: {
      charset:   'utf8mb4',
      collate:   'utf8mb4_unicode_ci',
      underscored: true,
      timestamps:  true,
    },
  },
};
