use anchor_lang::prelude::*;
use anchor_spl::token::{self, TokenAccount, Token, Mint};
use anchor_lang::solana_program::{entrypoint::{ProgramResult}};

use crate::constants::*;
declare_id!("5jKk2meTu2FJeXAQHec6eZumRpjuuqr4pM9AVDayf2q3");

mod constants {
    use anchor_lang::prelude::Pubkey;

    pub const REWARD_TOKEN: Pubkey = anchor_lang::solana_program::pubkey!("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

    pub const DECIMAL: u64 = 1000000;
}

#[program]
pub mod airdrop {
    use anchor_lang::AccountsClose;

    use super::*;

    pub fn initialize(ctx: Context<InitializeContext>, bump: u8) -> ProgramResult {
        let vault = &mut ctx.accounts.vault;
        vault.bump = bump;
        vault.total_count = 0;
        Ok(())
    }
    pub fn create_list(ctx: Context<CreateListContext>, price_high: u32, price_low: u32, amount: u32, bump: u8) -> ProgramResult {
        let list_nft = &mut ctx.accounts.list_nft;
        let price: u64 = price_high as u64 * DECIMAL + price_low as u64;
        let count = amount as u64;

        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.nft_from.to_account_info(),
                to: ctx.accounts.nft_to.to_account_info(),
                authority: ctx.accounts.admin.to_account_info()
            }
        );

        token::transfer(cpi_ctx, count)?;
        list_nft.price = price;
        list_nft.amount = count;
        list_nft.owner = ctx.accounts.admin.to_account_info().key();
        list_nft.address = ctx.accounts.mint.to_account_info().key();
        Ok(())
    }
    pub fn list(ctx: Context<ListContext>, price_high: u32, price_low: u32, amount: u32, bump: u8) -> ProgramResult {
        msg!("+ init_list");
        let list_nft = &mut ctx.accounts.list_nft;
        let price: u64 = price_high as u64 * DECIMAL + price_low as u64;
        let count = amount as u64;

        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.nft_from.to_account_info(),
                to: ctx.accounts.nft_to.to_account_info(),
                authority: ctx.accounts.admin.to_account_info()
            }
        );

        token::transfer(cpi_ctx, count)?;
        list_nft.owner = ctx.accounts.admin.to_account_info().key();
        list_nft.amount = list_nft.amount + count;
        Ok(())
    }

    pub fn buy(ctx: Context<BuyContext>, amount: u32) -> ProgramResult {
        let vault = &ctx.accounts.vault;
        let list_nft = &mut ctx.accounts.list_nft;
        let primary = list_nft.amount;

        let count = amount as u64;

        let vault_seeds = &[
            b"rewards vault".as_ref(),
            &[vault.bump],
        ];

        let vault_signer = &[&vault_seeds[..]];
        let mut cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.nft_from.to_account_info(),
                to: ctx.accounts.nft_to.to_account_info(),
                authority: ctx.accounts.vault.to_account_info()
            },
            vault_signer
        );

        token::transfer(cpi_ctx, count)?;

        cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.token_from.to_account_info(),
                to: ctx.accounts.token_to.to_account_info(),
                authority: ctx.accounts.buyer.to_account_info()
            }
        );

        token::transfer(cpi_ctx, list_nft.price * count)?;

        list_nft.amount = primary - count;

        // ctx.accounts.list_nft.close(ctx.accounts.admin.to_account_info())?;

        Ok(())
    }
}
#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct InitializeContext<'info> {
    #[account(init, seeds = [b"rewards vault".as_ref()], bump, space = 8 + 1 + 4, payer = admin)]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct CreateListContext<'info> {
    #[account(init, seeds = [b"list nft".as_ref(), mint.key().as_ref()], bump, space = 8 + 32 + 32 +  8 + 8 + 1, payer = admin)]
    pub list_nft: Account<'info, ListNft>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub vault: Account<'info, Vault>,
    pub mint: Account<'info, Mint>,
    #[account(mut, constraint = nft_from.owner == admin.key() && nft_from.mint == mint.key())]
    pub nft_from: Account<'info, TokenAccount>,
    #[account(mut, constraint = nft_to.owner == vault.key() && nft_to.mint == mint.key())]
    pub nft_to: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct ListContext<'info> {
    #[account(mut, constraint = list_nft.address == mint.key())]
    pub list_nft: Account<'info, ListNft>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub vault: Account<'info, Vault>,
    pub mint: Account<'info, Mint>,
    #[account(mut, constraint = nft_from.owner == admin.key() && nft_from.mint == mint.key())]
    pub nft_from: Account<'info, TokenAccount>,
    #[account(mut, constraint = nft_to.owner == vault.key() && nft_to.mint == mint.key())]
    pub nft_to: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
pub struct BuyContext<'info> {
    vault: Account<'info, Vault>,
    #[account(mut, constraint = list_nft.address == mint.key())]
    pub list_nft: Account<'info, ListNft>,
    pub buyer: Signer<'info>,
    pub mint: Account<'info, Mint>,
    /// CHECK: it's not dangerous
    #[account(mut, constraint = nft_from.owner == vault.key() && nft_from.mint == mint.key())]
    pub nft_from: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = nft_to.owner == buyer.key() && nft_to.mint == mint.key())]
    pub nft_to: Box<Account<'info, TokenAccount>>,
    pub token_mint: Box<Account<'info, Mint>>,
    #[account(mut, constraint = token_from.owner == buyer.key() && token_from.mint == token_mint.key())]
    pub token_from: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = token_to.mint == token_mint.key())]
    pub token_to: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>
}

#[account]
pub struct Vault {
    pub bump: u8,
    pub total_count: u32
}

#[account]
pub struct ListNft {
    pub address: Pubkey,
    pub owner: Pubkey,
    pub price: u64,
    pub amount: u64,
    pub bump: u8
}