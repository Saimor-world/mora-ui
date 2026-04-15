export const mergeUnique = <T extends { id: string }>(...lists: (T[] | undefined | null)[]): T[] => {
    const map = new Map<string, T>();
    lists.forEach((list) => {
        if (!list) return;
        list.forEach((item) => {
            if (item?.id) map.set(item.id, item);
        });
    });
    return Array.from(map.values());
};

export const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
