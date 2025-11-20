/**
 * Modern File System Browser
 *
 * Uses File System Access API (Chrome, Edge, Safari 15.2+)
 * Provides secure access to local files and directories
 *
 * Features:
 * - Directory picker with recursive scanning
 * - File metadata extraction (name, size, modified date, MIME type)
 * - Markdown/Text file content reading
 * - Type-safe TypeScript interfaces
 */

// TypeScript declarations for File System Access API
declare global {
  interface Window {
    showDirectoryPicker(options?: {
      mode?: 'read' | 'readwrite';
      startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
    }): Promise<FileSystemDirectoryHandle>;

    showOpenFilePicker(options?: {
      multiple?: boolean;
      types?: Array<{
        description: string;
        accept: Record<string, string[]>;
      }>;
    }): Promise<FileSystemFileHandle[]>;
  }

  interface FileSystemHandle {
    readonly kind: 'file' | 'directory';
    readonly name: string;
  }

  interface FileSystemFileHandle extends FileSystemHandle {
    readonly kind: 'file';
    getFile(): Promise<File>;
  }

  interface FileSystemDirectoryHandle extends FileSystemHandle {
    readonly kind: 'directory';
    values(): AsyncIterableIterator<FileSystemFileHandle | FileSystemDirectoryHandle>;
  }
}

export interface FileMetadata {
  id: string; // Unique ID based on path
  name: string;
  path: string; // Relative path from root
  fullPath: string; // Full system path (if available)
  size: number; // Bytes
  type: string; // MIME type
  modified: Date;
  isDirectory: boolean;
  extension?: string; // .md, .txt, .pdf
  parent?: string; // Parent directory path
}

export interface DirectoryTree {
  directory: FileMetadata;
  files: FileMetadata[];
  subdirectories: DirectoryTree[];
}

/**
 * Check if File System Access API is available
 */
export function isFileSystemAccessSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'showDirectoryPicker' in window &&
    'showOpenFilePicker' in window
  );
}

/**
 * Request directory access from user
 * Opens native directory picker dialog
 */
export async function pickDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('File System Access API not supported in this browser');
  }

  try {
    const dirHandle = await window.showDirectoryPicker({
      mode: 'read', // read-only access
    });
    return dirHandle;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      // User cancelled - not an error
      return null;
    }
    throw error;
  }
}

/**
 * Pick single file
 */
export async function pickFile(
  options?: {
    types?: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
    multiple?: boolean;
  }
): Promise<FileSystemFileHandle[]> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('File System Access API not supported in this browser');
  }

  try {
    const fileHandles = await window.showOpenFilePicker({
      multiple: options?.multiple ?? false,
      types: options?.types,
    });
    return fileHandles;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return [];
    }
    throw error;
  }
}

/**
 * Scan directory recursively
 * Returns flat list of all files with metadata
 */
export async function scanDirectory(
  dirHandle: FileSystemDirectoryHandle,
  options?: {
    maxDepth?: number;
    includeHidden?: boolean;
    extensions?: string[]; // Filter by extensions: ['.md', '.txt']
  }
): Promise<FileMetadata[]> {
  const maxDepth = options?.maxDepth ?? 10;
  const includeHidden = options?.includeHidden ?? false;
  const extensions = options?.extensions;

  const results: FileMetadata[] = [];

  async function scan(
    handle: FileSystemDirectoryHandle,
    path: string,
    depth: number
  ): Promise<void> {
    if (depth > maxDepth) return;

    for await (const entry of handle.values()) {
      // Skip hidden files (starting with .)
      if (!includeHidden && entry.name.startsWith('.')) {
        continue;
      }

      const entryPath = path ? `${path}/${entry.name}` : entry.name;

      if (entry.kind === 'file') {
        const fileHandle = entry as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        const extension = getFileExtension(entry.name);

        // Filter by extension if specified
        if (extensions && extension && !extensions.includes(extension)) {
          continue;
        }

        results.push({
          id: generateFileId(entryPath),
          name: entry.name,
          path: entryPath,
          fullPath: entryPath, // Browser API doesn't expose full system path
          size: file.size,
          type: file.type || getMimeTypeFromExtension(extension),
          modified: new Date(file.lastModified),
          isDirectory: false,
          extension,
          parent: path || undefined,
        });
      } else if (entry.kind === 'directory') {
        const subDirHandle = entry as FileSystemDirectoryHandle;

        // Add directory itself
        results.push({
          id: generateFileId(entryPath),
          name: entry.name,
          path: entryPath,
          fullPath: entryPath,
          size: 0,
          type: 'inode/directory',
          modified: new Date(), // Directories don't have lastModified
          isDirectory: true,
          parent: path || undefined,
        });

        // Recurse into subdirectory
        await scan(subDirHandle, entryPath, depth + 1);
      }
    }
  }

  await scan(dirHandle, '', 0);
  return results;
}

/**
 * Read file content as text
 * Works for markdown, text files, code, etc.
 */
export async function readFileContent(
  fileHandle: FileSystemFileHandle
): Promise<string> {
  const file = await fileHandle.getFile();
  return await file.text();
}

/**
 * Get file metadata without reading content
 */
export async function getFileMetadata(
  fileHandle: FileSystemFileHandle,
  path?: string
): Promise<FileMetadata> {
  const file = await fileHandle.getFile();
  const extension = getFileExtension(file.name);
  const filePath = path || file.name;

  return {
    id: generateFileId(filePath),
    name: file.name,
    path: filePath,
    fullPath: filePath,
    size: file.size,
    type: file.type || getMimeTypeFromExtension(extension),
    modified: new Date(file.lastModified),
    isDirectory: false,
    extension,
  };
}

/**
 * Extract file extension
 */
function getFileExtension(filename: string): string | undefined {
  const match = filename.match(/\.([^.]+)$/);
  return match ? `.${match[1].toLowerCase()}` : undefined;
}

/**
 * Guess MIME type from extension
 */
function getMimeTypeFromExtension(extension?: string): string {
  if (!extension) return 'application/octet-stream';

  const mimeTypes: Record<string, string> = {
    '.md': 'text/markdown',
    '.txt': 'text/plain',
    '.pdf': 'application/pdf',
    '.json': 'application/json',
    '.js': 'text/javascript',
    '.ts': 'text/typescript',
    '.tsx': 'text/typescript',
    '.jsx': 'text/javascript',
    '.html': 'text/html',
    '.css': 'text/css',
    '.py': 'text/x-python',
    '.java': 'text/x-java',
    '.cpp': 'text/x-c++',
    '.c': 'text/x-c',
    '.rs': 'text/x-rust',
    '.go': 'text/x-go',
    '.yaml': 'text/yaml',
    '.yml': 'text/yaml',
    '.xml': 'text/xml',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };

  return mimeTypes[extension] || 'application/octet-stream';
}

/**
 * Generate stable file ID from path
 */
function generateFileId(path: string): string {
  // Simple hash for now - could use crypto.subtle.digest later
  return `file:${path.replace(/\\/g, '/')}`;
}

/**
 * Build directory tree structure (hierarchical)
 */
export function buildDirectoryTree(files: FileMetadata[]): DirectoryTree[] {
  const roots: DirectoryTree[] = [];
  const dirMap = new Map<string, DirectoryTree>();

  // First pass: create all directories
  files
    .filter(f => f.isDirectory)
    .forEach(dir => {
      dirMap.set(dir.path, {
        directory: dir,
        files: [],
        subdirectories: [],
      });
    });

  // Second pass: add files to their parent directories
  files
    .filter(f => !f.isDirectory)
    .forEach(file => {
      const parentPath = file.parent || '';
      const parent = dirMap.get(parentPath);
      if (parent) {
        parent.files.push(file);
      } else {
        // File at root level - create virtual root
        if (!dirMap.has('')) {
          dirMap.set('', {
            directory: {
              id: 'root',
              name: '/',
              path: '',
              fullPath: '',
              size: 0,
              type: 'inode/directory',
              modified: new Date(),
              isDirectory: true,
            },
            files: [],
            subdirectories: [],
          });
        }
        dirMap.get('')!.files.push(file);
      }
    });

  // Third pass: build tree hierarchy
  dirMap.forEach((tree, path) => {
    if (path === '') {
      roots.push(tree);
    } else {
      const parentPath = path.split('/').slice(0, -1).join('/');
      const parent = dirMap.get(parentPath);
      if (parent) {
        parent.subdirectories.push(tree);
      } else {
        roots.push(tree);
      }
    }
  });

  return roots;
}
