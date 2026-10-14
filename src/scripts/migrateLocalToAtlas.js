import mongoose from 'mongoose';
import dns from 'dns';

try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {}

const localUri = 'mongodb://127.0.0.1:27017/restaurant_bills';
const atlasUri = 'mongodb+srv://diintechteam4_db_user:UJXPKfzqbkpQh6qU@cluster0.hhhir9p.mongodb.net/restaurant_bills?retryWrites=true&w=majority&appName=Cluster0';

const runMigration = async () => {
  let localConn = null;
  let atlasConn = null;

  try {
    console.log('1. Connecting to Local MongoDB...');
    localConn = await mongoose.createConnection(localUri).asPromise();
    console.log('✓ Connected to Local MongoDB.');

    console.log('2. Connecting to MongoDB Atlas...');
    atlasConn = await mongoose.createConnection(atlasUri).asPromise();
    console.log('✓ Connected to MongoDB Atlas.');

    // List of collections to migrate
    const collections = ['users', 'clients', 'customers', 'bills'];

    for (const collName of collections) {
      console.log(`\nMigrating collection: "${collName}"...`);
      const localColl = localConn.collection(collName);
      const atlasColl = atlasConn.collection(collName);

      const docs = await localColl.find({}).toArray();
      console.log(`Found ${docs.length} documents in local "${collName}".`);

      if (docs.length > 0) {
        for (const doc of docs) {
          await atlasColl.replaceOne({ _id: doc._id }, doc, { upsert: true });
        }
        console.log(`✓ Copied ${docs.length} documents to Atlas "${collName}".`);
      } else {
        // Create collection if empty so it shows in Atlas
        await atlasConn.createCollection(collName).catch(() => {});
        console.log(`✓ Created collection "${collName}" in Atlas.`);
      }
    }

    console.log('\n===========================================');
    console.log('🎉 ALL DATA & COLLECTIONS MIGRATED TO ATLAS!');
    console.log('===========================================');
  } catch (err) {
    console.error('Migration Error:', err);
  } finally {
    if (localConn) await localConn.close();
    if (atlasConn) await atlasConn.close();
    process.exit(0);
  }
};

runMigration();
