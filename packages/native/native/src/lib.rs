extern crate emerald_vault;
extern crate hex;
extern crate neon;
extern crate serde;
#[macro_use]
extern crate serde_derive;
extern crate chrono;
extern crate hdpath;
extern crate serde_json;
extern crate uuid;
extern crate bitcoin;
extern crate emerald_hwkey;
extern crate env_logger;
#[macro_use]
extern crate log;
extern crate num_bigint;
#[macro_use]
extern crate neon_frame_macro;

use neon::prelude::*;

mod access;
mod address;
mod addressbook;
mod admin;
mod entries;
mod seeds;
mod sign;
mod wallets;
mod global;
mod errors;
mod snapshot;

use env_logger::Builder;
use chrono::Local;
use log::LevelFilter;
use std::io::Write;

const DEV_MODE: bool = false;

register_module!(mut cx, {
    if DEV_MODE {
        Builder::new()
            .format(|buf, record| {
                writeln!(buf,
                         "{} [{}] - {}",
                         Local::now().format("%Y-%m-%dT%H:%M:%S"),
                         record.level(),
                         record.args()
                )
            })
            .filter(None, LevelFilter::Trace)
            .init();
        log::warn!("START IN DEV MODE");
    }

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
    cx.export_function("sign_message", sign::sign_message)
        .expect("sign_message not exported");

    cx.export_function("addrbook_list", addressbook::list)
        .expect("addrbook_list not exported");
    cx.export_function("addrbook_remove", addressbook::remove)
        .expect("addrbook_remove not exported");

    cx.export_function("seed_generateMnemonic", seeds::generate_mnemonic)
        .expect("seed_generateMnemonic not exported");
    cx.export_function("seed_add", seeds::add)
        .expect("seed_add not exported");
    cx.export_function("seed_update", seeds::update)
        .expect("seed_update not exported");
    cx.export_function("seed_list", seeds::list)
        .expect("seed_list not exported");
    cx.export_function("seed_isAvailable", seeds::is_available)
        .expect("seed_isAvailable not exported");
    cx.export_function("seed_listAddresses", seeds::list_addresses)
        .expect("seed_listAddresses not exported");

    cx.export_function("seed_hwkey_list", seeds::list_hwkey)
        .expect("seed_hwkey_list not exported");

    cx.export_function("global_isSet", global::is_set)
        .expect("global_isSet not exported");
    cx.export_function("global_create", global::create)
        .expect("global_create not exported");
    cx.export_function("global_verify", global::verify)
        .expect("global_verify not exported");
    cx.export_function("global_change", global::change_password)
        .expect("global_change not exported");

    cx.export_function("admin_migrate", admin::migrate)
        .expect("admin_migrate not exported");
    cx.export_function("admin_autofix", admin::autofix)
        .expect("admin_autofix not exported");
    cx.export_function("admin_listOdd", admin::list_odd)
        .expect("admin_listOdd not exported");
    cx.export_function("admin_upgradeOdd", admin::upgrade_odd)
        .expect("admin_upgradeOdd not exported");

    cx.export_function("snapshot_create", snapshot::create)
        .expect("snapshot_create not exported");
    cx.export_function("snapshot_restore", snapshot::restore)
        .expect("snapshot_restore not exported");

    Ok(())
});
