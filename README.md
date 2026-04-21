# Decentralized Sports Prediction Market (PoC)

## How to run

After cloning the repository, work from the project root. Run the install script once: it creates a Python virtual environment for the oracle/backend, installs frontend and backend dependencies, and (if Foundry is installed) pulls contract libraries.

```bash
git clone <repository-url>
cd Blockchain-Project
chmod +x install.sh run.sh   # if needed on your machine
./install.sh
```

When `install.sh` has finished successfully, start the app with `run.sh`. That script frees ports **3000** and **8000** if they are in use, then starts the Next.js frontend and the Flask Python API.

```bash
./run.sh
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The UI lists games for a given event. Connect a MetaMask wallet to place bets on the smart contract and claim winnings after a game has been settled (once the oracle has reported the result on-chain).

---

**Team members:** Carter Sammis, Emiliano Medina Gonzalez, Noah Turner


**Project Abstract (Short, high-level description of the project):**
This project aims to design and prototype a decentralized sports prediction market built using blockchain technology. The system will allow users to place bets on the outcome of sporting events through a web interface while leveraging smart contracts to securely store bets and distribute payouts. A sports data API will act as an oracle that provides verified game results, enabling the smart contract to automatically determine winners. The project will combine research on decentralized applications, oracle design, and smart contract security with the development of a functional prototype integrating Next.js, Python, and Solidity.

**Objectives (What are you hoping to accomplish?)(How do you define success?):**
This project explores the feasibility and design of a decentralized application (dApp) that allows users to participate in sports prediction markets without relying on a centralized database or intermediary. Instead of storing data in traditional backend systems, the smart contract deployed on a blockchain will act as the system’s source of truth for bets, game states, and payouts.

The application will consist of three main components. First, a Next.js frontend will allow users to view available games, connect their crypto wallet, and place bets. Second, a Python backend service will interact with a sports data API to retrieve official game results. This service will function as a simplified oracle, submitting verified outcomes to the smart contract. Third, a Solidity smart contract will store bets on-chain, manage escrowed funds, and distribute winnings once results are reported. In addition to building a working prototype, the project will include a research component that analyzes the role of oracles in blockchain systems, trust assumptions in decentralized applications, and the challenges of integrating real-world data with smart contracts
