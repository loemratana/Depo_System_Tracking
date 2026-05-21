import dotenv from 'dotenv';

dotenv.config();

const env = {
    nodeEnv: process.env.NODE_ENV || 'development',

    port: process.env.PORT || 5000,

    databaseUrl: process.env.DATABASE_URL,

    jwtSecret: process.env.JWT_SECRET,

    isDevelopment: process.env.NODE_ENV === 'development',

    isProduction: process.env.NODE_ENV === 'production',

    isTest: process.env.NODE_ENV === 'test',
}

export default env;
