// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.

const anchor = require('@project-serum/anchor');
const { AccountLayout, TOKEN_PROGRAM_ID, Token } = require('@solana/spl-token');

const { SystemProgram, Keypair, PublicKey } = anchor.web3;
const REWARD_TOKEN = 'GnBw4qZs3maF2d5ziQmGzquQFnGV33NUcEujTQ3CbzP3';

const wallets = ["DCTsNEGvVzw7USmCbsKk6hxP8KnuVtnJx8dR9efJzRyz", "25Krheds8cwMam9TmwJkkXW5yRKW37oLNLYz1rfHFdgU", "CSkw6KtE1uArvMPWD9PVmfLz55zSrEVpeuviPWizMwf7", "eiAVfLB3RsUJyZr8wj3UE47mmXK13EcnAA18doCVjxR", "BStTG8Y2LjRUUdZgYvYyATcwPgZdeK22sE11yv1bAPNU", "DuQYWijgfS2wsymACUphE6RexkWiN5HfMQq5YPrcTXTw", "7km8mQ5rTYMinVUUPhoR2CtBReZthhB1wHLn8haJm8XA", "Eo5GK5nuD6gh6V8Kb4T5PLe2g67mZFu1oE1KSxj2xkD7"];

module.exports = async function (provider) {
  // Configure client to use the provider.
  anchor.setProvider(provider);
  const program = anchor.workspace.Airdrop;
  // let [vaultPDA, bump_vault] = await anchor.web3.PublicKey.findProgramAddress(
  //   [Buffer.from('rewards vault')],
  //   program.programId
  // );

  // const aTokenAccount = new Keypair();
  // const aTokenAccountRent = await provider.connection.getMinimumBalanceForRentExemption(
  //   AccountLayout.span
  // )

  // console.log('programId', program.programId.toString());
  // console.log('vaultPda', vaultPDA.toString());
  // console.log('tokenAccount', aTokenAccount.publicKey.toString());

  // const tx = await program.rpc.initialize(
  //   bump_vault, {
  //   accounts: {
  //     vault: vaultPDA,
  //     admin: provider.wallet.publicKey,
  //     systemProgram: SystemProgram.programId
  //   },
  //   signers: [aTokenAccount],
  //   instructions: [
  //     SystemProgram.createAccount({
  //       fromPubkey: provider.wallet.publicKey,
  //       newAccountPubkey: aTokenAccount.publicKey,
  //       lamports: aTokenAccountRent,
  //       space: AccountLayout.span,
  //       programId: TOKEN_PROGRAM_ID
  //     }),
  //     Token.createInitAccountInstruction(
  //       TOKEN_PROGRAM_ID,
  //       new PublicKey(REWARD_TOKEN),
  //       aTokenAccount.publicKey,
  //       vaultPDA
  //     )
  //   ]
  // }
  // );
  // console.log('migration tx', tx);

  wallets.map(async (_wallet, _index) => {
    let [whitelistData, bump_whitelist_data] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from('whitelist data'), new PublicKey(_wallet).toBuffer()],
      program.programId
    );

    try {
      const data = await program.account.whitelistData.fetch(whitelistData);
      const user = data.user;
    }
    catch (err) {
      console.log('whitelistData', whitelistData.toString());

      let tx = await program.rpc.createWhitelistData(
        bump_whitelist_data,
        {
          accounts: {
            whitelistData: whitelistData,
            admin: provider.wallet.publicKey,
            user: new PublicKey(_wallet),
            systemProgram: SystemProgram.programId
          }
        }
      );

      console.log('whitelist tx', tx);
    }
  })
}
