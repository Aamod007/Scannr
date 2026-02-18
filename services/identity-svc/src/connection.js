import { Gateway, Wallets } from 'fabric-network';
import path from 'path';
import fs from 'fs';

const useFabric = process.env.USE_FABRIC === 'true';

export async function connectFabricGateway() {
  if (!useFabric) {
    return {
      channel: "india-customs-main",
      stub: true,
    };
  }

  try {
    const ccpPath = process.env.FABRIC_CCP_PATH || '/app/infra/blockchain/connection.json';
    const walletPath = process.env.FABRIC_WALLET_PATH || '/app/wallet';
    const userId = process.env.FABRIC_USER_ID || 'admin';

    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    
    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: userId,
      discovery: { enabled: true, asLocalhost: false }
    });

    const network = await gateway.getNetwork('india-customs-main');
    const contract = network.getContract('importer');

    return {
      gateway,
      network,
      contract,
      stub: false
    };
  } catch (error) {
    console.error('Failed to connect to Fabric:', error);
    return {
      channel: "india-customs-main",
      stub: true,
    };
  }
}

export function disconnectFabricGateway(connection) {
  if (connection && connection.gateway && !connection.stub) {
    connection.gateway.disconnect();
  }
}

export async function queryImporterFabric(contract, importerID) {
  if (!contract) {
    throw new Error('Fabric contract not available');
  }
  const result = await contract.evaluateTransaction('GetImporter', importerID);
  return JSON.parse(result.toString());
}

export async function registerImporterFabric(contract, importerID, yearsActive, aeoTier, violations, cleanInspections) {
  if (!contract) {
    throw new Error('Fabric contract not available');
  }
  await contract.submitTransaction(
    'RegisterImporter',
    importerID,
    yearsActive.toString(),
    aeoTier.toString(),
    violations.toString(),
    cleanInspections.toString()
  );
  return queryImporterFabric(contract, importerID);
}

export async function addViolationFabric(contract, importerID, violationID, description, severity) {
  if (!contract) {
    throw new Error('Fabric contract not available');
  }
  await contract.submitTransaction(
    'AddViolation',
    importerID,
    violationID,
    description,
    severity.toString()
  );
}
