import * as anchor from '@project-serum/anchor';
import { AnchorWallet } from '@solana/wallet-adapter-react';
import { AccountLayout, TOKEN_PROGRAM_ID, createInitializeAccountInstruction } from '@solana/spl-token';

export const getProvider = (connection: anchor.web3.Connection, wallet: AnchorWallet ) => {
  return new anchor.AnchorProvider(connection, wallet, 'confirmed' as anchor.web3.ConfirmOptions);
}

export const makeATokenAccountTransaction = async (connection: anchor.web3.Connection, wallet: anchor.web3.PublicKey, owner: anchor.web3.PublicKey, mint: anchor.web3.PublicKey) => {
  const { SystemProgram, Keypair } = anchor.web3;
  const instructions = [], signers = [];
  const aTokenAccounts = await connection.getParsedTokenAccountsByOwner(owner, { mint: mint });
  const rent = await connection.getMinimumBalanceForRentExemption(
      AccountLayout.span
  )
  let tokenTo;
  if (aTokenAccounts.value.length === 0) {
    const aTokenAccount = new Keypair();
    instructions.push(SystemProgram.createAccount({
      fromPubkey: wallet,
      newAccountPubkey: aTokenAccount.publicKey,
      lamports: rent,
      space: AccountLayout.span,
      programId: TOKEN_PROGRAM_ID
    }));
    instructions.push(createInitializeAccountInstruction(
      aTokenAccount.publicKey,
      mint,
      owner,
      TOKEN_PROGRAM_ID
    ));
    signers.push(aTokenAccount);
    tokenTo = aTokenAccount.publicKey;
  }
  else {
    tokenTo = aTokenAccounts.value[0].pubkey;
  }

  return { instructions, signers, tokenTo }
}