import {EthereumAccount, isEthereumAccount, Uuid, Wallet, WalletAccount} from "./types";

export function getEthereumAccounts(wallet: Wallet): EthereumAccount[] {
    let accs = wallet.accounts.filter((a) => isEthereumAccount(a));
    return accs as EthereumAccount[];
}

export function findAccount(wallet: Wallet, address: string): WalletAccount | undefined {
    return this.wallet.accounts.find((a) => {
        if (isEthereumAccount(a)) {
            return a.address === address;
        }
        return false
    });
}

export function getWallet(wallets: Wallet[], id: Uuid): Wallet | undefined {
    return wallets.find((w) => w.id == id)
}