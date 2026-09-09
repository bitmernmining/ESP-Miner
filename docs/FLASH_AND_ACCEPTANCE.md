# Bitmern OS — Flash & Acceptance (test units only)

**Source:** `bitmern` @ `c3c9bf72c718089594e3f23735ba92160a211cd7`  
**ESP-IDF:** v6.0.2 · **Chip:** ESP32-S3 · **Flash:** 16MB dio @ 80m  
**Scope:** 1–2 test units per board **401 / 601 / 603** only.  
**NOT authorized:** batch flash, shop inventory, Telegram/X, QR, Phase 1 pack edits.

## Artifacts

On Brandon's computer: `/workspace/bitmern-os-phase2/build/artifacts/`

| Board | Factory image (flash at `0x0`) | SHA256 |
|------|--------------------------------|--------|
| 401 | `esp-miner-factory-401-bitmern-c3c9bf7.bin` | `37d4ff573aba7b4aa5d3ae8a6eb369a9fd59345a4092e1275fb5aeac58570a81` |
| 601 | `esp-miner-factory-601-bitmern-c3c9bf7.bin` | `2e700bf48f35aa6c0fdfa62b8630d0be27bf5f90c3ec4dc5201b2362fd86ae67` |
| 603 | `esp-miner-factory-603-bitmern-c3c9bf7.bin` | `af3743db8be06783cd27220387fcaedcd7603061080e8e7eb257059b1ac076d1` |

Baked NVS defaults: primary `btc.bitmernsolo.com:3132`, fallback `:3122`, hostname `bitmern`, empty wallet fields (set in wizard).

## Flash (factory merge)

```bash
# Identify port (macOS often /dev/cu.usbserial-* or /dev/cu.usbmodem*)
esptool.py --chip esp32s3 -p PORT -b 460800 write_flash --flash_mode dio --flash_freq 80m --flash_size 16MB 0x0 esp-miner-factory-BOARD-bitmern-c3c9bf7.bin
```

Hold BOOT if needed to enter download mode. Power-cycle after flash.

## Step 7 acceptance (all must pass)

Per board / unit:

- [ ] OLED + dashboard show **Bitmern OS**
- [ ] First-boot AP + wizard; expectation banner visible
- [ ] Wi-Fi step: 5 GHz / bad SSID rejected; 2.4 GHz accepted
- [ ] Wallet step: invalid BTC blocked; valid accepted; pool hidden by default (Bitmern baked)
- [ ] Advanced can still change pool (no lock-in)
- [ ] Success shows real IP; dashboard reachable after reboot
- [ ] Miner on Bitmern Solo stats / shares on correct stratum
- [ ] Reflash to stock works (anti-tivoization)
- [ ] Hashrate/temps comparable to stock (no mining-core regression)

## Results log

| Board | Unit # | Flashed | Acceptance | Notes | Date |
|------|--------|---------|------------|-------|------|
| 401 | — | PENDING (no USB on build host) | — | — | — |
| 601 | — | PENDING | — | — | — |
| 603 | — | PENDING | — | — | — |

Audit log: `docs/security_audit_log.md` on `bitmern`.
Repo: https://github.com/bitmernmining/ESP-Miner
