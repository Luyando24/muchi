import fs from 'fs';

let content = fs.readFileSync('server/routes/school.ts', 'utf8');

const regex = /requireSchoolRole\(\[\s*([^\]]+)\s*\]\)/g;

content = content.replace(regex, (match, p1) => {
  if (p1.includes('"school_admin"') || p1.includes("'school_admin'")) {
    const roles = p1.split(',').map(r => r.trim().replace(/['"]/g, ''));
    const otherRoles = roles.filter(r => r !== 'school_admin' && !['bursar', 'registrar', 'exam_officer', 'academic_auditor', 'accounts', 'content_manager'].includes(r));
    
    if (otherRoles.length > 0) {
      const otherRolesStr = otherRoles.map(r => `"${r}"`).join(', ');
      return `requireSchoolRole([...ADMIN_ROLES, ${otherRolesStr}])`;
    } else {
      return `requireSchoolRole(ADMIN_ROLES)`;
    }
  }
  return match;
});

fs.writeFileSync('server/routes/school.ts', content);
console.log('Successfully updated school.ts');
