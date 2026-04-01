import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qlzmdmfkrpxhvdjdsbgo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsem1kbWZrcnB4aHZkamRzYmdvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTczNzkxOSwiZXhwIjoyMDgxMzEzOTE5fQ.IlgkY4QbFk0ZycgJ8FWvMX3CFPqv9vp8DKNuMkSYLRk'
);

async function main() {
  const { data, error } = await supabase.from('student_grades').select('*').gt('percentage', 100);
  console.log('Grades > 100:', data);
  
  const { data: s, error: e } = await supabase.from('submissions').select('score, max_score').gt('score', 100);
  console.log('Submissions > 100:', s);

  const { data: grades, error: gError } = await supabase.from('student_grades').select('percentage');
  console.log('All percentages types:', grades?.map(g => typeof g.percentage + ' ' + g.percentage).slice(0, 10));
}

main();