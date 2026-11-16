// Balisage i18n : entoure de t() les textes affichés des fichiers .tsx (idempotent).
// Usage : node tools/i18n-wrap.mjs src   (depuis la racine du projet)
import fs from 'node:fs'; import path from 'node:path'; import ts from 'typescript';
const ROOT = path.resolve(process.argv[2] ?? 'src');
const ATTRS = new Set(['title', 'aria-label', 'placeholder', 'label', 'alt', 'hint', 'reason', 'unit', 'confirmLabel', 'step', 'caption']);
const FIELDS = new Set(['text', 'label', 'title', 'name', 'desc', 'why', 'what', 'real', 'tip', 'pitch', 'question', 'value', 'result', 'impression', 'conclusion', 'gain', 'loss', 'save', 'lose', 'detail', 'role', 'priority', 'voice', 'hint', 'summary', 'caption', 'speaker', 'reason', 'error', 'message', 'notice', 'interrupted', 'serverNote', 'advisorRole', 'motivation', 'clue', 'indice']);
const letters = (s) => (s.match(/[A-Za-zÀ-ÿ]/g) ?? []).length >= 2;
const decode = (s) => s.replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
const files = []; (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) { if (f !== 'i18n') walk(p); } else if (p.endsWith('.tsx') && !p.includes('.test.')) files.push(p); } })(ROOT);
let total = 0;
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8'); const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX); const edits = [];
  const isT = (e) => ts.isCallExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === 't';
  function visit(n) {
    if (ts.isJsxText(n)) {
      const raw = n.getFullText(); const inner = raw.trim();
      const parentTag = n.parent && ts.isJsxElement(n.parent) ? n.parent.openingElement.tagName.getText() : '';
      if (inner && letters(inner) && parentTag !== 'style') {
        const lead = raw.slice(0, raw.indexOf(inner[0])); const trail = raw.slice(raw.lastIndexOf(inner[inner.length - 1]) + 1);
        const text = decode(inner).replace(/\s+/g, ' ');
        edits.push([n.getFullStart(), n.getEnd(), `${lead}{t(${JSON.stringify(text)})}${trail}`]);
      }
    } else if (ts.isJsxAttribute(n) && n.initializer) {
      const name = n.name.getText();
      if (ATTRS.has(name)) {
        const init = n.initializer;
        if (ts.isStringLiteral(init) && letters(init.text)) edits.push([init.getStart(), init.getEnd(), `{t(${JSON.stringify(init.text)})}`]);
        else if (ts.isJsxExpression(init) && init.expression && ts.isPropertyAccessExpression(init.expression) && FIELDS.has(init.expression.name.text)) edits.push([init.expression.getStart(), init.expression.getEnd(), `t(${init.expression.getText()})`]);
      }
    } else if (ts.isJsxExpression(n) && n.expression && (ts.isJsxElement(n.parent) || ts.isJsxFragment(n.parent))) {
      const e = n.expression;
      if (!isT(e) && ts.isPropertyAccessExpression(e) && FIELDS.has(e.name.text)) edits.push([e.getStart(), e.getEnd(), `t(${e.getText()})`]);
    }
    ts.forEachChild(n, visit);
  }
  visit(sf); if (!edits.length) continue;
  let out = src; for (const [a, b, r] of edits.sort((x, y) => y[0] - x[0])) out = out.slice(0, a) + r + out.slice(b);
  if (!/import \{[^}]*\bt\b[^}]*\} from '[./]*i18n'/.test(out)) {
    const rel = path.relative(path.dirname(file), path.join(ROOT, 'i18n')).split(path.sep).join('/'); const spec = rel.startsWith('.') ? rel : './' + rel;
    const lastImport = [...out.matchAll(/^import .*;$/gm)].at(-1); const at = lastImport ? lastImport.index + lastImport[0].length : 0;
    out = out.slice(0, at) + `\nimport { t } from '${spec}';` + out.slice(at);
  }
  fs.writeFileSync(file, out); total += edits.length; console.log(String(edits.length).padStart(4), path.relative(ROOT, file));
}
console.log('total', total);
