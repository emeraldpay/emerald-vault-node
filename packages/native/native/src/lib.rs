extern crate emerald_vault;
extern crate hex;
extern crate neon;
extern crate neon_serde;
extern crate serde;
#[macro_use]
extern crate serde_derive;
extern crate chrono;
extern crate hdpath;
extern crate serde_json;
extern crate uuid;
extern crate bitcoin;
extern crate emerald_hwkey;

use neon::prelude::*;

mod access;
mod address;
mod addressbook;
mod admin;
mod entries;
mod json;
mod seeds;
mod sign;
mod wallets;

register_module!(mut cx, {
    cx.export_function("wallets_list", wallets::list)
        .expect("wallets_list not exported");
    cx.export_function("wallets_add", wallets::add)
        .expect("wallets_add not exported");
    cx.export_function("wallets_remove", wallets::remove)
        .expect("wallets_remove not exported");
    cx.export_function("wallets_addEntry", wallets::add_entry_to_wallet)
        .expect("wallets_addEntry not exported");
    cx.export_function("wallets_updateLabel", wallets::update_label)
        .expect("wallets_updateLabel not exported");
    cx.export_function("wallets_removeEntry", wallets::remove_entry)
        .expect("wallets_removeEntry not exported");

    cx.export_function("entries_import", entries::import_ethereum)
        .expect("entries_import not exported");
    cx.export_function("entries_export", entries::export)
        .expect("entries_export not exported");
    cx.export_function("entries_exportPk", entries::export_pk)
        .expect("entries_exportPk not exported");
    cx.export_function("entries_updateLabel", entries::update_label)
        .expect("entries_updateLabel not exported");
    cx.export_function(
        "entries_updateReceiveDisabled",
        entries::update_receive_disabled,
    )
    .expect("entries_updateReceiveDisabled not exported");
    cx.export_function("entries_listAddresses", entries::list_addresses)
        .expect("entries_listAddresses not exported");

    cx.export_function("sign_tx", sign::sign_tx)
        .expect("sign_tx not exported");

    cx.export_function("addrbook_list", addressbook::list)
        .expect("addrbook_list not exported");
    cx.export_function("addrbook_add", addressbook::add)
        .expect("addrbook_add not exported");
    cx.export_function("addrbook_remove", addressbook::remove)
        .expect("addrbook_remove not exported");

    cx.export_function("seed_generateMnemonic", seeds::generate_mnemonic)
        .expect("seed_generateMnemonic not exported");
    cx.export_function("seed_add", seeds::add)
        .expect("seed_add not exported");
    cx.export_function("seed_list", seeds::list)
        .expect("seed_list not exported");
    cx.export_function("seed_isAvailable", seeds::is_available)
        .expect("seed_isAvailable not exported");
    cx.export_function("seed_listAddresses", seeds::list_addresses)
        .expect("seed_listAddresses not exported");

    cx.export_function("seed_hwkey_list", seeds::list_hwkey)
        .expect("seed_hwkey_list not exported");

    cx.export_function("admin_migrate", admin::migrate)
        .expect("admin_migrate not exported");
    cx.export_function("admin_autofix", admin::autofix)
        .expect("admin_autofix not exported");

    Ok(())
});
