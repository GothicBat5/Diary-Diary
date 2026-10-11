// First of
import java.io.File

fun main() 
{
    print("Enter folder path: ")
    val path = readln().trim()

    val folder = File(path)

    if (!folder.isDirectory) 
    {
        println("Invalid folder path!")
        return
    }

    val files = folder.listFiles()
        ?.filter { it.isFile }
        ?: emptyList()

    if (files.isEmpty()) 
    {
        println("No files found.")
        return
    }

    println("""
        
        === FILE SORTER ===
        1. Sort by name
        2. Sort by size
        3. Sort by type
        4. Sort by modification date
    """.trimIndent())

    print("Choose sorting method: ")
    val choice = readln().toIntOrNull()

    val sortedFiles = when (choice) 
    {
        1 -> files.sortedBy { 
            it.name.lowercase() 
        }
        
        2 -> files.sortedBy { 
            it.length() 
        }
        
        3 -> files.sortedBy {
            it.extension.lowercase()
        }
        
        4 -> files.sortedBy { 
            it.lastModified() 
        }
        else -> {
            println("Invalid choice!")
            return
        }
    }

    println("\n=== SORTED FILES ===")

    for (file in sortedFiles) {
        println(
            "${file.name} | " +
            "${file.length()} bytes | " +
            ".${file.extension} | " +
            "${file.lastModified()}"
        )
    }

    println("\nTotal files: ${sortedFiles.size}")
}
