// Extraction des chaînes à traduire (clés françaises normalisées), sans doublons.
import fs from 'node:fs'; import path from 'node:path'; import ts from 'typescript';
const ROOT = path.resolve(process.argv[2] ?? 'src'); const out = new Set();
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const looksText = (s) => { const k = norm(s); if (k.length < 2 || !/[A-Za-zÀ-ÿ]{2}/.test(k)) return false;
  if (/^(https?:|#\/|\.\/|tll\.|var\(|rgb|EVT-|[a-z0-9]+(-[a-z0-9]+)+$|[a-z]+[A-Z]\w*$|[a-z_]+$)/.test(k)) return false;
  if (/^[\w.-]+\.(js|ts|tsx|jpg|png|glb|json|css)$/.test(k)) return false; if (/[{};=]|=>/.test(k) && !/[éèàêç]/.test(k)) return false;
  return /\s|[À-ÿ]|^[A-ZÉ]/.test(k); };
function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) { if (!['i18n'].includes(f)) walk(p); } else if (/\.(ts|tsx)$/.test(p) && !p.includes('.test.') && !p.includes('/scene/engine') ) scan(p); } }
function scan(file) {
  const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  (function v(n) {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
      const p = n.parent; const isImport = ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || (p && ts.isExternalModuleReference(p));
      const isKey = p && ts.isPropertyAssignment(p) && p.name === n; const isType = p && (ts.isLiteralTypeNode(p));
      const isClass = p && ts.isJsxAttribute(p) && ['className', 'id', 'name', 'role', 'href', 'type', 'key', 'htmlFor', 'autoComplete', 'viewBox', 'd', 'fill', 'stroke', 'path'].includes(p.name.getText());
      if (!isImport && !isKey && !isType && !isClass && looksText(n.text)) out.add(norm(n.text));
    }
    ts.forEachChild(n, v);
  })(sf);
}
walk(ROOT); const list = [...out].sort(); fs.writeFileSync(process.argv[3] ?? 'i18n-keys.json', JSON.stringify(list, null, 0)); console.log(list.length, 'chaînes');
