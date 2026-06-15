mod commands;

use commands::fs::{fs_read_file, fs_write_file, open_file_dialog, save_file_dialog, unwatch_file, watch_file, WatcherState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(WatcherState::default())
        .invoke_handler(tauri::generate_handler![
            fs_read_file,
            fs_write_file,
            open_file_dialog,
            save_file_dialog,
            watch_file,
            unwatch_file,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
