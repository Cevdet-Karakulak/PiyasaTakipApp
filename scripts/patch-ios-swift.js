const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const os = require('os');

console.log('[patch-ios-swift] Running Swift compatibility patches...');

function isSwift60Or61() {
  try {
    const res = spawnSync('swift', ['--version']);
    if (res.status === 0) {
      const out = res.stdout.toString();
      console.log(`[patch-ios-swift] Detected Swift toolchain: ${out.trim().split('\n')[0]}`);
      if (out.includes('Swift version 6.2') || out.includes('Swift version 6.3') || out.includes('Swift version 6.4')) {
        return false;
      }
    }
  } catch (_) {}
  return true;
}

const needSwift60Workarounds = isSwift60Or61();

// 1. Patch Package.swift files to swift-tools-version: 6.0 and ensure swiftLanguageModes: [.v6] with minimal concurrency
function patchPackageSwift(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '.git') {
        patchPackageSwift(fullPath);
      }
    } else if (entry.name === 'Package.swift') {
      try {
        let content = fs.readFileSync(fullPath, 'utf8');
        let changed = false;
        if (content.includes('swift-tools-version: 6.2')) {
          content = content.replace(/swift-tools-version:\s*6\.2/g, 'swift-tools-version: 6.0');
          changed = true;
          console.log(`[patch-ios-swift] Downgraded swift-tools-version to 6.0 in: ${fullPath}`);
        }
        if (needSwift60Workarounds) {
          // Swift 6 mode is strictly required by ExpoModulesJSI for C++ interop, Task.immediate and consuming: labels
          if (content.includes('swiftLanguageModes: [.v5]')) {
            content = content.replace(/swiftLanguageModes:\s*\[\.v5\]/g, 'swiftLanguageModes: [.v6]');
            changed = true;
            console.log(`[patch-ios-swift] Set swiftLanguageModes to [.v6] in: ${fullPath}`);
          }
          // Add minimal strict concurrency flag to suppress fatal data-race errors in Swift 6 mode
          if (!content.includes('"-strict-concurrency=minimal"') && content.includes('"-enable-library-evolution"')) {
            content = content.replace(
              /["']-enable-library-evolution["'],/g,
              `"-enable-library-evolution",\n          "-Xfrontend",\n          "-strict-concurrency=minimal",`
            );
            changed = true;
            console.log(`[patch-ios-swift] Added -strict-concurrency=minimal to: ${fullPath}`);
          }
          // Remove invalid -Werror warning group flags (e.g. "-Werror", "ImplicitStrongCapture") rejected by Swift 6.0 driver
          if (content.includes('-Werror')) {
            content = content.replace(/["']-Werror["'],\s*["'][A-Za-z0-9_-]+["'],?/g, '');
            changed = true;
            console.log(`[patch-ios-swift] Stripped invalid -Werror warning flags in: ${fullPath}`);
          }
          // Remove trailing commas before closing parentheses (invalid in Swift 6.0 Package.swift parser)
          if (/,\s*\)/.test(content)) {
            content = content.replace(/,\s*\)/g, ')');
            changed = true;
            console.log(`[patch-ios-swift] Stripped trailing commas before ')' in: ${fullPath}`);
          }
        }
        if (changed) {
          fs.writeFileSync(fullPath, content, 'utf8');
        }
      } catch (err) {
        console.warn(`[patch-ios-swift] Could not patch ${fullPath}:`, err.message);
      }
    }
  }
}

const nodeModulesDir = path.resolve(__dirname, '..', 'node_modules');
patchPackageSwift(nodeModulesDir);

// 2. Patch JavaScriptObject.swift in expo-modules-jsi
const jsObjPath = path.resolve(
  nodeModulesDir,
  'expo-modules-jsi',
  'apple',
  'Sources',
  'ExpoModulesJSI',
  'Runtime',
  'Values',
  'JavaScriptObject.swift'
);

if (fs.existsSync(jsObjPath)) {
  let content = fs.readFileSync(jsObjPath, 'utf8');
  const target = `    try runtime._withUnsafeGuaranteedRef { runtime in
      try JavaScriptActor.assumeIsolated {
        try encode(JavaScriptValue.Slot(slot), runtime)
      }
    }`;

  const replacement = `    try runtime._withUnsafeGuaranteedRef { runtime in
      let rawSlot = UInt(bitPattern: slot)
      try JavaScriptActor.assumeIsolated {
        let localSlot = UnsafeMutablePointer<facebook.jsi.Value>(bitPattern: rawSlot)!
        try encode(JavaScriptValue.Slot(localSlot), runtime)
      }
    }`;

  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(jsObjPath, content, 'utf8');
    console.log('[patch-ios-swift] Successfully patched JavaScriptObject.swift for Swift 6 data-race immunity!');
  } else {
    console.log('[patch-ios-swift] JavaScriptObject.swift already patched.');
  }
} else {
  console.log('[patch-ios-swift] JavaScriptObject.swift not found at:', jsObjPath);
}

// Always ensure build-xcframework.sh has CODE_SIGNING_ALLOWED=NO so intermediate SPM builds do not attempt code signing
const buildXcfPathAlways = path.resolve(
  nodeModulesDir,
  'expo-modules-jsi',
  'apple',
  'scripts',
  'build-xcframework.sh'
);
if (fs.existsSync(buildXcfPathAlways)) {
  let content = fs.readFileSync(buildXcfPathAlways, 'utf8');
  if (!content.includes('CODE_SIGNING_ALLOWED=NO') && content.includes('SWIFT_COMPILATION_MODE=wholemodule')) {
    content = content.replace(
      'SWIFT_COMPILATION_MODE=wholemodule \\',
      'SWIFT_COMPILATION_MODE=wholemodule \\\n    SWIFT_STRICT_CONCURRENCY=minimal \\\n    CODE_SIGNING_ALLOWED=NO \\'
    );
    fs.writeFileSync(buildXcfPathAlways, content, 'utf8');
    console.log('[patch-ios-swift] Added CODE_SIGNING_ALLOWED=NO to build-xcframework.sh!');
  }
}

if (needSwift60Workarounds) {
// 3. Patch RuntimeScheduler.h in expo-modules-jsi (strip SWIFT_RETURNS_RETAINED which is unknown in Swift 6.0 / Clang)
const runtimeSchedulerPath = path.resolve(
  nodeModulesDir,
  'expo-modules-jsi',
  'apple',
  'Sources',
  'ExpoModulesJSI-Cxx',
  'include',
  'RuntimeScheduler.h'
);

if (fs.existsSync(runtimeSchedulerPath)) {
  let content = fs.readFileSync(runtimeSchedulerPath, 'utf8');
  if (content.includes('SWIFT_RETURNS_RETAINED')) {
    content = content.replace(/\s*SWIFT_RETURNS_RETAINED/g, '');
    fs.writeFileSync(runtimeSchedulerPath, content, 'utf8');
    console.log('[patch-ios-swift] Successfully stripped SWIFT_RETURNS_RETAINED from RuntimeScheduler.h for Swift 6.0!');
  } else {
    console.log('[patch-ios-swift] RuntimeScheduler.h already patched.');
  }
} else {
  console.log('[patch-ios-swift] RuntimeScheduler.h not found at:', runtimeSchedulerPath);
}

// 4. Patch JavaScriptRef.swift in expo-modules-jsi (strip Escapable which requires experimental NonescapableTypes in Swift 6.0)
const jsRefPath = path.resolve(
  nodeModulesDir,
  'expo-modules-jsi',
  'apple',
  'Sources',
  'ExpoModulesJSI',
  'Runtime',
  'JavaScriptRef.swift'
);

if (fs.existsSync(jsRefPath)) {
  let content = fs.readFileSync(jsRefPath, 'utf8');
  if (content.includes(', Escapable')) {
    content = content.replace(/,\s*Escapable/g, '');
    fs.writeFileSync(jsRefPath, content, 'utf8');
    console.log('[patch-ios-swift] Successfully stripped Escapable from JavaScriptRef.swift!');
  } else {
    console.log('[patch-ios-swift] JavaScriptRef.swift already patched.');
  }
} else {
  console.log('[patch-ios-swift] JavaScriptRef.swift not found at:', jsRefPath);
}

// 5. Patch JavaScriptError.swift in expo-modules-jsi (remove public from CppError extension to prevent library evolution error)
const jsErrPath = path.resolve(
  nodeModulesDir,
  'expo-modules-jsi',
  'apple',
  'Sources',
  'ExpoModulesJSI',
  'Runtime',
  'Values',
  'JavaScriptError.swift'
);

if (fs.existsSync(jsErrPath)) {
  let content = fs.readFileSync(jsErrPath, 'utf8');
  const target = `extension expo.CppError: Error {
  public var message: String {`;
  const replacement = `extension expo.CppError: Error {
  var message: String {`;
  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(jsErrPath, content, 'utf8');
    console.log('[patch-ios-swift] Successfully patched JavaScriptError.swift CppError extension!');
  } else {
    console.log('[patch-ios-swift] JavaScriptError.swift already patched.');
  }
} else {
  console.log('[patch-ios-swift] JavaScriptError.swift not found at:', jsErrPath);
}

// 6. Patch JavaScriptActor.swift in expo-modules-jsi (make runIsolated nonisolated taking () -> T so assumeIsolated needs neither actor access nor escaping conversion)
const jsActorPath = path.resolve(
  nodeModulesDir,
  'expo-modules-jsi',
  'apple',
  'Sources',
  'ExpoModulesJSI',
  'Runtime',
  'JavaScriptActor.swift'
);

if (fs.existsSync(jsActorPath)) {
  let content = fs.readFileSync(jsActorPath, 'utf8');
  let changed = false;

  // Remove @JavaScriptActor from runIsolated / runIsolatedThrowing and from their operation parameter
  if (content.includes('@JavaScriptActor\n  @usableFromInline\n  internal static func runIsolated')) {
    content = content.replace(
      /@JavaScriptActor\s*\n\s*@usableFromInline\s*\n\s*internal static func runIsolated/g,
      '@usableFromInline\n  internal static func runIsolated'
    );
    changed = true;
  }

  if (content.includes('internal static func runIsolated<T: ~Copyable>(_ operation: @JavaScriptActor () -> T) -> T')) {
    content = content.replace(
      'internal static func runIsolated<T: ~Copyable>(_ operation: @JavaScriptActor () -> T) -> T',
      'internal static func runIsolated<T: ~Copyable>(_ operation: () -> T) -> T'
    );
    changed = true;
  }

  if (content.includes('internal static func runIsolatedThrowing<T: ~Copyable>(_ operation: @JavaScriptActor () throws -> T) throws -> T')) {
    content = content.replace(
      'internal static func runIsolatedThrowing<T: ~Copyable>(_ operation: @JavaScriptActor () throws -> T) throws -> T',
      'internal static func runIsolatedThrowing<T: ~Copyable>(_ operation: () throws -> T) throws -> T'
    );
    changed = true;
  }

  // Update IsolatedRunner typealiases in assumeIsolated to match nonisolated runIsolated
  if (content.includes('typealias IsolatedRunner = @JavaScriptActor (@JavaScriptActor () -> T) -> T')) {
    content = content.replace(
      'typealias IsolatedRunner = @JavaScriptActor (@JavaScriptActor () -> T) -> T',
      'typealias IsolatedRunner = (() -> T) -> T'
    );
    changed = true;
  }

  if (content.includes('typealias IsolatedRunner = @JavaScriptActor (@JavaScriptActor () throws -> T) throws -> T') ||
      content.includes('typealias IsolatedRunner = (() throws -> T) -> T')) {
    content = content.replace(
      /typealias IsolatedRunner = (?:@JavaScriptActor \(@JavaScriptActor \(\) throws -> T\) throws -> T|\(\(\) throws -> T\) -> T)/g,
      'typealias IsolatedRunner = (() throws -> T) throws -> T'
    );
    changed = true;
  }

  // Restore runner call if previously replaced with NonisolatedOp
  const prevNonisolatedOp = `    typealias NonisolatedOp = () -> T
    let raw = unsafeBitCast(operation, to: NonisolatedOp.self)
    return raw()`;
  if (content.includes(prevNonisolatedOp)) {
    content = content.replace(
      prevNonisolatedOp,
      `    let runner = unsafeBitCast(runIsolated as IsolatedRunner, to: NonisolatedRunner.self)
    return runner(operation)`
    );
    changed = true;
  }

  const prevNonisolatedOpThrowing = `    typealias NonisolatedOp = () throws -> T
    let raw = unsafeBitCast(operation, to: NonisolatedOp.self)
    return try raw()`;
  if (content.includes(prevNonisolatedOpThrowing)) {
    content = content.replace(
      prevNonisolatedOpThrowing,
      `    let runner = unsafeBitCast(runIsolatedThrowing as IsolatedRunner, to: NonisolatedRunner.self)
    return try runner(operation)`
    );
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(jsActorPath, content, 'utf8');
    console.log('[patch-ios-swift] Successfully patched JavaScriptActor.swift assumeIsolated & runIsolated for Swift 6.0!');
  } else {
    console.log('[patch-ios-swift] JavaScriptActor.swift already patched.');
  }
} else {
  console.log('[patch-ios-swift] JavaScriptActor.swift not found at:', jsActorPath);
}

// 7. Patch JavaScriptRuntime.swift in expo-modules-jsi (replace bare-slash regex with NSRegularExpression / range)
const jsRuntimePath = path.resolve(
  nodeModulesDir,
  'expo-modules-jsi',
  'apple',
  'Sources',
  'ExpoModulesJSI',
  'Runtime',
  'JavaScriptRuntime.swift'
);

if (fs.existsSync(jsRuntimePath)) {
  let content = fs.readFileSync(jsRuntimePath, 'utf8');
  const target = 'if name.wholeMatch(of: /^[a-zA-Z_$][a-zA-Z0-9_$]*$/) == nil {';
  const replacement = 'if name.range(of: "^[a-zA-Z_$][a-zA-Z0-9_$]*$", options: .regularExpression) == nil {';
  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(jsRuntimePath, content, 'utf8');
    console.log('[patch-ios-swift] Successfully replaced bare-slash regex in JavaScriptRuntime.swift!');
  } else {
    console.log('[patch-ios-swift] JavaScriptRuntime.swift regex already patched.');
  }
} else {
  console.log('[patch-ios-swift] JavaScriptRuntime.swift not found at:', jsRuntimePath);
}

// 8. Patch JavaScriptPromise.swift in expo-modules-jsi (remove @JavaScriptActor from LongLivedState and add nonisolated init)
const jsPromisePath = path.resolve(
  nodeModulesDir,
  'expo-modules-jsi',
  'apple',
  'Sources',
  'ExpoModulesJSI',
  'Runtime',
  'Values',
  'JavaScriptPromise.swift'
);

if (fs.existsSync(jsPromisePath)) {
  let content = fs.readFileSync(jsPromisePath, 'utf8');
  let changed = false;
  if (content.includes('@JavaScriptActor\n  private final class LongLivedState: LongLivedObject {')) {
    content = content.replace(
      /@JavaScriptActor\s*\n\s*private final class LongLivedState: LongLivedObject {/g,
      'private final class LongLivedState: LongLivedObject {\n    nonisolated init() {}'
    );
    changed = true;
    console.log('[patch-ios-swift] Successfully patched LongLivedState in JavaScriptPromise.swift!');
  }
  if (changed) {
    fs.writeFileSync(jsPromisePath, content, 'utf8');
  } else {
    console.log('[patch-ios-swift] JavaScriptPromise.swift already patched.');
  }
} else {
  console.log('[patch-ios-swift] JavaScriptPromise.swift not found at:', jsPromisePath);
}

// 9. Patch JavaScriptCallback.swift in expo-modules-jsi (LongLivedState nonisolated init + @Sendable on local @JavaScriptActor func call)
const jsCallbackPath = path.resolve(
  nodeModulesDir,
  'expo-modules-jsi',
  'apple',
  'Sources',
  'ExpoModulesJSI',
  'Runtime',
  'JavaScriptCallback.swift'
);

if (fs.existsSync(jsCallbackPath)) {
  let content = fs.readFileSync(jsCallbackPath, 'utf8');
  let changed = false;
  if (content.includes('@JavaScriptActor\n  private final class LongLivedState: LongLivedObject {')) {
    content = content.replace(
      /@JavaScriptActor\s*\n\s*private final class LongLivedState: LongLivedObject {/g,
      'private final class LongLivedState: LongLivedObject {\n    nonisolated init() {}'
    );
    changed = true;
    console.log('[patch-ios-swift] Successfully patched LongLivedState in JavaScriptCallback.swift!');
  }

  // In Swift 6.0 (Xcode 16), local @JavaScriptActor func declarations cannot be marked @Sendable and are not inferred as @Sendable.
  // Convert them to typed @JavaScriptActor @Sendable closure constants (let call: ... = { function, runtime in ... })
  const voidCallRegex = /    @JavaScriptActor(?: @Sendable)?\n    func call\(_ function: borrowing JavaScriptFunction, _ runtime: JavaScriptRuntime\) throws \{/g;
  if (voidCallRegex.test(content)) {
    content = content.replace(
      voidCallRegex,
      '    let call: @JavaScriptActor @Sendable (borrowing JavaScriptFunction, JavaScriptRuntime) throws -> Void = { function, runtime in'
    );
    changed = true;
    console.log('[patch-ios-swift] Converted local Void func call to @JavaScriptActor @Sendable closure in JavaScriptCallback.swift!');
  }

  const boxCallRegex = /    @JavaScriptActor(?: @Sendable)?\n    func call\(_ function: borrowing JavaScriptFunction, _ runtime: JavaScriptRuntime\) throws -> UncheckedSendableBox<R>\n    \{/g;
  if (boxCallRegex.test(content)) {
    content = content.replace(
      boxCallRegex,
      '    let call: @JavaScriptActor @Sendable (borrowing JavaScriptFunction, JavaScriptRuntime) throws -> UncheckedSendableBox<R> = { function, runtime in'
    );
    changed = true;
    console.log('[patch-ios-swift] Converted local UncheckedSendableBox func call to @JavaScriptActor @Sendable closure in JavaScriptCallback.swift!');
  }

  // Also ensure @escaping @JavaScriptActor closures captured by local func call are explicitly @Sendable
  if (content.includes('@escaping @JavaScriptActor (')) {
    content = content.replace(
      /@escaping @JavaScriptActor \(/g,
      '@escaping @JavaScriptActor @Sendable ('
    );
    changed = true;
    console.log('[patch-ios-swift] Added @Sendable to @escaping @JavaScriptActor closures in JavaScriptCallback.swift!');
  }

  if (changed) {
    fs.writeFileSync(jsCallbackPath, content, 'utf8');
  } else {
    console.log('[patch-ios-swift] JavaScriptCallback.swift already patched.');
  }
} else {
  console.log('[patch-ios-swift] JavaScriptCallback.swift not found at:', jsCallbackPath);
}

// 10. Patch build-xcframework.sh in expo-modules-jsi to pass SWIFT_STRICT_CONCURRENCY=minimal
const buildXcfPath = path.resolve(
  nodeModulesDir,
  'expo-modules-jsi',
  'apple',
  'scripts',
  'build-xcframework.sh'
);

if (fs.existsSync(buildXcfPath)) {
  let content = fs.readFileSync(buildXcfPath, 'utf8');
  if (!content.includes('SWIFT_STRICT_CONCURRENCY=minimal') && content.includes('SWIFT_COMPILATION_MODE=wholemodule')) {
    content = content.replace(
      'SWIFT_COMPILATION_MODE=wholemodule \\',
      'SWIFT_COMPILATION_MODE=wholemodule \\\n    SWIFT_STRICT_CONCURRENCY=minimal \\\n    CODE_SIGNING_ALLOWED=NO \\'
    );
    fs.writeFileSync(buildXcfPath, content, 'utf8');
    console.log('[patch-ios-swift] Added SWIFT_STRICT_CONCURRENCY=minimal and CODE_SIGNING_ALLOWED=NO to build-xcframework.sh!');
  } else if (!content.includes('CODE_SIGNING_ALLOWED=NO') && content.includes('SWIFT_STRICT_CONCURRENCY=minimal')) {
    content = content.replace(
      'SWIFT_STRICT_CONCURRENCY=minimal \\',
      'SWIFT_STRICT_CONCURRENCY=minimal \\\n    CODE_SIGNING_ALLOWED=NO \\'
    );
    fs.writeFileSync(buildXcfPath, content, 'utf8');
    console.log('[patch-ios-swift] Added CODE_SIGNING_ALLOWED=NO to build-xcframework.sh!');
  } else {
    console.log('[patch-ios-swift] build-xcframework.sh already patched.');
  }
}

// 11. Patch Task+immediate.swift in expo-modules-jsi (Task.immediate and Task(name:) require iOS 26 SDK / Swift 6.2+)
const taskImmediatePath = path.resolve(
  nodeModulesDir,
  'expo-modules-jsi',
  'apple',
  'Sources',
  'ExpoModulesJSI',
  'Extensions',
  'Task+immediate.swift'
);

if (fs.existsSync(taskImmediatePath)) {
  let content = fs.readFileSync(taskImmediatePath, 'utf8');
  if (content.includes('Task.immediate(') || content.includes('Task(name: name,')) {
    const newTaskImmediate = `// swift-format-ignore-file: AlwaysUseLowerCamelCase

extension Task where Failure == any Error {
  @discardableResult
  public static func immediate_polyfill(
    name: String? = nil,
    priority: TaskPriority? = nil,
    @_inheritActorContext @_implicitSelfCapture operation: sending @escaping @isolated(any) () async throws -> Success
  ) -> Task<Success, any Error> {
    return Task(priority: priority ?? .high, operation: operation)
  }
}
`;
    fs.writeFileSync(taskImmediatePath, newTaskImmediate, 'utf8');
    console.log('[patch-ios-swift] Successfully patched Task+immediate.swift for Xcode 16 / Swift 6.0!');
  } else {
    console.log('[patch-ios-swift] Task+immediate.swift already patched.');
  }
}

// 12. Patch HostObjectCallbacks.h, HostFunctionClosure.h, and JavaScriptRuntime.swift for C++ interop in Swift 6.0
const hostObjCallbacksPath = path.resolve(
  nodeModulesDir,
  'expo-modules-jsi',
  'apple',
  'Sources',
  'ExpoModulesJSI-Cxx',
  'include',
  'HostObjectCallbacks.h'
);

if (fs.existsSync(hostObjCallbacksPath)) {
  let content = fs.readFileSync(hostObjCallbacksPath, 'utf8');
  if (!content.includes('static inline void pushPropNameId(')) {
    content = content.replace(
      'using PropNameIds = std::vector<facebook::jsi::PropNameID>;',
      `using PropNameIds = std::vector<facebook::jsi::PropNameID>;
  static inline void pushPropNameId(PropNameIds &vec, facebook::jsi::PropNameID propNameId) {
    vec.push_back(std::move(propNameId));
  }`
    );
    fs.writeFileSync(hostObjCallbacksPath, content, 'utf8');
    console.log('[patch-ios-swift] Added pushPropNameId helper to HostObjectCallbacks.h!');
  } else {
    console.log('[patch-ios-swift] HostObjectCallbacks.h already patched.');
  }
}

const hostFuncClosurePath = path.resolve(
  nodeModulesDir,
  'expo-modules-jsi',
  'apple',
  'Sources',
  'ExpoModulesJSI-Cxx',
  'include',
  'HostFunctionClosure.h'
);

if (fs.existsSync(hostFuncClosurePath)) {
  let content = fs.readFileSync(hostFuncClosurePath, 'utf8');
  if (!content.includes('static inline HostFunctionClosure *_Nonnull make(')) {
    content = content.replace(
      'explicit HostFunctionClosure(Context context, Closure closure, Deallocator deallocator) : RetainedSwiftPointer(context, deallocator), _closure(closure) {};',
      `explicit HostFunctionClosure(Context context, Closure closure, Deallocator deallocator) : RetainedSwiftPointer(context, deallocator), _closure(closure) {};

  static inline HostFunctionClosure *_Nonnull make(Context context, Closure closure, Deallocator deallocator) {
    return new HostFunctionClosure(context, closure, deallocator);
  }`
    );
    fs.writeFileSync(hostFuncClosurePath, content, 'utf8');
    console.log('[patch-ios-swift] Added HostFunctionClosure::make factory to HostFunctionClosure.h!');
  } else {
    console.log('[patch-ios-swift] HostFunctionClosure.h already patched.');
  }
}

if (fs.existsSync(jsRuntimePath)) {
  let content = fs.readFileSync(jsRuntimePath, 'utf8');
  let changed = false;

  if (content.includes('vector.push_back(consuming: propNameId)')) {
    content = content.replace(
      'vector.push_back(consuming: propNameId)',
      'expo.HostObjectCallbacks.pushPropNameId(&vector, propNameId)'
    );
    changed = true;
    console.log('[patch-ios-swift] Replaced vector.push_back(consuming:) in JavaScriptRuntime.swift!');
  }

  if (content.includes('return expo.HostFunctionClosure(context, call, deallocate)')) {
    content = content.replace(
      'return expo.HostFunctionClosure(context, call, deallocate)',
      'return expo.HostFunctionClosure.make(context, call, deallocate)'
    );
    changed = true;
    console.log('[patch-ios-swift] Replaced expo.HostFunctionClosure(...) with HostFunctionClosure.make(...) in JavaScriptRuntime.swift!');
  }

  if (changed) {
    fs.writeFileSync(jsRuntimePath, content, 'utf8');
  }
}

// 13. Patch Swift 6.0 ~Copyable self.init bugs, consuming closure parameter inference, and UncheckedSendable pointer captures
if (fs.existsSync(jsObjPath)) {
  let content = fs.readFileSync(jsObjPath, 'utf8');
  const initRegex = /  public init\(_ runtime: borrowing JavaScriptRuntime\) \{\r?\n    self\.init\(runtime, facebook\.jsi\.Object\(runtime\.pointee\)\)\r?\n  \}/;
  const replacementInit = `  public init(_ runtime: borrowing JavaScriptRuntime) {
    self.runtimeHandle = runtime.handle
    self.pointee = facebook.jsi.Object(runtime.pointee)
  }`;
  if (initRegex.test(content)) {
    content = content.replace(initRegex, replacementInit);
    fs.writeFileSync(jsObjPath, content, 'utf8');
    console.log('[patch-ios-swift] Patched ~Copyable self.init in JavaScriptObject.swift!');
  }
}

const jsArrayPath = path.resolve(
  nodeModulesDir,
  'expo-modules-jsi',
  'apple',
  'Sources',
  'ExpoModulesJSI',
  'Runtime',
  'Values',
  'JavaScriptArray.swift'
);

if (fs.existsSync(jsArrayPath)) {
  let content = fs.readFileSync(jsArrayPath, 'utf8');
  const targetInit = `  public init(_ runtime: borrowing JavaScriptRuntime, length: Int = 0) {
    self.init(runtime, facebook.jsi.Array(runtime.pointee, length))
  }`;
  const replacementInit = `  public init(_ runtime: borrowing JavaScriptRuntime, length: Int = 0) {
    self.runtimeHandle = runtime.handle
    self.pointee = facebook.jsi.Array(runtime.pointee, length)
  }`;
  if (content.includes(targetInit)) {
    content = content.replace(targetInit, replacementInit);
    fs.writeFileSync(jsArrayPath, content, 'utf8');
    console.log('[patch-ios-swift] Patched ~Copyable self.init in JavaScriptArray.swift!');
  }
}

if (fs.existsSync(jsPromisePath)) {
  let content = fs.readFileSync(jsPromisePath, 'utf8');
  const targetInit = `  @JavaScriptActor
  internal init(_ runtime: borrowing JavaScriptRuntime, _ object: consuming facebook.jsi.Object) throws {
    try self.init(runtime, JavaScriptObject(runtime, object))
  }`;
  const replacementInit = `  @JavaScriptActor
  internal init(_ runtime: borrowing JavaScriptRuntime, _ object: consuming facebook.jsi.Object) throws {
    let jsObj = JavaScriptObject(runtime, object)
    self.scheduler = runtime.scheduler
    _ = try jsObj.getPropertyAsFunction(.cached(runtime, "then"))
    longLivedState.object = jsObj.asValue()
    runtime.longLivedObjects.add(longLivedState)
  }`;
  if (content.includes(targetInit)) {
    content = content.replace(targetInit, replacementInit);
    fs.writeFileSync(jsPromisePath, content, 'utf8');
    console.log('[patch-ios-swift] Patched ~Copyable self.init in JavaScriptPromise.swift!');
  }
}

if (fs.existsSync(jsRuntimePath)) {
  let content = fs.readFileSync(jsRuntimePath, 'utf8');
  const targetClosure = `    let nativeConstructor = createFunction(name) { this, arguments in
      return try constructor(this, arguments)
    }`;
  const replacementClosure = `    let nativeConstructor = createFunction(name) { (this: consuming JavaScriptValue, arguments: consuming JavaScriptValuesBuffer) in
      return try constructor(this, arguments)
    }`;
  if (content.includes(targetClosure)) {
    content = content.replace(targetClosure, replacementClosure);
    fs.writeFileSync(jsRuntimePath, content, 'utf8');
    console.log('[patch-ios-swift] Patched consuming closure parameters in JavaScriptRuntime.swift!');
  }
}

const jsFuncPath = path.resolve(
  nodeModulesDir,
  'expo-modules-jsi',
  'apple',
  'Sources',
  'ExpoModulesJSI',
  'Runtime',
  'Values',
  'JavaScriptFunction.swift'
);

if (fs.existsSync(jsFuncPath)) {
  let content = fs.readFileSync(jsFuncPath, 'utf8');
  let changed = false;

  if (content.includes('    ) { arguments in')) {
    content = content.replace(
      /    \) \{ arguments in/g,
      '    ) { (arguments: consuming JavaScriptValuesBuffer) in'
    );
    changed = true;
    console.log('[patch-ios-swift] Patched consuming arguments closure parameter in JavaScriptFunction.swift!');
  }

  const targetAlloc = `      nonisolated(unsafe) let arguments = storage.baseAddress!
      nonisolated(unsafe) let result = arguments + argumentCount
      for index in 0...argumentCount {
        expo.emplaceUndefined(arguments + index)
      }
      defer {
        expo.destroyValues(arguments, argumentCount + 1)
      }
      try JavaScriptActor.assumeIsolated {
        try emplacing(JavaScriptValuesBuffer(runtime, start: arguments, count: argumentCount), runtime)
      }
      try throwCppErrorUnlessSucceeded(
        expo.callFunctionInto(runtime.pointee, pointee, arguments, argumentCount, result)
      )
      try JavaScriptActor.assumeIsolated {
        try withResult(JavaScriptUnownedValue(runtime.pointee, result), runtime)
      }`;

  const replacementAlloc = `      let arguments = storage.baseAddress!
      let result = arguments + argumentCount
      let sendableArguments = UncheckedSendable(arguments)
      let sendableResult = UncheckedSendable(result)
      for index in 0...argumentCount {
        expo.emplaceUndefined(arguments + index)
      }
      defer {
        expo.destroyValues(arguments, argumentCount + 1)
      }
      try JavaScriptActor.assumeIsolated {
        try emplacing(JavaScriptValuesBuffer(runtime, start: sendableArguments.value, count: argumentCount), runtime)
      }
      try throwCppErrorUnlessSucceeded(
        expo.callFunctionInto(runtime.pointee, pointee, arguments, argumentCount, result)
      )
      try JavaScriptActor.assumeIsolated {
        try withResult(JavaScriptUnownedValue(runtime.pointee, sendableResult.value), runtime)
      }`;

  if (content.includes(targetAlloc)) {
    content = content.replace(targetAlloc, replacementAlloc);
    changed = true;
    console.log('[patch-ios-swift] Patched UncheckedSendable pointer captures in JavaScriptFunction.swift!');
  }

  if (changed) {
    fs.writeFileSync(jsFuncPath, content, 'utf8');
  }
}

// 14. Patch precompiled .swiftinterface files in ios/Pods and prebuilt tarballs in node_modules
// Prebuilt ExpoModulesCore.xcframework was compiled with Swift 6.3.1 (Xcode 26) which emits isolated conformance syntax
// `extension UIKit.UIView : @_Concurrency.MainActor ExpoModulesCore.AnyArgument` in .swiftinterface files.
// Swift 6.0 (Xcode 16) rejects `@_Concurrency.MainActor` in protocol conformance position with `unknown attribute '_Concurrency.MainActor'`.

function patchSwiftInterfaceContent(content) {
  let updated = content;
  // Strip @_Concurrency.MainActor or @MainActor from protocol conformance clauses (after `:` before protocol name)
  updated = updated.replace(/(:\s*)@(?:_Concurrency\.)?MainActor\s+/g, '$1');
  return updated;
}

function patchSwiftInterfaceFilesInDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      patchSwiftInterfaceFilesInDir(fullPath);
    } else if (entry.name.endsWith('.swiftinterface')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const updated = patchSwiftInterfaceContent(content);
        if (updated !== content) {
          fs.writeFileSync(fullPath, updated, 'utf8');
          console.log(`[patch-ios-swift] Stripped isolated conformance attribute in: ${fullPath}`);
        }
      } catch (err) {
        console.warn(`[patch-ios-swift] Failed to patch swiftinterface ${fullPath}:`, err.message);
      }
    }
  }
}

function patchPrebuiltTarball(tarballPath) {
  if (!fs.existsSync(tarballPath)) return;
  const listRes = spawnSync('tar', ['-ztf', tarballPath]);
  if (listRes.status !== 0) return;
  const files = listRes.stdout.toString().split('\n').filter(f => f.trim().endsWith('.swiftinterface'));
  if (files.length === 0) return;

  // Check if any swiftinterface inside the tarball needs patching
  let needsPatch = false;
  for (const f of files) {
    const checkRes = spawnSync('tar', ['-zxvf', tarballPath, '-O', f.trim()]);
    if (checkRes.status === 0) {
      const text = checkRes.stdout.toString();
      if (patchSwiftInterfaceContent(text) !== text) {
        needsPatch = true;
        break;
      }
    }
  }
  if (!needsPatch) return;

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'expo-xcfw-patch-'));
  try {
    const extractRes = spawnSync('tar', ['-xzf', tarballPath, '-C', tmpDir]);
    if (extractRes.status === 0) {
      patchSwiftInterfaceFilesInDir(tmpDir);
      const topEntries = fs.readdirSync(tmpDir);
      const repackRes = spawnSync('tar', ['-czf', tarballPath, '-C', tmpDir, ...topEntries]);
      if (repackRes.status === 0) {
        console.log(`[patch-ios-swift] Repacked prebuilt tarball with Swift 6.0 compatible .swiftinterface: ${tarballPath}`);
      }
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function findAndPatchTarballs(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '.git') {
        findAndPatchTarballs(fullPath);
      }
    } else if (entry.name.endsWith('.tar.gz') && (fullPath.includes('prebuilds') || fullPath.includes('artifacts'))) {
      patchPrebuiltTarball(fullPath);
    }
  }
}

  findAndPatchTarballs(nodeModulesDir);
  const iosPodsDir = path.resolve(__dirname, '..', 'ios', 'Pods');
  if (fs.existsSync(iosPodsDir)) {
    patchSwiftInterfaceFilesInDir(iosPodsDir);
    findAndPatchTarballs(iosPodsDir);
  }
} else {
  console.log('[patch-ios-swift] Swift 6.2+ (Xcode 26) detected — skipping Swift 6.0-only workarounds.');
}

// 15. Configure Xcode project pbxproj for Manual App Store Signing (when APPLE_TEAM_ID & PROVISIONING_PROFILE_UUID are set)
const teamId = process.env.APPLE_TEAM_ID;
const profileUuid = process.env.PROVISIONING_PROFILE_UUID;
if (teamId && profileUuid) {
  const podsPbxproj = path.resolve(__dirname, '..', 'ios', 'Pods', 'Pods.xcodeproj', 'project.pbxproj');
  if (fs.existsSync(podsPbxproj)) {
    let pbx = fs.readFileSync(podsPbxproj, 'utf8');
    pbx = pbx.replace(/buildSettings = \{([\s\S]*?)\};/g, (match, inner) => {
      let cleaned = inner
        .replace(/^\s*CODE_SIGNING_ALLOWED\s*=.*;\r?\n?/gm, '')
        .replace(/^\s*CODE_SIGNING_REQUIRED\s*=.*;\r?\n?/gm, '')
        .replace(/^\s*"?CODE_SIGN_IDENTITY(?:\[sdk=iphoneos\*\])?"?\s*=.*;\r?\n?/gm, '')
        .replace(/^\s*PROVISIONING_PROFILE_SPECIFIER\s*=.*;\r?\n?/gm, '');
      return `buildSettings = {${cleaned}\t\t\t\tCODE_SIGNING_ALLOWED = NO;\n\t\t\t\tCODE_SIGNING_REQUIRED = NO;\n\t\t\t\tCODE_SIGN_IDENTITY = "";\n\t\t\t\t"CODE_SIGN_IDENTITY[sdk=iphoneos*]" = "";\n\t\t\t\tPROVISIONING_PROFILE_SPECIFIER = "";\n\t\t\t};`;
    });
    fs.writeFileSync(podsPbxproj, pbx, 'utf8');
    console.log('[patch-ios-swift] Disabled code signing on all targets in Pods.xcodeproj!');
  }

  const iosDir = path.resolve(__dirname, '..', 'ios');
  if (fs.existsSync(iosDir)) {
    const entries = fs.readdirSync(iosDir);
    for (const entry of entries) {
      if (entry.endsWith('.xcodeproj')) {
        const appPbxproj = path.join(iosDir, entry, 'project.pbxproj');
        if (fs.existsSync(appPbxproj)) {
          let pbx = fs.readFileSync(appPbxproj, 'utf8');
          pbx = pbx.replace(/buildSettings = \{([\s\S]*?)\};/g, (match, inner) => {
            if (!inner.includes('PRODUCT_BUNDLE_IDENTIFIER') && !inner.includes('INFOPLIST_FILE')) {
              let projCleaned = inner.replace(/^\s*DEVELOPMENT_TEAM\s*=.*;\r?\n?/gm, '');
              return `buildSettings = {${projCleaned}\t\t\t\tDEVELOPMENT_TEAM = ${teamId};\n\t\t\t};`;
            }
            let cleaned = inner
              .replace(/^\s*CODE_SIGN_STYLE\s*=.*;\r?\n?/gm, '')
              .replace(/^\s*"?CODE_SIGN_IDENTITY(?:\[sdk=iphoneos\*\])?"?\s*=.*;\r?\n?/gm, '')
              .replace(/^\s*DEVELOPMENT_TEAM\s*=.*;\r?\n?/gm, '')
              .replace(/^\s*"?PROVISIONING_PROFILE(?:_SPECIFIER)?"?\s*=.*;\r?\n?/gm, '');
            return `buildSettings = {${cleaned}\t\t\t\tCODE_SIGN_STYLE = Manual;\n\t\t\t\tCODE_SIGN_IDENTITY = "Apple Distribution";\n\t\t\t\t"CODE_SIGN_IDENTITY[sdk=iphoneos*]" = "Apple Distribution";\n\t\t\t\tDEVELOPMENT_TEAM = ${teamId};\n\t\t\t\tPROVISIONING_PROFILE_SPECIFIER = "${profileUuid}";\n\t\t\t};`;
          });
          fs.writeFileSync(appPbxproj, pbx, 'utf8');
          console.log(`[patch-ios-swift] Configured Manual Apple Distribution signing in ${entry}/project.pbxproj!`);
        }
      }
    }
  }
}

console.log('[patch-ios-swift] All Swift compatibility patches applied successfully!');
