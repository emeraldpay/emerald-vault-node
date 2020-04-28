extern crate emerald_vault;
extern crate hex;
#[macro_use]
extern crate neon;
#[macro_use]
extern crate neon_serde;
extern crate serde;
#[macro_use]
extern crate serde_derive;
extern crate serde_json;
extern crate uuid;

use neon::prelude::*;

mod json;
mod entries;
mod access;
mod seeds;
mod sign;
mod addressbook;
mod wallets;
mod admin;

register_module!(mut cx, {
    cx.export_function("wallets_list", wallets::list).expect("wallets_list not exported");
    cx.export_function("wallets_add", wallets::add).expect("wallets_add not exported");
    cx.export_function("wallets_remove", wallets::remove).expect("wallets_remove not exported");
    cx.export_function("wallets_addEntry", wallets::add_entry_to_wallet).expect("wallets_addEntry not exported");
    cx.export_function("wallets_updateLabel", wallets::update_label).expect("wallets_updateLabel not exported");
    cx.export_function("wallets_removeEntry", wallets::remove_entry).expect("wallets_removeEntry not exported");

    cx.export_function("entries_import", entries::import_ethereum).expect("entries_import not exported");
    cx.export_function("entries_export", entries::export).expect("entries_export not exported");
    cx.export_function("entries_exportPk", entries::export_pk).expect("entries_exportPk not exported");

    cx.export_function("sign_tx", sign::sign_tx).expect("sign_txTx not exported");

    cx.export_function("addrbook_list", addressbook::list).expect("addrbook_list not exported");
    cx.export_function("addrbook_add", addressbook::add).expect("addrbook_add not exported");
    cx.export_function("addrbook_remove", addressbook::remove).expect("addrbook_remove not exported");

    cx.export_function("ledger_isConnected", seeds::is_connected).expect("ledger_isConnected not exported");
    cx.export_function("ledger_listAddresses", seeds::list_addresses).expect("ledger_listAddresses not exported");

    cx.export_function("seed_generateMnemonic", seeds::generate_mnemonic).expect("seed_generateMnemonic not exported");
    cx.export_function("seed_add", seeds::add).expect("seed_add not exported");
    cx.export_function("seed_list", seeds::list).expect("seed_list not exported");

    cx.export_function("admin_migrate", admin::migrate).expect("admin_migrate not exported");
    cx.export_function("admin_autofix", admin::autofix).expect("admin_autofix not exported");

    Ok(())
});
