# Dependency checkpoint

The main integration pins MCP SDK `1.30.0` in its own lockfile. Overrides pin fixed transitive versions: `fast-uri 3.1.8`, `hono 4.13.7`, `qs 6.16.0` and `ip-address 10.7.2`. Main runtime audit reported zero findings on 2026-10-02. This is a point-in-time audit, not a permanent guarantee. Stdio and HTTP protocol tests exercise that dependency tree.

The action submodule remains pinned to its reviewed upstream commit. Its original npm lock still reports six vulnerable packages (five moderate, one high) at this checkpoint. They include URI/IP parsers, Hono/qs and Vitest dependencies. Relevant advisories include [fast-uri](https://github.com/advisories/GHSA-qw65-cvwx-89v3), [Hono](https://github.com/advisories/GHSA-hxh3-vqpv-xpqv), [qs](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g), [ip-address](https://github.com/advisories/GHSA-j6r3-76f7-8jcv) and [Vitest](https://github.com/advisories/GHSA-82fw-gwwq-j7x9).

The integration worker imports the action config/run/CLI adapter. It does not launch the action component's upstream HTTP/MCP servers, test server, URL classification endpoints or browser UI. The integration's network interface uses its independent, patched SDK tree. This limits exposure of the reported paths; it does not erase upstream findings. An upstream lockfile refresh can be reviewed separately, and the original servers should not be exposed until that review is complete.

Install uses locked dependencies and disables implicit install hooks. Explicit TypeScript build/postbuild steps remain required for the reviewed action component. No blind `npm audit fix`, major-version migration or submodule edit is performed.
