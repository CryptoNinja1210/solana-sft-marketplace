// @ts-nocheck
import React, { useEffect, useState } from 'react'
import { Outlet, Link } from "react-router-dom";
import {
  WalletMultiButton
} from '@solana/wallet-adapter-react-ui';

const TodoList: React.FC = () => {
  return (
    <div className='App'>
      <nav>
        <Link to="/">Marketplace</Link>
        <Link to="/list">List NFTS</Link>
        <span className='flex-grow' />
        <WalletMultiButton /> 
      </nav>        
      <Outlet />
    </div>
  )
}

export default TodoList