<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# template
see template.md for info on how templates are rendered

# mongoose + Turbopack

Mongoose models must be **referenced in function body code** (not just imported) in any file that uses `.populate()` on a ref to that model. Turbopack tree-shakes unused imports, which prevents `mongoose.model()` registration from executing and causes `MissingSchemaError` at runtime.

Always guard model imports with `void ModelName;` after the import block:

```ts
import CoverLetter from "@/models/CoverLetter";
import Resume from "@/models/Resume";

void CoverLetter;
void Resume;
```
