"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasRegexMatch = exports.hasRegexesMatch = exports.convertAsyncGeneratorToObservable = void 0;
const rxjs_1 = require("rxjs");
function convertAsyncGeneratorToObservable(iterator) {
    return new rxjs_1.Observable(observer => void (async () => {
        try {
            for await (const item of iterator) {
                observer.next(item);
            }
            observer.complete();
        }
        catch (e) {
            observer.error(e);
        }
    })());
}
exports.convertAsyncGeneratorToObservable = convertAsyncGeneratorToObservable;
function hasRegexesMatch(regexes, name) {
    return (regexes === null || regexes === void 0 ? void 0 : regexes.find(reg => hasRegexMatch(reg, name))) !== undefined;
}
exports.hasRegexesMatch = hasRegexesMatch;
function hasRegexMatch(reg, name) {
    var _a;
    try {
        return ((_a = (new RegExp(`^${reg}$`, 'g')).exec(name)) === null || _a === void 0 ? void 0 : _a[0]) === name;
    }
    catch (err) {
        return false;
    }
}
exports.hasRegexMatch = hasRegexMatch;
//# sourceMappingURL=utils.js.map