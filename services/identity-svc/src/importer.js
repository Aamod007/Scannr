import { createClient } from 'redis';
import {
  connectFabricGateway,
  disconnectFabricGateway,
  queryImporterFabric,
  registerImporterFabric,
  addViolationFabric
} from './connection.js';

// In-memory store for development when Redis/Fabric unavailable
const store = new Map();

// Redis client (lazy initialization)
let redisClient = null;

async function getRedisClient() {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || 'redis://redis:6379/0';
    redisClient = createClient({ url: redisUrl });
    redisClient.on('error', (err) => console.error('Redis Client Error', err));
    try {
      await redisClient.connect();
    } catch (e) {
      console.log('Redis unavailable, using in-memory store');
      redisClient = null;
    }
  }
  return redisClient;
}

export function calculateTrustScore(yearsActive, aeoTier, violations, cleanInspections) {
  const score = yearsActive * 10 + aeoTier * 20 - violations * 15 + cleanInspections * 0.5;
  return Math.max(0, Math.min(100, score));
}

export async function registerImporter(data) {
  const importerID = data.importer_id;
  
  // Check cache first
  const redis = await getRedisClient();
  if (redis) {
    const cached = await redis.get(`importer:${importerID}`);
    if (cached) {
      throw new Error("Importer already exists");
    }
  }
  
  // Check in-memory store
  if (store.has(importerID)) {
    throw new Error("Importer already exists");
  }
  
  const profile = {
    importer_id: importerID,
    registration_date: new Date().toISOString(),
    aeo_certificates: [],
    violation_history: [],
    inspection_logs: [],
    trust_score: calculateTrustScore(
      data.years_active || 0,
      data.aeo_tier || 0,
      data.violations || 0,
      data.clean_inspections || 0
    ),
    last_updated: new Date().toISOString(),
  };
  
  // Try Fabric blockchain
  const connection = await connectFabricGateway();
  try {
    if (!connection.stub) {
      await registerImporterFabric(
        connection.contract,
        importerID,
        data.years_active || 0,
        data.aeo_tier || 0,
        data.violations || 0,
        data.clean_inspections || 0
      );
    }
  } catch (e) {
    console.log('Fabric unavailable, using in-memory store');
  } finally {
    disconnectFabricGateway(connection);
  }
  
  // Store in memory
  store.set(importerID, profile);
  
  // Cache for 6 hours
  if (redis) {
    await redis.setEx(`importer:${importerID}`, 21600, JSON.stringify(profile));
  }
  
  return profile;
}

export async function queryImporter(importerID) {
  // Check cache first
  const redis = await getRedisClient();
  if (redis) {
    const cached = await redis.get(`importer:${importerID}`);
    if (cached) {
      return JSON.parse(cached);
    }
  }
  
  // Try Fabric blockchain first
  const connection = await connectFabricGateway();
  try {
    if (!connection.stub) {
      const fabricProfile = await queryImporterFabric(connection.contract, importerID);
      // Cache for 6 hours
      if (redis) {
        await redis.setEx(`importer:${importerID}`, 21600, JSON.stringify(fabricProfile));
      }
      return fabricProfile;
    }
  } catch (e) {
    console.log('Fabric query failed, falling back to memory store');
  } finally {
    disconnectFabricGateway(connection);
  }
  
  // Fallback to in-memory store
  const profile = store.get(importerID);
  if (!profile) {
    throw new Error("Importer not found");
  }
  
  // Cache for 6 hours
  if (redis) {
    await redis.setEx(`importer:${importerID}`, 21600, JSON.stringify(profile));
  }
  
  return profile;
}

export async function addViolation(importerID, data) {
  const profile = store.get(importerID);
  if (!profile) {
    throw new Error("Importer not found");
  }
  
  // Try Fabric blockchain
  const connection = await connectFabricGateway();
  try {
    if (!connection.stub) {
      await addViolationFabric(
        connection.contract,
        importerID,
        data.violation_id,
        data.description,
        data.severity
      );
    }
  } catch (e) {
    console.log('Fabric unavailable, using in-memory store');
  } finally {
    disconnectFabricGateway(connection);
  }
  
  // Update in-memory store
  profile.violation_history.push({
    violation_id: data.violation_id,
    description: data.description,
    severity: data.severity,
    recorded_at: new Date().toISOString(),
  });
  profile.last_updated = new Date().toISOString();
  profile.trust_score = calculateTrustScore(
    profile.years_active || 0,
    profile.aeo_tier || 0,
    profile.violation_history.length,
    profile.clean_inspections || 0
  );
  
  // Invalidate cache
  const redis = await getRedisClient();
  if (redis) {
    await redis.del(`importer:${importerID}`);
  }
  
  return profile;
}

export function resetStore() {
  store.clear();
}
