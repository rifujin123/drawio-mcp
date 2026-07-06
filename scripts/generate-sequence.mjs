/**
 * Generate login sequence diagram using internal builder.
 * Run: node scripts/generate-sequence.mjs
 */
import { SequenceDiagramBuilder } from '../src/builders/sequence-builder.js';
import { writeDrawioFile } from '../src/utils/diagram-writer.js';

const input = {
  title: 'Login Sequence Diagram',
  participants: [
    { name: 'User', type: 'actor' },
    { name: 'LoginPage', type: 'boundary' },
    { name: 'AuthController', type: 'control' },
    { name: 'UserService', type: 'control' },
    { name: 'Database', type: 'entity' },
  ],
  messages: [
    { from: 'User', to: 'LoginPage', label: 'enterCredentials()', type: 'synchronous', order: 1 },
    { from: 'LoginPage', to: 'AuthController', label: 'login(email, password)', type: 'synchronous', order: 2 },
    { from: 'AuthController', to: 'AuthController', label: 'validateInput()', type: 'synchronous', order: 3 },
    { from: 'AuthController', to: 'UserService', label: 'findByEmail()', type: 'synchronous', order: 4 },
    { from: 'UserService', to: 'Database', label: 'query()', type: 'synchronous', order: 5 },
    { from: 'Database', to: 'UserService', label: 'userData', type: 'return', order: 6 },
    { from: 'UserService', to: 'AuthController', label: 'user', type: 'return', order: 7 },
    { from: 'AuthController', to: 'AuthController', label: 'verifyPassword()', type: 'synchronous', order: 8 },
    { from: 'AuthController', to: 'LoginPage', label: 'authResult', type: 'return', order: 9 },
    { from: 'LoginPage', to: 'User', label: 'showDashboard()', type: 'return', order: 10 },
  ],
};

const builder = new SequenceDiagramBuilder(input);
builder.build();
builder.layout();
const xml = builder.serialize();
const filePath = await writeDrawioFile(xml, {
  diagramName: 'Login Sequence Diagram',
  prefix: 'sequence-diagram-login',
});
console.log(`Diagram created: ${filePath}`);
