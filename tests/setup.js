import { beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User } from '../src/models/User.js';
import { Idea } from '../src/models/Idea.js';
import { Version } from '../src/models/Version.js';
import { Review } from '../src/models/Review.js';
import { Vote } from '../src/models/Vote.js';

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDatabase(mongo.getUri());
  await Promise.all([User.init(), Idea.init(), Version.init(), Review.init(), Vote.init()]);
});

afterEach(async () => {
  await Promise.all([User.deleteMany({}), Idea.deleteMany({}), Version.deleteMany({}), Review.deleteMany({}), Vote.deleteMany({})]);
});

afterAll(async () => {
  await disconnectDatabase();
  await mongo.stop();
});
