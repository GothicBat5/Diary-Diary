use std::collections::HashMap;
use std::path::{Path, PathBuf};

fn sort_files_by_extension(directory: &Path) -> HashMap<String, Vec<PathBuf>> {
  
    let mut extension_map: HashMap<String, Vec<PathBuf>> = HashMap::new();

    if let Ok(entries) = directory.read_dir() {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                    extension_map
                        .entry(ext.to_string())
                        .or_insert_with(Vec::new)
                        .push(path);
                }
            }
        }
    }

    for paths in extension_map.values_mut() {
        paths.sort();
    }

    extension_map
}

fn main() {
    let dir = Path::new(".");
    let sorted = sort_files_by_extension(dir);

    for (ext, files) in &sorted {
        println!("{}.{}:", ext.len(), ext);
        for file in files {
            println!("  - {:?}", file);
        }
    }
}
