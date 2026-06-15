use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::Emitter;
use tauri_plugin_dialog::DialogExt;

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct FileError {
    pub code: String,
    pub message: String,
    pub path: String,
}

impl FileError {
    fn not_found(path: &str, msg: String) -> Self {
        Self { code: "FILE_NOT_FOUND".into(), message: msg, path: path.into() }
    }
    fn invalid_path(path: &str, msg: String) -> Self {
        Self { code: "INVALID_PATH".into(), message: msg, path: path.into() }
    }
    fn permission_denied(path: &str, msg: String) -> Self {
        Self { code: "PERMISSION_DENIED".into(), message: msg, path: path.into() }
    }
    fn read_error(path: &str, msg: String) -> Self {
        Self { code: "READ_ERROR".into(), message: msg, path: path.into() }
    }
    fn write_error(path: &str, msg: String) -> Self {
        Self { code: "WRITE_ERROR".into(), message: msg, path: path.into() }
    }
}

/// Map an `std::io::Error` to a `FileError` based on its kind.
fn map_io_error(path: &str, err: std::io::Error) -> FileError {
    match err.kind() {
        std::io::ErrorKind::NotFound => {
            FileError::not_found(path, err.to_string())
        }
        std::io::ErrorKind::PermissionDenied => {
            FileError::permission_denied(path, err.to_string())
        }
        _ => FileError::read_error(path, err.to_string()),
    }
}

// ---------------------------------------------------------------------------
// Return types
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct FileReadResult {
    pub content: String,
    pub original_encoding: String,
    pub original_line_ending: String,
    pub size_bytes: u64,
}

// ---------------------------------------------------------------------------
// Path validation
// ---------------------------------------------------------------------------

/// Reject paths that contain `..` or null bytes.
fn validate_path(raw: &str) -> Result<PathBuf, FileError> {
    if raw.contains('\0') {
        return Err(FileError::invalid_path(raw, "Path contains null bytes".into()));
    }
    // Check for ".." path components
    let path = Path::new(raw);
    for component in path.components() {
        if let std::path::Component::ParentDir = component {
            return Err(FileError::invalid_path(
                raw,
                "Path contains '..' component".into(),
            ));
        }
    }
    Ok(path.to_path_buf())
}

// ---------------------------------------------------------------------------
// Encoding / line-ending detection helpers
// ---------------------------------------------------------------------------

#[derive(Debug, PartialEq)]
enum DetectedEncoding {
    Utf8,
    Utf8Bom,
    Utf16Le,
}

#[derive(Debug, PartialEq)]
enum DetectedLineEnding {
    Lf,
    CrLf,
}

/// Detect encoding from raw bytes. Returns the encoding and the byte offset
/// where the actual text starts (after BOM).
fn detect_encoding(bytes: &[u8]) -> (DetectedEncoding, usize) {
    if bytes.len() >= 3 && bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF {
        (DetectedEncoding::Utf8Bom, 3)
    } else if bytes.len() >= 2 && bytes[0] == 0xFF && bytes[1] == 0xFE {
        (DetectedEncoding::Utf16Le, 2)
    } else {
        (DetectedEncoding::Utf8, 0)
    }
}

/// Detect line ending from a decoded string.
fn detect_line_ending(s: &str) -> DetectedLineEnding {
    if s.contains("\r\n") {
        DetectedLineEnding::CrLf
    } else {
        DetectedLineEnding::Lf
    }
}

// ---------------------------------------------------------------------------
// Command: fs_read_file
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn fs_read_file(path: String) -> Result<FileReadResult, FileError> {
    let validated = validate_path(&path)?;

    let bytes = match tokio::fs::read(&validated).await {
        Ok(b) => b,
        Err(e) => return Err(map_io_error(&path, e)),
    };

    let size_bytes = bytes.len() as u64;
    let (encoding, bom_offset) = detect_encoding(&bytes);

    // Decode
    let decoded = match encoding {
        DetectedEncoding::Utf8 | DetectedEncoding::Utf8Bom => {
            String::from_utf8_lossy(&bytes[bom_offset..]).to_string()
        }
        DetectedEncoding::Utf16Le => {
            let u16_data: Vec<u16> = bytes[bom_offset..]
                .chunks(2)
                .filter(|c| c.len() == 2)
                .map(|c| u16::from_le_bytes([c[0], c[1]]))
                .collect();
            String::from_utf16_lossy(&u16_data)
        }
    };

    let line_ending = detect_line_ending(&decoded);

    // Normalize: convert CRLF → LF
    let normalized = decoded.replace("\r\n", "\n");

    Ok(FileReadResult {
        content: normalized,
        original_encoding: match encoding {
            DetectedEncoding::Utf8 => "utf8".into(),
            DetectedEncoding::Utf8Bom => "utf8-bom".into(),
            DetectedEncoding::Utf16Le => "utf16".into(),
        },
        original_line_ending: match line_ending {
            DetectedLineEnding::Lf => "lf".into(),
            DetectedLineEnding::CrLf => "crlf".into(),
        },
        size_bytes,
    })
}

// ---------------------------------------------------------------------------
// Command: fs_write_file — atomic write via temp + rename
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn fs_write_file(
    path: String,
    content: String,
    line_ending: String,
) -> Result<(), FileError> {
    let validated = validate_path(&path)?;

    // Convert line endings
    let output = if line_ending == "crlf" {
        content.replace('\n', "\r\n")
    } else {
        content
    };

    // Write to a temp file in the same directory
    let parent = validated.parent().unwrap_or(Path::new("."));
    let stem = validated
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    let tmp_path = parent.join(format!(".{}.tmp", stem));

    if let Err(e) = tokio::fs::write(&tmp_path, &output).await {
        // Clean up temp file on failure
        let _ = tokio::fs::remove_file(&tmp_path).await;
        return Err(FileError::write_error(&path, e.to_string()));
    }

    // Atomic rename
    if let Err(e) = tokio::fs::rename(&tmp_path, &validated).await {
        let _ = tokio::fs::remove_file(&tmp_path).await;
        return Err(FileError::write_error(&path, e.to_string()));
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Command: open_file_dialog
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn open_file_dialog(
    app: tauri::AppHandle,
    title: Option<String>,
    multiple: Option<bool>,
) -> Option<serde_json::Value> {
    let mut dialog = app.dialog().file().add_filter("Markdown Files", &["md"]);

    if let Some(t) = title {
        dialog = dialog.set_title(&t);
    }

    let multiple = multiple.unwrap_or(false);

    if multiple {
        let files = dialog.blocking_pick_files();
        files.map(|paths| {
            let json_paths: Vec<String> = paths
                .into_iter()
                .filter_map(|p| p.into_path().ok())
                .map(|p| p.to_string_lossy().to_string())
                .collect();
            serde_json::json!(json_paths)
        })
    } else {
        let file = dialog.blocking_pick_file();
        file.and_then(|f| {
            f.into_path().ok().map(|p| serde_json::json!(p.to_string_lossy().to_string()))
        })
    }
}

// ---------------------------------------------------------------------------
// Command: save_file_dialog
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn save_file_dialog(
    app: tauri::AppHandle,
    title: Option<String>,
    default_filename: Option<String>,
    filter_name: Option<String>,
    filter_extensions: Option<Vec<String>>,
) -> Option<String> {
    let mut dialog = app.dialog().file();

    // Apply filter if provided, otherwise default to markdown
    if let Some(extensions) = filter_extensions {
        let name = filter_name.unwrap_or_else(|| "Custom".into());
        let exts: Vec<&str> = extensions.iter().map(|s| s.as_str()).collect();
        dialog = dialog.add_filter(&name, &exts);
    } else {
        dialog = dialog.add_filter("Markdown Files", &["md"]);
    }

    if let Some(t) = title {
        dialog = dialog.set_title(&t);
    }
    if let Some(name) = default_filename {
        dialog = dialog.set_file_name(&name);
    }

    let file = dialog.blocking_save_file();
    file.and_then(|f| f.into_path().ok().map(|p| p.to_string_lossy().to_string()))
}

// ---------------------------------------------------------------------------
// Watcher state
// ---------------------------------------------------------------------------

pub struct WatcherState(pub Mutex<HashMap<String, RecommendedWatcher>>);

impl Default for WatcherState {
    fn default() -> Self {
        Self(Mutex::new(HashMap::new()))
    }
}

// ---------------------------------------------------------------------------
// Command: watch_file
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn watch_file(
    app: tauri::AppHandle,
    state: tauri::State<'_, WatcherState>,
    path: String,
    watcher_id: String,
) -> Result<(), FileError> {
    let validated = validate_path(&path)?;

    // Ensure the file exists
    if !validated.exists() {
        return Err(FileError::not_found(&path, "File does not exist".into()));
    }

    // Watch the parent directory
    let parent = validated.parent().unwrap_or(Path::new(".")).to_path_buf();
    let target_file_name = validated
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let app_handle = app.clone();
    let w_id = watcher_id.clone();
    let p_clone = path.clone();

    let mut watcher = match notify::recommended_watcher(move |event: notify::Result<notify::Event>| {
        if let Ok(event) = event {
            // Only care about modify events for the specific file
            if event.kind.is_modify() || event.kind.is_create() {
                let is_target = event.paths.iter().any(|ep| {
                    ep.file_name()
                        .and_then(|n| n.to_str())
                        .map(|n| n == target_file_name)
                        .unwrap_or(false)
                });
                if is_target {
                    let _ = app_handle.emit(
                        "mdown://file-changed",
                        serde_json::json!({
                            "path": p_clone,
                            "watcherId": w_id,
                            "changeType": "modified",
                        }),
                    );
                }
            }
        }
    }) {
        Ok(w) => w,
        Err(e) => {
            return Err(FileError::read_error(&path, format!("Failed to create watcher: {e}")));
        }
    };

    if let Err(e) = watcher.watch(&parent, RecursiveMode::NonRecursive) {
        return Err(FileError::read_error(&path, format!("Failed to start watching: {e}")));
    }

    let mut guard = match state.0.lock() {
        Ok(g) => g,
        Err(e) => return Err(FileError::read_error(&path, format!("State lock error: {e}"))),
    };
    guard.insert(watcher_id, watcher);

    Ok(())
}

// ---------------------------------------------------------------------------
// Command: unwatch_file
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn unwatch_file(
    state: tauri::State<'_, WatcherState>,
    watcher_id: String,
) -> Result<(), FileError> {
    let mut guard = match state.0.lock() {
        Ok(g) => g,
        Err(e) => {
            return Err(FileError::read_error(
                "",
                format!("State lock error: {e}"),
            ));
        }
    };
    guard.remove(&watcher_id);
    Ok(())
}

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    /// Helper: create a temp file with given content, return its path.
    fn create_temp_file(content: &[u8]) -> (tempfile::TempDir, PathBuf) {
        let dir = tempfile::tempdir().expect("create temp dir");
        let path = dir.path().join("test.md");
        let mut f = std::fs::File::create(&path).expect("create temp file");
        f.write_all(content).expect("write temp file");
        (dir, path)
    }

    #[tokio::test]
    async fn test_003_a_read_nonexistent_returns_not_found() {
        let result = fs_read_file("C:/nonexistent/file.md".into()).await;
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert_eq!(err.code, "FILE_NOT_FOUND");
    }

    #[tokio::test]
    async fn test_003_b_path_with_dotdot_returns_invalid_path() {
        let result = fs_read_file("/some/../../path.md".into()).await;
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert_eq!(err.code, "INVALID_PATH");
    }

    #[tokio::test]
    async fn test_003_c_read_crlf_file_normalizes_line_endings() {
        let content = "line1\r\nline2\r\nline3";
        let (_dir, path) = create_temp_file(content.as_bytes());
        let result = fs_read_file(path.to_string_lossy().to_string()).await;
        assert!(result.is_ok());
        let res = result.unwrap();
        // Content should not contain \r
        assert!(!res.content.contains('\r'));
        assert_eq!(res.original_line_ending, "crlf");
    }

    #[tokio::test]
    async fn test_003_d_write_with_crlf_produces_crlf_in_file() {
        let dir = tempfile::tempdir().expect("create temp dir");
        let path = dir.path().join("write_test.md");
        let path_str = path.to_string_lossy().to_string();

        let result = fs_write_file(path_str.clone(), "hello\nworld".into(), "crlf".into()).await;
        assert!(result.is_ok());

        let raw = std::fs::read(&path).expect("read back file");
        let raw_str = String::from_utf8_lossy(&raw);
        assert!(raw_str.contains("\r\n"));
    }
}
