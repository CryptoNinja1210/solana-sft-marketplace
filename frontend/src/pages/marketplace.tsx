import React, { useEffect, useState } from 'react'
import * as anchor from '@project-serum/anchor'
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import axios from 'axios'
import {
  getParsedNftAccountsByOwner,
} from "@nfteyez/sol-rayz";

import CONFIG from '../config';
import { getProvider, makeATokenAccountTransaction } from '../utils/helper';
import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { sendTransactions, SequenceType } from '../helpers/sol/connection';
import { useToasts } from 'react-toast-notifications';
import { REWARD_TOKEN_DECIMAL } from '../config/dev';
import { useNavigate } from "react-router-dom";

const IDL = require('../constants/IDL/index.json');

const { PROGRAM_ID, REWARD_TOKEN, ADMIN_KEY } = CONFIG;

const Marketplace: React.FC = () => {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToasts();  
  const [ amount, setAmount ] = useState(1)
  const navigate = useNavigate();

  const fetch = async () => {
    setLoading(true);
    const provider = getProvider(connection, wallet!);
    const program = new anchor.Program(IDL, new PublicKey(PROGRAM_ID), provider);

    let [vaultPDA] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from('rewards vault')],
      program.programId
    );
    
    let nftArray = await getParsedNftAccountsByOwner({
      publicAddress: vaultPDA.toString(),
      connection: connection
    });
    console.log('nftArray', nftArray, 'vault', vaultPDA.toString());
    let k: any[] = []
    for (let i = 0; i < nftArray.length; i ++) {
      let nft = nftArray[i];
      let [listNftPDA] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from('list nft'), new PublicKey(nft.mint).toBuffer()],
        program.programId
      );
      
      const listNftInfo = await connection.getAccountInfo(listNftPDA);
      if (!listNftInfo) {
        continue;
      }
      let listNFtData: any = null;
      try {
        listNFtData = await program.account.listNft.fetch(listNftPDA);

      } catch(e) {
        console.log(e)
      }
      console.log(listNFtData)
      axios.get(nft.data.uri)
      .then(res => {
        k.push({...res.data, ...nft, owner: listNFtData.owner, price:  listNFtData?.price.toNumber() / 10**6, amount: listNFtData?.amount.toNumber() })
        setList([...k])
      })
      .catch(e => {
        console.log(e.message)
      })
    }
    setLoading(false);
  }
  
  useEffect(() => {
    if (!wallet) {
      addToast("Please connect wallet", {
        appearance: 'warning',
        autoDismiss: true,
      })
    } else {
      fetch();
    }

    // eslint-disable-next-line
  }, [wallet])

  const handleBuy = async (nft: any) => {
    setLoading(true);
    try {
      let instructionSet: any[] = [], signerSet: any[] = [];
      let instructions: any[] = [], signers: any[] = [];
      
      const provider = getProvider(connection, wallet!);
      const program = new anchor.Program(IDL, new PublicKey(PROGRAM_ID), provider);
  
      let [vaultPDA] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from('rewards vault')],
        program.programId
      );
  
      let [listNftPDA] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from('list nft'), new PublicKey(nft.mint).toBuffer()],
        program.programId
      );
  
      const nftFromTx = await makeATokenAccountTransaction(connection, wallet!.publicKey, vaultPDA, new PublicKey(nft.mint));
      if (nftFromTx.instructions.length > 0) {
        return;
      }
      const nftToAtaTx = await makeATokenAccountTransaction(connection, wallet!.publicKey, wallet!.publicKey, new PublicKey(nft.mint));
      
      instructions = [...instructions, ...nftToAtaTx.instructions];
      signers= [...signers, ...nftToAtaTx.signers];
      const tokenFromTx = await makeATokenAccountTransaction(connection, wallet!.publicKey, wallet!.publicKey, new PublicKey(REWARD_TOKEN));
      if (tokenFromTx.instructions.length > 0) {
        return;
      }
      const tokenToAtaTx = await makeATokenAccountTransaction(connection, wallet!.publicKey, nft.owner, new PublicKey(REWARD_TOKEN));
      instructions = [...instructions, ...tokenToAtaTx.instructions];
      signers= [...signers, ...tokenToAtaTx.signers];
      instructions.push(program.instruction.buy(amount, {
        accounts: {
          vault: vaultPDA,
          listNft: listNftPDA,
          buyer: wallet!.publicKey,
          mint: new PublicKey(nft.mint),
          nftFrom: nftFromTx.tokenTo,
          nftTo: nftToAtaTx.tokenTo,
          tokenFrom: tokenFromTx.tokenTo,
          tokenTo: tokenToAtaTx.tokenTo,
          tokenMint: new PublicKey(REWARD_TOKEN),
          tokenProgram: TOKEN_PROGRAM_ID
        }
      }));
      
      instructionSet.push(instructions);
      signerSet.push(signers);
      await sendTransactions(connection, wallet, instructionSet, signerSet, SequenceType.StopOnFailure);
      let newList = list.filter((item) => item.mint !== nft.mint);
      setList(state => {
        let k = [...state]
        k.map((item: any) => {
          if(item.nft === nft.mint) item.amount -= amount
        })
        return [...k]
      } );
      addToast("Buy success!", {
        appearance: 'success',
        autoDismiss: true,
      })
    }
    catch (error) {
      console.log('error', error);
      addToast("Buy error!", {
        appearance: 'error',
        autoDismiss: true,
      })
    }
    setLoading(false);
  }

  return (
    <div className='market'>
      {
        list.map( item => (
          <div className='card'>
            <img src={item.image} alt="nft"/>
            <section>
              <span>{item.data.name} / {item.amount}</span>
              <span>{item.price} USDC</span>
              <span>Owner: {item.owner.toBase58()}</span>
              <span>
                <input 
                  type='number'
                  value={amount}
                  onChange={e => setAmount(parseInt(e.target.value))}/>
              </span>
            </section>
            <footer>
              <button className='btn' onClick={() => handleBuy(item)}>buy</button>
            </footer>
          </div>
        ))
      }
      {
        loading &&
        <div id='preloader'></div>
      }
    </div>
  )
}

export default Marketplace