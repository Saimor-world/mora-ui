import fs from "node:fs";

const [auditPath, baselinePath] = process.argv.slice(2);
if (!auditPath || !baselinePath) {
  console.error("Usage: node check-npm-audit-baseline.mjs <audit.json> <baseline.json>");
  process.exit(2);
}

let audit;
let baseline;
try {
  audit = JSON.parse(fs.readFileSync(auditPath, "utf8"));
  baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
} catch (error) {
  console.error("Could not parse npm audit/baseline JSON:", error.message);
  process.exit(2);
}

const expiry = new Date(`${baseline.expires_on}T23:59:59Z`);
if (Number.isNaN(expiry.getTime())) {
  console.error("Invalid baseline expires_on date.");
  process.exit(2);
}
if (new Date() > expiry) {
  console.error(
    `Security-debt baseline expired on ${baseline.expires_on}. Fix or explicitly renew with a reviewed exception.`
  );
  process.exit(1);
}

const current = audit?.metadata?.vulnerabilities;
if (!current) {
  console.error("npm audit JSON did not contain metadata.vulnerabilities.");
  process.exit(2);
}

const allowed = baseline.maximum_vulnerabilities ?? {};
const severities = ["critical", "high", "moderate", "low", "info"];
let failed = false;

for (const severity of severities) {
  const now = Number(current[severity] ?? 0);
  const max = Number(allowed[severity] ?? 0);
  console.log(`${severity}: current=${now}, temporary_max=${max}`);
  if (now > max) {
    console.error(`::error::${severity} vulnerabilities increased from the temporary baseline.`);
    failed = true;
  }
}

if (failed) process.exit(1);

console.log(
  `Temporary vulnerability baseline accepted until ${baseline.expires_on}. Decreases are allowed; increases are blocked.`
);
