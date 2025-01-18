"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Validatable = void 0;
const errors_1 = require("../errors");
class Validatable {
    validate() {
        // validating the options
        const { error } = this.schema().validate(this.options(), { abortEarly: true });
        if (error) {
            throw new errors_1.ConnectorSchemaError(error);
        }
    }
}
exports.Validatable = Validatable;
//# sourceMappingURL=Validatable.js.map