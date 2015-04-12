// LSArray allows to create virtual array in the localStorage.
export class LSArray {
    constructor(keyPrefix) {
        let t = this,
            lenKey = keyPrefix + '|l';
        t.keyPrefix = keyPrefix + '|';
        this.lenKey = lenKey;
        if (_storage.getItem(lenKey) === null) {
            _storage.setItem(lenKey, 0);
        }
    }

    getAt(i) {
        let t = this;
        if (i < 0 || i >= t.len()) {
            throw 'Index out of range';
        }
        return _storage.getItem(key(t, i));
    }

    setAt(i, x) {
        let t = this;
        if (i < 0 || i >= t.len()) {
            throw 'Index out of range';
        }
        return _storage.setItem(key(t, i), x);
    }

    pop() {
        let t = this,
            l = t.len() - 1,
            k = key(t, l),
            x = _storage.getItem(k);
        _storage.removeItem(k);
        _storage.setItem(t.lenKey, l);
        return x;
    }

    push(x) {
        let t = this,
            l = t.len();
        _storage.setItem(key(t, l), x);
        _storage.setItem(t.lenKey, l + 1);
    }

    len() {
        return +_storage.getItem(this.lenKey);
    }

    clear() {
        let t = this;
        for (let i = 0, l = t.len(); i < l; ++i) {
            _storage.removeItem(key(t, i));
        }
        _storage.setItem(t.lenKey, 0);
    }

};

let _storage = localStorage;

function key(a, i) {
    return a.keyPrefix + i;
}
