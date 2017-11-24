assert = {
    'sameValue': function(a, b) {
        if (a !== b) {
            throw new Error('not equals: ' + a + " != " + b);
        }
    }
}
