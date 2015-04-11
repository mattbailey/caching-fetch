import * as imap from './indexed-map';
import * as heap from './heap';
import lzstring from 'lz-string';

// This is a cache implementation above localStorage.
// With every item it saves priority.
// When cache size grows more than maxSize elements it starts to remove
// items with lowest priority before new attempts to insert into cache.
// Implementation developed and tested with integer priority, but should work
// with other types for which < (less than) operator works.
// Cache gets and returns JSON objects, it parses/stringifies and
// compresses/decompersses them as necessary.
// Internaly cache implemented as heap over compaund structure
// (index array plus related map)  over localStorage.
// Complexity of operations should be O(log(n)).
export class Cache {
    constructor(keyPrefix, maxSize) {
        let m = new imap.IndexedMap(keyPrefix),
            t = this;
        heap.init(m);
        t.map = m;
        t.keyPrefix = keyPrefix;
        t.maxSize = maxSize;
    }

    keyFromUrl(url, params) {
        lzstring.compressToUTF16(url + JSON.stringify(params || {}));
    }

    getItem(key) {
        let v = this.map.getItem(key);
        if (v === null) {
            return null;
        }
        return JSON.parse(lzstring.decompressFromUTF16(v.d));
    }

    addItem(key, data, priority) {
        let t = this,
            x = prepareItem(key, data, priority);
        while (t.map.len() >= t.maxSize) {
            heap.pop(t.map);
        }
        tryHandleQuotaExceededErr(t, () => {
            heap.push(t.map, x);
        });
    }

    updateItem(key, data, priority) {
        let t = this,
            x = prepareItem(key, data, priority);
        tryHandleQuotaExceededErr(t, () => {
            t.map.updateItem(x, heap.fix);
        });
    }

    removeItem(key) {
        this.map.removeItem(key, heap.remove);
    }

    clear() {
        this.map.clear();
    }
};

function prepareItem(key, data, priority) {
    return {
        d: lzstring.compressToUTF16(JSON.stringify(data || {})),
        k: key,
        p: priority
    };
}

function tryHandleQuotaExceededErr(t, f) {
    try {
        f();
    } catch (e) {
        if (e == QUOTA_EXCEEDED_ERR) {
            t.map.clear();
            try {
                f();
            } catch (e) {
                if (e == QUOTA_EXCEEDED_ERR) {
                    localStorage.clear();
                    t.map = new imap.IndexedMap(t.keyPrefix);
                    f();
                }
            }
        }
    }
}
