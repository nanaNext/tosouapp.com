#!/usr/bin/env node
// Simple server restart helper
const { spawn } = require('child_process');
const path = require('path');

console.log('🛑 Killing existing Node processes...');
require('child_process').exec('taskkill /F /IM node.exe 2>nul', (err) => {
  setTimeout(() => {
    console.log('🚀 Starting server...');
    const server = spawn('npm', ['start'], {
      cwd: path.resolve(__dirname),
      stdio: 'inherit',
      shell: true
    });
    
    server.on('error', (err) => {
      console.error('Error starting server:', err);
      process.exit(1);
    });
  }, 2000);
});
