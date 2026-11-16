// 2e passe : enveloppe dans t() les littéraux français non traduits situés DANS une fonction (rendu) des .tsx.
// Les constantes de module sont listées sans être modifiées (elles doivent être traduites au point d'affichage).
import ts from 'typescript'; import fs from 'node:fs'; import path from 'node:path';
const files = []; (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.tsx$/.test(f)) files.push(p); } })('src');
const EN = JSON.parse('{' + fs.readFileSync('src/i18n/en.ts', 'utf8').match(/= \{\n([\s\S]*)\n\};/)[1] + '}');
const isFr = (x) => FR.test(x) || (EN[x.replace(/\s+/g, ' ').trim()] !== undefined && EN[x.replace(/\s+/g, ' ').trim()] !== x.trim() && /[a-z]{3}/i.test(x));
const FR = /[éèêàùçôîœ’«»]|\b(le|la|les|des|du|une|un|et|pour|avec|sans|aucun|votre|vous|est|de)\b/i;
const SKIP_ATTR = new Set(['className', 'key', 'id', 'href', 'role', 'type', 'name', 'htmlFor', 'd', 'fill', 'viewBox', 'data-zone']);
const isT = (n) => ts.isCallExpression(n) && ts.isIdentifier(n.expression) && ['t', 'tr', 'tf'].includes(n.expression.text);
const inFn = (n) => { for (let q = n.parent; q; q = q.parent) if (ts.isFunctionLike(q)) return true; return false; };
let edits = 0;
for (const f of files) {
  if (f.endsWith('App.tsx')) continue;
  const code = fs.readFileSync(f, 'utf8'); const src = ts.createSourceFile(f, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const alias = /import \{ t as tr/.test(code) ? 'tr' : 't'; const reps = [];
  const visit = (n) => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
      const p = n.parent; let wrapped = false;
      for (let q = p; q && !ts.isSourceFile(q); q = q.parent) if (isT(q)) { wrapped = true; break; }
      const attr = ts.isJsxAttribute(p) ? p.name.getText() : null;
      const bad = ts.isImportDeclaration(p) || ts.isPropertyAssignment(p) && p.name === n || ts.isElementAccessExpression(p) || ts.isCaseClause(p) || ts.isBinaryExpression(p) && /[=!]==/.test(p.operatorToken.getText()) || ts.isLiteralTypeNode(p);
      if (!wrapped && !bad && isFr(n.text) && !(attr && SKIP_ATTR.has(attr))) {
        if (!inFn(n)) { console.log('MODULE', f, src.getLineAndCharacterOfPosition(n.getStart()).line + 1, n.text.slice(0, 60)); return; }
        const s = n.getStart(), e = n.getEnd(); const txt = code.slice(s, e);
        reps.push([s, e, attr ? `{${alias}(${txt})}` : `${alias}(${txt})`]);
      }
      return;
    }
    ts.forEachChild(n, visit);
  };
  visit(src);
  if (!reps.length) continue;
  let out = code; for (const [s, e, r] of reps.sort((a, b) => b[0] - a[0])) out = out.slice(0, s) + r + out.slice(e);
  if (!/from '(\.\.\/)+i18n'/.test(out)) { const rel = path.relative(path.dirname(f), 'src/i18n').replace(/\\/g, '/'); out = `import { t } from '${rel.startsWith('.') ? rel : './' + rel}';\n` + out; }
  fs.writeFileSync(f, out); edits += reps.length; console.log('EDIT', f, reps.length);
}
console.log('edits', edits);
