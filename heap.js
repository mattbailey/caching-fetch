// This code is a port of Golang's heap.
// See http://golang.org/src/container/heap/heap.go.
//
// Original code is governed by BSD license (see http://golang.org/LICENSE):
//
// Copyright (c) 2012 The Go Authors. All rights reserved.
//	
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
//   * Redistributions of source code must retain the above copyright
// notice, this list of conditions and the following disclaimer.
//   * Redistributions in binary form must reproduce the above
// copyright notice, this list of conditions and the following disclaimer
// in the documentation and/or other materials provided with the
// distribution.
//   * Neither the name of Google Inc. nor the names of its
// contributors may be used to endorse or promote products derived from
// this software without specific prior written permission.
//	
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
// This file is a derived work and should be redistributed under the same
// conditions.


// Module provides heap operations for object, passed into module's methods.
// Object should implement such methods:
//  push(x) - add x as element len()
//  pop() - remove and return element len() - 1
//  len() - return number of elements in the collection
//  less(i, j) - reports whether element with index i should sort before the element with index j
//  swap(i, j) - swaps the elements with index i and j
//
// See original documentation for details: http://golang.org/pkg/container/heap/.
module.exports = {

    // A heap must be initialized before any of the heap operations
    // can be used. init() is idempotent with respect to the heap invariants
    // and may be called whenever the heap invariants may have been invalidated.
    // Its complexity is O(n) where n = h.len().
    init: (h) => {
        // heapify
        for (let n = h.len(), i = Math.trunc(n / 2) - 1; i >= 0; --i) {
            this.down(h, i, n);
        }
    },

    // push() pushes the element x onto the heap. The complexity is
    // O(log(n)) where n = h.len().
    push(h, x) {
        h.push(x);
        this.up(h, h.len() - 1);
    },

    // pop() removes the minimum element (according to less()) from the heap
    // and returns it. The complexity is O(log(n)) where n = h.len().
    // It is equivalent to remove(h, 0).
    pop(h) {
        let n = h.len() - 1;
        h.swap(0, n);
        this.down(h, 0, n);
        return h.pop();
    },

    // remove() removes the element at index i from the heap.
    // The complexity is O(log(n)) where n = h.len().
    remove(h, i) {
        let n = h.len() - 1;
        if (n != i) {
            h.swap(i, n);
            this.down(h, i, n);
            this.up(h, i);
        }
        return h.pop();
    },

    // fix() re-establishes the heap ordering after the element at index i has changed its value.
    // Changing the value of the element at index i and then calling fix() is equivalent to,
    // but less expensive than, calling remove(h, i) followed by a push() of the new value.
    // The complexity is O(log(n)) where n = h.len().
    fix(h, i) {
        this.down(h, i, h.len());
        this.up(h, i);
    },

    up(h, j) {
        for (;;) {
            let i = Math.trunc((j - 1) / 2); // parent
            if (i == j || !h.less(j, i)) {
                break;
            }
            h.swap(i, j);
            j = i;
        }
    },

    down(h, i, n) {
        for (;;) {
            let j1 = 2 * i + 1;
            if (j1 >= n || j1 < 0) { // j1 < 0 after int overflow
                break;
            }
            let j = j1, // left child
                j2 = j1 + 1;
            if (j2 < n && !h.less(j1, j2)) {
                j = j2; // = 2*i + 2  // right child
            }
            if (!h.less(j, i)) {
                break;
            }
            h.swap(i, j);
            i = j;
        }
    }
};
