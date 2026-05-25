'use strict';

/**
 * BlockScholar — All-in-One Ganache + Deploy + Frontend Script
 * ─────────────────────────────────────────────────────────────
 * Usage:  npm run deploy
 *
 * What it does:
 *  0. Auto-kills any existing process on ports 7545 / 3300
 *  1. Starts a local Ganache Ethereum node (port 7545, Chain ID 1337)
 *  2. Compiles ScholarshipDisbursement.sol using solc
 *  3. Deploys StuDetails → ScholarDetails → Staff (in correct order)
 *  4. Calls ScholarDetails.storeContractAdd(staffAddress) to link contracts
 *  5. Patches config.js with the real deployed addresses
 *  6. Starts the Express frontend server on port 3300
 *  7. Prints all account details + MetaMask setup instructions
 */

const ganache  = require('ganache');
const { ethers } = require('ethers');
const solc     = require('solc');
const express  = require('express');
const path     = require('path');
const fs       = require('fs');
const { execSync } = require('child_process');

// ── Kill any existing process on a given port (Windows) ──────────────────────
function killPort(port) {
  try {
    const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: ['pipe','pipe','ignore'] });
    const pids = [...new Set(
      result.trim().split('\n')
        .map(line => line.trim().split(/\s+/).pop())
        .filter(pid => /^\d+$/.test(pid) && pid !== '0')
    )];
    pids.forEach(pid => {
      try { execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' }); } catch {}
    });
    if (pids.length) info(`Cleared port ${port} (freed PID ${pids.join(', ')})`);
  } catch {} // port was already free — no-op
}

// ── Config ──────────────────────────────────────────────────────────────────
const GANACHE_PORT = 7545;
const APP_PORT     = 3300;
const CHAIN_ID     = 1337;

// Fixed mnemonic — deterministic accounts across restarts
const MNEMONIC = 'test test test test test test test test test test test junk';

// ── Helpers ──────────────────────────────────────────────────────────────────
const log   = (msg) => console.log(msg);
const ok    = (msg) => console.log(`   ✅ ${msg}`);
const info  = (msg) => console.log(`   ℹ️  ${msg}`);
const sep   = ()    => log('─'.repeat(60));

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  log('\n');
  log('╔════════════════════════════════════════════════════════╗');
  log('║         🎓  BlockScholar — Auto Deploy Tool            ║');
  log('╚════════════════════════════════════════════════════════╝');
  log('');

  // ── STEP 0: Clear any occupied ports ─────────────────────────────────────
  sep();
  log('  STEP 0 › Clearing ports 7545 & 3300 (if in use)');
  sep();
  killPort(GANACHE_PORT);
  killPort(APP_PORT);
  ok('Ports ready');

  // ── STEP 1: Start Ganache ─────────────────────────────────────────────────
  sep();
  log('  STEP 1 › Starting Ganache local blockchain');
  sep();

  const ganacheServer = ganache.server({
    wallet:  { mnemonic: MNEMONIC, totalAccounts: 10 },
    chain:   { chainId: CHAIN_ID, networkId: CHAIN_ID },
    logging: { quiet: true },
  });

  await ganacheServer.listen(GANACHE_PORT);
  ok(`Ganache running  →  http://127.0.0.1:${GANACHE_PORT}  (Chain ID: ${CHAIN_ID})`);

  // Derive accounts from mnemonic (deterministic)
  const hdNode   = ethers.utils.HDNode.fromMnemonic(MNEMONIC);
  const accounts = Array.from({ length: 5 }, (_, i) => {
    const node = hdNode.derivePath(`m/44'/60'/0'/0/${i}`);
    return { address: node.address, privateKey: node.privateKey };
  });

  // Connect ethers.js to Ganache
  const provider = new ethers.providers.JsonRpcProvider(`http://127.0.0.1:${GANACHE_PORT}`);
  const deployer = new ethers.Wallet(accounts[0].privateKey, provider);
  ok(`Deployer wallet  →  ${deployer.address}`);

  // ── STEP 2: Compile Solidity ──────────────────────────────────────────────
  sep();
  log('  STEP 2 › Compiling ScholarshipDisbursement.sol');
  sep();

  const solPath = path.join(__dirname, '..', 'ScholarshipDisbursement.sol');
  const source  = fs.readFileSync(solPath, 'utf8');

  const solcInput = JSON.stringify({
    language: 'Solidity',
    sources:  { 'ScholarshipDisbursement.sol': { content: source } },
    settings: {
      evmVersion: 'paris',
      optimizer:       { enabled: true, runs: 200 },
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } },
    },
  });

  const solcOutput = JSON.parse(solc.compile(solcInput));

  // Surface any errors
  if (solcOutput.errors) {
    const errors = solcOutput.errors.filter(e => e.severity === 'error');
    if (errors.length) {
      errors.forEach(e => log('❌ ' + e.formattedMessage));
      process.exit(1);
    }
    solcOutput.errors
      .filter(e => e.severity === 'warning')
      .forEach(e => info('(warning) ' + e.message.split('\n')[0]));
  }

  const compiled = solcOutput.contracts['ScholarshipDisbursement.sol'];
  ok('Compiled → StuDetails, ScholarDetails, Staff');

  // ── STEP 3: Deploy Contracts ──────────────────────────────────────────────
  sep();
  log('  STEP 3 › Deploying contracts to Ganache');
  sep();

  async function deploy(name, abi, bytecode, ctorArgs = []) {
    process.stdout.write(`   🚀 Deploying ${name}...`);
    const factory  = new ethers.ContractFactory(abi, bytecode, deployer);
    const contract = await factory.deploy(...ctorArgs);
    await contract.deployed();
    console.log(`  →  ${contract.address}`);
    return contract;
  }

  const stuContract    = await deploy('StuDetails',    compiled.StuDetails.abi,    compiled.StuDetails.evm.bytecode.object);
  const scholarContract = await deploy('ScholarDetails', compiled.ScholarDetails.abi, compiled.ScholarDetails.evm.bytecode.object, [stuContract.address]);
  const staffContract  = await deploy('Staff',         compiled.Staff.abi,         compiled.Staff.evm.bytecode.object, [stuContract.address, scholarContract.address]);

  // ── STEP 4: Link Contracts ────────────────────────────────────────────────
  process.stdout.write(`   🔗 Linking contracts (storeContractAdd)...`);
  const linkTx = await scholarContract.storeContractAdd(staffContract.address);
  await linkTx.wait();
  console.log('  ✅ Done');

  // ── STEP 5: Patch config.js ───────────────────────────────────────────────
  sep();
  log('  STEP 5 › Updating config.js with deployed addresses');
  sep();

  const configPath = path.join(__dirname, '..', 'config.js');
  let   cfg        = fs.readFileSync(configPath, 'utf8');

  cfg = cfg.replace(/student:\s*"[^"]*"/,  `student:  "${stuContract.address}"`);
  cfg = cfg.replace(/provider:\s*"[^"]*"/, `provider: "${scholarContract.address}"`);
  cfg = cfg.replace(/staff:\s*"[^"]*"/,    `staff:    "${staffContract.address}"`);

  fs.writeFileSync(configPath, cfg);
  ok('config.js patched successfully');

  // ── STEP 6: Start Express Frontend ───────────────────────────────────────
  sep();
  log('  STEP 6 › Starting BlockScholar frontend server');
  sep();

  const app = express();
  const root = path.join(__dirname, '..');

  app.use(express.static(root, {
    setHeaders(res, fp) {
      if (fp.endsWith('.js'))  res.setHeader('Content-Type', 'application/javascript');
      if (fp.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
    },
  }));
  app.get('/health', (_, res) => res.json({ status: 'ok', project: 'BlockScholar' }));
  app.get('*',       (_, res) => res.sendFile(path.join(root, 'index.html')));

  await new Promise((resolve, reject) => {
    app.listen(APP_PORT, resolve).on('error', reject);
  });
  ok(`Frontend running →  http://localhost:${APP_PORT}`);

  // ── STEP 7: Print Summary ─────────────────────────────────────────────────
  log('');
  log('╔════════════════════════════════════════════════════════╗');
  log('║          🎓  BlockScholar is LIVE!                     ║');
  log('╠════════════════════════════════════════════════════════╣');
  log('║  CONTRACT ADDRESSES                                    ║');
  log(`║  Student  :  ${stuContract.address}  ║`);
  log(`║  Provider :  ${scholarContract.address}  ║`);
  log(`║  Staff    :  ${staffContract.address}  ║`);
  log('╠════════════════════════════════════════════════════════╣');
  log('║  GANACHE TEST ACCOUNTS  (import any into MetaMask)     ║');
  log('╠════════════════════════════════════════════════════════╣');
  accounts.forEach((a, i) => {
    log(`║  [${i}] ${a.address}         ║`);
    log(`║      PK: ${a.privateKey}  ║`);
    log('║                                                        ║');
  });
  log('╠════════════════════════════════════════════════════════╣');
  log('║  METAMASK NETWORK SETTINGS                             ║');
  log('║  Network Name :  Ganache Local                         ║');
  log(`║  RPC URL      :  http://127.0.0.1:${GANACHE_PORT}                 ║`);
  log(`║  Chain ID     :  ${CHAIN_ID}                                   ║`);
  log('║  Currency     :  ETH                                   ║');
  log('╠════════════════════════════════════════════════════════╣');
  log(`║  🌐  Open:  http://localhost:${APP_PORT}                       ║`);
  log('║  ⚡  Keep this terminal OPEN (Ganache + Server)        ║');
  log('║  🔄  Hard-refresh browser (Ctrl+Shift+R) after open    ║');
  log('╚════════════════════════════════════════════════════════╝');
  log('');
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message || err);
  process.exit(1);
});
