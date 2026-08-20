interface CacheItem<V> {
  value: V;
  expiresAt: number; // timestamp в мс
}

export class LRUCache<K, V> {
  private cache = new Map<K, CacheItem<V>>();
  private readonly maxSize: number;
  private readonly defaultTTL: number; // в миллисекундах

  constructor(maxSize: number, defaultTTL: number = 30000) {
    // 30 секунд по умолчанию
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Получить значение по ключу. Если ключ есть и не истёк, обновляет порядок (перемещает в конец).
   * Возвращает undefined, если нет или истекло.
   */
  get(key: K): V | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;

    // Проверяем TTL
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    // Перемещаем в конец (обновляем порядок)
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  /**
   * Установить значение. Если ключ уже существует, обновляет.
   * При превышении размера удаляет самый старый (первый в итерации Map).
   */
  set(key: K, value: V, ttl?: number): void {
    const expiresAt = Date.now() + (ttl ?? this.defaultTTL);

    // Если ключ уже есть, удаляем его, чтобы обновить порядок
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Если достигнут лимит, удаляем самый старый (первый элемент в Map)
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Удалить ключ из кэша.
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Очистить весь кэш.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Проверить наличие ключа (без обновления порядка).
   */
  has(key: K): boolean {
    return (
      this.cache.has(key) && Date.now() <= (this.cache.get(key)?.expiresAt ?? 0)
    );
  }

  /**
   * Получить размер кэша.
   */
  get size(): number {
    return this.cache.size;
  }
}
