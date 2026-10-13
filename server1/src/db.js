const mongoose = require('mongoose');

let cachedConnection = null;

/**
 * Connects to MongoDB.
 * - If MONGODB_URI is set (e.g. Atlas or local mongod), uses it.
 * - Reuses cached connections in serverless environments (e.g. Vercel).
 * - Otherwise falls back to an in-memory MongoDB (mongodb-memory-server),
 *   so `npm start` works with zero setup in dev. Data resets on restart.
 */
async function connect() {
  let uri = process.env.MONGODB_URI;
  let usingMemory = false;

  // Reuse existing connection if already connected (vital for Vercel serverless)
  if (mongoose.connection.readyState >= 1) {
    return { usingMemory: false };
  }

  if (cachedConnection) {
    await cachedConnection;
    return { usingMemory: false };
  }

  if (!uri) {
    let MongoMemoryServer;
    try {
      ({ MongoMemoryServer } = require('mongodb-memory-server'));
    } catch (e) {
      throw new Error(
        'MONGODB_URI is not set and mongodb-memory-server is not installed. ' +
          'Set MONGODB_URI (Atlas or local mongod) or run: npm i mongodb-memory-server'
      );
    }
    const mem = await MongoMemoryServer.create();
    uri = mem.getUri('analytics');
    usingMemory = true;
    console.log('[db] MONGODB_URI not set -> using in-memory MongoDB (data resets on restart)');
  }

  cachedConnection = mongoose.connect(uri, {
    bufferCommands: false,
  });

  await cachedConnection;
  console.log(`[db] connected (${usingMemory ? 'in-memory' : uri.replace(/\/\/[^@]*@/, '//***@')})`);
  return { usingMemory };
}

module.exports = { connect };
