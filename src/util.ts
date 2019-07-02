import { readdir } from "fs-extra";
import { dirname } from "path";
import { Uri } from "vscode";

/**
 * Utility functions
 */
/**
 * Returns `true` if the paths are equal, `false` otherwise
 */
export function pathsEqual(path1: string, path2: string) {
  const norm1 = path1.replace(/\\/g, "/");
  const norm2 = path2.replace(/\\/g, "/");
  return norm1.toLowerCase() === norm2.toLowerCase();
}

export async function findRepoRoot(path: string) {
  while (!/^(\/|[a-zA-Z]:(\\)?)$/.exec(path)) {
    path = dirname(path);
    for (const filename of await readdir(path)) {
      if (filename === ".git") {
        return Uri.file(path);
      }
    }
  }
}
