import {
    EntryId,
    EthereumEntry,
    extractEntryInternalId,
    extractWalletId, getAccountId, HDPathAccount, HDPathAccounts, isEntryId,
    isEthereumEntry, isSeedPkRef,
    Uuid,
    Wallet,
    WalletEntry
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
     * Find wallet by specified entry id
     *
     * @param id
     * @return wallet OR undefined if no wallet with such entry found
     */
    findWalletByEntry(id: EntryId): WalletOp | undefined {
        let walletId = extractWalletId(id);
        try {
            let wallet = this.getWallet(walletId);
            if (wallet.value.entries.some((entry) => entry.id == id)) {
                return wallet
            } else {
                return undefined
            }
        } catch (e) {
            return undefined;
        }
    }

    /**
     * Find entry with the specified id
     *
     * @param id
     * @return entry OR undefined if not found
     */
    findEntry(id: EntryId): EthereumEntry | undefined {
        return this.getEntries().find((entry) => entry.id == id)
    }

    /**
     * @return list of WalletOp for all current wallets
     */
    getWallets(): WalletOp[] {
        return this.value.map((w) => WalletOp.of(w))
    }

    /**
     * @return all entries in the current list
     */
    getEntries(): EthereumEntry[] {
        let result = [];
        this.value.forEach((wallet) =>
            (wallet.entries || [])
                .filter((entry) => isEthereumEntry(entry))
                .forEach((entry) => result.push(entry))
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
            (wallet.entries || []).some((a) =>
                isEthereumEntry(a)
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
     * Finds all entries cross all wallets for the specified blockchain
     * @param blockchain
     */
    entriesByBlockchain(blockchain: number): EthereumEntry[] {
        let result = [];
        this.value
            .forEach((w) =>
                (w.entries || [])
                    .filter((entry) => entry.blockchain === blockchain)
                    .forEach((entry) => result.push(entry as EthereumEntry))
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
        this.value.entries = this.value.entries || [];
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
     * Return all Ethereum-type of entries in that wallet
     */
    getEthereumEntries(): EthereumEntry[] {
        let entries = this.value.entries.filter((e) => isEthereumEntry(e));
        return entries as EthereumEntry[];
    }

    /**
     * Find a first entry with specified address
     *
     * @param address
     * @param blockchain (optional)
     */
    findEntryByAddress(address: string, blockchain?: number): WalletEntry | undefined {
        return this.value.entries.find((e) =>
            isEthereumEntry(e)
            && e.address === address
            && (typeof blockchain === 'undefined' || e.blockchain === blockchain)
        );
    }

    /**
     *
     * @param blockchain
     * @return all entries in the wallet for the specified blockchain
     */
    entriesByBlockchain(blockchain: number): EthereumEntry[] {
        let result = [];
        this.value.entries
            .filter((entry) => entry.blockchain === blockchain)
            .forEach((entry) => result.push(entry as EthereumEntry));
        return result
    }

    /**
     *
     * @param blockchain
     * @return true if at least one of the entries is for specified blockchain
     */
    hasBlockchain(blockchain: number): boolean {
        return this.value.entries.some((entry) => entry.blockchain === blockchain)
    }

    /**
     * List BIP-44 Account Id which are used by current wallet for each Seed.
     *
     * @return list of active account id per seed.
     */
    getHDAccounts(): HDPathAccounts {
        let result: HDPathAccount[] = [];

        //copy reserved
        if (this.value.reserved) {
            this.value.reserved.forEach((r) => result.push(r));
        }

        //check current accounts used by entries, in case some were added but not stored
        //TODO hardcoded for ethereum
        this.getEthereumEntries().forEach((entry) => {
            if (isSeedPkRef(entry, entry.key)) {
                let seedId = entry.key.seedId;
                let accountId = getAccountId(entry.key);
                let alreadyExists = result.some((r) =>
                    r.seedId === seedId && r.accountId === accountId
                );
                if (!alreadyExists) {
                    result.push({seedId, accountId})
                }
            }
        });

        //flatten to a map structure
        let empty: HDPathAccounts = {};
        return result.reduce((prev: HDPathAccounts, curr: HDPathAccount) => {
            let x = prev[curr.seedId];
            if (!x) {
                prev[curr.seedId] = [curr.accountId];
            } else if (x.indexOf(curr.accountId) < 0) {
                x.push(curr.accountId);
            }
            return prev
        }, empty)
    }
}

/**
 * Operations over EntryId
 */
export class EntryIdOp {
    readonly value: EntryId;
    private readonly kind = "emerald.EntryIdOp";

    constructor(value: string) {
        this.value = value;
    }

    /**
     * Create new for the wallet and entry
     *
     * @param walletId
     * @param entryId entry index (numeric)
     */
    static create(walletId: Uuid, entryId: number): EntryIdOp {
        return new EntryIdOp(`${walletId}-${entryId}`)
    }

    /**
     * Create new EntryIdOp instance for the specified full id
     *
     * @param value
     * @throws error if argument is not a valid full entry id (UUID-NUM format)
     */
    static of(value: EntryId): EntryIdOp {
        if (!isEntryId(value)) {
            throw new Error("Not entry id: " + value);
        }
        return new EntryIdOp(value);
    }

    /**
     * Check if passed argument is EntryIdOp
     *
     * @param value
     */
    static isOp(value: EntryId | string | EntryIdOp): value is EntryIdOp {
        return typeof value === 'object'
            && value !== null
            && Object.entries(value).some((a) => a[0] === 'kind' && a[1] === "emerald.EntryIdOp")
    }

    /**
     * Returns a EntryIdOp for specified argument. If it's already an Op then return itself, or if it's a string, then creates new EntryIdOp for it.
     *
     * @param value
     */
    static asOp(value: EntryId | EntryIdOp): EntryIdOp {
        if (EntryIdOp.isOp(value)) {
            return value
        }
        return EntryIdOp.of(value)
    }

    /**
     * @return wallet id (UUID)
     */
    extractWalletId(): Uuid {
        return extractWalletId(this.value)
    }

    /**
     * @return entry index (number)
     */
    extractEntryInternalId(): number {
        return extractEntryInternalId(this.value)
    }
}