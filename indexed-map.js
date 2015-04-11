import * as lsarray from './ls-array'

// IndexedMap is a compound low-level structure for cache implementation.
// It consists of index array and map with actual data.
//
// Map is used to provide random access to the stored data.
// Index array stores some integer priority value for every element stored in
// the map and a key of actual data in the map. Index array allows to implement
// heap algorithms above this structure to remove elements in the priority order.
//
// Every item stored in this structure should be an object with fields d (data),
// k (key of data in the map without prefix) and p (priority),
// such as: {d: 'ddd', k:'kkk',  p: 'pppp'} .
//
// This low-level structure doesn't interpret or use data stored in items.
// It stores and returns them as blobs without any processing. Client code
// should prepare them as necessary. This structure doesn't interpret priority,
// it only use it in comparisons. Priority should be simple comparable value,
// such an integer. Comparison functions not supported for simplicity.
export class IndexedMap {
    constructor(keyPrefix) {
        let t = this;
        t.keyPrefixData = keyPrefix + '|d|';
        t.indexArray = new lsarray.LSArray(keyPrefix + '|i');
    }

    getItem(key) {
        let t = this,
            mv = JSON.parse(_storage.getItem(dataKey(t, key)));
        if (mv === null) {
            return null;
        }
        let iv = JSON.parse(t.indexArray.getAt(mv.i));
        if (iv.k != key) {
            throw 'Illegal state';
        }
        return { d: mv.d, k: iv.k, p: iv.p };
    }

    // Item should be removed via heap, but it need item's index, so use this 
    // method to find index and provide callback to remove item via heap.
    removeItem(key, removeCallback) {
        let t = this,
            mv = JSON.parse(_storage.getItem(dataKey(t, key)));
        if (mv === null) {
            return;
        }
        let iv = JSON.parse(t.indexArray.getAt(mv.i));
        if (iv.k != key) {
            throw 'Illegal state';
        }
	removeCallback(t, mv.i);
    }

    // Use only on existing items.
    // New items should be pushed via heap.
    // Provide callback to fix heap.
    updateItem(x, fixCallback) {
        let t = this,
            mv = JSON.parse(_storage.getItem(dataKey(t, x.k)));
        if (mv === null) {
            throw 'Attempt to change unexisting item';
        }
        let indexArray = t.indexArray,
            iv = JSON.parse(indexArray.getAt(mv.i));
        if (iv.k != x.k) {
            throw 'Illegal state';
        }
        mv.d = x.d;
        iv.p = x.p;
        _storage.setItem(dataKey(t, x.k), JSON.stringify(mv));
        indexArray.setAt(mv.i, JSON.stringify(iv));
        fixCallback(t, mv.i);
    }

    push(x) {
        let t = this,
            mv = JSON.parse(_storage.getItem(dataKey(t, x.k))),
            l = t.indexArray.len(),
            iv = { k: x.k, p: x.p };
	if (mv !== null) {
	    throw 'Attempt to push duplicate item';
	}
        mv = { i: l, d: x.d };
        _storage.setItem(dataKey(t, x.k), JSON.stringify(mv));
        t.indexArray.push(JSON.stringify(iv));
    }

    pop() {
        let t = this,
            iv = JSON.parse(t.indexArray.pop()),
            mv = JSON.parse(_storage.getItem(dataKey(t, iv.k)));
        return { d: mv.d, k: iv.k, p: iv.p };
    }

    len() {
        return this.indexArray.len();
    }

    less(i, j) {
        let indexArray = this.indexArray,
            ivi = JSON.parse(indexArray.getAt(i)),
            ivj = JSON.parse(indexArray.getAt(j));
        return ivi.p < ivj.p;
    }

    swap(i, j) {
        let t = this,
	    indexArray = t.indexArray,
            ivi = JSON.parse(indexArray.getAt(i)),
            ivj = JSON.parse(indexArray.getAt(j)),
            mvi = JSON.parse(_storage.getItem(dataKey(t, ivi.k))),
            mvj = JSON.parse(_storage.getItem(dataKey(t, ivj.k)));
	mvi.i = j;
	mvj.i = i;
        _storage.setItem(dataKey(t, ivi.k), JSON.stringify(mvi));
        _storage.setItem(dataKey(t, ivj.k), JSON.stringify(mvj));
        indexArray.setAt(i, JSON.stringify(ivj));
        indexArray.setAt(j, JSON.stringify(ivi));
    }

    clear() {
        let t = this,
            indexArray = t.indexArray;
        for (let i = 0, l = indexArray.len(); i < l; ++i) {
            let iv = JSON.parse(indexArray.getAt(i));
            _storage.removeItem(dataKey(t, iv.k));
        }
        indexArray.clear();
    }
};

let _storage = localStorage;

function dataKey(m, k) {
    return m.keyPrefixData + k;
}
