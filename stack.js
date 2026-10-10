class Stack {
    constructor() {
        this.elements = [];
    }

    push(element) {
        this.elements.push(element);
    }

    top() {
        return this.elements[this.elements.length - 1];
    }

    pop() {
        return this.elements.pop();
    }

    size() {
        return this.elements.length;
    }

    empty() {
        return this.elements.length === 0;
    }
}

module.exports = Stack;
