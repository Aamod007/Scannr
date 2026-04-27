/**
 * Hyperledger Fabric Network Configuration
 *
 * This module provides configuration for connecting to the
 * Hyperledger Fabric network used by SCANNR.
 */

const path = require('path');

const fabricConfig = {
  // Network details
  channelName: process.env.FABRIC_CHANNEL || 'scannr-channel',
  chaincodeName: process.env.FABRIC_CHAINCODE || 'importer-profile',
  auditChaincodeName: process.env.FABRIC_AUDIT_CHAINCODE || 'audit-trail',

  // Connection profile path
  connectionProfilePath: process.env.FABRIC_CCP_PATH ||
    path.resolve(__dirname, '..', '..', 'connection-profile.json'),

  // Wallet path
  walletPath: process.env.FABRIC_WALLET_PATH ||
    path.join(process.cwd(), 'wallet'),

  // Identity
  identity: process.env.FABRIC_IDENTITY || 'admin',

  // Discovery
  discovery: {
    enabled: process.env.FABRIC_DISCOVERY !== 'false',
    asLocalhost: process.env.FABRIC_AS_LOCALHOST !== 'false'
  },

  // Organizations
  organizations: [
    {
      name: 'CustomsOrg',
      mspId: 'CustomsMSP',
      peers: ['peer0.customs.scannr.in', 'peer1.customs.scannr.in'],
      ca: 'ca-customs'
    },
    {
      name: 'PortAuthorityOrg',
      mspId: 'PortAuthorityMSP',
      peers: ['peer0.port.scannr.in', 'peer1.port.scannr.in'],
      ca: 'ca-port'
    }
  ],

  // Orderer
  orderer: {
    name: 'orderer.scannr.in',
    type: 'etcdraft'
  },

  // Timeouts
  queryTimeout: parseInt(process.env.FABRIC_QUERY_TIMEOUT) || 30000,
  submitTimeout: parseInt(process.env.FABRIC_SUBMIT_TIMEOUT) || 60000
};

module.exports = fabricConfig;
