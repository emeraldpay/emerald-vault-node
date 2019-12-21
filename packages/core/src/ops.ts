import {
    AccountId,
    EthereumAccount,
    extractAccountInternalId,
    extractWalletId, isAccountId,
    isEthereumAccount,
    Uuid,
    Wallet,
    WalletAccount
} from "./types";

export class WalletsOp {
    readonly value: Wallet[];
    readonly size: number;

    constructor(value: Wallet[]) {
        this.value = value || [];
        this.size = this.value.length;
    }

    static of(wallets: Wallet[]): WalletsOp {
        return new WalletsOp(wallets)
    }

    getWallet(id: Uuid): WalletOp {
        let wallet = this.value.find((w) => w.id === id);
        if (wallet) {
            return WalletOp.of(wallet)
        }
        throw new Error(`No wallet with id: ${id}`)
    }

    findWalletByAccount(id: AccountId): WalletOp | undefined {
        let walletId = extractWalletId(id);
        try {
            let wallet = this.getWallet(walletId);
            if (wallet.value.accounts.some((account) => account.id == id)) {
                return wallet
            } else {
                return undefined
            }
        } catch (e) {
            return undefined;
        }
    }

    findAccount(id: AccountId): EthereumAccount | undefined {
        return this.getAccounts().find((account) => account.id == id)
    }

    getWallets(): WalletOp[] {
        return this.value.map((w) => WalletOp.of(w))
    }

    getAccounts(): EthereumAccount[] {
        let result = [];
        this.value.forEach((wallet) =>
            (wallet.accounts || [])
                .filter((account) => isEthereumAccount(account))
                .forEach((account) => result.push(account))
        );
        return result
    }

    findWalletByAddress(address: string, blockchain?: number): WalletOp | undefined {
        address = address.toLowerCase();
        let wallet = this.value.find((wallet) =>
            (wallet.accounts || []).some((a) =>
                isEthereumAccount(a)
                && a.address.toLowerCase() === address
                && (typeof blockchain === 'undefined' || a.blockchain === blockchain)
            )
        );
        if (wallet) {
            return WalletOp.of(wallet)
        }
        return undefined
    }

    walletsWithBlockchain(blockchain: number): WalletOp[] {
        return this.value
            .map((wallet) => WalletOp.of(wallet))
            .filter((wallet) => wallet.hasBlockchain(blockchain))
    }

    accountsByBlockchain(blockchain: number): EthereumAccount[] {
        let result = [];
        this.value
            .forEach((w) =>
                (w.accounts || [])
                    .filter((acc) => acc.blockchain === blockchain)
                    .forEach((acc) => result.push(acc as EthereumAccount))
            );
        return result
    }
}

export class WalletOp {
    readonly value: Wallet;

    constructor(value: Wallet) {
        this.value = value;
        this.value.accounts = this.value.accounts || [];
    }

    static of(wallet: Wallet): WalletOp {
        return new WalletOp(wallet);
    }

    getEthereumAccounts(): EthereumAccount[] {
        let accounts = this.value.accounts.filter((a) => isEthereumAccount(a));
        return accounts as EthereumAccount[];
    }

    findAccountByAddress(address: string, blockchain?: number): WalletAccount | undefined {
        return this.value.accounts.find((a) =>
            isEthereumAccount(a)
                && a.address === address
                && (typeof blockchain === 'undefined' || a.blockchain === blockchain)
        );
    }

    accountsByBlockchain(blockchain: number): EthereumAccount[] {
        let result = [];
        this.value.accounts
                    .filter((acc) => acc.blockchain === blockchain)
                    .forEach((acc) => result.push(acc as EthereumAccount));
        return result
    }

    hasBlockchain(blockchain: number): boolean {
        return this.value.accounts.some((account) => account.blockchain === blockchain)
    }
}

export class AccountIdOp {
    readonly value: AccountId;

    constructor(value: string) {
        this.value = value;
    }

    static create(walletId: Uuid, accountId: number): AccountIdOp {
        return new AccountIdOp(`${walletId}-${accountId}`)
    }

    static of(value: AccountId): AccountIdOp {
        if (!isAccountId(value)) {
            throw new Error("Not account id: " + value);
        }
        return new AccountIdOp(value);
    }

    extractWalletId(): Uuid {
        return extractWalletId(this.value)
    }

    extractAccountInternalId(): number {
        return extractAccountInternalId(this.value)
    }
}