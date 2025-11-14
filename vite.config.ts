import { defineConfig } from 'vite';

export default defineConfig({
  // Other configuration options (plugins, build, etc.) go here
  // ...

  server: {
    // Setting host to '0.0.0.0' makes Vite listen on all network interfaces.
    // This allows access from devices on your local network (using your local IP).
    host: '0.0.0.0',
    
    // Optional: You can specify the port if needed, otherwise it defaults to 5173
    // port: 3000, 
  },
});