/**
 * React Hook für Filesystem Integration
 *
 * Provides easy access to local file system in React components
 */

'use client';

import { useState, useCallback } from 'react';
import {
  isFileSystemAccessSupported,
  pickDirectory,
  pickFile,
  scanDirectory,
  readFileContent,
  type FileMetadata,
} from '../filesystem/browser';
import { showToast } from '../toast';

interface UseFilesystemState {
  files: FileMetadata[];
  isScanning: boolean;
  isSupported: boolean;
  selectedDirectory: string | null;
  error: string | null;
}

export function useFilesystem() {
  const [state, setState] = useState<UseFilesystemState>({
    files: [],
    isScanning: false,
    isSupported: isFileSystemAccessSupported(),
    selectedDirectory: null,
    error: null,
  });

  /**
   * Open directory picker and scan contents
   */
  const openDirectory = useCallback(async (options?: {
    maxDepth?: number;
    extensions?: string[];
  }) => {
    if (!state.isSupported) {
      setState(prev => ({
        ...prev,
        error: 'File System Access API not supported in this browser. Use Chrome, Edge, or Safari 15.2+',
      }));
      showToast({
        message: 'File System Access not supported in this browser',
        variant: 'error',
      });
      return;
    }

    try {
      setState(prev => ({ ...prev, isScanning: true, error: null }));

      const dirHandle = await pickDirectory();
      if (!dirHandle) {
        // User cancelled
        setState(prev => ({ ...prev, isScanning: false }));
        return;
      }

      showToast({
        message: `Scanning directory: ${dirHandle.name}...`,
        variant: 'info',
      });

      const files = await scanDirectory(dirHandle, options);

      setState(prev => ({
        ...prev,
        files,
        selectedDirectory: dirHandle.name,
        isScanning: false,
        error: null,
      }));

      showToast({
        message: `Found ${files.length} files in ${dirHandle.name}`,
        variant: 'success',
      });
    } catch (error) {
      console.error('[useFilesystem] Error scanning directory:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      setState(prev => ({
        ...prev,
        isScanning: false,
        error: errorMessage,
      }));

      showToast({
        message: `Error scanning directory: ${errorMessage}`,
        variant: 'error',
      });
    }
  }, [state.isSupported]);

  /**
   * Open single file picker
   */
  const openFiles = useCallback(async (options?: {
    types?: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
    multiple?: boolean;
  }) => {
    if (!state.isSupported) {
      setState(prev => ({
        ...prev,
        error: 'File System Access API not supported',
      }));
      return [];
    }

    try {
      const fileHandles = await pickFile(options);
      return fileHandles;
    } catch (error) {
      console.error('[useFilesystem] Error picking files:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showToast({
        message: `Error picking files: ${errorMessage}`,
        variant: 'error',
      });
      return [];
    }
  }, [state.isSupported]);

  /**
   * Clear selected files
   */
  const clearFiles = useCallback(() => {
    setState({
      files: [],
      isScanning: false,
      isSupported: state.isSupported,
      selectedDirectory: null,
      error: null,
    });
  }, [state.isSupported]);

  return {
    ...state,
    openDirectory,
    openFiles,
    clearFiles,
  };
}

/**
 * Hook for markdown file browsing specifically
 */
export function useMarkdownFiles() {
  const filesystem = useFilesystem();

  const openMarkdownDirectory = useCallback(async () => {
    await filesystem.openDirectory({
      extensions: ['.md', '.markdown', '.mdx'],
      maxDepth: 10,
    });
  }, [filesystem]);

  return {
    ...filesystem,
    openMarkdownDirectory,
    markdownFiles: filesystem.files.filter(f =>
      f.extension && ['.md', '.markdown', '.mdx'].includes(f.extension)
    ),
  };
}
