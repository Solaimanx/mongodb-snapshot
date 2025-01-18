import * as joi from "joi";
export declare abstract class Validatable {
    validate(): void;
    abstract options(): any;
    abstract schema(): joi.Schema;
}
//# sourceMappingURL=Validatable.d.ts.map