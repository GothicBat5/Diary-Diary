
use notify::{RecursiveMode, Watcher};
use std::{
    error::Error,
    fs,
    path::{Path, PathBuf},
    sync::mpsc,
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};


fn main() -> Result<(), Box<dyn Error>> {
    // original path :?
    let source = fs::canonicalize("MyImportantFiles")?;

    fs::create_dir_all("RustVaultBackups")?;
    let backup = fs::canonicalize("RustVaultBackups")?;

    // Prevent recursive backups and accidental self-backup.
    if source.starts_with(&backup) || backup.starts_with(&source) {
        return Err("Source and backup directories must be separate, non-nested folders.".into());
    }

    println!("RustVault starting...");
    println!("Watching: {}", source.display());
    println!("Backups:  {}", backup.display());

    // First, back up files that already exist.
    scan_directory(&source, &source, &backup)?;

    // Start watching for filesystem events.
    let (tx, rx) = mpsc::channel();

    let mut watcher = notify::recommended_watcher(move |result| {
        let _ = tx.send(result);
    })?;

    watcher.watch(&source, RecursiveMode::Recursive)?;

    println!("Monitoring active. Press Ctrl+C to stop.");

    // Keep the watcher alive and handle incoming events.
    loop {
        match rx.recv() {
            Ok(Ok(event)) => {
                for path in event.paths {
                    if path.is_file() {
                        if let Err(error) = backup_file(&source, &backup, &path) {
                            eprintln!(
                                "Backup failed for {}: {}",
                                path.display(),
                                error
                            );
                        }
                    }
                }
            }
            Ok(Err(error)) => {
                eprintln!("Watcher error: {error}");
            }
            Err(error) => {
                return Err(error.into());
            }
        }
    }
}

fn scan_directory(
    root: &Path,
    current: &Path,
    backup: &Path,
) -> Result<(), Box<dyn Error>> {
    for entry in fs::read_dir(current)? {
        let entry = entry?;
        let path = entry.path();
        let file_type = entry.file_type()?;

        // Do not follow symbolic links.
        if file_type.is_dir() {
            scan_directory(root, &path, backup)?;
        } else if file_type.is_file() {
            if let Err(error) = backup_file(root, backup, &path) {
                eprintln!("Backup failed for {}: {}", path.display(), error);
            }
        }
    }

    Ok(())
}

fn backup_file(
    root: &Path,
    backup: &Path,
    source_file: &Path,
) -> Result<(), Box<dyn Error>> {
    // Only accept files beneath the approved source directory.
    let relative = source_file.strip_prefix(root)?;

    if !source_file.is_file() {
        return Ok(());
    }

    // Give applications time to finish writing a file.
    let first = fs::metadata(source_file)?;
    thread::sleep(Duration::from_millis(500));
    let second = fs::metadata(source_file)?;

    if first.len() != second.len()
        || first.modified()? != second.modified()?
    {
        println!("File still changing; will wait for another event: {}",
            relative.display());
        return Ok(());
    }

    let destination = backup.join(relative);

    let parent = destination
        .parent()
        .ok_or("Invalid backup destination")?;

    fs::create_dir_all(parent)?;

    // Each snapshot gets a unique timestamp-based filename.
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)?
        .as_nanos();

    let mut name = destination
        .file_name()
        .ok_or("Missing filename")?
        .to_os_string();

    name.push(format!(".{timestamp}.bak"));

    let versioned_destination: PathBuf = parent.join(name);

    fs::copy(source_file, &versioned_destination)?;

    println!("Backed up: {}",relative.display());

    Ok(())
}
