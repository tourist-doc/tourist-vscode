import { readdir } from "fs-extra";
import { dirname, parse } from "path";
import { Uri } from "vscode";

/**
 * Utility functions
 */
/**
 * Returns `true` if the paths are equal, `false` otherwise
 */
export function pathsEqual(path1: string, path2: string) {
  const x = parse(path1);
  const y = parse(path2);

  return (
    x.root.toUpperCase() === y.root.toUpperCase() &&
    x.dir === y.dir &&
    x.base === y.base
  );
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
