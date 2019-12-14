import {EthereumAccount, isEthereumAccount, Uuid, Wallet, WalletAccount} from "./types";

export function getEthereumAccounts(wallet: Wallet): EthereumAccount[] {
    let accs = wallet.accounts.filter((a) => isEthereumAccount(a));
    return accs as EthereumAccount[];
}

export function findAccount(wallet: Wallet, address: string): WalletAccount | undefined {
    return wallet.accounts.find((a) => {
        if (isEthereumAccount(a)) {
            return a.address === address;
        }
        return false
    });
}

export function getWallet(wallets: Wallet[], id: Uuid): Wallet | undefined {
    return wallets.find((w) => w.id == id)
}

export function findWalletByAddress(wallets: Wallet[], address: string): Wallet | undefined {
    return wallets.find((wallet) =>
        wallet.accounts.some((a) => isEthereumAccount(a) && a.address === address)
    )
}

export function accountsByBlockchain(wallets: Wallet[], blockchain: number): EthereumAccount[] {
    let result = [];
    wallets
        .forEach((w) =>
            w.accounts
                .filter((acc) => acc.blockchain === blockchain)
                .forEach((acc) => result.push(acc as EthereumAccount))
        );
    return result
}