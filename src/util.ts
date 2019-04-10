import * as path from "path";

export function pathsEqual(path1: string, path2: string) {
  const x = path.parse(path1);
  const y = path.parse(path2);

  return (
    x.root.toUpperCase() === y.root.toUpperCase() &&
    x.dir === y.dir &&
    x.base === y.base
  );
}
