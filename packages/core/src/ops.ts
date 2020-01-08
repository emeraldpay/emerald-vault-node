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

/**
 * Operations over list of wallets
 */
export class WalletsOp {
    readonly value: Wallet[];
    readonly size: number;
    private readonly kind = "emerald.WalletsOp";

    constructor(value: Wallet[]) {
        this.value = value || [];
        this.size = this.value.length;
    }

    /**
     * Create instance
     *
     * @param wallets source wallets
     */
    static of(wallets: Wallet[]): WalletsOp {
        return new WalletsOp(wallets)
    }

    /**
     * Verify if argument is a WalletsOp instance
     *
     * @param value
     */
    static isOp(value: Wallet[] | WalletsOp): value is WalletsOp {
        return typeof value === 'object'
            && value !== null
            && Object.entries(value).some((a) => a[0] === 'kind' && a[1] === "emerald.WalletsOp")
    }

    /**
     * Returns a WalletsOp for specified argument. If it's already an Op then return itself, or if it's a structure, then creates new WalletsOp for it.
     *
     * @param value
     */
    static asOp(value: Wallet[] | WalletsOp): WalletsOp {
        if (WalletsOp.isOp(value)) {
            return value
        }
        return WalletsOp.of(value)
    }

    /**
     * Return wallet for the specified id
     *
     * @param id
     * @throws error if wallet with such id doesn't exist
     */
    getWallet(id: Uuid): WalletOp {
        let wallet = this.value.find((w) => w.id === id);
        if (wallet) {
            return WalletOp.of(wallet)
        }
        throw new Error(`No wallet with id: ${id}`)
    }

    /**
     * Find wallet by specified account id
     *
     * @param id
     * @return wallet OR undefined if no wallet with such account found
     */
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

    /**
     * Find account with the specified id
     *
     * @param id
     * @return account OR undefined if not found
     */
    findAccount(id: AccountId): EthereumAccount | undefined {
        return this.getAccounts().find((account) => account.id == id)
    }

    /**
     * @return list of WalletOp for all current wallets
     */
    getWallets(): WalletOp[] {
        return this.value.map((w) => WalletOp.of(w))
    }

    /**
     * @return all accounts in the current list
     */
    getAccounts(): EthereumAccount[] {
        let result = [];
        this.value.forEach((wallet) =>
            (wallet.accounts || [])
                .filter((account) => isEthereumAccount(account))
                .forEach((account) => result.push(account))
        );
        return result
    }

    /**
     * Find first wallet that contains specified address
     *
     * @param address
     * @param blockchain (optional) blockchain for the address
     */
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

    /**
     * Find all wallets with the specified blockchain
     *
     * @param blockchain
     */
    walletsWithBlockchain(blockchain: number): WalletOp[] {
        return this.value
            .map((wallet) => WalletOp.of(wallet))
            .filter((wallet) => wallet.hasBlockchain(blockchain))
    }

    /**
     * Finds all accounts cross all wallets for the specified blockchain
     * @param blockchain
     */
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

/**
 * Operations for a single wallet
 */
export class WalletOp {
    readonly value: Wallet;
    private readonly kind = "emerald.WalletOp";

    constructor(value: Wallet) {
        this.value = value;
        this.value.accounts = this.value.accounts || [];
    }

    /**
     * Create new instance of WalletOp
     * @param wallet
     */
    static of(wallet: Wallet): WalletOp {
        return new WalletOp(wallet);
    }

    /**
     * Verify if argument is a WalletOp instance
     *
     * @param value
     */
    static isOp(value: Wallet | WalletOp): value is WalletOp {
        return typeof value === 'object'
            && value !== null
            && Object.entries(value).some((a) => a[0] === 'kind' && a[1] === "emerald.WalletOp")
    }

    /**
     * Returns a WalletOp for specified argument. If it's already an Op then return itself, or if it's a structure, then creates new WalletOp for it.
     *
     * @param value
     */
    static asOp(value: Wallet | WalletOp): WalletOp {
        if (WalletOp.isOp(value)) {
            return value
        }
        return WalletOp.of(value)
    }

    /**
     * Return all Ethereum-type of accounts in that wallet
     */
    getEthereumAccounts(): EthereumAccount[] {
        let accounts = this.value.accounts.filter((a) => isEthereumAccount(a));
        return accounts as EthereumAccount[];
    }

    /**
     * Find a first account with specified address
     *
     * @param address
     * @param blockchain (optional)
     */
    findAccountByAddress(address: string, blockchain?: number): WalletAccount | undefined {
        return this.value.accounts.find((a) =>
            isEthereumAccount(a)
                && a.address === address
                && (typeof blockchain === 'undefined' || a.blockchain === blockchain)
        );
    }

    /**
     *
     * @param blockchain
     * @return all accounts in the wallet for the specified blockchain
     */
    accountsByBlockchain(blockchain: number): EthereumAccount[] {
        let result = [];
        this.value.accounts
                    .filter((acc) => acc.blockchain === blockchain)
                    .forEach((acc) => result.push(acc as EthereumAccount));
        return result
    }

    /**
     *
     * @param blockchain
     * @return true if at least one of the accounts is for specified blockchain
     */
    hasBlockchain(blockchain: number): boolean {
        return this.value.accounts.some((account) => account.blockchain === blockchain)
    }
}

/**
 * Operations over AccountId
 */
export class AccountIdOp {
    readonly value: AccountId;
    private readonly kind = "emerald.AccountIdOp";

    constructor(value: string) {
        this.value = value;
    }

    /**
     * Create new for the wallet and account
     *
     * @param walletId
     * @param accountId account index (numeric)
     */
    static create(walletId: Uuid, accountId: number): AccountIdOp {
        return new AccountIdOp(`${walletId}-${accountId}`)
    }

    /**
     * Create new AccountIdOp instance for the specified full id
     *
     * @param value
     * @throws error if argument is not a valid full account id (UUID-NUM format)
     */
    static of(value: AccountId): AccountIdOp {
        if (!isAccountId(value)) {
            throw new Error("Not account id: " + value);
        }
        return new AccountIdOp(value);
    }

    /**
     * Check if passed argument is AccountIdOp
     *
     * @param value
     */
    static isOp(value: AccountId | string | AccountIdOp): value is AccountIdOp {
        return typeof value === 'object'
            && value !== null
            && Object.entries(value).some((a) => a[0] === 'kind' && a[1] === "emerald.AccountIdOp")
    }

    /**
     * Returns a AccountIdOp for specified argument. If it's already an Op then return itself, or if it's a string, then creates new AccountIdOp for it.
     *
     * @param value
     */
    static asOp(value: AccountId | AccountIdOp): AccountIdOp {
        if (AccountIdOp.isOp(value)) {
            return value
        }
        return AccountIdOp.of(value)
    }

    /**
     * @return wallet id (UUID)
     */
    extractWalletId(): Uuid {
        return extractWalletId(this.value)
    }

    /**
     * @return account index (number)
     */
    extractAccountInternalId(): number {
        return extractAccountInternalId(this.value)
    }
}