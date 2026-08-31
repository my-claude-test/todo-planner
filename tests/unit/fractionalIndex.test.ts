import { describe, it, expect } from 'vitest';
import { keyBetween, keysAfter, orderForInsert } from '@/lib/fractionalIndex';

describe('keyBetween', () => {
  it('두 키 사이 값은 사전순으로 그 사이에 위치', () => {
    const a = keyBetween(null, null);
    const b = keyBetween(a, null);
    const mid = keyBetween(a, b);
    expect(a < mid).toBe(true);
    expect(mid < b).toBe(true);
  });
});

describe('keysAfter', () => {
  it('n개의 오름차순 키 생성', () => {
    const keys = keysAfter(null, 5);
    expect(keys).toHaveLength(5);
    const sorted = [...keys].sort();
    expect(keys).toEqual(sorted);
    expect(new Set(keys).size).toBe(5);
  });
});

describe('orderForInsert', () => {
  const cards = keysAfter(null, 4); // [c0, c1, c2, c3]

  it('맨 앞 삽입 -> 첫 카드보다 작음', () => {
    const o = orderForInsert(cards, 0);
    expect(o < cards[0]).toBe(true);
  });

  it('맨 뒤 삽입 -> 마지막 카드보다 큼', () => {
    const o = orderForInsert(cards, cards.length);
    expect(o > cards[cards.length - 1]).toBe(true);
  });

  it('index 2 삽입 -> cards[1] 과 cards[2] 사이', () => {
    const o = orderForInsert(cards, 2);
    expect(cards[1] < o).toBe(true);
    expect(o < cards[2]).toBe(true);
  });

  it('이웃 외 다른 카드 order 는 불변 (계산이 인접값만 사용)', () => {
    const before = [...cards];
    orderForInsert(cards, 2);
    expect(cards).toEqual(before);
  });
});
