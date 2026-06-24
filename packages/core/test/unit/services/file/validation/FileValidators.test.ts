import { describe, it, expect } from "vitest";
import { CreateFileValidator } from "../../../../../src/services/file/validation/index.js";
import { UpdateFileValidator } from "../../../../../src/services/file/validation/index.js";
import { AppendFileValidator } from "../../../../../src/services/file/validation/index.js";

describe("CreateFileValidator", () => {
    const validator = new CreateFileValidator();

    it("passes with valid options", () => {
        expect(() => validator.validate({ contents: "hello" })).not.toThrow();
    });

    it("passes with no chunkSize", () => {
        expect(() => validator.validate({})).not.toThrow();
    });

    it("rejects non-integer chunkSize", () => {
        expect(() => validator.validate({ chunkSize: 1.5 })).toThrow(
            "chunkSize must be a positive integer",
        );
    });

    it("rejects zero chunkSize", () => {
        expect(() => validator.validate({ chunkSize: 0 })).toThrow(
            "chunkSize must be a positive integer",
        );
    });

    it("rejects negative chunkSize", () => {
        expect(() => validator.validate({ chunkSize: -10 })).toThrow(
            "chunkSize must be a positive integer",
        );
    });
});

describe("UpdateFileValidator", () => {
    const validator = new UpdateFileValidator();

    it("passes when contents are present", () => {
        expect(() => validator.validate({}, true)).not.toThrow();
    });

    it("passes when keys are present", () => {
        expect(() => validator.validate({ keys: [] }, false)).not.toThrow();
    });

    it("passes when expirationTime is present", () => {
        expect(() =>
            validator.validate({ expirationTime: new Date() }, false),
        ).not.toThrow();
    });

    it("passes when fileMemo is present", () => {
        expect(() =>
            validator.validate({ fileMemo: "hi" }, false),
        ).not.toThrow();
    });

    it("rejects when no update field is provided", () => {
        expect(() => validator.validate({}, false)).toThrow(
            "At least one file update field must be provided",
        );
    });

    it("rejects non-integer chunkSize", () => {
        expect(() =>
            validator.validate({ contents: "x", chunkSize: 0.5 }, true),
        ).toThrow("chunkSize must be a positive integer");
    });
});

describe("AppendFileValidator", () => {
    const validator = new AppendFileValidator();

    it("passes with non-empty Uint8Array", () => {
        expect(() =>
            validator.validate(new Uint8Array([1, 2, 3]), {}),
        ).not.toThrow();
    });

    it("passes with non-empty string", () => {
        expect(() => validator.validate("hello", {})).not.toThrow();
    });

    it("rejects empty Uint8Array", () => {
        expect(() => validator.validate(new Uint8Array(0), {})).toThrow(
            "Append contents must not be empty",
        );
    });

    it("rejects empty string", () => {
        expect(() => validator.validate("", {})).toThrow(
            "Append contents must not be empty",
        );
    });

    it("rejects non-integer chunkSize", () => {
        expect(() =>
            validator.validate(new Uint8Array([1]), { chunkSize: -1 }),
        ).toThrow("chunkSize must be a positive integer");
    });
});
