# Bitmern OS — Factory flash notes

**Source commit:** `c3c9bf72c718089594e3f23735ba92160a211cd7`  
**Toolchain:** ESP-IDF v6.0.2 · ESP32-S3 · 16MB flash (dio, 80m)

## Factory images

| Board | File | SHA256 |
|------|------|--------|
| 401 | `esp-miner-factory-401-bitmern-c3c9bf7.bin` | `37d4ff573aba7b4aa5d3ae8a6eb369a9fd59345a4092e1275fb5aeac58570a81` |
| 601 | `esp-miner-factory-601-bitmern-c3c9bf7.bin` | `2e700bf48f35aa6c0fdfa62b8630d0be27bf5f90c3ec4dc5201b2362fd86ae67` |
| 603 | `esp-miner-factory-603-bitmern-c3c9bf7.bin` | `af3743db8be06783cd27220387fcaedcd7603061080e8e7eb257059b1ac076d1` |

Default NVS pool endpoints in these images: primary `btc.bitmernsolo.com:3132`, fallback `btc.bitmernsolo.com:3122`, hostname `bitmern`. Wallet fields are empty (set during onboarding).

## Flash

```bash
esptool.py --chip esp32s3 -p PORT -b 460800 write_flash --flash_mode dio --flash_freq 80m --flash_size 16MB 0x0 esp-miner-factory-BOARD-bitmern-c3c9bf7.bin
```

See also `docs/SHA256SUMS-c3c9bf7.txt` for companion artifact hashes.
