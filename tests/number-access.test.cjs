const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    filename,
  );
const { numberAccessPayload } = require("../src/api/numberAccess.ts");

test("saving a legacy unrestricted policy enables assignment enforcement", () => {
  assert.deepEqual(
    numberAccessPayload({
      enabled: false,
      revision: 2,
      accounts: [{ phoneNumberId: "a" }],
      members: [],
      assignments: [{ phoneNumberId: "a", userIds: [] }],
    }),
    {
      enabled: true,
      revision: 2,
      assignments: [{ phoneNumberId: "a", userIds: [] }],
    },
  );
});

test("number access updates send only policy fields and preserve the concurrency revision", () => {
  const policy = {
    enabled: true,
    revision: 4,
    accounts: [{ phoneNumberId: "a" }],
    members: [{ email: "private@example.com" }],
    assignments: [{ phoneNumberId: "a", userIds: ["one", "one", "two"] }],
  };
  assert.deepEqual(numberAccessPayload(policy), {
    enabled: true,
    revision: 4,
    assignments: [{ phoneNumberId: "a", userIds: ["one", "two"] }],
  });
  assert.deepEqual(policy.assignments[0].userIds, ["one", "one", "two"]);
});

test("disconnected number rows are not resubmitted from an old mobile policy", () => {
  assert.deepEqual(
    numberAccessPayload({
      enabled: false,
      revision: 5,
      accounts: [],
      members: [],
      assignments: [{ phoneNumberId: "disconnected", userIds: ["one"] }],
    }),
    {
      enabled: true,
      revision: 5,
      assignments: [],
    },
  );
});
