# BlockScholar

> **A Decentralized Application for Automated Merit-Based Scholarship Disbursement Using Ethereum Smart Contracts**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.x-363636?logo=solidity)](ScholarshipDisbursement.sol)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js)](package.json)

---

## Overview

**BlockScholar** is a proof-of-concept decentralized application (dApp) that automates study loan and scholarship disbursement using Ethereum blockchain technology. Smart contracts hold funds in escrow and automatically transfer them to students' wallets the moment their academic criteria (attendance % and average mark) are verified — no intermediaries, no delays, no fraud.

The system involves three parties:
- 🎓 **Student** — Registers on-chain; wallet address auto-saved as payment destination
- 🏦 **Scholarship Provider** — Funds scholarships in ETH and sets eligibility thresholds
- 🏫 **University Staff** — Submits results; contract auto-disburses or marks as failed

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Solidity 0.8.x |
| Blockchain | Ganache (local Ethereum, Chain ID 1337) |
| Wallet | MetaMask |
| Frontend | HTML5, CSS3, Vanilla JS |
| Web3 Library | ethers.js 5.2 |
| Server | Node.js + Express |
| IDE (Deploy) | Remix IDE |

---

## Smart Contracts

Three contracts deployed in order:

| # | Contract | Role |
|---|---|---|
| 1 | `StuDetails` | Student identity registry |
| 2 | `ScholarDetails` | Scholarship funding & escrow management |
| 3 | `Staff` | Payment engine & result verification |

**Deployment Order:**
```
1. Deploy StuDetails                         → address A
2. Deploy ScholarDetails(address A)          → address B
3. Deploy Staff(address A, address B)        → address C
4. Call ScholarDetails.storeContractAdd(C)   → links contracts
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) v18+
- [Ganache](https://trufflesuite.com/ganache/) (local Ethereum network)
- [MetaMask](https://metamask.io) browser extension
- [Remix IDE](https://remix.ethereum.org) (for deploying contracts)

### 1. Clone the Repository

```bash
git clone https://github.com/prakharshrestha/BlockScholar.git
cd BlockScholar
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Ganache

Open Ganache → Click **Quickstart Ethereum**
- RPC: `http://127.0.0.1:7545`
- Chain ID: `1337`

### 4. Connect MetaMask to Ganache

MetaMask → Add Network:
- **Network Name:** Ganache Local
- **RPC URL:** `http://127.0.0.1:7545`
- **Chain ID:** `1337`
- **Currency Symbol:** ETH

Import a Ganache account using its private key.

### 5. Deploy Contracts via Remix

1. Open [Remix IDE](https://remix.ethereum.org)
2. Paste `ScholarshipDisbursement.sol`
3. Compile with Solidity `0.8.x`
4. Set Environment → **Injected Provider - MetaMask**
5. Deploy in order (see table above)

### 6. Configure Contract Addresses

Edit `config.js`:

```js
const CONTRACT_ADDRESSES = {
  student:  "YOUR_STUDETAILS_ADDRESS",
  provider: "YOUR_SCHOLARDETAILS_ADDRESS",
  staff:    "YOUR_STAFF_ADDRESS",
};
```

### 7. Start the Server

```bash
node server.js
```

Open: **http://localhost:3300**

---

## Scholarship Status Lifecycle

```
addSchlRecords()
      ↓
  [active]
  /      \
paid    failed → re-activated → [active]
          \
     cancelScholarship() → [pending_refund] → processRefund() → [cancel]
```

---

## License

[MIT](LICENSE)
