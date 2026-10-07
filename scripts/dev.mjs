import {spawn} from 'node:child_process';
const tasks=[['node_modules/tsx/dist/cli.mjs','server/index.ts'],['node_modules/vite/bin/vite.js','--host','127.0.0.1']];
const children=tasks.map(args=>spawn(process.execPath,args,{stdio:'inherit',env:process.env}));
let closing=false;function close(code=0){if(closing)return;closing=true;for(const child of children)child.kill();process.exitCode=code;}
for(const child of children)child.on('exit',code=>close(code||0));process.on('SIGINT',()=>close());process.on('SIGTERM',()=>close());
