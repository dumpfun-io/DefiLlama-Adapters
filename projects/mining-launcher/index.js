// Mining Launcher - Gamified Mining Launchpad on Solana
// Anyone can launch a mining token. Users deploy SOL to a 5x5 grid per game,
// winners chosen via VRF, 10% buy-and-burn, 1.4% motherload jackpot per round.

const { getConnection, sumTokens2 } = require("../helper/solana");
const { PublicKey } = require("@solana/web3.js");
const bs58 = require("bs58");

const PROGRAM_ID = new PublicKey("Minefw2Nic7LBvSw9rN59e8wycUzrKMBF2PZzFHKsqd");

// Anchor discriminators: sha256("account:<Name>")[0:8]
// Filtered by discriminator (not size) to avoid collision with same-size
// Miner (600 = MiningRound) and VrfResult (100 = MiningBoard) accounts.
const DISC_LAUNCH_CONFIG    = Buffer.from([18, 161, 9, 224, 102, 145, 29, 94]);
const DISC_MINING_BOARD     = Buffer.from([167, 142, 34, 6, 66, 173, 50, 139]);
const DISC_MINING_ROUND     = Buffer.from([120, 38, 226, 94, 243, 8, 166, 118]);
const DISC_GLOBAL_MOTHERLOAD = Buffer.from([228, 172, 222, 43, 244, 185, 70, 180]);

// LaunchConfig layout: [8..40] mint (Pubkey), [40..72] pool (Pubkey), [72..104] rewards_vault (Pubkey)
const REWARDS_VAULT_OFFSET = 72;

const encode = bs58.default ? bs58.default.encode : bs58.encode;
function discFilter(disc) {
  return [{ memcmp: { offset: 0, bytes: encode(disc) } }];
}

async function getAllProgramData() {
  const connection = getConnection();

  // Targeted RPC calls with discriminator filters and minimal data transfer
  const [configs, boards, rounds, motherloads] = await Promise.all([
    // LaunchConfig: need first 104 bytes to read rewards_vault pubkey
    connection.getProgramAccounts(PROGRAM_ID, {
      filters: discFilter(DISC_LAUNCH_CONFIG),
      dataSlice: { offset: 0, length: 104 },
    }),
    // MiningBoard: only need pubkey for SOL balance (motherload + burn escrow)
    connection.getProgramAccounts(PROGRAM_ID, {
      filters: discFilter(DISC_MINING_BOARD),
      dataSlice: { offset: 0, length: 0 },
    }),
    // MiningRound: only need pubkey for SOL balance (user-deployed SOL)
    connection.getProgramAccounts(PROGRAM_ID, {
      filters: discFilter(DISC_MINING_ROUND),
      dataSlice: { offset: 0, length: 0 },
    }),
    // GlobalMotherload: only need pubkey for SOL balance (cross-game jackpot)
    connection.getProgramAccounts(PROGRAM_ID, {
      filters: discFilter(DISC_GLOBAL_MOTHERLOAD),
      dataSlice: { offset: 0, length: 0 },
    }),
  ]);

  const rewardsVaults = [];
  for (const { account } of configs) {
    const data = account.data;
    if (data.length >= 104) {
      const rewardsVault = new PublicKey(data.subarray(REWARDS_VAULT_OFFSET, REWARDS_VAULT_OFFSET + 32));
      rewardsVaults.push(rewardsVault.toBase58());
    }
  }

  const solOwners = [...boards, ...rounds, ...motherloads].map(
    ({ pubkey }) => pubkey.toBase58()
  );

  return { solOwners, rewardsVaults };
}

async function tvl(api) {
  const { solOwners } = await getAllProgramData();
  await sumTokens2({ api, solOwners });
}

async function staking(api) {
  const { rewardsVaults } = await getAllProgramData();
  await sumTokens2({ api, tokenAccounts: rewardsVaults });
}

module.exports = {
  timetravel: false,
  methodology:
    "TVL counts SOL locked in active mining rounds (user deposits), mining board PDAs " +
    "(motherload + burn escrow accumulation), and the global motherload jackpot. " +
    "Staking counts protocol tokens in rewards vaults (95% of each launched token's supply). " +
    "All games are discovered dynamically via on-chain program accounts.",
  solana: {
    tvl,
    staking,
  },
};
