import {EthereumAccount, isEthereumAccount, Uuid, Wallet, WalletAccount} from "./types";

function getEthereumAccounts(wallet: Wallet): EthereumAccount[] {
    let accs = wallet.accounts.filter((a) => isEthereumAccount(a));
    return accs as EthereumAccount[];
}

function findAccount(wallet: Wallet, address: string): WalletAccount | undefined {
    return wallet.accounts.find((a) => {
        if (isEthereumAccount(a)) {
            return a.address === address;
        }
        return false
    });
}

function getWallet(wallets: Wallet[], id: Uuid): Wallet | undefined {
    return wallets.find((w) => w.id == id)
}

function findWalletByAddress(wallets: Wallet[], address: string): Wallet | undefined {
    address = address.toLowerCase();
    return wallets.find((wallet) =>
        wallet.accounts.some((a) => isEthereumAccount(a) && a.address.toLowerCase() === address)
    )
}

function findAccountByAddress(wallets: Wallet[], address: string): WalletAccount | undefined {
    address = address.toLowerCase();
    let wallet = findWalletByAddress(wallets, address);
    if (wallet) {
        return wallet.accounts.find((a) => (a as EthereumAccount).address.toLowerCase() == address);
    }
    return undefined;
}

function accountsByBlockchain(wallets: Wallet[], blockchain: number): EthereumAccount[] {
    let result = [];
    wallets
        .forEach((w) =>
            w.accounts
                .filter((acc) => acc.blockchain === blockchain)
                .forEach((acc) => result.push(acc as EthereumAccount))
        );
    return result
}

export const VaultSelectors = {
    getEthereumAccounts,
    findAccount,
    getWallet,
    findWalletByAddress,
    findAccountByAddress,
    accountsByBlockchain
};