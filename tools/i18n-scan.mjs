// Liste les littéraux français non passés à t()/tr()/tf() (contrôle i18n). Usage : node tools/i18n-scan.mjs
import ts from 'typescript'; import fs from 'node:fs'; import path from 'node:path';
const files = []; (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.tsx?$/.test(f) && !p.includes('i18n')) files.push(p); } })('src');
const FR = /[éèêàùçôîœ’«»]|\b(le|la|les|des|du|une|un|et|pour|avec|sans|aucun|votre|vous|est)\b/i;
const SKIP_ATTR = new Set(['className', 'key', 'id', 'href', 'role', 'type', 'name', 'htmlFor', 'd', 'fill', 'viewBox', 'data-zone']);
const isT = (n) => ts.isCallExpression(n) && ts.isIdentifier(n.expression) && ['t', 'tr', 'tf'].includes(n.expression.text);
let total = 0;
for (const f of files) {
  const src = ts.createSourceFile(f, fs.readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true);
  const visit = (n) => {
    const lit = ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateExpression(n);
    if (lit) {
      const text = ts.isTemplateExpression(n) ? n.getText() : n.text;
      let p = n.parent, wrapped = false;
      for (let q = p; q && !ts.isStatement(q); q = q.parent) if (isT(q)) { wrapped = true; break; }
      const attr = ts.isJsxAttribute(p) ? p.name.getText() : null;
      if (!wrapped && FR.test(text) && !(attr && SKIP_ATTR.has(attr)) && !ts.isImportDeclaration(p) && !ts.isPropertyAssignment(p) || (!wrapped && ts.isPropertyAssignment(p) && p.initializer === n && FR.test(text) && process.argv.includes('--props'))) {
        const { line } = src.getLineAndCharacterOfPosition(n.getStart()); total++;
        console.log(`${f}:${line + 1}  ${text.slice(0, 90)}`);
      }
      return;
    }
    if (ts.isJsxText(n)) { /* déjà traité par le codemod */ }
    ts.forEachChild(n, visit);
  };
  visit(src);
}
console.error('total', total);
