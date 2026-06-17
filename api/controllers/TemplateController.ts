import { Request, Response } from 'express';
import { FileStorageService } from '../services/FileStorageService.js';
import { ApplicationTemplate } from '../../shared/types/index.js';

export class TemplateController {
  static async getTemplates(req: Request, res: Response) {
    try {
      const { type, country } = req.query;
      let templates = FileStorageService.readTemplates();

      if (type) {
        templates = templates.filter((t: ApplicationTemplate) => t.type === type);
      }
      if (country) {
        templates = templates.filter((t: ApplicationTemplate) => t.country === country);
      }

      return res.json(templates);
    } catch (error) {
      console.error('Get templates error:', error);
      return res.status(500).json({ error: '服务器错误' });
    }
  }

  static async updateTemplate(req: Request, res: Response) {
    try {
      const { type, country } = req.params;
      const data = req.body;
      const templates = FileStorageService.readTemplates();
      const index = templates.findIndex(
        (t: ApplicationTemplate) => t.type === type && t.country === country
      );

      if (index === -1) {
        templates.push(data);
      } else {
        templates[index] = data;
      }

      FileStorageService.writeTemplates(templates);
      return res.json(data);
    } catch (error) {
      console.error('Update template error:', error);
      return res.status(500).json({ error: '服务器错误' });
    }
  }
}
