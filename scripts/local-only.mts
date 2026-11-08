/**
 * The demo seed creates fake accounts and demo courses. It must only ever touch the
 * local stack, so it stops unless every address it would write to is on this machine.
 */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "host.docker.internal"]);

export function nonLocalTargets(targets: Record<string, string | undefined>): string[] {
  return Object.entries(targets)
    .filter(([, url]) => {
      if (!url) return false;
      try {
        return !LOCAL_HOSTS.has(new URL(url).hostname);
      } catch {
        return true;
      }
    })
    .map(([name]) => name);
}

export function assertLocalOnly(what: string, targets: Record<string, string | undefined>) {
  const missing = Object.entries(targets).filter(([, url]) => !url).map(([name]) => name);
  const remote = nonLocalTargets(targets);
  if (missing.length || remote.length) {
    console.error(
      `${what} only runs against the local stack.` +
        (remote.length ? ` Not local: ${remote.join(", ")}.` : "") +
        (missing.length ? ` Not set: ${missing.join(", ")}.` : "") +
        " Nothing was changed.",
    );
    process.exit(1);
  }
}
