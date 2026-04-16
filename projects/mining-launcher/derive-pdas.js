#!/usr/bin/env node
// Helper script to derive PDA addresses for Mining Launcher
// Usage: node derive-pdas.js <PROGRAM_ID> [TOKEN_MINT]
//
// Example:
//   node derive-pdas.js Minefw2Nic7LBvSw9rN59e8wycUzrKMBF2PZzFHKsqd
//   node derive-pdas.js Minefw2Nic7LBvSw9rN59e8wycUzrKMBF2PZzFHKsqd So11111111111111111111111111111111

const { PublicKey } = require("@solana/web3.js");

const programId = new PublicKey(process.argv[2] || "Minefw2Nic7LBvSw9rN59e8wycUzrKMBF2PZzFHKsqd");
const tokenMint = process.argv[3] ? new PublicKey(process.argv[3]) : null;

console.log(`Program ID: ${programId.toBase58()}\n`);

// Global motherload PDA (singleton)
const [globalMotherload] = PublicKey.findProgramAddressSync(
  [Buffer.from("global_motherload")],
  programId
);
console.log(`Global Motherload PDA: ${globalMotherload.toBase58()}`);

if (tokenMint) {
  console.log(`\nToken Mint: ${tokenMint.toBase58()}`);

  const [launchConfig] = PublicKey.findProgramAddressSync(
    [Buffer.from("launch_config"), tokenMint.toBuffer()],
    programId
  );
  console.log(`Launch Config PDA:    ${launchConfig.toBase58()}`);

  const [miningBoard] = PublicKey.findProgramAddressSync(
    [Buffer.from("mining_board"), tokenMint.toBuffer()],
    programId
  );
  console.log(`Mining Board PDA:     ${miningBoard.toBase58()}`);

  const [adminList] = PublicKey.findProgramAddressSync(
    [Buffer.from("admin_list"), tokenMint.toBuffer()],
    programId
  );
  console.log(`Admin List PDA:       ${adminList.toBase58()}`);

  const [vrfResult] = PublicKey.findProgramAddressSync(
    [Buffer.from("vrf_result"), tokenMint.toBuffer()],
    programId
  );
  console.log(`VRF Result PDA:       ${vrfResult.toBase58()}`);

  const [lpPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("launch_config"), tokenMint.toBuffer(), Buffer.from("lp_pda")],
    programId
  );
  console.log(`LP PDA:               ${lpPda.toBase58()}`);

  // Example round PDA (round 1)
  const roundId = Buffer.alloc(8);
  roundId.writeBigUInt64LE(1n);
  const [round1] = PublicKey.findProgramAddressSync(
    [Buffer.from("mining_round"), tokenMint.toBuffer(), roundId],
    programId
  );
  console.log(`Round 1 PDA:          ${round1.toBase58()}`);

  console.log(`\n--- Copy these into index.js MINING_GAMES array ---`);
  console.log(`{`);
  console.log(`  mint: "${tokenMint.toBase58()}",`);
  console.log(`  miningBoard: "${miningBoard.toBase58()}",`);
  console.log(`  rewardsVault: "TODO_GET_FROM_LAUNCH_TX", // ATA created during launch instruction`);
  console.log(`}`);
} else {
  console.log(`\nPass a token mint as second argument to derive per-game PDAs.`);
}

console.log(`\n--- Copy global motherload into ADDRESSES ---`);
console.log(`GLOBAL_MOTHERLOAD: "${globalMotherload.toBase58()}",`);
