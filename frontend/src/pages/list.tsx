import React, { useEffect, useState } from 'react'
import * as anchor from '@project-serum/anchor'
import axios from "axios"
import {
  getParsedNftAccountsByOwner,
} from "@nfteyez/sol-rayz";
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, getAccount } from '@solana/spl-token';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { useToasts } from 'react-toast-notifications';
import { useNavigate } from "react-router-dom";

import CONFIG from '../config';
import { getProvider, makeATokenAccountTransaction } from '../utils/helper';
import { sendTransactions, SequenceType } from '../helpers/sol/connection';
const IDL = require('../constants/IDL/index.json');
const { PROGRAM_ID, REWARD_TOKEN_DECIMAL } = CONFIG;

const List: React.FC = () => {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [collection, setCollection] = useState<any[]>([])
  const [loading, setLoading] = useState(false);
  const provider = getProvider(connection, wallet!);
  const [ amount, setAmount ] = useState(1)
  const program = new anchor.Program(IDL, new PublicKey(PROGRAM_ID), provider);
  const { addToast } = useToasts();
  const navigate = useNavigate();

  const fetch = async () => {
    setLoading(true)
    let walletNftArray = await getParsedNftAccountsByOwner({
      publicAddress: wallet!.publicKey.toString(),
      connection
    });

    console.log(walletNftArray)
    let k: any[] = [] 

    walletNftArray.forEach( item => {
      axios.get(item.data.uri)
      .then(res => {
        k.push({...res.data, ...item, listed: false})
        setCollection([...k])
      })
      .catch(e => {
        console.log(e.message)
      })
    })
    setLoading(false);
}
  useEffect(() => {
    if (!wallet) {
      addToast("Please connect the wallet!", {
        appearance: 'warning',
        autoDismiss: true,
      })
    } else {
      fetch()
    }

    
    // eslint-disable-next-line
  }, [wallet])

  const handleChangePrice = async (index: number, value: number) => {
    let newCollection = collection.map((item, key) => key === index ? ({
      ...item,
      price: value
    }): item);

    setCollection([...newCollection]);
  }

  const handleConfirm = async (nft: any) => {
    try {
      console.log(nft)
      if(nft.data.creators[2].address !== wallet?.publicKey.toBase58()) {
        addToast("You can only list Wooden Nickel minted by you!", {
          appearance: 'warning',
          autoDismiss: true,
        })
        return
      }
      setLoading(true);
      let instructionSet: any[] = [], signerSet: any[] = [];
      let instructions: any[] = [], signers: any[] = [];

      const provider = getProvider(connection, wallet!);
      const program = new anchor.Program(IDL, new PublicKey(PROGRAM_ID), provider);
  
      let priceHigh = 0;
      let priceLow = 0.001 * REWARD_TOKEN_DECIMAL;
      console.log(priceLow)
  
      console.log('nft', nft);
      let [vaultPDA] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from('rewards vault')],
        program.programId
      );
  
      let [listNftPDA, bump] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from('list nft'), new PublicKey(nft.mint).toBuffer()],
        program.programId
      );
      const holderPdaInfo = await connection.getAccountInfo(listNftPDA);
      const nftFrom = await getAssociatedTokenAddress(new PublicKey(nft.mint), wallet!.publicKey!);
      const nftToAtaTx = await makeATokenAccountTransaction(connection, wallet!.publicKey, new PublicKey(vaultPDA), new PublicKey(nft.mint));
      
      if (nftToAtaTx.instructions.length > 0) {
        instructions = nftToAtaTx.instructions;
        signers = nftToAtaTx.signers;
      }
      console.log(amount)
      if (!holderPdaInfo) {
        console.log("no exist")
        instructions.push(program.instruction.createList(priceHigh, priceLow, amount, bump, {
          accounts: {
            listNft: listNftPDA,
            admin: new PublicKey(wallet!.publicKey),
            vault: vaultPDA,
            mint: new PublicKey(nft.mint),
            nftFrom: nftFrom,
            nftTo: nftToAtaTx.tokenTo,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId
          }
        }));
      } else {
        instructions.push(
          program.instruction.list(priceHigh, priceLow, amount, bump, {
            accounts: {
              listNft: listNftPDA,
              admin: new PublicKey(wallet!.publicKey),
              vault: vaultPDA,
              mint: new PublicKey(nft.mint),
              nftFrom: nftFrom,
              nftTo: nftToAtaTx.tokenTo,
              tokenProgram: TOKEN_PROGRAM_ID,
              systemProgram: SystemProgram.programId
            }
          })
        );
      }
      instructionSet.push(instructions);
      console.log(instructionSet)
      signerSet.push(signers);
      await sendTransactions(connection, wallet, instructionSet, signerSet, SequenceType.StopOnFailure);

      addToast("Listing success!", {
        appearance: 'success',
        autoDismiss: true,
      })
    }
    catch (error) {
      console.log('error', error);
      addToast("Listing fail!", {
        appearance: 'success',
        autoDismiss: true,
      })
    }
    setLoading(false);
  }

  return (
    <div className='market'>
      {
        collection.map( (item, key) => (
          <div className='card' key={key}>
            <img src={item.image} alt="nft"/>
            <section>
              <p>{item.data.name}</p>
              <span>
                <input 
                  type='number'
                  value={amount}
                  onChange={e => setAmount(parseInt(e.target.value))}/>
              </span>
            </section>
            <footer>
              <button className='btn' onClick={() => handleConfirm(item)}>
                List
              </button>
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

export default List
