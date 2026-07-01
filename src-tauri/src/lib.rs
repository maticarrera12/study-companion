use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use tauri::async_runtime::JoinHandle;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_sql::{Migration, MigrationKind};

/// Holds the currently pending completion-notification task so it can be
/// cancelled/rescheduled. The Rust runtime keeps ticking even when macOS
/// suspends the WKWebView (occluded/minimized window), which is why the
/// timer completion sound lives here and not in JS.
#[derive(Default)]
struct TimerNotifyState(Mutex<Option<JoinHandle<()>>>);

fn now_millis() -> f64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as f64)
        .unwrap_or(0.0)
}

fn phase_copy(phase: &str) -> (&'static str, &'static str) {
    if phase == "focus" {
        ("Pomodoro complete", "Time for a break.")
    } else {
        ("Break complete", "Back to focus.")
    }
}

/// Schedule an OS notification (with sound) to fire at `target_ms` (epoch ms).
/// Any previously scheduled notification is cancelled first.
#[tauri::command]
fn schedule_timer_notification(
    app: AppHandle,
    state: State<'_, TimerNotifyState>,
    target_ms: f64,
    phase: String,
) {
    let delay = (target_ms - now_millis()).max(0.0) as u64;
    let (title, body) = phase_copy(&phase);

    let handle = tauri::async_runtime::spawn(async move {
        tokio::time::sleep(Duration::from_millis(delay)).await;
        let _ = app
            .notification()
            .builder()
            .title(title)
            .body(body)
            // A named macOS system sound (/System/Library/Sounds). The plugin maps
            // this to Sound::Custom, and the literal "default" is NOT a real sound
            // file (it would be silent) — only "NSUserNotificationDefaultSoundName"
            // is, which the plugin does not expose. "Glass" is a valid system sound.
            .sound("Glass")
            .show();
    });

    let mut guard = state.0.lock().unwrap();
    if let Some(prev) = guard.replace(handle) {
        prev.abort();
    }
}

/// Cancel any pending completion notification.
#[tauri::command]
fn cancel_timer_notification(state: State<'_, TimerNotifyState>) {
    if let Some(handle) = state.0.lock().unwrap().take() {
        handle.abort();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![Migration {
        version: 1,
        description: "initial schema",
        sql: include_str!("../migrations/0001_initial.sql"),
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:study-companion.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            app.manage(TimerNotifyState::default());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            schedule_timer_notification,
            cancel_timer_notification
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
