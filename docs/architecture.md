# Teddy architecture — v0.3

## Product invariant

`./teddy.sh` opens a local browser experience with Teddy, voice, configuration and durable memory. Infrastructure remains hidden during normal conversation.

## Planes

```text
Browser Teddy  <==== WebRTC media/data ====> OpenAI Realtime
     |
     | same-origin HTTP control
     v
Node 24.x control plane
  |- static UI and diagnostics
  |- config/history/memory
  |- encrypted API-key vault
  |- Realtime SDP bootstrap
  `- SQLite WAL state
```

The server never relays live PCM. Local mode binds loopback and needs no application password. Remote mode is a distinct security profile: trusted TLS proxy + exact public origin + Basic auth + external master key.

## Trust boundaries

1. **Browser -> Teddy:** Host, authentication (remote), Fetch-Site, Origin, media type and body-size checks.
2. **Teddy -> OpenAI:** standard key remains server-side; endpoint scheme/credentials/redirects and response size are constrained.
3. **Disk:** config/history/memory use private SQLite; API key uses AES-256-GCM. Local master-file mode optimizes one-user setup; remote mode requires an external master.
4. **Container:** process runs unprivileged, application tree is read-only, `/data` is the only writable persistent path.
5. **CI:** third-party actions use immutable commit SHAs and every PR executes runtime + container gates.

## Scale boundary

Realtime bandwidth scales outside Teddy because media is browser-to-OpenAI. The local state implementation is a single SQLite writer by design. A horizontally replicated service must supply a shared persistence implementation and managed secret key rather than sharing a SQLite file.
