import * as path from "path";

/**
 * Utility functions
 */
/**
 * Returns `true` if the paths are equal, `false` otherwise
 */
export function pathsEqual(path1: string, path2: string) {
  const x = path.parse(path1);
  const y = path.parse(path2);

  return (
    x.root.toUpperCase() === y.root.toUpperCase() &&
    x.dir === y.dir &&
    x.base === y.base
  );
}
