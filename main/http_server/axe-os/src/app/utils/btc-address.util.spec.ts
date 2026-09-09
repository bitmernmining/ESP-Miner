import { isValidBitcoinAddress } from './btc-address.util';

describe('isValidBitcoinAddress', () => {
  it('accepts common bc1q P2WPKH', () => {
    expect(isValidBitcoinAddress('bc1qnp980s5fpp8l94p5cvttmtdqy8rvrq74qly2yr')).toBeTrue();
  });

  it('accepts bc1p taproot length', () => {
    expect(
      isValidBitcoinAddress('bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297')
    ).toBeTrue();
  });

  it('accepts legacy P2PKH starting with 1', () => {
    expect(isValidBitcoinAddress('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')).toBeTrue();
  });

  it('accepts P2SH starting with 3', () => {
    expect(isValidBitcoinAddress('3J98t1WpEZ73CNmYviecrnyiWrnqRhWNLy')).toBeTrue();
  });

  it('rejects empty and whitespace', () => {
    expect(isValidBitcoinAddress('')).toBeFalse();
    expect(isValidBitcoinAddress('   ')).toBeFalse();
  });

  it('rejects mixed-case bech32', () => {
    expect(isValidBitcoinAddress('Bc1qnp980s5fpp8l94p5cvttmtdqy8rvrq74qly2yr')).toBeFalse();
  });

  it('rejects invalid charset / short addresses', () => {
    expect(isValidBitcoinAddress('bc1q0')).toBeFalse();
    expect(isValidBitcoinAddress('bc1qIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII')).toBeFalse();
    expect(isValidBitcoinAddress('notanaddress')).toBeFalse();
  });

  it('rejects base58 with invalid characters (0, O, I, l)', () => {
    expect(isValidBitcoinAddress('10ABCDEFGHJKLMNPQRSTUVWXYZabcdefghij')).toBeFalse();
  });
});
