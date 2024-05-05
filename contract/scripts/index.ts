
import * as anchor from '@project-serum/anchor';
import { Commitment, ConnectionConfig, PublicKey, Keypair, Connection, SystemProgram } from '@solana/web3.js';
import NodeWallet from '@project-serum/anchor/dist/cjs/nodewallet';

import KEY from '../devnet.json';

const IDL = require('../airdrop.json');

const DEV_CLUSTER_API ='https://api.devnet.solana.com';
const MAIN_CLUSTER_API = 'https://mainnet-beta.solana.com';
const PROGRAM_ID = '5jKk2meTu2FJeXAQHec6eZumRpjuuqr4pM9AVDayf2q3';

let key = KEY;
const seed = Uint8Array.from(key.slice(0, 32));
console.log('secrect', seed);
const UPDATE_AUTHORITY = Keypair.fromSeed(seed);

(async () => {

  const connection = new Connection(DEV_CLUSTER_API, {
    skipPreflight: true,
    preflightCommitment: 'confirmed' as Commitment,
  } as ConnectionConfig );

  const provider = new anchor.Provider(connection, new NodeWallet(UPDATE_AUTHORITY), {
    skipPreflight: true,
    preflightCommitment: 'confirmed' as Commitment,
  } as ConnectionConfig);
  const program = new anchor.Program(IDL, new PublicKey(PROGRAM_ID), provider);
  let [vaultPDA, bump_vault] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('rewards vault')],
    program.programId
  );
  const tx = await program.rpc.initialize(
    bump_vault, {
     accounts: {
       vault: vaultPDA,
       admin: provider.wallet.publicKey,
       systemProgram: SystemProgram.programId
     }
    });
  console.log('tx', tx);
})()