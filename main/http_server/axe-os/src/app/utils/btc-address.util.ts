/** Client-side Bitcoin address checks for onboarding (bc1 bech32 / 1|3 base58). */

const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function isBech32Charset(payload: string): boolean {
  for (let i = 0; i < payload.length; i++) {
    if (!BECH32_CHARSET.includes(payload[i])) {
      return false;
    }
  }
  return true;
}

function isBase58Charset(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    if (!BASE58_ALPHABET.includes(value[i])) {
      return false;
    }
  }
  return true;
}

/**
 * Proper-enough live validation for common BTC payout addresses:
 * - bc1q / bc1p (bech32 / bech32m): charset + length, no mixed case
 * - 1... / 3... (P2PKH / P2SH): base58 alphabet + length
 */
export function isValidBitcoinAddress(address: string): boolean {
  if (!address) {
    return false;
  }

  const trimmed = address.trim();
  if (!trimmed) {
    return false;
  }

  const lower = trimmed.toLowerCase();

  if (lower.startsWith('bc1')) {
    // Bech32 must be entirely lower or entirely upper, never mixed.
    if (trimmed !== lower && trimmed !== trimmed.toUpperCase()) {
      return false;
    }

    // HRP "bc" + separator "1" + data/checksum
    const payload = lower.slice(3);
    if (payload.length < 6 || !isBech32Charset(payload)) {
      return false;
    }

    // Common mainnet lengths: P2WPKH 42, P2WSH/Taproot 62
    if (lower.startsWith('bc1q') && (lower.length === 42 || lower.length === 62)) {
      return true;
    }
    if (lower.startsWith('bc1p') && lower.length === 62) {
      return true;
    }

    // Allow other valid bech32 lengths within BIP-173 bounds
    return lower.length >= 14 && lower.length <= 74;
  }

  if (trimmed.startsWith('1') || trimmed.startsWith('3')) {
    if (!isBase58Charset(trimmed)) {
      return false;
    }
    // Typical base58check address length
    return trimmed.length >= 26 && trimmed.length <= 35;
  }

  return false;
}
