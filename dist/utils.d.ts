import { Observable } from "rxjs";
export declare function convertAsyncGeneratorToObservable<T>(iterator: AsyncGenerator<T>): Observable<T>;
export declare function hasRegexesMatch(regexes: string[] | undefined, name: string): boolean;
export declare function hasRegexMatch(reg: string, name: string): boolean;
//# sourceMappingURL=utils.d.ts.map