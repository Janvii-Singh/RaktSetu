const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/raktsetu',
  JWT_SECRET: process.env.JWT_SECRET || 'default_jwt_secret_dev',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  ML_SERVICE_URL: process.env.ML_SERVICE_URL || 'http://localhost:5001',
  NODE_ENV: process.env.NODE_ENV || 'development',
  MAPBOX_TOKEN: process.env.MAPBOX_TOKEN || '',
};
