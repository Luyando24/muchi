import { spawn } from 'child_process';

const frontend = spawn('pnpm', ['run', 'dev:frontend'], { stdio: 'inherit', shell: true });
const backend = spawn('pnpm', ['run', 'start:api'], { stdio: 'inherit', shell: true });

process.on('SIGINT', () => {
    frontend.kill('SIGINT');
    backend.kill('SIGINT');
    process.exit();
});

process.on('SIGTERM', () => {
    frontend.kill('SIGTERM');
    backend.kill('SIGTERM');
    process.exit();
});
