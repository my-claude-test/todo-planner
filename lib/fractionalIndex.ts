import { generateKeyBetween } from 'fractional-indexing';

/**
 * 두 order 문자열 사이의 새 order 를 만든다.
 * a, b 중 하나가 null 이면 목록의 맨 앞/뒤를 의미한다.
 */
export function keyBetween(a: string | null, b: string | null): string {
  return generateKeyBetween(a ?? null, b ?? null);
}

/**
 * n 개의 연속된 order 를 만든다 (초기 시딩용).
 */
export function keysAfter(start: string | null, count: number): string[] {
  const keys: string[] = [];
  let prev = start ?? null;
  for (let i = 0; i < count; i += 1) {
    const next = generateKeyBetween(prev, null);
    keys.push(next);
    prev = next;
  }
  return keys;
}

/**
 * 정렬된 order 배열에서 targetIndex 위치에 삽입할 때 쓸 order 를 계산한다.
 * targetIndex 는 "삽입 후" 위치 (0 = 맨 앞).
 */
export function orderForInsert(sortedOrders: string[], targetIndex: number): string {
  const before = targetIndex > 0 ? sortedOrders[targetIndex - 1] ?? null : null;
  const after = targetIndex < sortedOrders.length ? sortedOrders[targetIndex] ?? null : null;
  return generateKeyBetween(before, after);
}
