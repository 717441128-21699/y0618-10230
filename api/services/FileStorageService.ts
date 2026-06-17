import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');

export class FileStorageService {
  private static readFile<T>(filename: string): T {
    const filePath = path.join(DATA_DIR, filename);
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  }

  private static writeFile<T>(filename: string, data: T): void {
    const filePath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  static readUsers() {
    return this.readFile<any[]>('users.json');
  }

  static writeUsers(users: any[]) {
    this.writeFile('users.json', users);
  }

  static readTemplates() {
    return this.readFile<any[]>('templates.json');
  }

  static writeTemplates(templates: any[]) {
    this.writeFile('templates.json', templates);
  }

  static readProjects() {
    return this.readFile<any[]>('projects.json');
  }

  static writeProjects(projects: any[]) {
    this.writeFile('projects.json', projects);
  }
}
