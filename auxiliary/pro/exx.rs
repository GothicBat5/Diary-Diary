use std::fs;
use std::path::Path;

fn main() {
    let source = Path::new("MyFiles");
    let pictures = source.join("Pictures");

    fs::create_dir_all(&pictures).unwrap();

    for entry in fs::read_dir(source).unwrap() {
        let entry = entry.unwrap();
        let path = entry.path();

        if path.is_file() {
            let is_image = matches!(
                path.extension()
                    .and_then(|ext| ext.to_str()),
                Some("png" | "jpg" | "jpeg" | "gif")
            );

            if is_image {
                if let Some(name) = path.file_name() {
                    let destination = pictures.join(name);

                    if !destination.exists() {
                        match fs::rename(&path, &destination) {
                            Ok(()) => println!(
                                "Moved: {}",
                                name.to_string_lossy()
                            ),
                            Err(e) => println!("Could not move file: {e}"),
                        }
                    }
                }
            }
        }
    }
}
