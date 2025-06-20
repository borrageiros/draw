import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || '';

interface CachedMongoose {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

interface GlobalWithMongoose {
  mongoose?: CachedMongoose;
}

const cached = global as GlobalWithMongoose;

if (!cached.mongoose) {
  cached.mongoose = { conn: null, promise: null };
}

// Configure events for debugging
mongoose.connection.on('connected', () => {
  console.log('MongoDB connected successfully');
});

mongoose.connection.on('error', (err) => {
  console.log(`MongoDB connection error: ${err}`);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Function to add process handlers
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  process.exit(0);
});

async function dbConnect() {
  if (cached.mongoose?.conn) {
    return cached.mongoose.conn;
  }

  if (!cached.mongoose?.promise) {
    const opts = {
      bufferCommands: false
    };

    console.log('Connecting to MongoDB...');
    cached.mongoose!.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongoose) => {
        console.log(`MongoDB connected to: ${MONGODB_URI.split('@').pop()}`);
        return mongoose;
      })
      .catch((error) => {
        console.error('Error connecting to MongoDB:', error.message);
        throw error;
      });
  }

  try {
    cached.mongoose!.conn = await cached.mongoose!.promise;
    return cached.mongoose!.conn;
  } catch (error) {
    throw error;
  }
}

// Function to check the connection status
export function getConnectionStatus() {
  return {
    connected: mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState,
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    status: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState]
  };
}

export default dbConnect; 